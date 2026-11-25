import { createHash, randomUUID } from 'node:crypto';
import { beginnerGradingResponseSchema, gradingResponseSchema, encounterResponseSchema, lightTurnSchema, locationAtmosphereSchema } from './llm/schemas.js';
import { buildAtmosphereMessages, buildGradingMessages, buildNarrationMessages } from './llm/prompt-builder.js';
import {
  IMMERSION, calculateTargetRatio, capAssistedQuality, gradeVocabularyAnswer, immersionFrom, initialSchedule,
  foldEvidenceText, isDue, lacksTargetLanguage, levelFor, masteryLabel, matchCanonicalVocabulary, progressionView, ratioBonusFor, scheduleReview,
} from './language-engine.js';
import { foldWords, worldFor } from './content-loader.js';
import { LINE_LIMIT, LINE_TEXT_LIMIT, assertLearnerId, createLearnerEnvelope } from './learning-storage.js';
import { AppError, conflictError, retryableError, validationError } from './errors.js';
import { characterExcuse } from './llm/excuse.js';
import { ProviderError } from './llm/provider-error.js';
import { applyMove, currentLocationId, gateFor, sealedMessage, visitedSet, worldSnapshot } from './world.js';
import { cleared as clearedSite, freshRun, gateFor as gateOfSite, isComplete, moveProblem, moved, readRun, siteOf, siteStates } from './dungeon.js';
import { roadMethods } from './road/service.js';
import { entriesFor, passageView, selectPassage, toSegments, truthIds } from './narration.js';
import { weatherAt } from './road/weather.js';

// Round 051 (critique 1.3): told to the narrator when a pass is held (see submitDialogue).
export const HELD_NOTE = 'A held objective was said correctly but does not count: an earlier objective comes first. Do not celebrate it or treat it as done, and do not give its answer; the player must say it again after the earlier objective.';

// Round 078: appended once, after the rejected reply, when a narration line had no target language (see narrate). It
// asks for the turn's share and demands no English, since the share can reach 100% (critique 1.4).
export const NARRATION_RETRY_MS = 20_000;
// Round 121: what earns experience: an objective a turn closes, a conversation that resolves, a correct due review.
export const XP = Object.freeze({ objective: 10, resolve: 25, review: 5 });
const TIMED_OUT = Symbol('timed out');
// Round 097 (critique 1.4): the correction's first word, which play-market uses to tell a retry from a first call.
export const CORRECTION_PREFIX = 'CORRECTION:';
export function correctionNote(language, ratio) {
  return `${CORRECTION_PREFIX} in your reply above, dialogue.native has no ${language.name} in it: every word is also in its translation. Write the reply again for the same turn, following every rule above; dialogue.native must be about ${Math.round(ratio * 100)}% ${language.name}, as the LANGUAGE RULES require.`;
}

export const ATMOSPHERE_MAX_LENGTH = 300;
export const FOOTNOTE_MAX_LENGTH = 200; // round 081
// Round 129: beginner mode. A conversation's hearts, each of which pays for one corrected answer, and the longest
// correction kept. CORRECTED_NOTE is told to the narrator when a correction closed an objective.
// Round 130: the narration's tappable words. A listed word is kept when it is short, has a short meaning and stands
// in the narration; at most this many.
export const NARRATIVE_WORDS = Object.freeze({ max: 12, word: 40, meaning: 80 });
export const BEGINNER_HEARTS = 3;
// Round 159: the save's `told` keeps a character's revelation under this prefix and the encounter's id.
export const REVELATION_PREFIX = 'revelation_';
// Round 153: the quality recorded for a target the player wrote in a light turn: said, with nobody having checked how well.
export const LIGHT_QUALITY = 4;
// Round 154: a light conversation is an exchange of this many of the player's turns. Before `min` it goes on even
// when every objective is met; from `min` it ends once none is open; at `max` it ends whatever is open.
// Round 174: every conversation, strict or light, authored or on the road, is complete on the player's third reply
// (strict, sooner when every objective is met). After that the player may keep chatting: such a turn is answered and
// changes nothing (no marks, no Spellbook, no XP, no curriculum).
export const EXCHANGE_LIMIT = 3;
export const LIGHT_EXCHANGE = Object.freeze({ min: 3, max: 5 }); // round 154; under the limit of round 174, both are 3
const LIGHT_ENDING = Object.freeze({
  // Round 177: a player's own goodbye is answered (the playtest found it refused); the character never ends it first.
  go_on: 'Not yet: the conversation goes on after this reply, whatever has been met. Do not end it yourself. If the player says goodbye, say goodbye back warmly and ask nothing more.',
  if_done: 'If no objective is left open after this answer, this reply is the last of the conversation: wind it up warmly, as the character would, and ask nothing more. Otherwise the conversation goes on.',
  now: 'Now: this reply is the last of the conversation, whatever is still open. Wind it up warmly, as the character would, and ask nothing more.',
});
// Round 177: two texts that differ only in accents, apostrophes, capitals, punctuation or spacing.
export function sameLetters(a, b) {
  const fold = (text) => String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/œ/gu, 'oe').replace(/æ/gu, 'ae').replace(/[^\p{L}\p{N}]+/gu, ''); // round 181: ligatures
  return fold(a) !== '' && fold(a) === fold(b);
}
export const CORRECTION_MAX_LENGTH = 600; // round 131: an answer may be a paragraph (300 before)
const CORRECTED_NOTE = 'An objective marked corrected was said with slips, or in English; the player was understood and has been shown the correct form. Treat it as met. Answer what the player meant. Do not mock the slips, do not remark on which language the player used, and do not repeat the correction.';

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
// Round 082 Amendment 1 (review R1.2): the inscriptions too. Round 093 (critique 1.4): the whole Spellbook, which
// grows with the cards; a replay carries the Spellbook as it is now.
// Round 121 (critique 1.5): nor the progression, which a replay takes from the save as it is now; `xpGained`, what
// that attempt earned, stays.
function forReceipt(response) {
  if (!response || !('spellbook' in response)) return response;
  const { spellbook, progression, ...rest } = response;
  return rest;
}
// Round 093 (critique Optional): only a receipt of the save's own, never an inherited property ("constructor").
const receiptOf = (envelope, attemptId) => {
  const processed = envelope.spellbook.processedAssessments;
  return Object.hasOwn(processed, String(attemptId)) ? processed[String(attemptId)] : undefined;
};

// Round 076: how long the player stays at a place before its greeting is written, how often a busy provider is
// waited out, and how many greetings are kept in all.
export const PREFETCH_DWELL_MS = 1500;
export const PREFETCH_RETRIES = 3;
export const PREFETCH_MAX_GREETINGS = 100;
const greetingKey = (learnerId, definitionId) => `${learnerId}\u0000${definitionId}`;

