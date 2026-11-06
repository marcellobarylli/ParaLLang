import { createHash, randomUUID } from 'node:crypto';
import { gradingResponseSchema, encounterResponseSchema, locationAtmosphereSchema } from './llm/schemas.js';
import { buildAtmosphereMessages, buildGradingMessages, buildNarrationMessages } from './llm/prompt-builder.js';
import {
  calculateTargetRatio, capAssistedQuality, gradeVocabularyAnswer, initialSchedule,
  foldEvidenceText, isDue, lacksTargetLanguage, masteryLabel, matchCanonicalVocabulary, scheduleReview,
} from './language-engine.js';
import { foldWords } from './content-loader.js';
import { LINE_LIMIT, LINE_TEXT_LIMIT, assertLearnerId, createLearnerEnvelope } from './learning-storage.js';
import { AppError, conflictError, retryableError, validationError } from './errors.js';
import { ProviderError } from './llm/provider-error.js';
import { applyMove, currentLocationId, gateFor, sealedMessage, visitedSet, worldSnapshot } from './world.js';

// Round 051 (critique 1.3): told to the narrator when a pass is held (see submitDialogue).
export const HELD_NOTE = 'A held objective was said correctly but does not count: an earlier objective comes first. Do not celebrate it or treat it as done, and do not give its answer; the player must say it again after the earlier objective.';

// Round 078: appended once, after the rejected reply, when a narration line had no target language (see narrate). It
// asks for the turn's share and demands no English, since the share can reach 100% (critique 1.4).
export const NARRATION_RETRY_MS = 20_000;
const TIMED_OUT = Symbol('timed out');
export function correctionNote(language, ratio) {
  return `CORRECTION: in your reply above, dialogue.native has no ${language.name} in it: every word is also in its translation. Write the reply again for the same turn, following every rule above; dialogue.native must be about ${Math.round(ratio * 100)}% ${language.name}, as the LANGUAGE RULES require.`;
}

export const ATMOSPHERE_MAX_LENGTH = 300;
export const FOOTNOTE_MAX_LENGTH = 200; // round 081

// Round 086: does the text hold an inflection of a single-word form (4+ letters) of the objectives' targets?
// Round 088: split so kept lines can test one entry's forms (`inflectsForms` takes the surface forms as written).
const inflectionForms = (surfaceForms) => new Set(surfaceForms.map((form) => foldWords(form).trim()).filter((form) => form.length >= 4 && !form.includes(' ')));
export function inflectsForms(text, surfaceForms) {
  const forms = inflectionForms(surfaceForms);
  if (!forms.size) return false;
  return foldWords(text).trim().split(' ').some((word) => !forms.has(word) && [...forms].some((form) =>
    word.length >= form.length && word.length <= form.length + 2 && word.startsWith(form.slice(0, -1))));
}
export function inflectsAnswer(text, objectives, vocabularyById) {
  return inflectsForms(text, objectives.flatMap((objective) => objective.target_vocabulary_ids)
    .flatMap((id) => vocabularyById.get(id)?.surface_variants ?? []));
}
export const LINE_ENTRY_CACHE = 500; // round 088: natives whose entry ids are remembered
export const ATMOSPHERE_RETRY_MS = 10 * 60_000;
export const ATMOSPHERE_BUSY_RETRY_MS = 15_000;
// Round 089 (review R1.1): no English exemptions in the atmosphere filter. Round 053's list (once, kilo, basta, sei, …)
// held only forms that are objective answers in their pack (docs/rounds/089/results/exempt.txt).
// Round 068 (backlog A10b, critique 1.2): one kind of detail per line, fixed by the location's index in the pack's world
// and the state (none 0, open 1, complete 2): (3i + s) mod 5. A pure function of what the cache key already holds, so
// a cached line always matches its detail for the server's lifetime (critique 1.6).
export const ATMOSPHERE_DETAILS = Object.freeze(['a sound', 'a smell', 'a movement', 'the light', 'the air or the temperature']);
const ATMOSPHERE_STATES = ['none', 'open', 'complete'];
export function atmosphereDetail(world, locationId, state) {
  const index = world.locations.findIndex((location) => location.id === locationId);
  const s = ATMOSPHERE_STATES.indexOf(state);
  if (index < 0 || s < 0) return ATMOSPHERE_DETAILS[0];
  return ATMOSPHERE_DETAILS[(3 * index + s) % ATMOSPHERE_DETAILS.length];
}
const foldForAtmosphere = (text) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Round 092 (Amendment 1): some occurrence of `needle` in `text` neither starts nor ends inside a word.
const WORD_CHAR = /[\p{L}\p{N}\p{M}]/u;
export function atWordBoundaries(text, needle) {
  if (!needle) return false;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) {
    const before = at > 0 && WORD_CHAR.test(text[at - 1]) && WORD_CHAR.test(needle[0]);
    const after = at + needle.length < text.length && WORD_CHAR.test(text[at + needle.length]) && WORD_CHAR.test(needle.at(-1));
    if (!before && !after) return true;
  }
  return false;
}

