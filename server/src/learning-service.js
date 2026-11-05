import { createHash, randomUUID } from 'node:crypto';
import { gradingResponseSchema, encounterResponseSchema } from './llm/schemas.js';
import { buildGradingMessages, buildNarrationMessages } from './llm/prompt-builder.js';
import {
  calculateTargetRatio, capAssistedQuality, gradeVocabularyAnswer, initialSchedule,
  isDue, masteryLabel, matchCanonicalVocabulary, scheduleReview,
} from './language-engine.js';
import { assertLearnerId, createLearnerEnvelope } from './learning-storage.js';
import { AppError, conflictError, retryableError, validationError } from './errors.js';
import { ProviderError } from './llm/provider-error.js';
import { applyMove, currentLocationId, gateFor, sealedMessage, worldSnapshot } from './world.js';

function clone(value) { return structuredClone(value); }
function payloadHash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function nowIso(clock) { return new Date(clock()).toISOString(); }

export class LearningService {
  constructor({ provider, storage, content, clock = () => new Date() }) {
    this.provider = provider;
    this.storage = storage;
    this.content = content;
    this.clock = clock;
    this.encounters = new Map();
    this.reviewChallenges = new Map();
    this.locks = new Map();
  }

  async serialized(learnerId, operation) {
    const previous = this.locks.get(learnerId) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    this.locks.set(learnerId, current);
    try { return await current; }
    finally { if (this.locks.get(learnerId) === current) this.locks.delete(learnerId); }
  }