export class LearningService {
  constructor({ provider, storage, content, clock = () => new Date(), atmosphere = false, prefetch = false, prefetchDwellMs = PREFETCH_DWELL_MS, prefetchRetries = PREFETCH_RETRIES, narrationRetryMs = NARRATION_RETRY_MS, seedSource = null, exchangeLimit = EXCHANGE_LIMIT }) {
    this.provider = provider;
    // Round 174: the player's replies after which a conversation is complete (the tests of long scenarios raise it).
    this.exchangeLimit = exchangeLimit;
    // Round 144: where a new road's seed comes from (a test fixes it), and one lookup for a vocabulary id: the pack's
    // entries first, then the curriculum's own (road/curriculum.js keeps them apart from the pack's).
    this.seedSource = seedSource;
    this.lookup = { get: (id) => this.content.vocabularyById.get(id) ?? this.content.curriculum?.vocabulary.byId.get(id) };
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
  // Round 144: a conversation of The Journey 2 has no authored definition: it is built from the session's road
  // data (road/service.js), the same one every time.
  definition(session) {
    if (session?.road) return this.roadDefinition(session.road);
    return this.content.encounters.get(session?.definitionId ?? this.content.defaultEncounterId);
  }

  // Round 144: a vocabulary entry's content version, the pack's or the curriculum's; and every entry of both, for
  // the checks that look for a learner's cards in a text.
  entryVersion(id) { return this.content.entryVersion(id) ?? this.content.curriculum?.vocabulary.versionOf(id); }
  allEntries() {
    this.everyEntry ??= [...this.content.vocabulary.entries, ...(this.content.curriculum?.vocabulary.entries ?? [])];
    return this.everyEntry;
  }

  // Round 121: `bonus` is the level's addition to the base ratio, taken when the conversation starts (a session's
  // ratioBonus). The existing cap of 1 applies to the sum.
  // Round 148: `immersion` is the share the player chose (a session's `immersion`); it replaces the content's.
  ratioFor(turns, definition = this.definition(null), bonus = 0, immersion = null) {
    if (immersion !== null) return immersion;
    return calculateTargetRatio(
      definition.character.language_profile.base_target_ratio + bonus,
      definition.encounter.escalation.target_ratio_increase_per_turn,
      turns,
    );
  }

  // Round 121: the learner's experience and the level it makes.
  // Round 148: the share a request asks for, or null. A share that is not one is refused.
  immersionOf(value) {
    const immersion = immersionFrom(value);
    if (immersion === undefined) throw validationError(`immersion must be a number from ${IMMERSION.min} to ${IMMERSION.max}.`);
    return immersion;
  }
  // What the narrator's prompt takes from a session's share: the ratio, and whether the lines are wholly target language.
  shareOf(turns, definition, session) {
    const immersion = session?.immersion ?? null;
    return { targetRatio: this.ratioFor(turns, definition, session?.ratioBonus ?? 0, immersion), ...(immersion !== null && immersion >= IMMERSION.full ? { full: true } : {}) };
  }

  // Round 156 (issue #6): the narrator's written passage for something that happened (narration.js), or null. It is
  // marked as told in the envelope given, which the caller saves (or does not: a passage of a view that writes
  // nothing is chosen again the same way). `pick` chooses among passages that fit equally.
  tell(envelope, event, pick = 0) {
    this.enterGuide(envelope, event);
    const passage = selectPassage(this.content.passages ?? [], event, { told: envelope.told ?? {}, pick });
    if (passage && !Object.hasOwn(envelope.told ?? {}, passage.id)) envelope.told = { ...(envelope.told ?? {}), [passage.id]: nowIso(this.clock) };
    // Round 158 (issue #4): a passage with an untranslatable text in it; the guidebook has an entry for the first.
    if (passage && truthIds(passage.text).length) this.enterGuide(envelope, { event: 'truth_shown' });
    return passage;
  }
  // Round 158: what turns a written text into segments: the pack's untranslatable texts and the language's tag.
  get narrationPack() { return { truths: this.content.truths ?? new Map(), lang: this.content.language.tag }; }
  // Round 157 (issue #5): the guidebook. What happened may enter entries (content/narration/guidebook.yaml): each is
  // entered once, unread, in the envelope given, which the caller saves. Returns whether any was entered.
  enterGuide(envelope, event) {
    const entering = entriesFor(this.content.guide ?? [], event, envelope.guidebook ?? {});
    if (!entering.length) return false;
    const at = nowIso(this.clock);
    envelope.guidebook = { ...(envelope.guidebook ?? {}), ...Object.fromEntries(entering.map((entry) => [entry.id, { at, read: false }])) };
    return true;
  }
  guideEntry(entry, record) { return { id: entry.id, title: entry.title, segments: toSegments(entry.text, this.narrationPack), at: record.at, unread: !record.read }; }
  // Round 158 (issue #4): the passages told to this learner that hold an untranslatable text, oldest first, so that
  // a text met early can be read again when more of the language is known.
  guideFragments(envelope) {
    // Round 159: and what a character uttered after an encounter (kept under REVELATION_PREFIX + the encounter's id).
    const sourceOf = (id) => {
      if (!id.startsWith(REVELATION_PREFIX)) return this.content.passagesById?.get(id) ?? null;
      const text = this.content.encounters.get(id.slice(REVELATION_PREFIX.length))?.encounter.revelation?.text;
      return text ? { id, text } : null;
    };
    return Object.entries(envelope.told ?? {})
      .map(([id, at]) => ({ passage: sourceOf(id), at }))
      .filter(({ passage }) => passage && truthIds(passage.text).length)
      .sort((a, b) => a.at.localeCompare(b.at) || a.passage.id.localeCompare(b.passage.id))
      .map(({ passage, at }) => ({ ...passageView(passage, this.narrationPack), at }));
  }
  // Round 159 (issue #7): what a character utters once its encounter is completed, as the client is sent it; null
  // for an encounter without one. It is kept in the save's `told` under this id, for the guidebook.
  revelationOf(definition) {
    const text = definition.encounter.revelation?.text;
    return text ? { id: `${REVELATION_PREFIX}${definition.encounter.id}`, segments: toSegments(text, this.narrationPack) } : null;
  }
  guidebookView(envelope) {
    return { guidebook: { entries: this.guideEntries(envelope), total: (this.content.guide ?? []).length, fragments: this.guideFragments(envelope) } };
  }
  // The learner's entries, in the order they were entered (the file's order within one moment).
  guideEntries(envelope) {
    const have = envelope.guidebook ?? {};
    return (this.content.guide ?? []).filter((entry) => Object.hasOwn(have, entry.id))
      .map((entry, index) => ({ entry: this.guideEntry(entry, have[entry.id]), index }))
      .sort((a, b) => a.entry.at.localeCompare(b.entry.at) || a.index - b.index).map(({ entry }) => entry);
  }
  // What every view of a place carries: how many entries the learner has, and those not yet read, to be told there.
  guidebookNote(envelope) {
    const entries = this.guideEntries(envelope);
    return { count: entries.length, unread: entries.filter((entry) => entry.unread) };
  }
  async getGuidebook(learnerId) {
    return this.guidebookView(await this.loadEnvelope(learnerId));
  }
  // The guidebook was opened: every entry is read.
  async readGuidebook(learnerId) {
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      if (!Object.values(envelope.guidebook ?? {}).some((entry) => !entry.read)) return this.getGuidebook(learnerId);
      const staged = clone(envelope);
      for (const entry of Object.values(staged.guidebook)) entry.read = true;
      await this.storage.save(staged);
      return this.guidebookView(staged);
    });
  }

  // A passage by its id, as the client is sent it; null for none or one the content no longer has.
  toldView(passageId) { return passageView(this.content.passagesById?.get(passageId) ?? null, this.narrationPack); }

  progression(envelope) { return progressionView(envelope.progression?.xp ?? 0); }
  level(envelope) { return levelFor(envelope.progression?.xp ?? 0); }

  // Round 045 (backlog G3): the objectives still open, in authored order. In order (the default), those from the index
  // on; unordered, every objective not yet passed. The current objective is the first open one.
  activeObjectives(session) {
    const { objectives, objectives_unordered: unordered } = this.definition(session).encounter;
    // Round 153: a light turn may close an objective out of order; from then on the session goes by what was passed.
    if (!unordered && !session.loose) return objectives.slice(session.objectiveIndex);
    const passed = new Set(session.passedObjectiveIds ?? []);
    return objectives.filter((objective) => !passed.has(objective.id));
  }

  currentObjective(session) { return this.activeObjectives(session)[0] ?? null; }

  locationName(definition) { return this.content.world.locationsById.get(definition.encounter.location)?.name ?? definition.encounter.location; }

  // Round 022: a party conversation is set wherever the player stood when it began; other encounters at their location.
  sceneLocationId(session) { return session?.locationId ?? this.definition(session).encounter.location; }

  sceneName(session) { return this.definition(session).scene?.name ?? this.content.world.locationsById.get(this.sceneLocationId(session))?.name ?? this.sceneLocationId(session); }

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
      const entry = this.lookup.get(vocabularyId);
      if (!entry) continue;
      const bucket = entry.kind === 'phrase' ? envelope.spellbook.phrases : envelope.spellbook.words;
      if (bucket[vocabularyId]) continue;
      bucket[vocabularyId] = {
        vocabularyId,
        contentVersion: this.entryVersion(vocabularyId),
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

  isCurrent(item) { return Boolean(this.lookup.get(item.vocabularyId)) && item.contentVersion === this.entryVersion(item.vocabularyId); }

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
        const entry = this.lookup.get(item.vocabularyId);
        if (!entry || item.contentVersion !== this.entryVersion(entry.id)) return null;
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
      const lists = this.entryAnswerLists(this.lookup.get(card.vocabularyId));
      card.formCardIds = order.filter((id) => lists.form.has(id));
      card.exampleCardIds = order.filter((id) => lists.example.has(id));
    }
    const inEncounter = this.inEncounter(encounter);
    // Round 106 (round 104 R1.7): the payload withholds what the screens hide (the app's cardState and cardWaits,
    // at snapshot time): no meanings or note during an encounter, on a due card, or while a card in its own form is
    // due; no example English then either, or while a card in the example is due. The clients keep their clock checks.
    const due = new Set(cards.filter((card) => card.due).map((card) => card.vocabularyId));
    for (const card of cards) {
      const meaning = inEncounter || card.due || card.formCardIds.some((id) => due.has(id));
      const example = meaning || card.exampleCardIds.some((id) => due.has(id));
      card.withheld = { meaning, example };
      if (meaning) { card.meanings = null; card.note = null; }
      if (example && card.example) card.example = { ...card.example, english: null };
    }
    return {
      cards, dueCount: cards.filter((card) => card.due).length, contentVersion: this.content.vocabulary.version,
      inEncounter, containmentFiles: this.containmentFiles(envelope, inEncounter),
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

  // Round 144: with the curriculum's vocabulary this runs over many more entries, so each entry is first tried
  // cheaply: only one whose form (or, for an inflection, whose stem) stands somewhere in the text is read precisely.
  // The result is the same as reading every entry precisely.
  entryIdsIn(text) {
    this.entryForms ??= this.allEntries().map((entry) => {
      const forms = entry.surface_variants.map((form) => foldWords(form).trim()).filter(Boolean);
      return { entry, forms, stems: forms.filter((form) => form.length >= 4 && !form.includes(' ')).map((form) => form.slice(0, -1)) };
    });
    const folded = foldWords(text);
    const words = folded.trim().split(' ');
    return new Set(this.entryForms
      .filter(({ entry, forms, stems }) => (forms.some((form) => folded.includes(form.split(' ')[0])) && matchCanonicalVocabulary(text, [entry]).length)
        || (stems.some((stem) => words.some((word) => word.startsWith(stem))) && inflectsForms(text, entry.surface_variants)))
      .map(({ entry }) => entry.id));
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
  containmentFiles(envelope, inEncounter = false) {
    const completed = new Set(envelope.world?.completedEncounterIds ?? []);
    return [...this.content.encounters.values()]
      .filter(({ encounter }) => encounter.containment_file && completed.has(encounter.id))
      .map(({ encounter }) => {
        const { designation, name, class: hazardClass, notes, annex, ...properties } = encounter.containment_file;
        return {
          encounterId: encounter.id, locationName: this.content.world.locationsById.get(encounter.location).name,
          designation, name, class: hazardClass, properties, notes: [...notes],
          ...(annex ? { annex: this.annexSnapshot(envelope, annex, inEncounter) } : {}),
        };
      })
      .sort((a, b) => a.designation.localeCompare(b.designation));
  }

  // Round 111 (backlog B8): a redacted annex. Unread, the payload holds no text, only the companion's redaction (which
  // states the cost). Read, the text shows at any time (it holds no answer: server test); the translation and
  // glossary wait out an encounter, as a fragment's do. `strainPending` while the read's cost is not yet spent.
  annexSnapshot(envelope, annex, inEncounter) {
    const record = (envelope.annexes ?? []).find((candidate) => candidate.id === annex.id) ?? null;
    const read = Boolean(record);
    return {
      id: annex.id, title: annex.title, redaction: annex.redaction, read, readAt: record?.readAt ?? null,
      strainPending: read && record.strainSpentOn === null, hidden: inEncounter,
      // Round 112 (review R1.1): 0 when this read strains the next conversation, 1 the one after, …; null if none.
      strainQueue: read && record.strainSpentOn === null ? this.pendingStrainIds(envelope).indexOf(annex.id) : null,
      text: read ? annex.text : null,
      translation: read && !inEncounter ? annex.translation : null,
      glossary: read && !inEncounter ? annex.glossary.map((entry) => ({ ...entry })) : null,
      exposureNote: read ? annex.exposure_note : null,
    };
  }

  // The annexes of the pack, by id, with the encounter whose containment file holds each.
  annexById(annexId) {
    for (const { encounter } of this.content.encounters.values()) {
      if (encounter.containment_file?.annex?.id === annexId) return { annex: encounter.containment_file.annex, encounter };
    }
    return null;
  }

  // Round 111: the companion's strain is pending while a read annex of this pack has not yet cost a finished
  // conversation (critique 1.6: an id no longer in the content neither strains nor is spent, so it can never strain
  // for good). The ids, so a session spends only the reads that strained it (critique 1.7).
  pendingStrainIds(envelope) {
    return (envelope.annexes ?? []).filter((record) => record.strainSpentOn === null && this.annexById(record.id)).map((record) => record.id);
  }

  // Round 111: an objective's hint limit, one fewer (floor 0) in a session started while the strain was pending.
  // Round 112 (review R1.9): the objective's own limit, shown as `baseLimit`.
  baseHintLimit(objective) {
    return objective?.hint_limit ?? 0;
  }

  hintLimit(session, objective) {
    const limit = this.baseHintLimit(objective);
    return session?.strained ? Math.max(0, limit - 1) : limit;
  }

  // Round 111: read a redacted annex anyway. Not during an encounter (the companion holds the redaction then, and
  // the cost must not land mid-conversation), not before its containment file is filed; a second read changes nothing.
  async readAnnex(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const annexId = request?.annexId;
      const found = typeof annexId === 'string' ? this.annexById(annexId) : null;
      if (!found) throw new AppError('There is no such annex.', { status: 404, code: 'NOT_FOUND' });
      if (!(envelope.world?.completedEncounterIds ?? []).includes(found.encounter.id)) {
        throw conflictError('That containment file has not been filed yet.', 'NOT_FILED');
      }
      if (this.inEncounter(this.encounters.get(learnerId))) {
        throw conflictError('Your companion keeps the redaction in place while a conversation is under way.', 'IN_ENCOUNTER');
      }
      if ((envelope.annexes ?? []).some((record) => record.id === annexId)) {
        return { charged: false, spellbook: this.spellbookSnapshot(envelope) };
      }
      const staged = clone(envelope);
      staged.annexes = [...(staged.annexes ?? []), { id: annexId, readAt: nowIso(this.clock), strainSpentOn: null }];
      await this.storage.save(staged);
      return { charged: true, spellbook: this.spellbookSnapshot(staged) };
    });
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
  // Round 144: `entries` is the vocabulary a footnote must hold none of: the pack's, or for a road conversation the
  // words its lines may show (its unit's), since the curriculum's whole vocabulary holds numbers and everyday words.
  keptFootnote(generated, previousNpc, open = [], entries = this.content.vocabulary.entries) {
    if (typeof generated.footnote !== 'string' || previousNpc?.footnote) return undefined;
    const text = generated.footnote.trim().replace(/\s+/g, ' ');
    if (!text || text.length > FOOTNOTE_MAX_LENGTH) return undefined;
    if (matchCanonicalVocabulary(text, entries).length) return undefined;
    return inflectsAnswer(text, open, this.lookup) ? undefined : text;
  }

  // Round 130: the target-language words of a narration, as the model listed them, that the player may tap for a
  // meaning. Kept: short, with a meaning, standing in the narration as written at word boundaries, once each. Not
  // kept: a form of a target of any of the conversation's objectives, so a tap never gives an answer's meaning away
  // (round 017's rule for the Spellbook); the word stays in the text.
  keptNarrativeWords(generated, definition) {
    if (!Array.isArray(generated.narrative_words)) return [];
    const targetIds = new Set(definition.encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids));
    const narrative = foldEvidenceText(generated.narrative);
    const kept = [];
    const seen = new Set();
    for (const entry of generated.narrative_words) {
      const word = String(entry?.word ?? '').trim().replace(/\s+/g, ' ');
      const meaning = String(entry?.meaning ?? '').trim().replace(/\s+/g, ' ');
      const folded = foldEvidenceText(word);
      if (!word || !meaning || word.length > NARRATIVE_WORDS.word || meaning.length > NARRATIVE_WORDS.meaning) continue;
      if (!folded || seen.has(folded) || !atWordBoundaries(narrative, folded)) continue;
      if (matchCanonicalVocabulary(word, definition.scope ?? this.content.vocabulary.entries).some((match) => targetIds.has(match.id))) continue;
      seen.add(folded);
      kept.push({ word, meaning });
      if (kept.length === NARRATIVE_WORDS.max) break;
    }
    return kept;
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
    const footnote = this.keptFootnote(generated, previousNpc, open, definition.scope ? definition.narrationEntries : undefined);
    const narrativeWords = this.keptNarrativeWords(generated, definition);
    return {
      id: randomUUID(), role: 'npc', narrative: generated.narrative,
      ...(narrativeWords.length ? { narrativeWords } : {}),
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
    // Round 174: a conversation completed by the limit of replies has no current objective, though one was left open.
    const objective = encounter.state === 'ongoing' ? this.currentObjective(encounter) : null;
    const currentNpc = [...encounter.transcript].reverse().find((message) => message.role === 'npc');
    const revealKeys = this.currentRevealKeys(encounter);
    const transcript = encounter.transcript.map((message) => {
      if (message.role === 'player') return clone(message);
      const protectedMessage = encounter.state === 'ongoing' && message.id === currentNpc?.id;
      // Round 148: at full immersion the translation comes with the line, free: it is how the line is read.
      const sentenceRevealed = !protectedMessage || (encounter.immersion ?? 0) >= IMMERSION.full || revealKeys.includes(`sentence:${message.id}`);
      return {
        id: message.id, role: message.role, narrative: message.narrative,
        ...(message.narrativeWords?.length ? { narrativeWords: message.narrativeWords.map((entry) => ({ ...entry })) } : {}), // round 130
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
    const limit = this.hintLimit(encounter, objective);
    return {
      id: encounter.id,
      encounterId: definition.encounter.id,
      location: this.sceneLocationId(encounter),
      partyConversation: Boolean(definition.encounter.party_of),
      ...(encounter.dungeonId ? { dungeonId: encounter.dungeonId, siteId: encounter.siteId } : {}), // rounds 114, 119
      // Round 144: a conversation of The Journey 2: its site, its kind and what it is about.
      ...(encounter.road ? { road: { node: encounter.road.node, ...definition.road } } : {}),
      character: {
        id: definition.character.id, name: definition.character.name, saveable: definition.character.saveable === true,
        ...(definition.character.voice ? { voice: { ...definition.character.voice } } : {}), // round 126
        // Round 144: a generated character has no figure, only words: who they are and what they look like.
        ...(encounter.road ? { role: definition.character.species, description: definition.character.appearance } : {}),
      },
      resolvedMessage: definition.encounter.resolved_message ?? null,
      // Round 159 (issue #7): what the character utters, told by the narrator once the encounter is completed.
      revelation: encounter.state === 'resolved' ? this.revelationOf(definition) : null,
      companionBriefing: definition.encounter.companion_briefing ?? null,
      version: encounter.version,
      state: encounter.state,
      encounter_state: encounter.state === 'resolved' ? 'resolved' : 'ongoing',
      committedPlayerTurns: encounter.committedPlayerTurns,
      difficulty: this.ratioFor(encounter.committedPlayerTurns, definition, encounter.ratioBonus ?? 0),
      must_translate: encounter.state === 'ongoing' && Boolean(objective),
      hints_available: encounter.state === 'ongoing' && revealKeys.length < limit,
      // Round 112: `baseLimit` is the objective's own limit, so the app can say how many fewer the strain leaves.
      hints: { used: revealKeys.length, remaining: Math.max(0, limit - revealKeys.length), limit, baseLimit: this.baseHintLimit(objective), strained: Boolean(encounter.strained) },
      currentObjective: objective ? { id: objective.id, prompt: objective.prompt } : null,
      // Round 131: every objective still open, in order: one answer of a paragraph may meet several.
      openObjectives: encounter.state === 'ongoing' ? this.activeObjectives(encounter).map(({ id, prompt }) => ({ id, prompt })) : [],
      // Round 129: the hearts of beginner mode. A new conversation (and Start over) has them all.
      hearts: { used: encounter.heartsUsed ?? 0, limit: BEGINNER_HEARTS },
      // Round 154: where a light conversation stands in its exchange of turns (the player's turns so far).
      exchange: { turn: encounter.committedPlayerTurns, ...this.lightExchange(), limit: Number.isFinite(this.exchangeLimit) ? this.exchangeLimit : null }, // round 174: the replies to completion
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
      // Round 182: the player is told what actually went wrong, after a joke (llm/excuse.js).
      throw retryableError(characterExcuse(label, error, this.provider.providerName), 'PROVIDER_FAILURE');
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

  // Without an encounterId the default encounter starts anywhere (the old web client, verify:cli); with one, the player
  // must be at that encounter's location. Round 114: with a dungeonId, a site of that dungeon starts, wherever the player
  // stands on the market map. Round 119: it is the site the player stands at in the dungeon (encounterId, if given, must be its encounter).
  // Round 144: with `road`, the conversation waiting at the learner's site of The Journey 2 starts.
  // Round 148: with `immersion` (the web client's slider) the characters' lines have that share of target language.
  async startEncounter(learnerId, { restart = false, encounterId = null, dungeonId = null, road = false, immersion: asked = null } = {}) {
    assertLearnerId(learnerId);
    const immersion = this.immersionOf(asked);
    return this.serialized(learnerId, async () => {
      // Round 076 (critique 1.2): no prefetch starts while a start runs, saving included.
      this.starting.add(learnerId);
      try {
        const started = road ? await this._startRoad(learnerId, restart, immersion)
          : dungeonId !== null ? await this._startDungeonSite(learnerId, restart, encounterId, dungeonId, immersion)
            : await this._startEncounter(learnerId, restart, encounterId, immersion);
        // A conversation taken up again takes the share asked for now: its next line follows it.
        const session = this.encounters.get(learnerId);
        if (immersion !== null && session && session.immersion !== immersion) {
          session.immersion = immersion;
          return { ...started, encounter: this.serializeEncounter(session) };
        }
        return started;
      } finally { this.starting.delete(learnerId); }
    });
  }

  // Round 114: a dungeon and its run in a save (a learner who never entered it is on run 1 with nothing cleared).
  dungeon(dungeonId) {
    const dungeon = typeof dungeonId === 'string' ? this.content.dungeons?.get(dungeonId) : null;
    if (!dungeon) throw new AppError('Unknown dungeon.', { status: 404, code: 'UNKNOWN_DUNGEON' });
    return dungeon;
  }

  // Round 119: the run as the map's rules read it (server/src/dungeon.js), and as the save holds it.
  dungeonRun(envelope, dungeon) { return readRun(dungeon, envelope.dungeons?.[dungeon.id]); }

  saveRun(envelope, dungeon, run) {
    envelope.dungeons = { ...(envelope.dungeons ?? {}), [dungeon.id]: { run: run.run, at: run.at, cleared: [...run.cleared], visited: [...run.visited] } };
  }

  // The dungeon's map and what the run shows of it. A hidden site keeps its place (the client bundles the file for
  // its 3D view) but not its character's name, nor whether the character can be saved.
  dungeonView(envelope, dungeon) {
    const run = this.dungeonRun(envelope, dungeon);
    const sites = siteStates(dungeon, run, this.level(envelope)); // round 121: a site may ask for a level
    return {
      dungeon: {
        id: dungeon.id, name: dungeon.name, level: dungeon.level, start: dungeon.start, goal: dungeon.goal,
        // Round 120: `saveable` lets a cleared site's card offer the party invitation with no conversation loaded.
        sites: dungeon.sites.map((site) => {
          const { character } = this.content.encounters.get(site.encounter);
          const hidden = sites[site.id].state === 'hidden';
          return {
            id: site.id, encounterId: site.encounter, name: site.name, at: [...site.at],
            characterName: hidden ? null : character.name,
            saveable: hidden ? null : character.saveable === true,
          };
        }),
        paths: dungeon.paths.map(({ between, via }) => ({ between: [...between], via: via.map((point) => [...point]) })),
      },
      progress: { run: run.run, at: run.at, complete: isComplete(dungeon, run), clearedSiteIds: run.cleared, visitedSiteIds: run.visited, sites },
      // Round 156: the narrator's passage for the site the player stands at (the same one every time; nothing is saved).
      narration: passageView(selectPassage(this.content.passages ?? [], { event: 'site_arrive', dungeon: dungeon.id, site: run.at }), this.narrationPack),
      guidebook: this.guidebookNote(envelope), // round 157
      progression: this.progression(envelope),
    };
  }

  async getDungeon(learnerId, dungeonId) {
    const dungeon = this.dungeon(dungeonId);
    const envelope = await this.loadEnvelope(learnerId);
    return this.dungeonView(envelope, dungeon);
  }

  // A new run: the cleared and visited sites are forgotten and the player stands at the start (the market's completed
  // encounters, the Spellbook and fragments stay), and a conversation this dungeon started is dropped.
  async resetDungeon(learnerId, dungeonId) {
    const dungeon = this.dungeon(dungeonId);
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const staged = clone(envelope);
      this.saveRun(staged, dungeon, freshRun(dungeon, this.dungeonRun(envelope, dungeon).run + 1));
      await this.storage.save(staged);
      if (this.encounters.get(learnerId)?.dungeonId === dungeon.id) this.encounters.delete(learnerId);
      return this.dungeonView(staged, dungeon);
    });
  }

  // Round 119: a walk to a neighbouring site, under the pass rule. While this dungeon's own conversation is under way
  // the move is refused, unless `leave` is true, which drops that conversation.
  async moveInDungeon(learnerId, dungeonId, request) {
    const dungeon = this.dungeon(dungeonId);
    assertLearnerId(learnerId);
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const run = this.dungeonRun(envelope, dungeon);
      const siteId = request?.siteId;
      const level = this.level(envelope);
      const problem = moveProblem(dungeon, run, siteId, level);
      if (problem === 'UNKNOWN_SITE') throw validationError('Unknown site.');
      const here = siteOf(dungeon, run.at);
      const target = siteOf(dungeon, siteId);
      if (problem === 'NOT_ADJACENT') throw conflictError(`You can't get to ${target.name} from ${here.name}.`, 'NOT_ADJACENT');
      if (problem === 'SEALED') {
        // Round 121: the message names what is missing: sites, the level, or both.
        const gate = gateOfSite(target, run, level);
        const sites = gate.completed < gate.required ? ` Finish the other encounters first (${gate.completed} of ${gate.required} done).` : '';
        const levels = gate.level && gate.level.current < gate.level.required ? ` It opens at level ${gate.level.required} (you are level ${gate.level.current}).` : '';
        throw conflictError(`${target.name} is sealed.${sites}${levels}`, 'SEALED');
      }
      const active = this.encounters.get(learnerId);
      const own = active?.dungeonId === dungeon.id;
      if (siteId !== run.at && own && active.state === 'ongoing' && request?.leave !== true) {
        throw conflictError(`Finish your conversation with ${this.definition(active).character.name} first.`, 'CONVERSATION_UNDER_WAY');
      }
      if (siteId === run.at) return this.dungeonView(envelope, dungeon);
      const staged = clone(envelope);
      this.saveRun(staged, dungeon, moved(dungeon, run, siteId));
      this.tell(staged, { event: 'site_arrive', dungeon: dungeon.id, site: siteId }); // rounds 157 and 158: the guidebook's entries, and the site's passage as told
      await this.storage.save(staged);
      // The conversation belongs to the site the player has left (a resolved one is over; an ongoing one was left).
      if (own) this.encounters.delete(learnerId);
      return this.dungeonView(staged, dungeon);
    });
  }

  // Round 114: the market's location check (NOT_HERE), gates and drills do not apply. Round 119: the encounter is the
  // one at the site the player stands at. The run's own conversation at this site resumes (a reload); any other start
  // of it is a new conversation, also when the site is cleared. Another conversation under way is never replaced
  // without restart.
  async _startDungeonSite(learnerId, restart, encounterId, dungeonId, immersion = null) {
    const dungeon = this.dungeon(dungeonId);
    const envelope = await this.loadEnvelope(learnerId);
    const site = siteOf(dungeon, this.dungeonRun(envelope, dungeon).at);
    const definition = this.content.encounters.get(site.encounter);
    if (encounterId !== null && encounterId !== site.encounter) {
      throw new AppError(`${dungeon.name}: you stand at ${site.name}, with ${definition.character.name}.`,
        { status: 409, code: 'NOT_AT_SITE', details: { siteId: site.id, encounterId: site.encounter } });
    }
    const active = this.encounters.get(learnerId);
    const ownSession = active && active.dungeonId === dungeon.id && active.siteId === site.id && this.definition(active) === definition;
    if (!restart && ownSession && active.state === 'ongoing') {
      return { encounter: this.serializeEncounter(active), spellbook: this.spellbookSnapshot(envelope) };
    }
    if (!restart && !ownSession && active?.state === 'ongoing') {
      throw conflictError(`Finish your conversation with ${this.definition(active).character.name} first.`, 'CONVERSATION_UNDER_WAY');
    }
    return this.openSession(learnerId, envelope, definition, { dungeonId: dungeon.id, siteId: site.id, immersion });
  }

  async _startEncounter(learnerId, restart, encounterId, immersion = null) {
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
      return this.openSession(learnerId, envelope, definition, { locationId, immersion });
    }
  }

  // A new conversation: its greeting, the words it exposes, and the session held in memory. Round 114: split out of
  // _startEncounter for the dungeon start; a dungeon's session carries its dungeonId.
  async openSession(learnerId, envelope, definition, { locationId, dungeonId, siteId, road, immersion = null } = {}) {
    // Round 087 (review R1.1): greetings for other encounters are no longer needed; they stop holding the provider.
    this.dropGreetings(learnerId, definition.encounter.party_of ? null : greetingKey(learnerId, definition.encounter.id));
    // Round 121: the level raises the target ratio of a dungeon site's conversation, from its first line to its last.
    // Review R1.1: only there. The market's conversations (the iPhone app) and a party member's keep the content's.
    const ratioBonus = dungeonId ? ratioBonusFor(this.level(envelope)) : 0;
    // Round 148: a greeting written ahead was written at the content's share; with a share of the player's own it is
    // dropped and the greeting is written now.
    if (immersion !== null && !definition.encounter.party_of) this.dropGreeting(greetingKey(learnerId, definition.encounter.id));
    // Round 177: the taught objectives whose words the learner had met before this conversation (fixed now, so the
    // character's own lines in it do not change it).
    const known = this.knownObjectiveIds(envelope, definition);
    const generated = (immersion === null && !known.length ? await this.prefetchedGreeting(learnerId, definition) : null)
      ?? await this.narrate(this.greetingMessages(definition, locationId, ratioBonus, immersion, known), definition, this.ratioFor(0, definition, ratioBonus, immersion));
    const npcMessage = this.canonicalizeNarration(generated, definition);
    const stagedEnvelope = clone(envelope);
    this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), nowIso(this.clock), 'encounter_exposure');
    // Round 157: the first conversation at a dungeon's site may enter a guidebook entry (a map only read enters none).
    // Round 158: and the site's passage counts as told (one with an untranslatable text is kept for the guidebook).
    if (dungeonId) this.tell(stagedEnvelope, { event: 'site_arrive', dungeon: dungeonId, site: siteId });
    // Round 111 (review R1.12): computed once. Round 112 (critique 1.5): only the oldest pending read strains a
    // session, so with two reads pending each costs its own finished conversation (no stacking, none free).
    const strainedBy = this.pendingStrainIds(envelope).slice(0, 1);
    const encounter = {
      id: randomUUID(), definitionId: definition.encounter.id, version: 1, state: 'ongoing', objectiveIndex: 0, passedObjectiveIds: [],
      committedPlayerTurns: 0, transcript: [npcMessage], reveals: {},
      ...(locationId ? { locationId } : {}),
      ...(dungeonId ? { dungeonId, siteId } : {}),
      ...(road ? { road } : {}), // round 144: the stage sets a road conversation's ratio, so it takes no level bonus
      ...(ratioBonus ? { ratioBonus } : {}),
      ...(immersion !== null ? { immersion } : {}), // round 148
      ...(known.length ? { known } : {}), // round 177
      // Round 111: a session started while the companion's strain is pending has a hint fewer per objective.
      ...(strainedBy.length ? { strained: true, strainedBy } : {}),
    };
    await this.storage.save(stagedEnvelope);
    this.encounters.set(learnerId, encounter);
    return { encounter: this.serializeEncounter(encounter), spellbook: this.spellbookSnapshot(stagedEnvelope), guidebook: this.guidebookNote(stagedEnvelope) };
  }

  // Round 076 (critique 1.6): the greeting's prompt, the same for a start and a prefetch. It depends on content only,
  // which is loaded once for the service's lifetime, so a prefetched greeting is the one the start would ask for.
  greetingMessages(definition, locationId, ratioBonus = 0, immersion = null, known = []) {
    return buildNarrationMessages({
      language: this.content.language,
      character: definition.character,
      styleGuide: this.content.styleGuide,
      locationName: definition.scene?.name ?? this.sceneName({ definitionId: definition.encounter.id, locationId }),
      objectives: this.voiced(definition.encounter.objectives, known),
      vocabularyById: this.lookup,
      ...this.shareOf(0, definition, { ratioBonus, immersion }),
      ambientEntries: definition.ambientEntries,
      ...this.sceneExtras(definition, known),
    });
  }

  // Round 177: the owner's rule: a character says an objective's words first only when the learner has truly never
  // met them. The ids of the taught objectives (those with a `recall_intent`) of which some word is in the Spellbook.
  knownObjectiveIds(envelope, definition) {
    return definition.encounter.objectives
      .filter((objective) => objective.recall_intent && objective.target_vocabulary_ids.some((id) => this.findItem(envelope, id)))
      .map((objective) => objective.id);
  }

  // Round 177: objectives as the narrator is told them: a known one asks for recall, not modelling.
  voiced(objectives, known = []) {
    const ids = new Set(known);
    return objectives.map((objective) => (ids.has(objective.id) ? { ...objective, intent: objective.recall_intent } : objective));
  }

  // Round 144: what a road conversation adds to the narrator's turn data: the place it is in, and for a lesson the
  // note that its words are new and are to be modelled. Nothing for an authored encounter, whose prompts are pinned.
  sceneExtras(definition, known = []) {
    // Round 155 (issue #3): what the character knows of the world: an authored character's region and what it has
    // noticed are on its sheet; a generated character of the road brings its own (road/encounters.js).
    const world = definition.world ?? (definition.character.world
      ? worldFor(this.content.knowledge, this.content.language.code, definition.character.world.region, definition.character.world.noticed)
      : null);
    return {
      ...(world ? { world } : {}),
      ...(definition.scene?.place ? { placeName: definition.scene.place } : {}),
      // Round 146: the time of day and the weather on the road, as the player sees them (the same clock and seed).
      ...(definition.scene?.seed !== undefined ? { weather: weatherAt(new Date(this.clock()).getTime(), definition.scene.seed).sentence } : {}),
      // Round 177: the note that the words are new, only while some taught objective's words are.
      ...(definition.teachingNote && definition.encounter.objectives.some((objective) => objective.recall_intent && !known.includes(objective.id)) ? { teachingNote: definition.teachingNote } : {}),
      ...(definition.road?.cefr ? { level: definition.road.cefr } : {}), // round 177: the conversation rules of the stage
    };
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
  // Round 082 Amendment 1: the inscriptions and the drill too. Round 093 (critique 1.4): receipts hold no Spellbook,
  // so a replay carries the whole Spellbook as it is now (also for older receipts that still hold one).
  replay(response, envelope) {
    return { ...response, spellbook: this.spellbookSnapshot(envelope), ...('xpGained' in response ? { progression: this.progression(envelope) } : {}), replayed: true };
  }

  async revealEncounterHelp(learnerId, request) {
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const current = this.encounters.get(learnerId);
      this.validateVersion(current, request.encounterId, request.version);
      if (current.state !== 'ongoing') throw validationError('This encounter no longer has an active learning objective.');
      const objective = this.currentObjective(current);
      // Round 154: a light exchange may go on with every objective met; then there is nothing left to hint at.
      if (!objective) throw conflictError('No translation hints remain for this objective.', 'HINTS_EXHAUSTED');
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
      if (!alreadyRevealed && used.length >= this.hintLimit(current, objective)) throw conflictError('No translation hints remain for this objective.', 'HINTS_EXHAUSTED');
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

  // Round 144: `entries` is the vocabulary the evidence is read against: the pack's, or the curriculum's for a road
  // conversation.
  validateAssessment(raw, objectives, playerInput, schema = gradingResponseSchema, entries = this.content.vocabulary.entries) {
    let assessment;
    try { assessment = schema.parse(raw); }
    catch { throw retryableError('The grading response was invalid. Your answer can be retried unchanged.', 'INVALID_GRADING'); }
    const allowed = new Map(objectives.map((objective) => [objective.id, objective]));
    const seen = new Set();
    for (const result of assessment.objective_results) {
      const objective = allowed.get(result.objective_id);
      if (!objective || seen.has(result.objective_id)) throw retryableError('The grader assessed an unknown or duplicate objective. Your progress was not changed.', 'INVALID_GRADING');
      seen.add(result.objective_id);
      // Round 177: evidence that cannot be verified in the answer (an unrelated item, a form the vocabulary does not
      // list, a quote not in the answer, a repeat) is dropped, never recorded. Before, it failed the whole turn with
      // INVALID_GRADING, and a correct answer in a form the vocabulary lacks ("che cosa c'è che non va?") could not
      // be given at all (the playtest of 2026-11-24).
      const evidenceIds = new Set();
      result.vocabulary_evidence = result.vocabulary_evidence.filter((evidence) => {
        if (!objective.target_vocabulary_ids.includes(evidence.vocabulary_id) || evidenceIds.has(evidence.vocabulary_id)) return false;
        const excerptIds = new Set(matchCanonicalVocabulary(evidence.evidence, entries).map((match) => match.id));
        // Round 092 (review R1.2; Amendment 1): the evidence must stand in the answer at word boundaries ("pane"
        // quoted from "panettone" does not); graders may quote words around the form ("No estás sola" for sola).
        if (!excerptIds.has(evidence.vocabulary_id) || !atWordBoundaries(foldEvidenceText(playerInput), foldEvidenceText(evidence.evidence))) return false;
        evidenceIds.add(evidence.vocabulary_id);
        return true;
      });
      // Round 177: a pass without the required evidence that stands is the grader's judgement of the meaning: it is not
      // a pass (nothing of its words is recorded) but it is understood, and closes as a corrected objective would.
      if (result.passed && objective.required_target_groups.some((group) => !group.some((id) => evidenceIds.has(id)))) {
        result.passed = false;
        result.attempted = true;
        result.understood = true;
        result.vocabulary_evidence = [];
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
    const immersion = this.immersionOf(request.immersion); // round 148: the slider travels with each answer
    return this.serialized(learnerId, async () => {
      const envelope = await this.loadEnvelope(learnerId);
      const fingerprint = payloadHash({ kind: 'dialogue', encounterId: request.encounterId, version: request.version, message });
      const existing = receiptOf(envelope, request.attemptId);
      if (existing) {
        if (existing.payloadHash !== fingerprint) throw conflictError('This attempt ID was already used for different input.', 'ATTEMPT_REUSE');
        return this.replay(existing.response, envelope);
      }
      const current = this.encounters.get(learnerId);
      this.validateVersion(current, request.encounterId, request.version);
      if (current.state !== 'ongoing' && request.chat !== true) throw validationError('This encounter is already complete. Restart to play again.');
      if (immersion !== null) current.immersion = immersion; // the reply to this answer follows the slider as it stands
      const definition = this.definition(current);
      // Round 174: chatting on after the conversation is complete.
      if (current.state !== 'ongoing') return this.chatTurn({ learnerId, request, fingerprint, envelope, current, definition, message });
      const objectives = this.activeObjectives(current);
      // Round 153: light mode, asked for by the client with each answer: nothing is checked, and one call reads the
      // answer and replies to it.
      // Round 154: nor is there anything to mark once every objective is met and the exchange is still going.
      if (request.light === true || objectives.length === 0) return this.lightTurn({ learnerId, request, fingerprint, envelope, current, definition, objectives, message });
      // Round 129: beginner mode, asked for by the client with each answer. The grader also says what the player
      // tried and gives their answer in correct target language; a heart pays for a corrected answer.
      const beginner = request.beginner === true;
      const gradingSchema = beginner ? beginnerGradingResponseSchema : gradingResponseSchema;
      const gradingRaw = await this.callProvider(buildGradingMessages({
        language: this.content.language, objectives, vocabularyById: this.lookup,
        conversationContext: current.transcript.map((item) => item.role === 'player' ? item.text : item.dialogue.native),
        playerInput: message,
        ordered: definition.encounter.objectives_unordered !== true && !current.loose,
        ...(beginner ? { beginner } : {}),
      }), gradingSchema, 'dialogue_assessment', 'The language assessor');
      const assessment = this.validateAssessment(gradingRaw, objectives, message, gradingSchema, definition.scope);

      // In order: the leading run of passes closes. Unordered (round 045): every passed open objective closes.
      const resultOf = (objective) => assessment.objective_results.find((item) => item.objective_id === objective.id);
      const passedOf = (objective) => resultOf(objective)?.passed === true;
      // Round 129: the correction, when the grader gave one and the player tried at least one objective. With a heart
      // left it costs that heart and closes the objectives it covers (those tried and not passed); with none it is
      // only shown. One heart for an answer, however many slips.
      const heartsUsed = current.heartsUsed ?? 0;
      const correctionText = beginner && typeof assessment.correction === 'string' ? assessment.correction.trim().replace(/\s+/g, ' ').slice(0, CORRECTION_MAX_LENGTH) : '';
      const corrected = beginner && correctionText !== '' && assessment.objective_results.some((result) => result.attempted || result.passed);
      // Round 177: a correction that only mends accents, apostrophes, capitals or punctuation costs no heart and closes
      // what was tried (the playtest lost hearts for "Si" for "Sì"); it is still shown.
      const trivial = corrected && sameLetters(correctionText, message);
      const heartLost = corrected && !trivial && heartsUsed < BEGINNER_HEARTS;
      // Round 177: understood (a pass whose words could not be verified) closes without a heart.
      const forgivenOf = (objective) => !passedOf(objective) && (resultOf(objective)?.understood === true || ((heartLost || trivial) && resultOf(objective)?.attempted === true));
      const unordered = definition.encounter.objectives_unordered === true || current.loose === true;
      const closing = [];
      for (const objective of objectives) {
        if (passedOf(objective) || forgivenOf(objective)) closing.push(objective);
        else if (!unordered) break;
      }
      const forgivenIds = new Set(closing.filter((objective) => !passedOf(objective)).map((objective) => objective.id));
      const passedCount = closing.length;
      const nextObjectiveIndex = current.objectiveIndex + passedCount;
      const nextPassedIds = [...(current.passedObjectiveIds ?? []), ...closing.map((objective) => objective.id)];
      const remaining = unordered
        ? definition.encounter.objectives.filter((objective) => !nextPassedIds.includes(objective.id))
        : definition.encounter.objectives.slice(nextObjectiveIndex);
      const nextTurns = current.committedPlayerTurns + 1;
      // Round 174: complete when every objective is met, or on the player's third reply whatever is open.
      const resolved = remaining.length === 0 || nextTurns >= this.exchangeLimit;
      // Round 051 (backlog H1): in order, a pass after a failed objective does not close. It is `held`: not banked,
      // and the narrator is told not to treat it as done. The field is present only when true (pinned prompts).
      const closingIds = new Set(closing.map((objective) => objective.id));
      const heldIds = new Set(unordered ? [] : assessment.objective_results
        .filter((result) => result.passed && !closingIds.has(result.objective_id)).map((result) => result.objective_id));
      const heldMark = (id) => (heldIds.has(id) ? { held: true } : {});
      // Round 129: an objective closed by a correction is passed for the narrator and the client, and marked.
      const correctedMark = (id) => (forgivenIds.has(id) ? { corrected: true } : {});
      const decision = {
        objectiveResults: assessment.objective_results.map(({ objective_id, passed }) => ({ objectiveId: objective_id, passed: passed || forgivenIds.has(objective_id), ...heldMark(objective_id), ...correctedMark(objective_id) })),
        encounterState: resolved ? 'resolved' : 'ongoing',
        nextObjectiveId: remaining[0]?.id ?? null,
        ...(heldIds.size ? { held_note: HELD_NOTE } : {}),
        ...(forgivenIds.size ? { corrected_note: CORRECTED_NOTE } : {}),
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
          objectiveId: result.objective_id, passed: result.passed || forgivenIds.has(result.objective_id), ...heldMark(result.objective_id), ...correctedMark(result.objective_id), feedback: result.feedback,
          vocabularyEvidence: result.vocabulary_evidence.map((evidence) => ({
            vocabularyId: evidence.vocabulary_id, evidence: evidence.evidence,
            quality: evidence.quality, effectiveQuality: evidence.effective_quality,
          })),
        })),
        // Round 129: what the player meant, in correct target language, and whether it cost a heart.
        ...(corrected ? { correction: { text: correctionText, translation: typeof assessment.correction_translation === 'string' ? assessment.correction_translation.trim() : null, heartLost } } : {}),
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
          objectives: this.voiced(remaining, current.known),
          vocabularyById: this.lookup,
          conversationHistory: history,
          playerInput: message,
          ...this.shareOf(nextTurns, definition, current),
          decision,
          ambientEntries: definition.ambientEntries,
          ...this.sceneExtras(definition, current.known),
        }), definition, this.ratioFor(nextTurns, definition, current.ratioBonus ?? 0, current.immersion ?? null));

        const evidence = assessment.objective_results.flatMap((result) => result.vocabulary_evidence.map((item) => ({
          objectiveId: result.objective_id, vocabularyId: item.vocabulary_id, quality: item.effective_quality, passed: result.passed,
        })));
        return await this.commitTurn({
          learnerId, request, fingerprint, envelope, current, definition, message, generated, closing, remaining, resolved,
          evidence, responseAssessment, correctedIds: forgivenIds, heartLost,
        });
      } finally {
        if (this.turnProgress.get(learnerId)?.run === run) this.turnProgress.delete(learnerId);
      }
    });
  }

  // Round 153: what a turn does to the save and the session once its verdict and its reply are known. The strict turn
  // and the light one both end here. `evidence` is [{ objectiveId, vocabularyId, quality, passed }]; `correctedIds`
  // are the objectives this turn closed that the player did not say cleanly (the road's score reads them).
  async commitTurn({ learnerId, request, fingerprint, envelope, current, definition, message, generated, closing, remaining, resolved, evidence, responseAssessment, correctedIds = new Set(), heartLost = false, sessionPatch = {} }) {
    const stagedEnvelope = clone(envelope);
    const stagedEncounter = clone(current);
    const timestamp = nowIso(this.clock);
    const advancedObjectiveIds = new Set(closing.map((objective) => objective.id));
    for (const item of evidence) {
      this.discover(stagedEnvelope, [item.vocabularyId], timestamp, 'dialogue_assessment');
      const card = this.findItem(stagedEnvelope, item.vocabularyId);
      card.evidence.push({ at: timestamp, kind: 'dialogue', objectiveId: item.objectiveId, quality: item.quality, passed: item.passed });
      if (advancedObjectiveIds.has(item.objectiveId) && item.passed && isDue(card.schedule, this.clock())) {
        card.schedule = scheduleReview(card.schedule, item.quality, this.clock());
      }
    }
    const previousNpc = [...current.transcript].reverse().find((item) => item.role === 'npc');
    const npcMessage = this.canonicalizeNarration(generated, definition, previousNpc, remaining);
    this.discover(stagedEnvelope, npcMessage.dialogue.words.map((word) => word.vocabularyId), timestamp, 'encounter_exposure');
    stagedEncounter.transcript.push({ id: randomUUID(), role: 'player', text: message }, npcMessage);
    stagedEncounter.objectiveIndex = current.objectiveIndex + closing.length;
    stagedEncounter.passedObjectiveIds = [...(current.passedObjectiveIds ?? []), ...closing.map((objective) => objective.id)];
    stagedEncounter.committedPlayerTurns = current.committedPlayerTurns + 1;
    stagedEncounter.state = resolved || current.state === 'resolved' ? 'resolved' : 'ongoing'; // round 174: a chat after the end stays resolved
    stagedEncounter.version += 1;
    Object.assign(stagedEncounter, sessionPatch);
    if (heartLost) stagedEncounter.heartsUsed = (current.heartsUsed ?? 0) + 1; // round 129
    // Round 144: which objectives a correction closed, for the conversation's score (road/pacing.js).
    if (correctedIds.size) stagedEncounter.correctedObjectiveIds = [...new Set([...(current.correctedObjectiveIds ?? []), ...correctedIds])];
    // Round 028: progress is recorded before the response is built, so the resolving turn's spellbook already
    // holds the encounter's containment file.
    if (resolved && definition.encounter.party_of) {
      // Round 022: a party conversation counts towards the member, not the map (the Rift gate is unchanged).
      const member = stagedEnvelope.party.find((candidate) => this.isHomeMember(candidate, definition.encounter.party_of));
      if (member) member.conversations = (member.conversations ?? 0) + 1;
    } else if (resolved && !stagedEncounter.road && !stagedEnvelope.world.completedEncounterIds.includes(definition.encounter.id)) {
      stagedEnvelope.world.completedEncounterIds.push(definition.encounter.id);
    }
    // Round 159 (issue #7): what the character utters on completion is told now: kept for the guidebook, and, when it
    // holds an untranslatable text, the guidebook's entry on those is entered with it.
    const revelation = resolved ? this.revelationOf(definition) : null;
    if (revelation) {
      if (!Object.hasOwn(stagedEnvelope.told ?? {}, revelation.id)) stagedEnvelope.told = { ...(stagedEnvelope.told ?? {}), [revelation.id]: timestamp };
      if (revelation.segments.some((segment) => segment.kind === 'truth')) this.enterGuide(stagedEnvelope, { event: 'truth_shown' });
    }
    // Round 144: a road conversation counts towards the curriculum, in the same save as its resolution.
    const roadResult = resolved && stagedEncounter.road ? this.finishRoad(stagedEnvelope, stagedEncounter) : null;
    // Round 114: a dungeon's conversation clears its site in the run (round 119: the site the session was opened at).
    if (resolved && stagedEncounter.dungeonId) this.clearSite(stagedEnvelope, stagedEncounter.dungeonId, stagedEncounter.siteId);
    // Round 111: the conversation that bore the strain spends it, in the same save as its resolution and receipt
    // (a replay returns the receipt and spends nothing again; a failed save spends nothing). Any finished
    // conversation spends it, a replayed party conversation or a completed place's restart too (decision 4).
    if (resolved && stagedEncounter.strained) {
      const by = new Set(stagedEncounter.strainedBy ?? []);
      for (const record of stagedEnvelope.annexes ?? []) if (record.strainSpentOn === null && by.has(record.id)) record.strainSpentOn = definition.encounter.id;
    }
    // Round 121: experience for the objectives this turn closed and for a resolve, in the same save as the turn
    // and its receipt, so a replayed attempt earns nothing again.
    const xpGained = XP.objective * closing.length + (resolved ? XP.resolve : 0);
    stagedEnvelope.progression = { xp: (stagedEnvelope.progression?.xp ?? 0) + xpGained };
    const response = {
      encounter: this.serializeEncounter(stagedEncounter),
      assessment: responseAssessment,
      spellbook: this.spellbookSnapshot(stagedEnvelope, stagedEncounter),
      xpGained,
      progression: this.progression(stagedEnvelope),
      ...(roadResult ? { roadResult } : {}),
      ...(revelation ? { guidebook: this.guidebookNote(stagedEnvelope) } : {}), // round 159: its entry may be new
      replayed: false,
    };
    stagedEnvelope.spellbook.processedAssessments[request.attemptId] = {
      kind: 'dialogue', payloadHash: fingerprint, committedAt: timestamp, response: forReceipt(response),
    };
    await this.storage.save(stagedEnvelope, { keepReceiptId: request.attemptId });
    this.encounters.set(learnerId, stagedEncounter);
    return response;
  }

  // Round 153: light mode's turn. One call to the model returns what the player meant, the same in correct target
  // language, which open objectives that meaning fulfils, and the character's reply. Nothing is checked against the
  // answer: no grader, no evidence rules, no hearts, no retry of the line. An objective closes on the model's word, in
  // any order. Round 154: the conversation is an exchange of LIGHT_EXCHANGE turns, and the model is told where in it
  // this turn stands. The Spellbook still learns from the turn: a target of a closed objective that stands in the player's
  // own text (found by the vocabulary matcher, not by a judge) is recorded as said.
  async lightTurn({ learnerId, request, fingerprint, envelope, current, definition, objectives, message }) {
    const nextTurns = current.committedPlayerTurns + 1;
    const { min, max } = this.lightExchange(); // round 174: within the exchange limit
    const history = current.transcript.map((item) => item.role === 'player'
      ? { role: 'user', content: item.text }
      : { role: 'assistant', content: item.dialogue.native });
    const generated = await this.callProvider(buildNarrationMessages({
      language: this.content.language,
      character: definition.character,
      styleGuide: this.content.styleGuide,
      locationName: this.sceneName(current),
      objectives: this.voiced(objectives, current.known),
      vocabularyById: this.lookup,
      conversationHistory: history,
      playerInput: message,
      ...this.shareOf(nextTurns, definition, current),
      ambientEntries: definition.ambientEntries,
      ...this.sceneExtras(definition, current.known),
      light: { turn: nextTurns, min, max, ending: LIGHT_ENDING[nextTurns >= max ? 'now' : nextTurns >= min ? 'if_done' : 'go_on'] },
    }), lightTurnSchema, 'light_turn', definition.character.name);
    const { player } = generated;
    const met = new Set(player.objectives_met);
    const closing = objectives.filter((objective) => met.has(objective.id));
    const closingIds = new Set(closing.map((objective) => objective.id));
    const remaining = objectives.filter((objective) => !closingIds.has(objective.id));
    // Round 154: the exchange's end: nothing open from the third turn on, or the fifth turn whatever is open.
    const resolved = nextTurns >= max || (remaining.length === 0 && nextTurns >= min);
    const tidy = (text) => String(text).trim().replace(/\s+/g, ' ').slice(0, CORRECTION_MAX_LENGTH);
    const said = new Set(matchCanonicalVocabulary(message, definition.scope ?? this.content.vocabulary.entries).map((match) => match.id));
    const anyReveal = objectives.some((objective) => (current.reveals[objective.id] ?? []).length > 0);
    const evidence = closing.flatMap((objective) => objective.target_vocabulary_ids.filter((id) => said.has(id)).map((id) => ({
      objectiveId: objective.id, vocabularyId: id, quality: capAssistedQuality(LIGHT_QUALITY, anyReveal), passed: true,
    })));
    const responseAssessment = {
      light: true,
      overallFeedback: tidy(player.meant),
      objectiveResults: objectives.map((objective) => ({ objectiveId: objective.id, passed: closingIds.has(objective.id), feedback: objective.prompt, vocabularyEvidence: [] })),
      // What the player meant, in correct target language, when their own answer was not that already.
      ...(player.clean ? {} : { correction: { text: tidy(player.target), translation: tidy(player.meant), heartLost: false, light: true } }),
    };
    return this.commitTurn({
      learnerId, request, fingerprint, envelope, current, definition, message, generated, closing, remaining, resolved,
      evidence, responseAssessment, correctedIds: player.clean ? new Set() : closingIds, sessionPatch: { loose: true },
    });
  }

  // Round 174: light mode's exchange within the limit of replies.
  lightExchange() {
    return { min: Math.min(LIGHT_EXCHANGE.min, this.exchangeLimit), max: Math.min(LIGHT_EXCHANGE.max, this.exchangeLimit) };
  }

  // Round 174: a turn after the conversation is complete. The character answers as in a light turn with nothing
  // open; only the transcript grows. Nothing is marked or recorded, and the conversation stays complete.
  async chatTurn({ learnerId, request, fingerprint, envelope, current, definition, message }) {
    const turn = current.committedPlayerTurns + 1;
    const history = current.transcript.map((item) => item.role === 'player'
      ? { role: 'user', content: item.text }
      : { role: 'assistant', content: item.dialogue.native });
    const generated = await this.callProvider(buildNarrationMessages({
      language: this.content.language,
      character: definition.character,
      styleGuide: this.content.styleGuide,
      locationName: this.sceneName(current),
      objectives: [],
      vocabularyById: this.lookup,
      conversationHistory: history,
      playerInput: message,
      ...this.shareOf(turn, definition, current),
      ambientEntries: definition.ambientEntries,
      ...this.sceneExtras(definition, current.known),
      light: { turn, ...this.lightExchange(), ending: LIGHT_ENDING.go_on },
    }), lightTurnSchema, 'light_turn', definition.character.name);
    return this.commitTurn({
      learnerId, request, fingerprint, envelope, current, definition, message, generated, closing: [], remaining: [], resolved: false,
      evidence: [], responseAssessment: null,
    });
  }

  clearSite(envelope, dungeonId, siteId) {
    const dungeon = this.content.dungeons?.get(dungeonId);
    if (!dungeon || !siteOf(dungeon, siteId)) return;
    this.saveRun(envelope, dungeon, clearedSite(dungeon, this.dungeonRun(envelope, dungeon), siteId));
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
      const entry = this.lookup.get(item.vocabularyId);
      if (!entry || item.contentVersion !== this.entryVersion(entry.id)) throw conflictError('This card belongs to a different content version.', 'STALE_CONTENT');
      const challenge = {
        id: randomUUID(), learnerId, vocabularyId: entry.id,
        contentVersion: this.entryVersion(entry.id), issuedAt: nowIso(this.clock),
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
      const existing = receiptOf(envelope, request.attemptId);
      if (existing) {
        if (existing.payloadHash !== fingerprint) throw conflictError('This attempt ID was already used for different review input.', 'ATTEMPT_REUSE');
        return this.replay(existing.response, envelope);
      }
      const challenge = this.reviewChallenges.get(learnerId)?.get(request.challengeId);
      if (!challenge) throw conflictError('That review challenge is stale. Fetch a new due review.', 'STALE_CHALLENGE');
      const item = this.findItem(envelope, challenge.vocabularyId);
      const entry = this.lookup.get(challenge.vocabularyId);
      if (!item || !entry || challenge.contentVersion !== this.entryVersion(entry.id)) throw conflictError('That review card is no longer available.', 'STALE_CONTENT');

      const stagedEnvelope = clone(envelope);
      const stagedItem = this.findItem(stagedEnvelope, challenge.vocabularyId);
      const result = request.action === 'reveal'
        ? { correct: false, quality: 0, kind: 'revealed' }
        : gradeVocabularyAnswer(entry, answer);
      const timestamp = nowIso(this.clock);
      const scheduleChanged = isDue(stagedItem.schedule, this.clock()) && !challenge.practice;
      if (scheduleChanged) stagedItem.schedule = scheduleReview(stagedItem.schedule, result.quality, this.clock());
      stagedItem.evidence.push({ at: timestamp, kind: 'review', quality: result.quality, correct: result.correct, revealed: request.action === 'reveal', scheduleChanged });
      // Round 121: a correct review of a due card earns experience (not practice, not a revealed answer).
      const xpGained = result.correct && scheduleChanged ? XP.review : 0;
      stagedEnvelope.progression = { xp: (stagedEnvelope.progression?.xp ?? 0) + xpGained };
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
        xpGained,
        progression: this.progression(stagedEnvelope),
        replayed: false,
      };
      stagedEnvelope.spellbook.processedAssessments[request.attemptId] = {
        kind: 'review', payloadHash: fingerprint, committedAt: timestamp, response: forReceipt(response),
      };
      await this.storage.save(stagedEnvelope, { keepReceiptId: request.attemptId });
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

// Round 144: The Journey 2's methods (road/service.js).
Object.assign(LearningService.prototype, roadMethods);
