import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { normalizeAnswer } from './language-engine.js';

const defaultContentDir = resolve(import.meta.dirname, '..', '..', 'content');
export const DEFAULT_LANGUAGE = 'it';

const languageSchema = z.object({
  code: z.string().regex(/^[a-z]{2,3}$/),
  name: z.string().min(1),
  tag: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/),
  default_encounter: z.string().min(1),
}).strict();
const exampleSchema = z.object({ target: z.string().min(1), english: z.string().min(1) }).strict();
const vocabularyEntrySchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  kind: z.enum(['word', 'phrase']),
  target: z.string().min(1),
  part_of_speech: z.string().min(1),
  accepted_translations: z.array(z.string().min(1)).min(1),
  surface_variants: z.array(z.string().min(1)).min(1),
  accent_insensitive: z.boolean(),
  example: exampleSchema,
  note: z.string().min(1).optional(),
  reference_ids: z.array(z.string().min(1)).min(1),
}).strict();
const vocabularySchema = z.object({
  version: z.string().min(1),
  references: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url(),
  }).strict()).min(1),
  entries: z.array(vocabularyEntrySchema).min(1),
}).strict();

const objectiveSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  intent: z.string().min(1),
  target_vocabulary_ids: z.array(z.string()).min(1),
  required_target_groups: z.array(z.array(z.string()).min(1)).min(1),
  grammar_constraints: z.array(z.string().min(1)).min(1),
  accepted_examples: z.array(z.string().min(1)).min(1),
  negative_examples: z.array(z.object({ text: z.string().min(1), reason: z.string().min(1) }).strict()).min(1),
  reference_meaning: z.string().min(1),
  hint_limit: z.number().int().nonnegative(),
  next_objective: z.string().nullable(),
  assessment_reference_ids: z.array(z.string()).min(1),
}).strict();

const containmentFileSchema = z.object({
  designation: z.string().regex(/^CM-\d{3}$/),
  name: z.string().min(1),
  class: z.string().min(1),
  virulence: z.string().min(1),
  harm: z.string().min(1),
  incubation: z.string().min(1),
  vector: z.string().min(1),
  containment: z.string().min(1),
  notes: z.array(z.string().min(1)).min(1).max(3),
}).strict();

const encounterSchema = z.object({
  id: z.string().min(1),
  character: z.string().min(1),
  // Round 022: a party conversation names the location encounter whose character it continues (`party_of`) and has
  // no map location; every other encounter has a location.
  location: z.string().min(1).optional(),
  party_of: z.string().min(1).optional(),
  type: z.literal('dialogue'),
  initial_prompt_template: z.string().min(1),
  turn_prompt_template: z.string().min(1),
  defeat_condition: z.object({ type: z.string(), description: z.string().min(1) }).strict(),
  max_turns: z.number().int().positive(),
  escalation: z.object({ target_ratio_increase_per_turn: z.number().min(0) }).strict(),
  resolved_message: z.string().min(1).optional(),
  // Round 009: static English lines in which the companion introduces the mechanics (the tutorial sets them).
  companion_briefing: z.array(z.string().min(1)).min(1).max(4).optional(),
  // Round 029 (backlog C1): before a first fight, every due Spellbook card among the objectives' targets is reviewed.
  drill_before: z.literal(true).optional(),
  // Round 028: the Spellbook's deadpan containment file for an infohazard (LORE.md); location encounters only.
  containment_file: containmentFileSchema.optional(),
  // Round 019: authored words the NPC may use in any line; never the target of one of the encounter's objectives.
  ambient_vocabulary_ids: z.array(z.string().min(1)).min(1).optional(),
  objectives: z.array(objectiveSchema).min(1),
  // Round 045 (backlog G3): objectives that may be met in any order; every passed one closes. Default: in order.
  objectives_unordered: z.boolean().optional(),
}).strict().superRefine((encounter, context) => {
  if (Boolean(encounter.location) === Boolean(encounter.party_of)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'An encounter has either a location or party_of, not both or neither' });
  }
  if (encounter.party_of && encounter.drill_before) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'A party conversation cannot require a drill' });
  }
  if (encounter.party_of && encounter.containment_file) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'A party conversation cannot hold a containment file' });
  }
});

const characterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  species: z.string().min(1),
  personality: z.object({
    tone: z.string().min(1),
    quirks: z.array(z.string().min(1)).min(1),
    humour_style: z.string().min(1),
  }).strict(),
  appearance: z.string().min(1),
  combat_style: z.string().min(1),
  difficulty: z.number().min(1),
  language_profile: z.object({
    base_target_ratio: z.number().min(0).max(1),
    vocabulary_focus: z.array(z.string().min(1)).min(1),
    grammar_focus: z.array(z.string().min(1)).min(1),
  }).strict(),
  defeat_condition: z.object({ type: z.string().min(1), description: z.string().min(1) }).strict(),
  saveable: z.boolean(),
}).strict();

const styleGuideSchema = z.object({
  tone: z.string().min(1),
  narrator_voice: z.string().min(1),
  rules: z.array(z.string().min(1)).min(1),
}).strict();

// Round 027: the philosophy statement shown once before the map (content/narration/onboarding.yaml).
const onboardingSchema = z.object({
  title: z.string().min(1),
  statement: z.string().min(1),
  notes: z.array(z.string().min(1)).min(1).max(4),
  begin_label: z.string().min(1),
}).strict();

// Round 030 (backlog A9): fragments of The Journey (content/languages/<code>/lore/fragments.yaml, optional).
const fragmentSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  title: z.string().min(1),
  found_after: z.string().min(1),
  // Round 032: unlocked by the found_after character's party conversations instead of the encounter's completion.
  after_conversations: z.number().int().min(1).optional(),
  found: z.string().min(1),
  text: z.string().min(1),
  translation: z.string().min(1),
  glossary: z.array(z.object({ word: z.string().min(1), meaning: z.string().min(1) }).strict()).min(1).max(10),
}).strict();
const fragmentsSchema = z.object({ fragments: z.array(fragmentSchema) }).strict();

const locationIdSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);
const locationSchema = z.object({
  id: locationIdSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  vocabulary_focus: z.array(z.string().min(1)).min(1),
  encounter: z.string().min(1).nullable(),
  // Round 014: a gated location (the Rift) opens once every listed encounter is complete.
  requires_completed: z.array(z.string().min(1)).default([]),
  map: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict(),
}).strict();
const connectionsSchema = z.object({
  start: locationIdSchema,
  paths: z.array(z.tuple([locationIdSchema, locationIdSchema])).min(1),
}).strict();

