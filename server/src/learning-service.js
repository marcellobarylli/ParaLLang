import { createHash, randomUUID } from 'node:crypto';
import { gradingResponseSchema, encounterResponseSchema } from './llm/schemas.js';
import { buildGradingMessages, buildNarrationMessages } from './llm/prompt-builder.js';
import {
  calculateSpanishRatio, capAssistedQuality, gradeVocabularyAnswer, initialSchedule,
  isDue, masteryLabel, matchCanonicalVocabulary, scheduleReview,
} from './language-engine.js';
import { assertLearnerId, createLearnerEnvelope } from './learning-storage.js';
import { conflictError, retryableError, validationError } from './errors.js';
import { ProviderError } from './llm/provider-error.js';

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
      return { learnerId, recovered };
    });
  }

  async loadEnvelope(learnerId) {
    assertLearnerId(learnerId);
    const envelope = await this.storage.load(learnerId);
    if (!envelope) throw validationError('Unknown learner ID. Create a learner identity first.');
    return envelope;
  }

  ratioFor(turns) {
    return calculateSpanishRatio(
      this.content.character.language_profile.base_spanish_ratio,
      this.content.encounter.escalation.spanish_ratio_increase_per_turn,
      turns,
    );
  }

  activeObjectives(encounter) { return this.content.encounter.objectives.slice(encounter.objectiveIndex); }

  discover(envelope, vocabularyIds, discoveredAt, source) {
    let changed = false;
    for (const vocabularyId of new Set(vocabularyIds)) {
      const entry = this.content.vocabularyById.get(vocabularyId);
      if (!entry) continue;
      const bucket = entry.kind === 'phrase' ? envelope.spellbook.phrases : envelope.spellbook.words;
      if (bucket[vocabularyId]) continue;
      bucket[vocabularyId] = {
        vocabularyId,
        contentVersion: this.content.vocabulary.version,
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

  spellbookSnapshot(envelope) {
    const now = this.clock();
    const cards = [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)]
      .map((item) => {
        const entry = this.content.vocabularyById.get(item.vocabularyId);
        if (!entry || item.contentVersion !== this.content.vocabulary.version) return null;
        return {
          vocabularyId: entry.id,
          kind: entry.kind,
          spanish: entry.spanish,
          meanings: entry.accepted_translations,
          partOfSpeech: entry.part_of_speech,
          example: entry.example,
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
    return { cards, dueCount: cards.filter((card) => card.due).length, contentVersion: this.content.vocabulary.version };
  }

  canonicalizeNarration(generated) {
    const matches = matchCanonicalVocabulary(generated.dialogue.native, this.content.vocabulary.entries);
    const seen = new Set();
    const words = matches.filter((match) => !seen.has(match.id) && seen.add(match.id)).map(({ entry, excerpt }) => ({
      vocabularyId: entry.id,
      spanish: excerpt || entry.spanish,
      canonicalSpanish: entry.spanish,
      partOfSpeech: entry.part_of_speech,
      meaning: entry.accepted_translations[0],
    }));
    return {
      id: randomUUID(), role: 'npc', narrative: generated.narrative,
      dialogue: { speaker: this.content.character.name, native: generated.dialogue.native, translation: generated.dialogue.translation, words },
    };
  }

  currentRevealKeys(encounter) {
    const objective = this.content.encounter.objectives[encounter.objectiveIndex];
    return objective ? (encounter.reveals[objective.id] ?? []) : [];
  }

  serializeEncounter(encounter) {
    const objective = this.content.encounter.objectives[encounter.objectiveIndex] ?? null;
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
            spanish: word.spanish,
            canonicalSpanish: word.canonicalSpanish,
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
      version: encounter.version,
      state: encounter.state,
      encounter_state: encounter.state === 'resolved' ? 'resolved' : 'ongoing',
      committedPlayerTurns: encounter.committedPlayerTurns,
      difficulty: this.ratioFor(encounter.committedPlayerTurns),
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

  async startEncounter(learnerId, { restart = false } = {}) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      if (!restart && this.encounters.has(learnerId)) {
        return { encounter: this.serializeEncounter(this.encounters.get(learnerId)), spellbook: this.spellbookSnapshot(envelope) };
      }
      const ratio = this.ratioFor(0);
      const generated = await this.callProvider(buildNarrationMessages({
        character: this.content.character,
        objectives: this.content.encounter.objectives,
        vocabularyById: this.content.vocabularyById,
        spanishRatio: ratio,
      }), encounterResponseSchema, 'encounter_narration', 'Gerald');
      const npcMessage = this.canonicalizeNarration(generated);
      const stagedEnvelope = clone(envelope);
      this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), nowIso(this.clock), 'encounter_exposure');
      const encounter = {
        id: randomUUID(), version: 1, state: 'ongoing', objectiveIndex: 0,
        committedPlayerTurns: 0, transcript: [npcMessage], reveals: {},
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
      const objective = this.content.encounter.objectives[current.objectiveIndex];
      const activeMessage = [...current.transcript].reverse().find((message) => message.role === 'npc');
      if (!activeMessage || request.messageId !== activeMessage.id) throw conflictError('Help is only available for the current Gerald message.', 'STALE_MESSAGE');
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
          || !playerInput.toLocaleLowerCase('es').includes(evidence.evidence.toLocaleLowerCase('es'))
          || !excerptIds.has(evidence.vocabulary_id)) {
          throw retryableError('The grader returned vocabulary evidence that is not present in the answer.', 'INVALID_GRADING');
        }
        evidenceIds.add(evidence.vocabulary_id);
      }
      if (result.passed && objective.required_target_groups.some((group) => !group.some((id) => evidenceIds.has(id)))) {
        throw retryableError('The grader passed an objective without the required Spanish evidence.', 'INVALID_GRADING');
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
      if (current.state !== 'ongoing') throw validationError('Gerald has already accepted this order. Restart to play again.');
      const objectives = this.activeObjectives(current);
      const gradingRaw = await this.callProvider(buildGradingMessages({
        objectives, vocabularyById: this.content.vocabularyById,
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
      const resolved = nextObjectiveIndex >= this.content.encounter.objectives.length;
      const nextTurns = current.committedPlayerTurns + 1;
      const decision = {
        objectiveResults: assessment.objective_results.map(({ objective_id, passed }) => ({ objectiveId: objective_id, passed })),
        encounterState: resolved ? 'resolved' : 'ongoing',
        nextObjectiveId: this.content.encounter.objectives[nextObjectiveIndex]?.id ?? null,
      };
      const history = current.transcript.map((item) => item.role === 'player'
        ? { role: 'user', content: item.text }
        : { role: 'assistant', content: item.dialogue.native });
      const generated = await this.callProvider(buildNarrationMessages({
        character: this.content.character,
        objectives: this.content.encounter.objectives.slice(nextObjectiveIndex),
        vocabularyById: this.content.vocabularyById,
        conversationHistory: history,
        playerInput: message,
        spanishRatio: this.ratioFor(nextTurns),
        decision,
      }), encounterResponseSchema, 'encounter_narration', 'Gerald');

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
      const npcMessage = this.canonicalizeNarration(generated);
      this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), timestamp, 'encounter_exposure');
      stagedEncounter.transcript.push({ id: randomUUID(), role: 'player', text: message }, npcMessage);
      stagedEncounter.objectiveIndex = nextObjectiveIndex;
      stagedEncounter.committedPlayerTurns = nextTurns;
      stagedEncounter.state = resolved ? 'resolved' : 'ongoing';
      stagedEncounter.version += 1;
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
        spellbook: this.spellbookSnapshot(stagedEnvelope),
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

  async getSpellbook(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    return this.spellbookSnapshot(envelope);
  }

  async createReviewChallenge(learnerId, vocabularyId = null) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      let item;
      if (vocabularyId) item = this.findItem(envelope, vocabularyId);
      else item = [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)]
        .find((candidate) => isDue(candidate.schedule, this.clock()));
      if (!item) return { challenge: null, spellbook: this.spellbookSnapshot(envelope) };
      const entry = this.content.vocabularyById.get(item.vocabularyId);
      if (!entry || item.contentVersion !== this.content.vocabulary.version) throw conflictError('This card belongs to a different content version.', 'STALE_CONTENT');
      const challenge = {
        id: randomUUID(), learnerId, vocabularyId: entry.id,
        contentVersion: this.content.vocabulary.version, issuedAt: nowIso(this.clock),
        practice: !isDue(item.schedule, this.clock()),
      };
      if (!this.reviewChallenges.has(learnerId)) this.reviewChallenges.set(learnerId, new Map());
      this.reviewChallenges.get(learnerId).set(challenge.id, challenge);
      return {
        challenge: { id: challenge.id, vocabularyId: entry.id, spanish: entry.spanish, kind: entry.kind, practice: challenge.practice },
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
      if (!item || !entry || challenge.contentVersion !== this.content.vocabulary.version) throw conflictError('That review card is no longer available.', 'STALE_CONTENT');

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
