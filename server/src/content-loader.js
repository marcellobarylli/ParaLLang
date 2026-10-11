import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

const defaultContentDir = resolve(import.meta.dirname, '..', '..', 'content');
const cache = new Map();

const exampleSchema = z.object({ spanish: z.string().min(1), english: z.string().min(1) }).strict();
const vocabularyEntrySchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  kind: z.enum(['word', 'phrase']),
  spanish: z.string().min(1),
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

const encounterSchema = z.object({
  id: z.string().min(1),
  character: z.string().min(1),
  location: z.string().min(1),
  type: z.literal('dialogue'),
  initial_prompt_template: z.string().min(1),
  turn_prompt_template: z.string().min(1),
  defeat_condition: z.object({ type: z.string(), description: z.string().min(1) }).strict(),
  max_turns: z.number().int().positive(),
  escalation: z.object({ spanish_ratio_increase_per_turn: z.number().min(0) }).strict(),
  objectives: z.array(objectiveSchema).min(1),
}).strict();

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
    base_spanish_ratio: z.number().min(0).max(1),
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

export function loadGameContent({ contentDir = defaultContentDir, fresh = false } = {}) {
  if (!fresh && cache.has(contentDir)) return cache.get(contentDir);

  const vocabulary = vocabularySchema.parse(parseYaml(contentDir, 'language/vocabulary/gerald_coffee.yaml'));
  const character = characterSchema.parse(parseYaml(contentDir, 'characters/enemies/imp_coffee.yaml'));
  const encounter = encounterSchema.parse(parseYaml(contentDir, 'encounters/imp_coffee_greeting.yaml'));
  const styleGuide = styleGuideSchema.parse(parseYaml(contentDir, 'narration/style_guide.yaml'));

  unique(vocabulary.entries.map((entry) => entry.id), 'Vocabulary');
  unique(vocabulary.references.map((reference) => reference.id), 'Vocabulary references');
  unique(encounter.objectives.map((objective) => objective.id), 'Encounter objectives');

  const vocabularyById = new Map(vocabulary.entries.map((entry) => [entry.id, Object.freeze(entry)]));
  const referenceIds = new Set(vocabulary.references.map((reference) => reference.id));
  const objectiveIds = new Set(encounter.objectives.map((objective) => objective.id));

  for (const entry of vocabulary.entries) {
    if (!entry.surface_variants.some((form) => form.toLocaleLowerCase('es') === entry.spanish.toLocaleLowerCase('es'))) {
      throw new Error(`Vocabulary ${entry.id} must include its canonical Spanish form in surface_variants`);
    }
    for (const referenceId of entry.reference_ids) {
      if (!referenceIds.has(referenceId)) throw new Error(`Vocabulary ${entry.id} references unknown source ${referenceId}`);
    }
  }

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

  const content = Object.freeze({ character, encounter, styleGuide, vocabulary, vocabularyById });
  cache.set(contentDir, content);
  return content;
}

export function clearContentCache() { cache.clear(); }

// Narrow compatibility helpers for scripts which used the Phase 1 loader.
export function loadCharacter() { return loadGameContent().character; }
export function loadEncounter() { return loadGameContent().encounter; }
export function loadStyleGuide() { return loadGameContent().styleGuide; }