function clone(value) { return structuredClone(value); }
function payloadHash(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function nowIso(clock) { return new Date(clock()).toISOString(); }
// Round 060: the dedupe key of a kept line (critique 1.7): normalised text plus speaker.
const lineKey = (line) => `${line.speaker}\u0000${line.native.normalize('NFC').toLowerCase().replace(/\s+/gu, ' ').trim()}`;
// Round 060 (critiques 1.2, 1.3): receipts store responses without the kept lines; a replay gets the current ones.
// Round 082 Amendment 1 (review R1.2): the inscriptions too; they follow the world, not the turn.
function withoutLines(response) {
  if (!response?.spellbook || !('lines' in response.spellbook || 'inscriptions' in response.spellbook)) return response;
  const { lines, inscriptions, ...spellbook } = response.spellbook;
  return { ...response, spellbook };
}

// Round 076: how long the player stays at a place before its greeting is written, how often a busy provider is
// waited out, and how many greetings are kept in all.
export const PREFETCH_DWELL_MS = 1500;
export const PREFETCH_RETRIES = 3;
export const PREFETCH_MAX_GREETINGS = 100;
const greetingKey = (learnerId, definitionId) => `${learnerId}\u0000${definitionId}`;

export class LearningService {
  constructor({ provider, storage, content, clock = () => new Date(), atmosphere = false, prefetch = false, prefetchDwellMs = PREFETCH_DWELL_MS, prefetchRetries = PREFETCH_RETRIES, narrationRetryMs = NARRATION_RETRY_MS }) {
    this.provider = provider;
    // Round 076: the greeting written while the player reads the map card (off unless switched on). One arrival per
    // learner; greetings by learner and encounter until a start takes them; counters only.
    this.prefetchEnabled = prefetch;
    this.prefetchDwellMs = prefetchDwellMs;
    this.prefetchRetries = prefetchRetries;
    this.arrivals = new Map();
    this.arrivalSeq = 0;
    this.greetings = new Map();
    this.starting = new Set();
    this.stopping = false;
    this.prefetchStats = { scheduled: 0, calls: 0, used: 0, fallback: 0, failed: 0, busy: 0, skipped: 0, evicted: 0, dropped: 0 }; // dropped: round 087
    // Round 078: narration lines checked for target language, and what the one retry did (memory only).
    this.narrationStats = { checked: 0, flagged: 0, retryPassed: 0, kept: 0, timedOut: 0 };
    this.narrationRetryMs = narrationRetryMs;
    // Round 053 (backlog A10): atmosphere lines by state key, and the calls under way for a key.
    this.atmosphereEnabled = atmosphere;
    this.atmosphereLines = new Map();
    this.atmosphereCalls = new Map();
    this.atmosphereFailures = new Map();
    this.atmosphereStats = { calls: 0, aborted: 0, drops: [] };
    // Round 089 (review R1.2): controllers of the atmosphere calls in flight; a player's call on a serial provider
    // aborts them, so a cosmetic line never holds the one CLI slot ahead of an encounter.
    this.atmosphereAborts = new Set();
    this.providerCallsInFlight = 0;
    this.storage = storage;
    this.content = content;
    this.clock = clock;
    this.encounters = new Map();
    this.reviewChallenges = new Map();
    this.locks = new Map();
    // Round 070 (backlog I1): per learner, the validated assessment of the turn whose reply is being written.
    this.turnProgress = new Map();
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
      this.scheduleArrival(learnerId, currentLocationId(this.content.world, envelope.world));
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
      this.turnProgress.delete(learnerId); // round 090 (review R1.5)
      this.forgetPrefetch(learnerId);
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

  // Round 045 (backlog G3): the objectives still open, in authored order. In order (the default), those from the index
  // on; unordered, every objective not yet passed. The current objective is the first open one.
  activeObjectives(session) {
    const { objectives, objectives_unordered: unordered } = this.definition(session).encounter;
    if (!unordered) return objectives.slice(session.objectiveIndex);
    const passed = new Set(session.passedObjectiveIds ?? []);
    return objectives.filter((objective) => !passed.has(objective.id));
  }

  currentObjective(session) { return this.activeObjectives(session)[0] ?? null; }

  locationName(definition) { return this.content.world.locationsById.get(definition.encounter.location)?.name ?? definition.encounter.location; }

  // Round 022: a party conversation is set wherever the player stood when it began; other encounters at their location.
  sceneLocationId(session) { return session?.locationId ?? this.definition(session).encounter.location; }

  sceneName(session) { return this.content.world.locationsById.get(this.sceneLocationId(session))?.name ?? this.sceneLocationId(session); }

  // Round 047 (backlog G4): a home may have deeper party conversations (`after_conversations`). With `count`
  // finished conversations, the deepest one unlocked is offered; count 0 gives the first tier.
  partyConversationFor(encounterId, count = 0) {
    const tier = (definition) => definition.encounter.after_conversations ?? 0;
    return [...this.content.encounters.values()]
      .filter((definition) => definition.encounter.party_of === encounterId && tier(definition) <= count)
      .reduce((best, definition) => (!best || tier(definition) > tier(best) ? definition : best), null);
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
    // Round 090 (decision 2): the learner's other cards whose form stands in a card's own target or its example, so
    // the app keeps that meaning or the example's English back while one of them is due.
    const order = cards.map((card) => card.vocabularyId);
    for (const card of cards) {
      const lists = this.entryAnswerLists(this.content.vocabularyById.get(card.vocabularyId));
      card.formCardIds = order.filter((id) => lists.form.has(id));
      card.exampleCardIds = order.filter((id) => lists.example.has(id));
    }
    const inEncounter = this.inEncounter(encounter);
    return {
      cards, dueCount: cards.filter((card) => card.due).length, contentVersion: this.content.vocabulary.version,
      inEncounter, containmentFiles: this.containmentFiles(envelope),
      journeyFragments: this.journeyFragments(envelope, inEncounter), drill: this.pendingDrill(envelope),
      lines: this.keptLines(envelope, inEncounter, cards), inscriptions: this.inscriptions(envelope, inEncounter),
    };
  }

  // Round 082: the inscriptions of visited locations (the current one included), in file order. Derived from world
  // progress, no save change. The text holds no answer (server test); translation and glossary wait out an encounter.
  inscriptions(envelope, inEncounter = false) {
    const visited = visitedSet(this.content.world, envelope.world);
    return (this.content.inscriptions ?? []).filter((inscription) => visited.has(inscription.location)).map((inscription) => ({
      id: inscription.id, locationId: inscription.location,
      locationName: this.content.world.locationsById.get(inscription.location).name,
      where: inscription.where, text: inscription.text, hidden: inEncounter,
      translation: inEncounter ? null : inscription.translation,
      glossary: inEncounter ? null : inscription.glossary.map((entry) => ({ ...entry })),
    }));
  }

  // Round 060 (backlog C9): the lines the player paid to translate, newest first. The translation is withheld during
  // an encounter and while any card the line contains is due (decision 2): the line is that card's answer in context.
  // Round 088 (review R1.1): also while any of the learner's cards stands in the line, from any encounter: its entry
  // found alone (overlaps do not exclude each other) or an inflection of it. English homographs of a due card hide a
  // line too (decision 2). `cardIds` lets the app check a stale snapshot by the clock.
  keptLines(envelope, inEncounter, cards) {
    const due = new Set(cards.filter((card) => card.due).map((card) => card.vocabularyId));
    const order = cards.map((card) => card.vocabularyId);
    return (envelope.lines ?? []).map((line) => {
      const found = this.lineEntryIds(line.native);
      const cardIds = [...new Set([...line.vocabularyIds, ...order.filter((id) => found.has(id))])];
      const hidden = inEncounter || cardIds.some((id) => due.has(id));
      return {
        id: line.id, speaker: line.speaker, native: line.native, translation: hidden ? null : line.translation,
        locationName: (line.locationId && this.content.world.locationsById.get(line.locationId)?.name) ?? null,
        vocabularyIds: [...line.vocabularyIds], cardIds, savedAt: line.savedAt, hidden,
      };
    });
  }

  // Round 088 (decision 3): every pack entry found in a native, alone or inflected; a bounded map, oldest out (the
  // service's content is fixed for its life, so the native is the whole key).
  lineEntryIds(native) {
    this.lineEntries ??= new Map();
    const known = this.lineEntries.get(native);
    if (known) return known;
    const found = this.entryIdsIn(native);
    this.lineEntries.set(native, found);
    if (this.lineEntries.size > LINE_ENTRY_CACHE) this.lineEntries.delete(this.lineEntries.keys().next().value);
    return found;
  }

  entryIdsIn(text) {
    return new Set(this.content.vocabulary.entries
      .filter((entry) => matchCanonicalVocabulary(text, [entry]).length || inflectsForms(text, entry.surface_variants))
      .map((entry) => entry.id));
  }

  // Round 090 (review R1.2 of rounds 029–039): the pack entries in an entry's own target and in its example, without
  // itself, computed once per entry (content is fixed for the service's life; critique 1.8).
  entryAnswerLists(entry) {
    this.entryLists ??= new Map();
    let lists = this.entryLists.get(entry.id);
    if (!lists) {
      const without = (set) => { set.delete(entry.id); return set; };
      lists = {
        form: without(this.entryIdsIn(entry.target)),
        example: without(entry.example?.target ? this.entryIdsIn(entry.example.target) : new Set()),
      };
      this.entryLists.set(entry.id, lists);
    }
    return lists;
  }

  // Round 060: keeps a paid sentence reveal in the staged envelope only (critique 1.6), deduped and capped.
  keepLine(envelope, session, message) {
    // Round 088 (review R1.3): never a lone high surrogate at the cut.
    const cap = (value) => String(value ?? '').slice(0, LINE_TEXT_LIMIT).replace(/[\uD800-\uDBFF]$/, '');
    const line = {
      id: cap(message.id), encounterId: cap(this.definition(session).encounter.id),
      locationId: this.sceneLocationId(session) ?? null, speaker: cap(message.dialogue.speaker),
      native: cap(message.dialogue.native), translation: cap(message.dialogue.translation),
      vocabularyIds: message.dialogue.words.map((word) => word.vocabularyId), savedAt: nowIso(this.clock),
    };
    if (![line.id, line.encounterId, line.speaker, line.native, line.translation].every(Boolean)) return;
    const key = lineKey(line);
    envelope.lines = [line, ...(envelope.lines ?? []).filter((kept) => lineKey(kept) !== key)].slice(0, LINE_LIMIT);
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
      const member = party.find((m) => this.isHomeMember(m, homeId));
      return member ? (member.conversations ?? 0) : null;
    };
    // Round 089 (review R1.3): the conversation offered at N − 1, whose resolution reached the count N.
    const conversationOf = (homeId, unlockedAt) => this.partyConversationFor(homeId, unlockedAt - 1).encounter.id;
    const found = (fragment) => (fragment.after_conversations === undefined
      ? completed.has(fragment.found_after)
      : (memberCount(fragment.found_after) ?? 0) >= fragment.after_conversations);
    return this.content.fragments.filter(found).map((fragment) => {
      const { encounter, character } = this.content.encounters.get(fragment.found_after);
      const byConversation = fragment.after_conversations !== undefined;
      return {
        id: fragment.id, title: fragment.title, found: fragment.found,
        encounterId: byConversation ? conversationOf(encounter.id, fragment.after_conversations) : encounter.id,
        // Round 036: a conversation fragment names who told it (shown in English, also during encounters).
        ...(byConversation ? { unlockedAt: fragment.after_conversations, conversations: memberCount(encounter.id), toldBy: character.name } : {}),
        locationName: this.content.world.locationsById.get(encounter.location).name, text: fragment.text,
        hidden: inEncounter,
        translation: inEncounter ? null : fragment.translation,
        glossary: inEncounter ? null : fragment.glossary.map((entry) => ({ ...entry })),
      };
    });
  }

  // Round 081 (backlog B5): a footnote is kept when it is a short string, the previous NPC line of the session kept
  // none, and no pack vocabulary form is in it. Amendment 2: no English-homograph exemptions (the atmosphere list holds
  // encounter answers such as basta, sei, soy), so "once" or "cafe" drops a footnote too.
  // Round 086: nor an unlisted inflection of an open objective's single-word answer (it *buoni* for *buono*): a word
  // that is not itself a form but starts with a form of 4+ letters minus its last letter and is 0–2 letters longer.
  // Measured over 47k English tokens of live narration (docs/rounds/086/results): full recall on synthetic
  // inflections, few English collisions (a dropped footnote is optional flavour).
  keptFootnote(generated, previousNpc, open = []) {
    if (typeof generated.footnote !== 'string' || previousNpc?.footnote) return undefined;
    const text = generated.footnote.trim().replace(/\s+/g, ' ');
    if (!text || text.length > FOOTNOTE_MAX_LENGTH) return undefined;
    if (matchCanonicalVocabulary(text, this.content.vocabulary.entries).length) return undefined;
    return inflectsAnswer(text, open, this.content.vocabularyById) ? undefined : text;
  }

  canonicalizeNarration(generated, definition, previousNpc, open = definition.encounter.objectives) {
    const matches = matchCanonicalVocabulary(generated.dialogue.native, definition.narrationEntries);
    // Round 057 (backlog C7): every span the matcher gave an id, so the app can mark the word in the line where the
    // server found it (critique 1.1); the first match still sets the order and `target`.
    const spans = new Map();
    for (const match of matches) {
      if (!spans.has(match.id)) spans.set(match.id, { match, spans: [] });
      spans.get(match.id).spans.push([match.start, match.end]);
    }
    const words = [...spans.values()].map(({ match: { entry, excerpt }, spans: wordSpans }) => ({
      vocabularyId: entry.id,
      target: excerpt || entry.target,
      canonicalTarget: entry.target,
      partOfSpeech: entry.part_of_speech,
      meaning: entry.accepted_translations[0],
      spans: wordSpans,
    }));
    const footnote = this.keptFootnote(generated, previousNpc, open);
    return {
      id: randomUUID(), role: 'npc', narrative: generated.narrative,
      ...(footnote ? { footnote } : {}),
      dialogue: { speaker: definition.character.name, native: generated.dialogue.native, translation: generated.dialogue.translation, words },
    };
  }

  currentRevealKeys(encounter) {
    const objective = this.currentObjective(encounter);
    return objective ? (encounter.reveals[objective.id] ?? []) : [];
  }

  serializeEncounter(encounter) {
    const definition = this.definition(encounter);
    const objective = this.currentObjective(encounter);
    const currentNpc = [...encounter.transcript].reverse().find((message) => message.role === 'npc');
    const revealKeys = this.currentRevealKeys(encounter);
    const transcript = encounter.transcript.map((message) => {
      if (message.role === 'player') return clone(message);
      const protectedMessage = encounter.state === 'ongoing' && message.id === currentNpc?.id;
      const sentenceRevealed = !protectedMessage || revealKeys.includes(`sentence:${message.id}`);
      return {
        id: message.id, role: message.role, narrative: message.narrative,
        ...(message.footnote ? { footnote: message.footnote } : {}),
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
            ...(word.spans ? { spans: word.spans.map((span) => [...span]) } : {}),
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

  async callProvider(messages, schema, schemaName, label, { signal, background = false } = {}) {
    // Round 089 (decision 2): a player's call (not the greeting prefetch) on a serial provider aborts atmosphere calls.
    if (!background && this.provider.serial === true) this.abortAtmosphere();
    this.providerCallsInFlight += 1; // round 053: no atmosphere call starts meanwhile
    try {
      const response = await this.provider.structuredChat(messages, schema, { schemaName, temperature: 0.2, ...(signal ? { signal } : {}) });
      return schema.parse(response);
    }
    catch (error) {
      if (error instanceof ProviderError) throw error;
      throw retryableError(`${label} is temporarily unavailable. Your progress was not changed. Please retry in a moment.`, 'PROVIDER_FAILURE');
    }
    finally { this.providerCallsInFlight -= 1; }
  }

  // Round 078 (prototype.md §11): an NPC line with no target language at all is written again, once: the same
  // messages, the rejected reply and a correction. A retry that fails, is still flagged or takes longer than
  // narrationRetryMs keeps the first line, so the guard never turns a playable turn into an error. Amendment 1
  // (review 1): at the deadline the retry is aborted (the CLI runner frees its one slot); no retry while stopping.
  // Round 087 (critique 1.4, 1.5): a caller's signal (a prefetch) reaches the first call and the retry; no retry once
  // it is aborted.
  async narrate(messages, definition, ratio, { signal, background = false } = {}) {
    const first = await this.callProvider(messages, encounterResponseSchema, 'encounter_narration', definition.character.name, { ...(signal ? { signal } : {}), background });
    this.narrationStats.checked += 1;
    if (!this.lacksTarget(first, definition)) return first;
    this.narrationStats.flagged += 1;
    if (this.stopping || signal?.aborted) { this.narrationStats.kept += 1; return first; }
    const abort = new AbortController();
    const retry = this.callProvider([
      ...messages,
      { role: 'assistant', content: JSON.stringify(first) },
      { role: 'user', content: correctionNote(this.content.language, ratio) },
    ], encounterResponseSchema, 'encounter_narration', definition.character.name,
    { signal: signal ? AbortSignal.any([signal, abort.signal]) : abort.signal, background }).catch(() => null);
    let timer;
    const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve(TIMED_OUT), this.narrationRetryMs); });
    timer.unref?.();
    const second = await Promise.race([retry, deadline]);
    clearTimeout(timer);
    if (second === TIMED_OUT) { abort.abort(); this.narrationStats.timedOut += 1; return first; }
    if (second && !this.lacksTarget(second, definition)) { this.narrationStats.retryPassed += 1; return second; }
    this.narrationStats.kept += 1;
    return first;
  }

  lacksTarget(generated, definition) {
    return lacksTargetLanguage(generated.dialogue.native, generated.dialogue.translation, definition.narrationEntries);
  }

  // Without an encounterId the default encounter starts anywhere (the frozen web client); with one, the player
  // must be at that encounter's location.
  async startEncounter(learnerId, { restart = false, encounterId = null } = {}) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      // Round 076 (critique 1.2): no prefetch starts while a start runs, saving included.
      this.starting.add(learnerId);
      try { return await this._startEncounter(learnerId, restart, encounterId); }
      finally { this.starting.delete(learnerId); }
    });
  }

  async _startEncounter(learnerId, restart, encounterId) {
    {
      const envelope = await this.loadEnvelope(learnerId);
      const definitionId = encounterId ?? this.content.defaultEncounterId;
      const definition = this.content.encounters.get(definitionId);
      if (typeof definitionId !== 'string' || !definition) throw validationError('Unknown encounter.');
      const here = currentLocationId(this.content.world, envelope.world);
      const active = this.encounters.get(learnerId);
      // Round 091 (critique 1.2): a restart of the conversation the server holds works away from its place.
      const restartsHeld = restart && Boolean(active) && this.definition(active) === definition;
      if (definition.encounter.party_of) {
        // Round 022: a party member travels with the player, so their conversation starts anywhere once they have joined.
        // Round 047 (critique 1.3): the member met at the conversation's home, as the snapshot matches them.
        const member = envelope.party.find((candidate) => this.isHomeMember(candidate, definition.encounter.party_of));
        if (!member) {
          throw conflictError(`${definition.character.name} is not in your party yet.`, 'NOT_IN_PARTY');
        }
        // Round 047: a deeper conversation waits for its count of finished conversations.
        if ((definition.encounter.after_conversations ?? 0) > (member.conversations ?? 0)) {
          throw conflictError(`${definition.character.name} is not ready for that conversation yet.`, 'NOT_YET');
        }
      } else {
        if (encounterId !== null && here !== definition.encounter.location && !restartsHeld) {
          throw conflictError(`${definition.character.name} is not here. Walk to ${this.locationName(definition)} first.`, 'NOT_HERE');
        }
        // Round 015: a save from rounds 005–013 may already stand in the Rift; its encounter still waits for the gate.
        const gate = gateFor(this.content.world.locationsById.get(definition.encounter.location), envelope.world);
        if (gate?.sealed) throw conflictError(sealedMessage(this.locationName(definition), gate), 'SEALED');
      }
      const locationId = definition.encounter.party_of ? here : undefined;
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
      // Round 091 (review R1.1 of rounds 017–028, critique 1.1): a named start never replaces another conversation
      // under way; leaving it is a restart start. After the drill check, whose message names it too. The web client's default start (no id) still replaces.
      if (encounterId !== null && !restart && active?.state === 'ongoing' && this.definition(active) !== definition) {
        throw conflictError(`Finish your conversation with ${this.definition(active).character.name} first.`, 'CONVERSATION_UNDER_WAY');
      }
      // Round 087 (review R1.1): greetings for other encounters are no longer needed; they stop holding the provider.
      this.dropGreetings(learnerId, definition.encounter.party_of ? null : greetingKey(learnerId, definition.encounter.id));
      const generated = await this.prefetchedGreeting(learnerId, definition)
        ?? await this.narrate(this.greetingMessages(definition, locationId), definition, this.ratioFor(0, definition));
      const npcMessage = this.canonicalizeNarration(generated, definition);
      const stagedEnvelope = clone(envelope);
      this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), nowIso(this.clock), 'encounter_exposure');
      const encounter = {
        id: randomUUID(), definitionId: definition.encounter.id, version: 1, state: 'ongoing', objectiveIndex: 0, passedObjectiveIds: [],
        committedPlayerTurns: 0, transcript: [npcMessage], reveals: {},
        ...(locationId ? { locationId } : {}),
      };
      await this.storage.save(stagedEnvelope);
      this.encounters.set(learnerId, encounter);
      return { encounter: this.serializeEncounter(encounter), spellbook: this.spellbookSnapshot(stagedEnvelope) };
    }
  }

  // Round 076 (critique 1.6): the greeting's prompt, the same for a start and a prefetch. It depends on content only,
  // which is loaded once for the service's lifetime, so a prefetched greeting is the one the start would ask for.
  greetingMessages(definition, locationId) {
    return buildNarrationMessages({
      language: this.content.language,
      character: definition.character,
      styleGuide: this.content.styleGuide,
      locationName: this.sceneName({ definitionId: definition.encounter.id, locationId }),
      objectives: definition.encounter.objectives,
      vocabularyById: this.content.vocabularyById,
      targetRatio: this.ratioFor(0, definition),
      ambientEntries: definition.ambientEntries,
    });
  }

  // Round 076: a greeting written on arrival, taken once (ready or still being written); null when there is none or
  // its call failed, and the start then asks the provider as before. Never for a party conversation.
  // Round 087 (review R1.2, critique 1.1–1.3): a greeting taken while still being written whose call then timed out
  // fails the start with that timeout (as a plain start's would), instead of a second full wait; one that had already
  // failed before the tap, or failed otherwise, falls back. Only the CLI runner raises `timeout`.
  async prefetchedGreeting(learnerId, definition) {
    if (definition.encounter.party_of) return null;
    const key = greetingKey(learnerId, definition.encounter.id);
    const entry = this.greetings.get(key);
    if (!entry) return null;
    this.greetings.delete(key);
    const pending = !entry.settled;
    const { generated, error } = await entry.promise;
    this.prefetchStats[generated ? 'used' : 'fallback'] += 1;
    if (!generated && pending && error instanceof ProviderError && error.category === 'timeout') throw error;
    return generated ?? null;
  }

  // Round 087 (review R1.1, critique 1.6, 1.8): every way a held greeting goes aborts its call; counted as dropped.
  dropGreeting(key, counter = 'dropped') {
    const entry = this.greetings.get(key);
    if (!entry) return;
    this.greetings.delete(key);
    entry.controller.abort();
    this.prefetchStats[counter] += 1;
  }

  dropGreetings(learnerId, keepKey = null) {
    const prefix = greetingKey(learnerId, '');
    for (const key of [...this.greetings.keys()]) if (key.startsWith(prefix) && key !== keepKey) this.dropGreeting(key);
  }

  // Round 076 (critiques 1.3, 1.7): each committed move (and each launch) replaces the learner's arrival; its timer
  // fires after the dwell.
  scheduleArrival(learnerId, locationId) {
    if (!this.prefetchEnabled || this.stopping) return;
    // Round 087 (review R1.1): the greetings of places left behind go, their calls aborted.
    const encounterHere = this.content.world.locationsById.get(locationId)?.encounter;
    this.dropGreetings(learnerId, encounterHere ? greetingKey(learnerId, encounterHere) : null);
    const previous = this.arrivals.get(learnerId);
    if (previous?.timer) clearTimeout(previous.timer);
    const arrival = { seq: (this.arrivalSeq += 1), locationId, tries: 0, timer: null };
    this.arrivals.set(learnerId, arrival);
    this.prefetchStats.scheduled += 1;
    this.armArrival(learnerId, arrival);
  }

  armArrival(learnerId, arrival) {
    arrival.timer = setTimeout(() => { this.fireArrival(learnerId, arrival).catch(() => {}); }, this.prefetchDwellMs);
    arrival.timer.unref?.();
  }

  endArrival(learnerId, arrival, outcome) {
    if (this.arrivals.get(learnerId) === arrival) this.arrivals.delete(learnerId);
    if (outcome) this.prefetchStats[outcome] += 1;
  }

  // Round 076 (critiques 1.2, 1.5): the arrival must still be the latest; the save is read again and checked as a
  // start would check it; no start running, no session of it, no greeting held; a busy provider is waited out.
  async fireArrival(learnerId, arrival) {
    const latest = () => !this.stopping && this.arrivals.get(learnerId) === arrival;
    if (!latest()) return;
    arrival.timer = null;
    const definition = await this.prefetchTarget(learnerId, arrival.locationId);
    if (!latest()) return;
    if (!definition) { this.endArrival(learnerId, arrival, 'skipped'); return; }
    const key = greetingKey(learnerId, definition.encounter.id);
    const active = this.encounters.get(learnerId);
    if (this.starting.has(learnerId) || this.greetings.has(key) || (active && this.definition(active) === definition)) {
      this.endArrival(learnerId, arrival, 'skipped');
      return;
    }
    // Round 089 (critique 1.1): the prefetch never aborts an atmosphere call; one in flight counts as busy.
    if (this.providerCallsInFlight > 0 || this.atmosphereAborts.size > 0) {
      this.prefetchStats.busy += 1;
      if (arrival.tries < this.prefetchRetries) { arrival.tries += 1; this.armArrival(learnerId, arrival); }
      else this.endArrival(learnerId, arrival, null);
      return;
    }
    this.endArrival(learnerId, arrival, null);
    this.prefetchStats.calls += 1;
    // Round 087 (critique 1.2, 1.4): the entry never rejects and keeps its error; an aborted call is not a failure.
    const controller = new AbortController();
    const entry = { controller, settled: false };
    entry.promise = this.narrate(this.greetingMessages(definition, undefined), definition, this.ratioFor(0, definition), { signal: controller.signal, background: true })
      .then((generated) => ({ generated }), (error) => {
        if (!controller.signal.aborted) this.prefetchStats.failed += 1;
        return { error };
      })
      .then((outcome) => { entry.settled = true; return outcome; });
    this.greetings.set(key, entry);
    while (this.greetings.size > PREFETCH_MAX_GREETINGS) {
      this.dropGreeting(this.greetings.keys().next().value, 'evicted');
    }
  }

  // The encounter a start at this location could open now, or null.
  async prefetchTarget(learnerId, locationId) {
    let envelope;
    try { envelope = await this.storage.load(learnerId); } catch { return null; }
    if (!envelope) return null;
    const { world } = this.content;
    if (currentLocationId(world, envelope.world) !== locationId) return null;
    const location = world.locationsById.get(locationId);
    const definition = location?.encounter ? this.content.encounters.get(location.encounter) : null;
    if (!definition || definition.encounter.party_of) return null;
    if ((envelope.world?.completedEncounterIds ?? []).includes(location.encounter)) return null;
    if (gateFor(location, envelope.world)?.sealed) return null;
    if (definition.encounter.drill_before && this.pendingDrill(envelope)?.encounterId === location.encounter) return null;
    return definition;
  }

  // Round 076 (critique 1.4): a removed learner's arrival and greetings go; round 087: a call still running is aborted.
  forgetPrefetch(learnerId) {
    const arrival = this.arrivals.get(learnerId);
    if (arrival?.timer) clearTimeout(arrival.timer);
    this.arrivals.delete(learnerId);
    this.dropGreetings(learnerId);
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

  // Round 060 (critique 1.3): a replayed receipt carries the kept lines as they are now, not as they were.
  replayWithLines(response, envelope) {
    const replay = { ...response, replayed: true };
    if (replay.spellbook) {
      const current = this.spellbookSnapshot(envelope);
      // Round 082 Amendment 1 (review R1.2): the inscriptions and the drill follow the current place.
      replay.spellbook = { ...replay.spellbook, lines: current.lines, inscriptions: current.inscriptions, drill: current.drill };
    }
    return replay;
  }

  async revealEncounterHelp(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const current = this.encounters.get(learnerId);
      this.validateVersion(current, request.encounterId, request.version);
      if (current.state !== 'ongoing') throw validationError('This encounter no longer has an active learning objective.');
      const objective = this.currentObjective(current);
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
      else this.keepLine(stagedEnvelope, current, activeMessage);
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
        // Round 092 (review R1.2; Amendment 1): the evidence must stand in the answer at word boundaries ("pane"
        // quoted from "panettone" does not); graders may quote words around the form ("No estás sola" for sola).
        const folded = foldEvidenceText(evidence.evidence);
        const inContext = atWordBoundaries(foldEvidenceText(playerInput), folded);
        if (evidenceIds.has(evidence.vocabulary_id)
          || !excerptIds.has(evidence.vocabulary_id)
          || !inContext) {
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
        return this.replayWithLines(existing.response, envelope);
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
        ordered: definition.encounter.objectives_unordered !== true,
      }), gradingResponseSchema, 'dialogue_assessment', 'The language assessor');
      const assessment = this.validateAssessment(gradingRaw, objectives, message);

      // In order: the leading run of passes closes. Unordered (round 045): every passed open objective closes.
      const passedOf = (objective) => assessment.objective_results.find((item) => item.objective_id === objective.id)?.passed === true;
      const unordered = definition.encounter.objectives_unordered === true;
      const closing = [];
      for (const objective of objectives) {
        if (passedOf(objective)) closing.push(objective);
        else if (!unordered) break;
      }
      const passedCount = closing.length;
      const nextObjectiveIndex = current.objectiveIndex + passedCount;
      const nextPassedIds = [...(current.passedObjectiveIds ?? []), ...closing.map((objective) => objective.id)];
      const remaining = unordered
        ? definition.encounter.objectives.filter((objective) => !nextPassedIds.includes(objective.id))
        : definition.encounter.objectives.slice(nextObjectiveIndex);
      const resolved = remaining.length === 0;
      const nextTurns = current.committedPlayerTurns + 1;
      // Round 051 (backlog H1): in order, a pass after a failed objective does not close. It is `held`: not banked,
      // and the narrator is told not to treat it as done. The field is present only when true (pinned prompts).
      const closingIds = new Set(closing.map((objective) => objective.id));
      const heldIds = new Set(unordered ? [] : assessment.objective_results
        .filter((result) => result.passed && !closingIds.has(result.objective_id)).map((result) => result.objective_id));
      const heldMark = (id) => (heldIds.has(id) ? { held: true } : {});
      const decision = {
        objectiveResults: assessment.objective_results.map(({ objective_id, passed }) => ({ objectiveId: objective_id, passed, ...heldMark(objective_id) })),
        encounterState: resolved ? 'resolved' : 'ongoing',
        nextObjectiveId: remaining[0]?.id ?? null,
        ...(heldIds.size ? { held_note: HELD_NOTE } : {}),
      };
      // Round 045 (critique 1.5): in an unordered encounter, help taken on the current objective may serve any open
      // objective, so a reveal caps the quality of every objective graded this turn (round 092: ordered ones too). Round 070 (critique 1.8): the
      // effective qualities and the response's assessment block are computed before the reply, once.
      const anyReveal = objectives.some((objective) => (current.reveals[objective.id] ?? []).length > 0);
      for (const result of assessment.objective_results) {
        // Round 092 (review R1.6): in an ordered encounter only the current objective can have reveals, and help on its
        // line helps every objective the turn closes, so the cap is the same condition for both kinds.
        const assisted = anyReveal;
        for (const evidence of result.vocabulary_evidence) evidence.effective_quality = capAssistedQuality(evidence.quality, assisted);
      }
      const responseAssessment = {
        overallFeedback: assessment.overall_feedback,
        objectiveResults: assessment.objective_results.map((result) => ({
          objectiveId: result.objective_id, passed: result.passed, ...heldMark(result.objective_id), feedback: result.feedback,
          vocabularyEvidence: result.vocabulary_evidence.map((evidence) => ({
            vocabularyId: evidence.vocabulary_id, evidence: evidence.evidence,
            quality: evidence.quality, effectiveQuality: evidence.effective_quality,
          })),
        })),
      };
      // Round 070: the verdict is readable through progress() while the reply is written; this run removes only its
      // own entry, inside the lock (critique 1.4).
      const run = {};
      this.turnProgress.set(learnerId, { run, attemptId: String(request.attemptId), assessment: clone(responseAssessment) });
      try {
        const history = current.transcript.map((item) => item.role === 'player'
          ? { role: 'user', content: item.text }
          : { role: 'assistant', content: item.dialogue.native });
        const generated = await this.narrate(buildNarrationMessages({
          language: this.content.language,
          character: definition.character,
          styleGuide: this.content.styleGuide,
          locationName: this.sceneName(current),
          objectives: remaining,
          vocabularyById: this.content.vocabularyById,
          conversationHistory: history,
          playerInput: message,
          targetRatio: this.ratioFor(nextTurns, definition),
          decision,
          ambientEntries: definition.ambientEntries,
        }), definition, this.ratioFor(nextTurns, definition));

        const stagedEnvelope = clone(envelope);
        const stagedEncounter = clone(current);
        const timestamp = nowIso(this.clock);
        const advancedObjectiveIds = new Set(closing.map((objective) => objective.id));
        for (const result of assessment.objective_results) {
          for (const evidence of result.vocabulary_evidence) {
            this.discover(stagedEnvelope, [evidence.vocabulary_id], timestamp, 'dialogue_assessment');
            const item = this.findItem(stagedEnvelope, evidence.vocabulary_id);
            const effectiveQuality = evidence.effective_quality;
            item.evidence.push({ at: timestamp, kind: 'dialogue', objectiveId: result.objective_id, quality: effectiveQuality, passed: result.passed });
            if (advancedObjectiveIds.has(result.objective_id) && result.passed && isDue(item.schedule, this.clock())) {
              item.schedule = scheduleReview(item.schedule, effectiveQuality, this.clock());
            }
          }
        }
        const previousNpc = [...current.transcript].reverse().find((item) => item.role === 'npc');
        const npcMessage = this.canonicalizeNarration(generated, definition, previousNpc, remaining);
        this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), timestamp, 'encounter_exposure');
        stagedEncounter.transcript.push({ id: randomUUID(), role: 'player', text: message }, npcMessage);
        stagedEncounter.objectiveIndex = nextObjectiveIndex;
        stagedEncounter.passedObjectiveIds = nextPassedIds;
        stagedEncounter.committedPlayerTurns = nextTurns;
        stagedEncounter.state = resolved ? 'resolved' : 'ongoing';
        stagedEncounter.version += 1;
        // Round 028: progress is recorded before the response is built, so the resolving turn's spellbook already
        // holds the encounter's containment file.
        if (resolved && definition.encounter.party_of) {
          // Round 022: a party conversation counts towards the member, not the map (the Rift gate is unchanged).
          const member = stagedEnvelope.party.find((candidate) => this.isHomeMember(candidate, definition.encounter.party_of));
          if (member) member.conversations = (member.conversations ?? 0) + 1;
        } else if (resolved && !stagedEnvelope.world.completedEncounterIds.includes(definition.encounter.id)) {
          stagedEnvelope.world.completedEncounterIds.push(definition.encounter.id);
        }
        const response = {
          encounter: this.serializeEncounter(stagedEncounter),
          assessment: responseAssessment,
          spellbook: this.spellbookSnapshot(stagedEnvelope, stagedEncounter),
          replayed: false,
        };
        stagedEnvelope.spellbook.processedAssessments[request.attemptId] = {
          kind: 'dialogue', payloadHash: fingerprint, committedAt: timestamp, response: withoutLines(response),
        };
        await this.storage.save(stagedEnvelope);
        this.encounters.set(learnerId, stagedEncounter);
        return response;
      } finally {
        if (this.turnProgress.get(learnerId)?.run === run) this.turnProgress.delete(learnerId);
      }
    });
  }

  // Round 070 (backlog I1): the validated verdict of the turn under way, while its reply is written. Not serialized:
  // it answers while the turn holds the learner's lock. No save, no provider; null unless the attempt id matches.
  progress(learnerId, attemptId) {
    // Round 075 (critique 1.1): compared as a string, untrimmed, so a numeric id matches and " abc " is not "abc".
    const id = String(attemptId ?? '');
    if (!id.trim()) throw validationError('An attempt ID is required.');
    const entry = this.turnProgress.get(learnerId);
    return { progress: { attemptId: id, assessment: entry && entry.attemptId === id ? clone(entry.assessment) : null } };
  }

  // Round 027: the philosophy statement; the same for every learner, so no learner id is needed.
  getOnboarding() {
    const { title, statement, notes, beginLabel } = this.content.onboarding;
    return { onboarding: { title, statement, notes: [...notes], beginLabel } };
  }

  async getWorld(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    return { world: this.worldView(envelope.world) };
  }

  worldView(progress) { return worldSnapshot(this.content.world, progress, this.content.encounters, this.content.inscriptionsByLocation ?? new Map()); }

  async moveTo(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const { progress, changed } = applyMove(this.content.world, envelope.world, request.locationId);
      // Round 082: the Spellbook comes along (a new place's inscription, the Rift's drill), from the staged save.
      if (!changed) return { world: this.worldView(envelope.world), spellbook: this.spellbookSnapshot(envelope) };
      const stagedEnvelope = clone(envelope);
      stagedEnvelope.world = progress;
      await this.storage.save(stagedEnvelope);
      this.scheduleArrival(learnerId, progress.currentLocationId);
      return { world: this.worldView(progress), spellbook: this.spellbookSnapshot(stagedEnvelope) };
    });
  }

  // Round 053 (backlog A10): an English line of atmosphere for the current location, or null. Never an error for
  // the provider's sake: the static description is always shown. Off unless switched on (the CLI runner is serial);
  // skipped while an encounter call is in flight. Cached by state (not by learner) for the server's lifetime; a
  // failure is cached as null for ATMOSPHERE_RETRY_MS. Every drop is traced in atmosphereStats.
  async getAtmosphere(learnerId) {
    const envelope = await this.loadEnvelope(learnerId);
    if (!this.atmosphereEnabled) return { atmosphere: null };
    const { world } = this.content;
    const locationId = currentLocationId(world, envelope.world);
    const location = world.locationsById.get(locationId);
    const encounter = location.encounter ? this.content.encounters.get(location.encounter) : null;
    const done = new Set(envelope.world?.completedEncounterIds ?? []);
    const state = !encounter ? 'none' : done.has(location.encounter) ? 'complete' : 'open';
    const party = [...new Set(this.partySnapshot(envelope).map((member) => {
      const species = this.content.encounters.get(member.encounterId)?.character.species;
      return species ? `${member.name} (${species})` : member.name;
    }))].sort();
    const key = JSON.stringify([this.content.language.code, locationId, state, party]);
    const result = (text) => ({ atmosphere: text ? { locationId, text } : null });
    if (this.atmosphereLines.has(key)) return result(this.atmosphereLines.get(key));
    const failedUntil = this.atmosphereFailures.get(key);
    if (failedUntil !== undefined && new Date(this.clock()).getTime() < failedUntil) return result(null);
    if (!this.atmosphereCalls.has(key)) {
      // Review 1: busy is not cached, so the reply says when to ask again.
      if (this.providerCallsInFlight > 0) { this.dropAtmosphere('busy', locationId); return { ...result(null), retryAfterMs: ATMOSPHERE_BUSY_RETRY_MS }; }
      // Round 089 (decision 3): a valid line is kept even if the abort came late; an aborted call without one is
      // not a failure, and every request sharing it is told when to ask again.
      const controller = new AbortController();
      this.atmosphereAborts.add(controller);
      const call = this.writeAtmosphere(location, state, encounter?.character ?? null, party, controller.signal)
        .then((outcome) => {
          if (outcome.text) { this.atmosphereLines.set(key, outcome.text); this.atmosphereFailures.delete(key); }
          else if (!outcome.aborted) this.atmosphereFailures.set(key, new Date(this.clock()).getTime() + ATMOSPHERE_RETRY_MS);
          return outcome;
        })
        .finally(() => { this.atmosphereCalls.delete(key); this.atmosphereAborts.delete(controller); });
      this.atmosphereCalls.set(key, call);
    }
    const outcome = await this.atmosphereCalls.get(key);
    return outcome.aborted && !outcome.text ? { ...result(null), retryAfterMs: ATMOSPHERE_BUSY_RETRY_MS } : result(outcome.text);
  }

  abortAtmosphere() {
    for (const controller of this.atmosphereAborts) controller.abort();
    this.atmosphereAborts.clear();
  }

  dropAtmosphere(reason, locationId, excerpt) {
    this.atmosphereStats.drops.push({ reason, locationId, ...(excerpt ? { excerpt } : {}) });
    if (this.atmosphereStats.drops.length > 50) this.atmosphereStats.drops.shift();
  }

  async writeAtmosphere(location, state, character, party, signal) {
    const outcome = await this.atmosphereLine(location, state, character, party, signal);
    return { text: outcome, aborted: signal?.aborted === true };
  }

  async atmosphereLine(location, state, character, party, signal) {
    const who = character ? `${character.name}, ${/^[aeiou]/i.test(character.species) ? 'an' : 'a'} ${character.species},` : null;
    const facts = {
      none: 'Nobody here wants to talk to the player.',
      open: `${who} is here and has not been won over yet.`,
      complete: `The player has already won over ${who} here.`,
    };
    let messages;
    const detail = atmosphereDetail(this.content.world, location.id, state);
    try { messages = buildAtmosphereMessages({ language: this.content.language, styleGuide: this.content.styleGuide, location, state: facts[state], partyNames: party, detail }); }
    catch { this.dropAtmosphere('build', location.id); return null; } // review 1: never a 500
    this.atmosphereStats.calls += 1;
    let reply;
    try { reply = await this.provider.structuredChat(messages, locationAtmosphereSchema, { schemaName: 'location_atmosphere', temperature: 0.7, ...(signal ? { signal } : {}) }); }
    catch {
      if (signal?.aborted) { this.atmosphereStats.aborted += 1; this.dropAtmosphere('aborted', location.id); }
      else this.dropAtmosphere('provider', location.id);
      return null;
    }
    const parsed = locationAtmosphereSchema.safeParse(reply);
    if (!parsed.success) { this.dropAtmosphere('schema', location.id); return null; }
    const text = parsed.data.atmosphere.trim().replace(/\s+/g, ' ');
    if (!text || text.length > ATMOSPHERE_MAX_LENGTH) { this.dropAtmosphere('length', location.id); return null; }
    // No form of a pack entry (it teaches nothing and gives nothing away), unless it is a word of the location's own
    // description (round 053 critique 1.1), which the map card already shows. Round 089: no English exemptions.
    const ownWords = new Set(foldForAtmosphere(location.description).split(' '));
    const hit = matchCanonicalVocabulary(text, this.content.vocabulary.entries)
      .find((match) => !foldForAtmosphere(match.excerpt).split(' ').every((word) => ownWords.has(word)));
    if (hit) { this.dropAtmosphere('vocabulary', location.id, hit.excerpt); return null; }
    return text;
  }

  // Round 021: the party. Members whose encounter is not in the loaded pack stay in the save but are not shown.
  partySnapshot(envelope) {
    const active = this.encounters.get(envelope.learnerId);
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
        ...this.conversationOffer(member, active),
        ...this.storyProgress(member),
      }];
    });
  }

  // Round 047 (backlog G4): the conversation Talk starts and its tier (the threshold, 0 for the first): the deepest
  // unlocked one, unless an unresolved party conversation of this member is under way (critique 1.1: Talk resumes it).
  conversationOffer(member, active) {
    const ongoing = this.inEncounter(active) && this.definition(active).encounter.party_of === member.encounterId
      ? this.definition(active) : null;
    const definition = ongoing ?? this.partyConversationFor(member.encounterId, member.conversations ?? 0);
    return {
      conversationId: definition?.encounter.id ?? null,
      conversationTier: definition?.encounter.after_conversations ?? 0,
    };
  }

  // Round 043 (critique 1.1): one rule for "this party member was met at that encounter", shared by the Spellbook's
  // conversation fragments and the Party screen's hint: the same encounter and its character.
  isHomeMember(member, homeId) {
    const definition = this.content.encounters.get(homeId);
    return Boolean(definition) && member.encounterId === homeId && member.characterId === definition.character.id;
  }

  // Round 043 (backlog G1): the Party screen's hint. The member's conversation fragments are those found after its
  // home encounter with `after_conversations` (matched by encounter, as journeyFragments does). `nextStoryAt` is the
  // smallest threshold not yet reached (null when none is left); `storiesTold` counts those reached. Derived.
  storyProgress(member) {
    const count = member.conversations ?? 0;
    const thresholds = this.content.fragments
      .filter((fragment) => fragment.after_conversations !== undefined && this.isHomeMember(member, fragment.found_after))
      .map((fragment) => fragment.after_conversations);
    const ahead = thresholds.filter((at) => at > count);
    return { nextStoryAt: ahead.length ? Math.min(...ahead) : null, storiesTold: thresholds.length - ahead.length };
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
        return this.replayWithLines(existing.response, envelope);
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
        kind: 'review', payloadHash: fingerprint, committedAt: timestamp, response: withoutLines(response),
      };
      await this.storage.save(stagedEnvelope);
      this.reviewChallenges.get(learnerId).delete(request.challengeId);
      return response;
    });
  }

  async shutdown() {
    // Round 076 (critique 1.4): no prefetch timer outlives the service, and none is scheduled after this.
    this.stopping = true;
    for (const arrival of this.arrivals.values()) if (arrival.timer) clearTimeout(arrival.timer);
    this.arrivals.clear();
    for (const key of [...this.greetings.keys()]) this.dropGreeting(key); // round 087
    await this.provider.shutdown?.();
  }
}