  async createOrRecoverLearner(requestedId) {
    const learnerId = requestedId || randomUUID();
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      let envelope = await this.storage.load(learnerId);
      const recovered = Boolean(envelope);
      if (!envelope) {
        envelope = createLearnerEnvelope(learnerId);
        await this.storage.save(envelope);
      }
      return { learnerId, recovered, language: this.content.language };
    });
  }

  // Round 039: removing a save deletes it here too. Serialized, so it waits for any request in flight for this
  // learner; the in-memory encounter and review challenges go with it.
  async deleteLearner(learnerId) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      // Post-close review: the in-memory state goes only once the file is gone (a failed unlink keeps the session).
      const existed = await this.storage.remove(learnerId);
      this.encounters.delete(learnerId);
      this.reviewChallenges.delete(learnerId);
      return { deleted: true, existed };
    });
  }

  async loadEnvelope(learnerId) {
    assertLearnerId(learnerId);
    const envelope = await this.storage.load(learnerId);
    if (!envelope) throw validationError('Unknown learner ID. Create a learner identity first.');
    return envelope;
  }

  // Round 006: each session plays one encounter definition ({ encounter, character }) from the pack.
  definition(session) { return this.content.encounters.get(session?.definitionId ?? this.content.defaultEncounterId); }

  ratioFor(turns, definition = this.definition(null)) {
    return calculateTargetRatio(
      definition.character.language_profile.base_target_ratio,
      definition.encounter.escalation.target_ratio_increase_per_turn,
      turns,
    );
  }

  activeObjectives(session) { return this.definition(session).encounter.objectives.slice(session.objectiveIndex); }

  locationName(definition) { return this.content.world.locationsById.get(definition.encounter.location)?.name ?? definition.encounter.location; }

  // Round 022: a party conversation is set wherever the player stood when it began; other encounters at their location.
  sceneLocationId(session) { return session?.locationId ?? this.definition(session).encounter.location; }

  sceneName(session) { return this.content.world.locationsById.get(this.sceneLocationId(session))?.name ?? this.sceneLocationId(session); }

  partyConversationFor(encounterId) {
    return [...this.content.encounters.values()].find((definition) => definition.encounter.party_of === encounterId) ?? null;
  }

  discover(envelope, vocabularyIds, discoveredAt, source) {
    let changed = false;
    for (const vocabularyId of new Set(vocabularyIds)) {
      const entry = this.content.vocabularyById.get(vocabularyId);
      if (!entry) continue;
      const bucket = entry.kind === 'phrase' ? envelope.spellbook.phrases : envelope.spellbook.words;
      if (bucket[vocabularyId]) continue;
      bucket[vocabularyId] = {
        vocabularyId,
        contentVersion: this.content.entryVersion(vocabularyId),
        discoveredAt,
        discoverySource: source,
        schedule: initialSchedule(discoveredAt),
        evidence: [],
      };
      changed = true;
    }
    return changed;
  }

  findItem(envelope, vocabularyId) {
    return envelope.spellbook.words[vocabularyId] ?? envelope.spellbook.phrases[vocabularyId] ?? null;
  }

  isCurrent(item) { return Boolean(this.content.vocabularyById.get(item.vocabularyId)) && item.contentVersion === this.content.entryVersion(item.vocabularyId); }

  // Round 029 (backlog C1): the cards to review before a drill encounter's first fight. Per required target group:
  // the group's current Spellbook cards; it blocks when it has some and all are due, and its drill card is the one
  // due longest (then by id). Undiscovered and stale cards never block.
  drillFor(envelope, definition) {
    const now = this.clock();
    const ids = [];
    for (const objective of definition.encounter.objectives) {
      for (const group of objective.required_target_groups) {
        const cards = group.map((id) => this.findItem(envelope, id)).filter((item) => item && this.isCurrent(item));
        if (!cards.length || !cards.every((item) => isDue(item.schedule, now))) continue;
        const [first] = [...cards].sort((a, b) => a.schedule.dueAt.localeCompare(b.schedule.dueAt) || a.vocabularyId.localeCompare(b.vocabularyId));
        if (!ids.includes(first.vocabularyId)) ids.push(first.vocabularyId);
      }
    }
    return ids;
  }

  // The drill pending where the player stands: a drill_before encounter at this location, not yet completed.
  pendingDrill(envelope) {
    const here = currentLocationId(this.content.world, envelope.world);
    const encounterId = this.content.world.locationsById.get(here)?.encounter;
    const definition = encounterId ? this.content.encounters.get(encounterId) : null;
    if (!definition?.encounter.drill_before || envelope.world.completedEncounterIds.includes(encounterId)) return null;
    const vocabularyIds = this.drillFor(envelope, definition);
    return vocabularyIds.length ? { encounterId, characterName: definition.character.name, vocabularyIds } : null;
  }

  // Round 017: while an encounter is under way the Spellbook gives no meanings and reviews are closed, because any
  // card (its own meaning, another card's example, a phrase) could answer the NPC's protected line.
  inEncounter(encounter) { return encounter?.state === 'ongoing'; }

  assertNoEncounter(learnerId) {
    if (this.inEncounter(this.encounters.get(learnerId))) {
      throw conflictError('Reviews wait until the encounter is over. Ask your companion for a hint instead.', 'IN_ENCOUNTER');
    }
  }

  spellbookSnapshot(envelope, encounter = this.encounters.get(envelope.learnerId)) {
    const now = this.clock();
    const cards = [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)]
      .map((item) => {
        const entry = this.content.vocabularyById.get(item.vocabularyId);
        if (!entry || item.contentVersion !== this.content.entryVersion(entry.id)) return null;
        return {
          vocabularyId: entry.id,
          kind: entry.kind,
          target: entry.target,
          meanings: entry.accepted_translations,
          partOfSpeech: entry.part_of_speech,
          example: entry.example,
          note: entry.note ?? null,
          discoveredAt: item.discoveredAt,
          mastery: masteryLabel(item.schedule),
          due: isDue(item.schedule, now),
          nextReviewAt: item.schedule.dueAt,
          lastOutcome: item.schedule.lastQuality,
          repetitions: item.schedule.repetitions,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.discoveredAt.localeCompare(b.discoveredAt) || a.vocabularyId.localeCompare(b.vocabularyId));
    const inEncounter = this.inEncounter(encounter);
    return {
      cards, dueCount: cards.filter((card) => card.due).length, contentVersion: this.content.vocabulary.version,
      inEncounter, containmentFiles: this.containmentFiles(envelope),
      journeyFragments: this.journeyFragments(envelope, inEncounter), drill: this.pendingDrill(envelope),
    };
  }

  // Round 028 (backlog B4): a containment file is filed once its encounter is completed (world progress; no save
  // change). Not on a visit or at the start: the file would explain the hazard before the player met it (critique 1.2).
  containmentFiles(envelope) {
    const completed = new Set(envelope.world?.completedEncounterIds ?? []);
    return [...this.content.encounters.values()]
      .filter(({ encounter }) => encounter.containment_file && completed.has(encounter.id))
      .map(({ encounter }) => {
        const { designation, name, class: hazardClass, notes, ...properties } = encounter.containment_file;
        return {
          encounterId: encounter.id, locationName: this.content.world.locationsById.get(encounter.location).name,
          designation, name, class: hazardClass, properties, notes: [...notes],
        };
      })
      .sort((a, b) => a.designation.localeCompare(b.designation));
  }

  // Round 030 (backlog A9): fragments of The Journey, found once their encounter is completed (no save change), in
  // story (file) order. No text holds a vocabulary form of the pack (server test); the English translation and
  // glossary are withheld while an encounter is under way, as card meanings are (round 017).
  journeyFragments(envelope, inEncounter = false) {
    const completed = new Set(envelope.world?.completedEncounterIds ?? []);
    const party = envelope.party ?? [];
    // Round 032: a fragment with `after_conversations` is unlocked by the party member met at `found_after` (matched
    // as partySnapshot does: encounter and character) once their conversation count reaches it, not by completion.
    // Derived, not saved: removing the member or raising N would hide it again.
    const memberCount = (homeId) => {
      const { character } = this.content.encounters.get(homeId);
      const member = party.find((m) => m.encounterId === homeId && m.characterId === character.id);
      return member ? (member.conversations ?? 0) : null;
    };
    const conversationOf = (homeId) => [...this.content.encounters.values()].find(({ encounter }) => encounter.party_of === homeId).encounter.id;
    const found = (fragment) => (fragment.after_conversations === undefined
      ? completed.has(fragment.found_after)
      : (memberCount(fragment.found_after) ?? 0) >= fragment.after_conversations);
    return this.content.fragments.filter(found).map((fragment) => {
      const { encounter, character } = this.content.encounters.get(fragment.found_after);
      const byConversation = fragment.after_conversations !== undefined;
      return {
        id: fragment.id, title: fragment.title, found: fragment.found,
        encounterId: byConversation ? conversationOf(encounter.id) : encounter.id,
        // Round 036: a conversation fragment names who told it (shown in English, also during encounters).
        ...(byConversation ? { unlockedAt: fragment.after_conversations, conversations: memberCount(encounter.id), toldBy: character.name } : {}),
        locationName: this.content.world.locationsById.get(encounter.location).name, text: fragment.text,
        hidden: inEncounter,
        translation: inEncounter ? null : fragment.translation,
        glossary: inEncounter ? null : fragment.glossary.map((entry) => ({ ...entry })),
      };
    });
  }

  canonicalizeNarration(generated, definition) {
    const matches = matchCanonicalVocabulary(generated.dialogue.native, definition.narrationEntries);
    const seen = new Set();
    const words = matches.filter((match) => !seen.has(match.id) && seen.add(match.id)).map(({ entry, excerpt }) => ({
      vocabularyId: entry.id,
      target: excerpt || entry.target,
      canonicalTarget: entry.target,
      partOfSpeech: entry.part_of_speech,
      meaning: entry.accepted_translations[0],
    }));
    return {
      id: randomUUID(), role: 'npc', narrative: generated.narrative,
      dialogue: { speaker: definition.character.name, native: generated.dialogue.native, translation: generated.dialogue.translation, words },
    };
  }

  currentRevealKeys(encounter) {
    const objective = this.definition(encounter).encounter.objectives[encounter.objectiveIndex];
    return objective ? (encounter.reveals[objective.id] ?? []) : [];
  }

  serializeEncounter(encounter) {
    const definition = this.definition(encounter);
    const objective = definition.encounter.objectives[encounter.objectiveIndex] ?? null;
    const currentNpc = [...encounter.transcript].reverse().find((message) => message.role === 'npc');
    const revealKeys = this.currentRevealKeys(encounter);
    const transcript = encounter.transcript.map((message) => {
      if (message.role === 'player') return clone(message);
      const protectedMessage = encounter.state === 'ongoing' && message.id === currentNpc?.id;
      const sentenceRevealed = !protectedMessage || revealKeys.includes(`sentence:${message.id}`);
      return {
        id: message.id, role: message.role, narrative: message.narrative,
        dialogue: {
          speaker: message.dialogue.speaker,
          native: message.dialogue.native,
          translation: sentenceRevealed ? message.dialogue.translation : undefined,
          translationAvailable: true,
          words: message.dialogue.words.map((word) => ({
            vocabularyId: word.vocabularyId,
            target: word.target,
            canonicalTarget: word.canonicalTarget,
            partOfSpeech: word.partOfSpeech,
            meaning: (!protectedMessage || revealKeys.includes(`word:${message.id}:${word.vocabularyId}`)) ? word.meaning : undefined,
            meaningAvailable: true,
          })),
        },
        protected: protectedMessage,
      };
    });
    const limit = objective?.hint_limit ?? 0;
    return {
      id: encounter.id,
      encounterId: definition.encounter.id,
      location: this.sceneLocationId(encounter),
      partyConversation: Boolean(definition.encounter.party_of),
      character: { id: definition.character.id, name: definition.character.name, saveable: definition.character.saveable === true },
      resolvedMessage: definition.encounter.resolved_message ?? null,
      companionBriefing: definition.encounter.companion_briefing ?? null,
      version: encounter.version,
      state: encounter.state,
      encounter_state: encounter.state === 'resolved' ? 'resolved' : 'ongoing',
      committedPlayerTurns: encounter.committedPlayerTurns,
      difficulty: this.ratioFor(encounter.committedPlayerTurns, definition),
      must_translate: encounter.state === 'ongoing' && Boolean(objective),
      hints_available: encounter.state === 'ongoing' && revealKeys.length < limit,
      hints: { used: revealKeys.length, remaining: Math.max(0, limit - revealKeys.length), limit },
      currentObjective: objective ? { id: objective.id, prompt: objective.prompt } : null,
      transcript,
    };
  }

  async callProvider(messages, schema, schemaName, label) {
    try {
      const response = await this.provider.structuredChat(messages, schema, { schemaName, temperature: 0.2 });
      return schema.parse(response);
    }
    catch (error) {
      if (error instanceof ProviderError) throw error;
      throw retryableError(`${label} is temporarily unavailable. Your progress was not changed. Please retry in a moment.`, 'PROVIDER_FAILURE');
    }
  }

  // Without an encounterId the default encounter starts anywhere (the frozen web client); with one, the player
  // must be at that encounter's location.
  async startEncounter(learnerId, { restart = false, encounterId = null } = {}) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const definitionId = encounterId ?? this.content.defaultEncounterId;
      const definition = this.content.encounters.get(definitionId);
      if (typeof definitionId !== 'string' || !definition) throw validationError('Unknown encounter.');
      const here = currentLocationId(this.content.world, envelope.world);
      if (definition.encounter.party_of) {
        // Round 022: a party member travels with the player, so their conversation starts anywhere once they have joined.
        if (!envelope.party.some((member) => member.characterId === definition.character.id)) {
          throw conflictError(`${definition.character.name} is not in your party yet.`, 'NOT_IN_PARTY');
        }
      } else {
        if (encounterId !== null && here !== definition.encounter.location) {
          throw conflictError(`${definition.character.name} is not here. Walk to ${this.locationName(definition)} first.`, 'NOT_HERE');
        }
        // Round 015: a save from rounds 005–013 may already stand in the Rift; its encounter still waits for the gate.
        const gate = gateFor(this.content.world.locationsById.get(definition.encounter.location), envelope.world);
        if (gate?.sealed) throw conflictError(sealedMessage(this.locationName(definition), gate), 'SEALED');
      }
      const locationId = definition.encounter.party_of ? here : undefined;
      const active = this.encounters.get(learnerId);
      // Round 022: a resolved party conversation is played again from the start; other encounters resume as before.
      const replay = Boolean(definition.encounter.party_of) && active?.state === 'resolved';
      if (!restart && !replay && active && this.definition(active) === definition) {
        return { encounter: this.serializeEncounter(active), spellbook: this.spellbookSnapshot(envelope) };
      }
      // Round 029: forced repetition before the first fight, checked after resuming and never for a session of this
      // encounter that is already active (restart included: reviews are closed while it runs; critique 2.2).
      if (definition.encounter.drill_before && !(active && this.definition(active) === definition)) {
        const drill = this.pendingDrill(envelope);
        if (drill?.encounterId === definition.encounter.id) {
          const words = drill.vocabularyIds.length === 1 ? 'word' : 'words';
          const elsewhere = this.inEncounter(active) ? ` Finish your conversation with ${this.definition(active).character.name} first.` : '';
          throw new AppError(`${definition.character.name} reviews everything you have learned. Review your ${drill.vocabularyIds.length} due ${words} in the Spellbook first.${elsewhere}`,
            { status: 409, code: 'DRILL_REQUIRED', details: { vocabularyIds: drill.vocabularyIds } });
        }
      }
      const ratio = this.ratioFor(0, definition);
      const generated = await this.callProvider(buildNarrationMessages({
        language: this.content.language,
        character: definition.character,
        styleGuide: this.content.styleGuide,
        locationName: this.sceneName({ definitionId: definition.encounter.id, locationId }),
        objectives: definition.encounter.objectives,
        vocabularyById: this.content.vocabularyById,
        targetRatio: ratio,
        ambientEntries: definition.ambientEntries,
      }), encounterResponseSchema, 'encounter_narration', definition.character.name);
      const npcMessage = this.canonicalizeNarration(generated, definition);
      const stagedEnvelope = clone(envelope);
      this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), nowIso(this.clock), 'encounter_exposure');
      const encounter = {
        id: randomUUID(), definitionId: definition.encounter.id, version: 1, state: 'ongoing', objectiveIndex: 0,
        committedPlayerTurns: 0, transcript: [npcMessage], reveals: {},
        ...(locationId ? { locationId } : {}),
      };
      await this.storage.save(stagedEnvelope);
      this.encounters.set(learnerId, encounter);
      return { encounter: this.serializeEncounter(encounter), spellbook: this.spellbookSnapshot(stagedEnvelope) };
    });
  }

  async currentEncounter(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    const encounter = this.encounters.get(learnerId);
    return { encounter: encounter ? this.serializeEncounter(encounter) : null, spellbook: this.spellbookSnapshot(envelope) };
  }

  validateVersion(encounter, encounterId, version) {
    if (!encounter || encounter.id !== encounterId) throw conflictError('This encounter is no longer active. Refresh to recover the current encounter.', 'STALE_ENCOUNTER');
    if (encounter.version !== version) throw conflictError('This encounter changed in another tab. Refresh before retrying.', 'STALE_VERSION');
  }

  async revealEncounterHelp(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const current = this.encounters.get(learnerId);
      this.validateVersion(current, request.encounterId, request.version);
      if (current.state !== 'ongoing') throw validationError('This encounter no longer has an active learning objective.');
      const objective = this.definition(current).encounter.objectives[current.objectiveIndex];
      const activeMessage = [...current.transcript].reverse().find((message) => message.role === 'npc');
      if (!activeMessage || request.messageId !== activeMessage.id) throw conflictError(`Help is only available for the current ${this.definition(current).character.name} message.`, 'STALE_MESSAGE');
      let key;
      let reveal;
      if (request.kind === 'sentence') {
        key = `sentence:${activeMessage.id}`;
        reveal = { kind: 'sentence', value: activeMessage.dialogue.translation };
      } else if (request.kind === 'word') {
        const word = activeMessage.dialogue.words.find((candidate) => candidate.vocabularyId === request.vocabularyId);
        if (!word) throw validationError('That canonical word is not present in the active message.');
        key = `word:${activeMessage.id}:${word.vocabularyId}`;
        reveal = { kind: 'word', vocabularyId: word.vocabularyId, value: word.meaning };
      } else throw validationError('Help kind must be word or sentence.');

      const used = current.reveals[objective.id] ?? [];
      const alreadyRevealed = used.includes(key);
      if (!alreadyRevealed && used.length >= objective.hint_limit) throw conflictError('No translation hints remain for this objective.', 'HINTS_EXHAUSTED');
      if (alreadyRevealed) return { reveal, charged: false, encounter: this.serializeEncounter(current), spellbook: this.spellbookSnapshot(envelope) };

      const staged = clone(current);
      staged.reveals[objective.id] = [...used, key];
      staged.version += 1;
      const stagedEnvelope = clone(envelope);
      if (request.kind === 'word') this.discover(stagedEnvelope, [request.vocabularyId], nowIso(this.clock), 'companion_reveal');
      await this.storage.save(stagedEnvelope);
      this.encounters.set(learnerId, staged);
      return { reveal, charged: true, encounter: this.serializeEncounter(staged), spellbook: this.spellbookSnapshot(stagedEnvelope) };
    });
  }

  validateAssessment(raw, objectives, playerInput) {
    let assessment;
    try { assessment = gradingResponseSchema.parse(raw); }
    catch { throw retryableError('The grading response was invalid. Your answer can be retried unchanged.', 'INVALID_GRADING'); }
    const allowed = new Map(objectives.map((objective) => [objective.id, objective]));
    const seen = new Set();
    for (const result of assessment.objective_results) {
      const objective = allowed.get(result.objective_id);
      if (!objective || seen.has(result.objective_id)) throw retryableError('The grader assessed an unknown or duplicate objective. Your progress was not changed.', 'INVALID_GRADING');
      seen.add(result.objective_id);
      const evidenceIds = new Set();
      for (const evidence of result.vocabulary_evidence) {
        if (!objective.target_vocabulary_ids.includes(evidence.vocabulary_id)) throw retryableError('The grader returned evidence for an unrelated vocabulary item.', 'INVALID_GRADING');
        const excerptIds = new Set(matchCanonicalVocabulary(evidence.evidence, this.content.vocabulary.entries).map((match) => match.id));
        if (evidenceIds.has(evidence.vocabulary_id)
          || !playerInput.toLowerCase().includes(evidence.evidence.toLowerCase())
          || !excerptIds.has(evidence.vocabulary_id)) {
          throw retryableError('The grader returned vocabulary evidence that is not present in the answer.', 'INVALID_GRADING');
        }
        evidenceIds.add(evidence.vocabulary_id);
      }
      if (result.passed && objective.required_target_groups.some((group) => !group.some((id) => evidenceIds.has(id)))) {
        throw retryableError(`The grader passed an objective without the required ${this.content.language.name} evidence.`, 'INVALID_GRADING');
      }
    }
    if (seen.size !== objectives.length || objectives.some((objective) => !seen.has(objective.id))) {
      throw retryableError('The grader did not return a complete objective verdict. Your progress was not changed.', 'INVALID_GRADING');
    }
    return assessment;
  }

  async submitDialogue(learnerId, request) {
    const message = String(request.message ?? '').trim();
    if (!message) throw validationError('Enter a response before sending.');
    if (!request.attemptId) throw validationError('A stable attempt ID is required.');
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const fingerprint = payloadHash({ kind: 'dialogue', encounterId: request.encounterId, version: request.version, message });
      const existing = envelope.spellbook.processedAssessments[request.attemptId];
      if (existing) {
        if (existing.payloadHash !== fingerprint) throw conflictError('This attempt ID was already used for different input.', 'ATTEMPT_REUSE');
        return { ...existing.response, replayed: true };
      }
      const current = this.encounters.get(learnerId);
      this.validateVersion(current, request.encounterId, request.version);
      if (current.state !== 'ongoing') throw validationError('This encounter is already complete. Restart to play again.');
      const definition = this.definition(current);
      const objectives = this.activeObjectives(current);
      const gradingRaw = await this.callProvider(buildGradingMessages({
        language: this.content.language, objectives, vocabularyById: this.content.vocabularyById,
        conversationContext: current.transcript.map((item) => item.role === 'player' ? item.text : item.dialogue.native),
        playerInput: message,
      }), gradingResponseSchema, 'dialogue_assessment', 'The language assessor');
      const assessment = this.validateAssessment(gradingRaw, objectives, message);

      let passedCount = 0;
      for (const objective of objectives) {
        const result = assessment.objective_results.find((item) => item.objective_id === objective.id);
        if (!result.passed) break;
        passedCount += 1;
      }
      const nextObjectiveIndex = current.objectiveIndex + passedCount;
      const resolved = nextObjectiveIndex >= definition.encounter.objectives.length;
      const nextTurns = current.committedPlayerTurns + 1;
      const decision = {
        objectiveResults: assessment.objective_results.map(({ objective_id, passed }) => ({ objectiveId: objective_id, passed })),
        encounterState: resolved ? 'resolved' : 'ongoing',
        nextObjectiveId: definition.encounter.objectives[nextObjectiveIndex]?.id ?? null,
      };
      const history = current.transcript.map((item) => item.role === 'player'
        ? { role: 'user', content: item.text }
        : { role: 'assistant', content: item.dialogue.native });
      const generated = await this.callProvider(buildNarrationMessages({
        language: this.content.language,
        character: definition.character,
        styleGuide: this.content.styleGuide,
        locationName: this.sceneName(current),
        objectives: definition.encounter.objectives.slice(nextObjectiveIndex),
        vocabularyById: this.content.vocabularyById,
        conversationHistory: history,
        playerInput: message,
        targetRatio: this.ratioFor(nextTurns, definition),
        decision,
        ambientEntries: definition.ambientEntries,
      }), encounterResponseSchema, 'encounter_narration', definition.character.name);

      const stagedEnvelope = clone(envelope);
      const stagedEncounter = clone(current);
      const timestamp = nowIso(this.clock);
      const advancedObjectiveIds = new Set(objectives.slice(0, passedCount).map((objective) => objective.id));
      for (const result of assessment.objective_results) {
        const assisted = (current.reveals[result.objective_id] ?? []).length > 0;
        for (const evidence of result.vocabulary_evidence) {
          this.discover(stagedEnvelope, [evidence.vocabulary_id], timestamp, 'dialogue_assessment');
          const item = this.findItem(stagedEnvelope, evidence.vocabulary_id);
          const effectiveQuality = capAssistedQuality(evidence.quality, assisted);
          item.evidence.push({ at: timestamp, kind: 'dialogue', objectiveId: result.objective_id, quality: effectiveQuality, passed: result.passed });
          if (advancedObjectiveIds.has(result.objective_id) && result.passed && isDue(item.schedule, this.clock())) {
            item.schedule = scheduleReview(item.schedule, effectiveQuality, this.clock());
          }
          evidence.effective_quality = effectiveQuality;
        }
      }
      const npcMessage = this.canonicalizeNarration(generated, definition);
      this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), timestamp, 'encounter_exposure');
      stagedEncounter.transcript.push({ id: randomUUID(), role: 'player', text: message }, npcMessage);
      stagedEncounter.objectiveIndex = nextObjectiveIndex;
      stagedEncounter.committedPlayerTurns = nextTurns;
      stagedEncounter.state = resolved ? 'resolved' : 'ongoing';
      stagedEncounter.version += 1;
      // Round 028: progress is recorded before the response is built, so the resolving turn's spellbook already
      // holds the encounter's containment file.
      if (resolved && definition.encounter.party_of) {
        // Round 022: a party conversation counts towards the member, not the map (the Rift gate is unchanged).
        const member = stagedEnvelope.party.find((candidate) => candidate.characterId === definition.character.id);
        if (member) member.conversations = (member.conversations ?? 0) + 1;
      } else if (resolved && !stagedEnvelope.world.completedEncounterIds.includes(definition.encounter.id)) {
        stagedEnvelope.world.completedEncounterIds.push(definition.encounter.id);
      }
      const response = {
        encounter: this.serializeEncounter(stagedEncounter),
        assessment: {
          overallFeedback: assessment.overall_feedback,
          objectiveResults: assessment.objective_results.map((result) => ({
            objectiveId: result.objective_id, passed: result.passed, feedback: result.feedback,
            vocabularyEvidence: result.vocabulary_evidence.map((evidence) => ({
              vocabularyId: evidence.vocabulary_id, evidence: evidence.evidence,
              quality: evidence.quality, effectiveQuality: evidence.effective_quality,
            })),
          })),
        },
        spellbook: this.spellbookSnapshot(stagedEnvelope, stagedEncounter),
        replayed: false,
      };
      stagedEnvelope.spellbook.processedAssessments[request.attemptId] = {
        kind: 'dialogue', payloadHash: fingerprint, committedAt: timestamp, response,
      };
      await this.storage.save(stagedEnvelope);
      this.encounters.set(learnerId, stagedEncounter);
      return response;
    });
  }

  // Round 027: the philosophy statement; the same for every learner, so no learner id is needed.
  getOnboarding() {
    const { title, statement, notes, beginLabel } = this.content.onboarding;
    return { onboarding: { title, statement, notes: [...notes], beginLabel } };
  }

  async getWorld(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    return { world: worldSnapshot(this.content.world, envelope.world, this.content.encounters) };
  }

  async moveTo(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const { progress, changed } = applyMove(this.content.world, envelope.world, request.locationId);
      if (!changed) return { world: worldSnapshot(this.content.world, envelope.world, this.content.encounters) };
      const stagedEnvelope = clone(envelope);
      stagedEnvelope.world = progress;
      await this.storage.save(stagedEnvelope);
      return { world: worldSnapshot(this.content.world, progress, this.content.encounters) };
    });
  }

  // Round 021: the party. Members whose encounter is not in the loaded pack stay in the save but are not shown.
  partySnapshot(envelope) {
    return (envelope.party ?? []).flatMap((member) => {
      const definition = this.content.encounters.get(member.encounterId);
      if (!definition || definition.character.id !== member.characterId) return [];
      return [{
        characterId: member.characterId,
        name: definition.character.name,
        encounterId: member.encounterId,
        locationId: definition.encounter.location,
        locationName: this.locationName(definition),
        joinedAt: member.joinedAt,
        conversations: member.conversations ?? 0,
        conversationId: this.partyConversationFor(member.encounterId)?.encounter.id ?? null,
      }];
    });
  }

  async getParty(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    return { party: this.partySnapshot(envelope) };
  }

  // A defeated, saveable character joins the party. Declining writes nothing, so the offer stays open.
  async recruit(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const encounterId = request?.encounterId;
      const definition = typeof encounterId === 'string' ? this.content.encounters.get(encounterId) : null;
      if (!definition) throw validationError('Unknown encounter.');
      const { character } = definition;
      if (character.saveable !== true) throw conflictError(`${character.name} cannot join your party.`, 'NOT_SAVEABLE');
      if (!envelope.world.completedEncounterIds.includes(encounterId)) {
        throw conflictError(`${character.name} has not been won over yet. Finish the encounter first.`, 'NOT_DEFEATED');
      }
      if (envelope.party.some((member) => member.characterId === character.id)) {
        return { party: this.partySnapshot(envelope), joined: false };
      }
      const stagedEnvelope = clone(envelope);
      stagedEnvelope.party.push({ characterId: character.id, encounterId, joinedAt: nowIso(this.clock) });
      await this.storage.save(stagedEnvelope);
      return { party: this.partySnapshot(stagedEnvelope), joined: true };
    });
  }

  async getSpellbook(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    return this.spellbookSnapshot(envelope);
  }

  async createReviewChallenge(learnerId, vocabularyId = null) {
    return this.serialized(learnerId, async () => {
      this.assertNoEncounter(learnerId);
      const envelope = await this.loadEnvelope(learnerId);
      let item;
      if (vocabularyId) item = this.findItem(envelope, vocabularyId);
      else {
        // Round 029: a pending drill's cards come first; stale cards are never picked (critique 2.4).
        const drillId = this.pendingDrill(envelope)?.vocabularyIds[0];
        item = drillId ? this.findItem(envelope, drillId)
          : [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)]
            .find((candidate) => this.isCurrent(candidate) && isDue(candidate.schedule, this.clock()));
      }
      if (!item) return { challenge: null, spellbook: this.spellbookSnapshot(envelope) };
      const entry = this.content.vocabularyById.get(item.vocabularyId);
      if (!entry || item.contentVersion !== this.content.entryVersion(entry.id)) throw conflictError('This card belongs to a different content version.', 'STALE_CONTENT');
      const challenge = {
        id: randomUUID(), learnerId, vocabularyId: entry.id,
        contentVersion: this.content.entryVersion(entry.id), issuedAt: nowIso(this.clock),
        practice: !isDue(item.schedule, this.clock()),
      };
      if (!this.reviewChallenges.has(learnerId)) this.reviewChallenges.set(learnerId, new Map());
      this.reviewChallenges.get(learnerId).set(challenge.id, challenge);
      return {
        challenge: { id: challenge.id, vocabularyId: entry.id, target: entry.target, kind: entry.kind, practice: challenge.practice },
        spellbook: this.spellbookSnapshot(envelope),
      };
    });
  }

  async submitReview(learnerId, request) {
    if (!request.attemptId || !request.challengeId) throw validationError('Review challenge and attempt IDs are required.');
    if (request.action !== 'answer' && request.action !== 'reveal') throw validationError('Review action must be answer or reveal.');
    const answer = String(request.answer ?? '').trim();
    if (request.action === 'answer' && !answer) throw validationError('Enter an answer or choose Show answer.');
    return this.serialized(learnerId, async () => {
      this.assertNoEncounter(learnerId);
      const envelope = await this.loadEnvelope(learnerId);
      const fingerprint = payloadHash({ kind: 'review', challengeId: request.challengeId, action: request.action, answer });
      const existing = envelope.spellbook.processedAssessments[request.attemptId];
      if (existing) {
        if (existing.payloadHash !== fingerprint) throw conflictError('This attempt ID was already used for different review input.', 'ATTEMPT_REUSE');
        return { ...existing.response, replayed: true };
      }
      const challenge = this.reviewChallenges.get(learnerId)?.get(request.challengeId);
      if (!challenge) throw conflictError('That review challenge is stale. Fetch a new due review.', 'STALE_CHALLENGE');
      const item = this.findItem(envelope, challenge.vocabularyId);
      const entry = this.content.vocabularyById.get(challenge.vocabularyId);
      if (!item || !entry || challenge.contentVersion !== this.content.entryVersion(entry.id)) throw conflictError('That review card is no longer available.', 'STALE_CONTENT');

      const stagedEnvelope = clone(envelope);
      const stagedItem = this.findItem(stagedEnvelope, challenge.vocabularyId);
      const result = request.action === 'reveal'
        ? { correct: false, quality: 0, kind: 'revealed' }
        : gradeVocabularyAnswer(entry, answer);
      const timestamp = nowIso(this.clock);
      const scheduleChanged = isDue(stagedItem.schedule, this.clock()) && !challenge.practice;
      if (scheduleChanged) stagedItem.schedule = scheduleReview(stagedItem.schedule, result.quality, this.clock());
      stagedItem.evidence.push({ at: timestamp, kind: 'review', quality: result.quality, correct: result.correct, revealed: request.action === 'reveal', scheduleChanged });
      const response = {
        result: {
          correct: result.correct,
          feedback: request.action === 'reveal' ? 'Answer revealed; this recall attempt was recorded as quality 0.'
            : result.correct ? (result.kind === 'minor_typo' ? 'Correct meaning, with a minor typo.' : 'Correct.') : 'Not quite. Review the canonical answer and try it again when due.',
          effectiveQuality: result.quality,
          canonicalAnswer: entry.accepted_translations[0],
          acceptedAnswers: entry.accepted_translations,
          nextReviewAt: stagedItem.schedule.dueAt,
          scheduleChanged,
        },
        spellbook: this.spellbookSnapshot(stagedEnvelope),
        replayed: false,
      };
      stagedEnvelope.spellbook.processedAssessments[request.attemptId] = {
        kind: 'review', payloadHash: fingerprint, committedAt: timestamp, response,
      };
      await this.storage.save(stagedEnvelope);
      this.reviewChallenges.get(learnerId).delete(request.challengeId);
      return response;
    });
  }

  async shutdown() { await this.provider.shutdown?.(); }
}