function parseYaml(contentDir, relativePath) {
  const fullPath = resolve(contentDir, relativePath);
  try {
    return yaml.load(readFileSync(fullPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to load content/${relativePath}: ${error.message}`);
  }
}

function unique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length) throw new Error(`${label} contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
}

export function availableLanguages(contentDir = defaultContentDir) {
  const languagesDir = resolve(contentDir, 'languages');
  return readdirSync(languagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(resolve(languagesDir, entry.name, 'language.yaml')))
    .map((entry) => entry.name)
    .sort();
}

export function loadGameContent({ contentDir = defaultContentDir, language: code = DEFAULT_LANGUAGE } = {}) {
  const available = availableLanguages(contentDir);
  if (!available.includes(code)) {
    throw new Error(`Unknown target language: ${code}. Available: ${available.join(', ')}`);
  }
  const pack = `languages/${code}`;
  const { default_encounter: defaultEncounterId, ...language } = languageSchema.parse(parseYaml(contentDir, `${pack}/language.yaml`));
  if (language.code !== code) throw new Error(`content/${pack}/language.yaml must declare code ${code}`);
  const styleGuide = styleGuideSchema.parse(parseYaml(contentDir, 'narration/style_guide.yaml'));
  const { begin_label: beginLabel, ...onboardingText } = onboardingSchema.parse(parseYaml(contentDir, 'narration/onboarding.yaml'));
  const onboarding = Object.freeze({ ...onboardingText, notes: Object.freeze(onboardingText.notes), beginLabel });

  // Round 006: every vocabulary file of the pack is merged; each entry keeps its own file's version.
  const vocabularyFiles = yamlFiles(contentDir, `${pack}/vocabulary`)
    .map((file) => vocabularySchema.parse(parseYaml(contentDir, file)));
  const vocabulary = Object.freeze({
    version: vocabularyFiles.map((file) => file.version).sort().join('+'),
    references: vocabularyFiles.flatMap((file) => file.references),
    entries: vocabularyFiles.flatMap((file) => file.entries),
  });
  const fileById = new Map(vocabularyFiles.flatMap((file) => file.entries.map((entry) => [entry.id, file])));
  const versionById = new Map([...fileById].map(([id, file]) => [id, file.version]));
  unique(vocabulary.entries.map((entry) => entry.id), 'Vocabulary');
  unique(vocabulary.references.map((reference) => reference.id), 'Vocabulary references');

  const vocabularyById = new Map(vocabulary.entries.map((entry) => [entry.id, Object.freeze(entry)]));
  const referenceIds = new Set(vocabulary.references.map((reference) => reference.id));

  for (const entry of vocabulary.entries) {
    if (!entry.surface_variants.some((form) => form.toLowerCase() === entry.target.toLowerCase())) {
      throw new Error(`Vocabulary ${entry.id} must include its canonical ${language.name} form in surface_variants`);
    }
    for (const referenceId of entry.reference_ids) {
      if (!referenceIds.has(referenceId)) throw new Error(`Vocabulary ${entry.id} references unknown source ${referenceId}`);
    }
  }

  const encounters = new Map();
  for (const file of yamlFiles(contentDir, `${pack}/encounters`)) {
    const encounter = encounterSchema.parse(parseYaml(contentDir, file));
    if (encounters.has(encounter.id)) throw new Error(`Encounter id ${encounter.id} is declared twice`);
    const character = characterSchema.parse(parseYaml(contentDir, encounter.character));
    validateObjectives(encounter, vocabularyById, referenceIds);
    // Round 009: narration is matched only against the vocabulary files this encounter's objectives draw on (whole
    // files), so one encounter's words never appear as chips or Spellbook entries in another's lines.
    const ambientIds = encounter.ambient_vocabulary_ids ?? [];
    validateAmbientVocabulary(encounter, ambientIds, vocabularyById);
    const files = new Set(encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids.map((id) => fileById.get(id))));
    const ambientEntries = Object.freeze(ambientIds.map((id) => vocabularyById.get(id)));
    // Round 019: ambient entries join one by one, not their whole file.
    const fileEntries = vocabularyFiles.filter((file) => files.has(file)).flatMap((file) => file.entries);
    const narrationEntries = Object.freeze([...fileEntries, ...ambientEntries.filter((entry) => !fileEntries.includes(entry))]);
    encounters.set(encounter.id, Object.freeze({ encounter, character, narrationEntries, ambientEntries }));
  }
  validatePartyConversations(encounters);
  unique([...encounters.values()].flatMap(({ encounter: e }) => (e.containment_file ? [e.containment_file.designation] : [])), 'Containment file designations');
  const defaultDefinition = encounters.get(defaultEncounterId);
  if (!defaultDefinition) throw new Error(`content/${pack}/language.yaml names unknown default_encounter ${defaultEncounterId}`);
  if (defaultDefinition.encounter.party_of) throw new Error(`content/${pack}/language.yaml default_encounter ${defaultEncounterId} is a party conversation`);
  const { encounter, character } = defaultDefinition;

  const world = loadWorld(contentDir, encounters);
  const fragments = loadFragments(contentDir, pack, encounters);
  return Object.freeze({
    language, styleGuide, onboarding, vocabulary, vocabularyById, world, encounters, fragments,
    defaultEncounterId,
    // The default encounter, for callers that know only one (the web client's start, verify:cli).
    encounter, character,
    entryVersion: (id) => versionById.get(id),
  });
}

// Round 030: a fragment is found once its `found_after` location encounter is complete. Each glossary word must
// occur in the text (apostrophes split words, so "albero" is found in "all'albero").
export const foldWords = (text) => ` ${String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim()} `;
function loadFragments(contentDir, pack, encounters) {
  const relativePath = `${pack}/lore/fragments.yaml`;
  if (!existsSync(resolve(contentDir, relativePath))) return Object.freeze([]);
  const { fragments } = fragmentsSchema.parse(parseYaml(contentDir, relativePath));
  unique(fragments.map((fragment) => fragment.id), 'Lore fragments');
  for (const fragment of fragments) {
    const home = encounters.get(fragment.found_after);
    if (!home) throw new Error(`Lore fragment ${fragment.id} names unknown encounter ${fragment.found_after}`);
    if (home.encounter.party_of) throw new Error(`Lore fragment ${fragment.id} must follow a location encounter, not ${fragment.found_after}`);
    if (fragment.after_conversations !== undefined
      && ![...encounters.values()].some(({ encounter }) => encounter.party_of === fragment.found_after)) {
      throw new Error(`Lore fragment ${fragment.id} counts conversations, but ${fragment.found_after} has no party conversation`);
    }
    const text = foldWords(fragment.text);
    for (const { word } of fragment.glossary) {
      if (!text.includes(foldWords(word))) throw new Error(`Lore fragment ${fragment.id} glosses "${word}", which is not in its text`);
    }
  }
  return Object.freeze(fragments.map((fragment) => Object.freeze({ ...fragment, glossary: Object.freeze(fragment.glossary.map((g) => Object.freeze({ ...g }))) })));
}

// Round 022: a party conversation continues a saveable character's location encounter, with the same character file.
function validatePartyConversations(encounters) {
  const homes = new Set();
  for (const { encounter, character } of encounters.values()) {
    if (!encounter.party_of) continue;
    if (homes.has(encounter.party_of)) throw new Error(`Encounter ${encounter.party_of} has more than one party conversation`);
    homes.add(encounter.party_of);
    const home = encounters.get(encounter.party_of);
    if (!home) throw new Error(`Party conversation ${encounter.id} names unknown encounter ${encounter.party_of}`);
    if (home.encounter.party_of) throw new Error(`Party conversation ${encounter.id} must name a location encounter, not ${encounter.party_of}`);
    if (home.encounter.character !== encounter.character) {
      throw new Error(`Party conversation ${encounter.id} must use the character of ${encounter.party_of} (${home.encounter.character})`);
    }
    if (character.saveable !== true) throw new Error(`Party conversation ${encounter.id} needs a saveable character; ${character.name} is not`);
  }
}

function yamlFiles(contentDir, relativeDir) {
  return readdirSync(resolve(contentDir, relativeDir)).filter((name) => name.endsWith('.yaml')).sort()
    .map((name) => `${relativeDir}/${name}`);
}

function validateAmbientVocabulary(encounter, ambientIds, vocabularyById) {
  unique(ambientIds, `Encounter ${encounter.id} ambient vocabulary`);
  const targets = new Set(encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids));
  const fold = (form) => normalizeAnswer(form, { stripAccents: true });
  const targetForms = [...targets].flatMap((id) => vocabularyById.get(id)?.surface_variants ?? []).map(fold);
  for (const id of ambientIds) {
    if (!vocabularyById.has(id)) throw new Error(`Encounter ${encounter.id} names unknown ambient vocabulary ${id}`);
    if (targets.has(id)) throw new Error(`Encounter ${encounter.id} ambient vocabulary ${id} is an objective target`);
    // No ambient form may be, or contain as a whole word, a form of an objective target (it would give it away).
    for (const form of vocabularyById.get(id).surface_variants.map(fold)) {
      const words = ` ${form} `;
      const clash = targetForms.find((target) => words.includes(` ${target} `) || ` ${target} `.includes(words));
      if (clash) throw new Error(`Encounter ${encounter.id} ambient vocabulary ${id} overlaps the objective target form "${clash}"`);
    }
  }
}

function validateObjectives(encounter, vocabularyById, referenceIds) {
  unique(encounter.objectives.map((objective) => objective.id), `Encounter ${encounter.id} objectives`);
  const objectiveIds = new Set(encounter.objectives.map((objective) => objective.id));
  encounter.objectives.forEach((objective, index) => {
    for (const id of objective.target_vocabulary_ids) {
      if (!vocabularyById.has(id)) throw new Error(`Objective ${objective.id} references unknown vocabulary ${id}`);
    }
    for (const group of objective.required_target_groups) {
      for (const id of group) {
        if (!objective.target_vocabulary_ids.includes(id)) {
          throw new Error(`Objective ${objective.id} required target ${id} is not an assessment target`);
        }
      }
    }
    for (const id of objective.assessment_reference_ids) {
      if (!referenceIds.has(id)) throw new Error(`Objective ${objective.id} references unknown source ${id}`);
    }
    const expectedNext = encounter.objectives[index + 1]?.id ?? null;
    if (objective.next_objective !== expectedNext || (objective.next_objective && !objectiveIds.has(objective.next_objective))) {
      throw new Error(`Objective ${objective.id} must point to the next ordered objective (${expectedNext ?? 'none'})`);
    }
  });
}

// The world is shared by every language pack: locations in content/world/locations/, paths in connections.yaml.
export function loadWorld(contentDir, encounters) {
  const locationsDir = resolve(contentDir, 'world', 'locations');
  const locations = readdirSync(locationsDir)
    .filter((name) => name.endsWith('.yaml'))
    .sort()
    .map((name) => {
      const location = locationSchema.parse(parseYaml(contentDir, `world/locations/${name}`));
      if (`${location.id}.yaml` !== name) throw new Error(`content/world/locations/${name} must declare id ${name.slice(0, -5)}`);
      return Object.freeze(location);
    });
  const connections = connectionsSchema.parse(parseYaml(contentDir, 'world/connections.yaml'));
  const byId = new Map(locations.map((location) => [location.id, location]));
  if (!byId.has(connections.start)) throw new Error(`World start ${connections.start} is not a known location`);

  const neighbours = new Map(locations.map((location) => [location.id, new Set()]));
  for (const [a, b] of connections.paths) {
    for (const id of [a, b]) if (!byId.has(id)) throw new Error(`World path ${a}–${b} names unknown location ${id}`);
    if (a === b) throw new Error(`World path ${a}–${b} joins a location to itself`);
    neighbours.get(a).add(b);
    neighbours.get(b).add(a);
  }
  const reached = new Set([connections.start]);
  const queue = [connections.start];
  while (queue.length) for (const next of neighbours.get(queue.shift())) if (!reached.has(next)) { reached.add(next); queue.push(next); }
  const unreachable = locations.filter((location) => !reached.has(location.id)).map((location) => location.id);
  if (unreachable.length) throw new Error(`World locations unreachable from ${connections.start}: ${unreachable.join(', ')}`);

  // Each encounter sits at exactly one place: the location it names, which names it back.
  for (const location of locations.filter((candidate) => candidate.encounter !== null)) {
    const definition = encounters.get(location.encounter);
    if (!definition) throw new Error(`Location ${location.id} names unknown encounter ${location.encounter}`);
    if (definition.encounter.location !== location.id) {
      throw new Error(`Location ${location.id} names encounter ${location.encounter}, which is set at ${definition.encounter.location}`);
    }
  }
  for (const { encounter } of encounters.values()) {
    if (encounter.party_of) continue; // round 022: party conversations are not on the map
    if (byId.get(encounter.location)?.encounter !== encounter.id) {
      throw new Error(`Encounter ${encounter.id} must be held by its location ${encounter.location}`);
    }
  }

  for (const location of locations) {
    const required = location.requires_completed;
    if (new Set(required).size !== required.length) throw new Error(`Location ${location.id} lists an encounter twice in requires_completed`);
    for (const id of required) {
      if (!encounters.has(id)) throw new Error(`Location ${location.id} requires unknown encounter ${id}`);
      if (encounters.get(id).encounter.party_of) throw new Error(`Location ${location.id} requires party conversation ${id}, which never completes on the map`);
      if (id === location.encounter) throw new Error(`Location ${location.id} requires its own encounter ${id}`);
    }
  }

  return Object.freeze({
    start: connections.start,
    locations,
    locationsById: byId,
    paths: connections.paths.map(([a, b]) => Object.freeze([a, b])),
    neighbours: new Map([...neighbours].map(([id, set]) => [id, Object.freeze([...set].sort())])),
  });
}

// Narrow compatibility helpers for scripts which used the Phase 1 loader.
export function loadCharacter() { return loadGameContent().character; }
export function loadEncounter() { return loadGameContent().encounter; }
export function loadStyleGuide() { return loadGameContent().styleGuide; }
