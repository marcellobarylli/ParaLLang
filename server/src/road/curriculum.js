// Round 144: the curriculum of The Journey 2. It is content: a language-neutral skeleton (content/curriculum/, one
// file per stage: what the learner can do after each unit, the lessons and what each asks of the player) and, per
// language pack, the words that do it (content/languages/<code>/curriculum/, one file per stage).
//
//   stage    a stretch of the CEFR scale (A1.1 ... B1.2) with the share of target language its characters speak
//   unit     one communicative function ("ordering", "saying what you did") with one grammar point
//   lesson   one conversation: two to four objectives, each met by saying one of a few target words or phrases
//
// The curriculum's vocabulary is its own: its ids are prefixed `c_` and it is matched apart from the market pack's
// (content.vocabulary), so the market's answer checks, lore texts and pinned versions are untouched. An objective is
// compiled into the shape the encounter engine already grades (content-loader.js's objectiveSchema); `{name}` stands
// for the character, who is generated per site (characters.js) and filled in by encounters.js.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';
import { matchCanonicalVocabulary } from '../language-engine.js';

export const CURRICULUM_PREFIX = 'c_';
const idSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);

const stageSchema = z.object({
  id: idSchema,
  cefr: z.enum(['A1', 'A2', 'B1', 'B2']),
  name: z.string().min(1),
  // The share of target language in a character's first line at this stage (it rises a little every turn).
  ratio: z.number().min(0.05).max(0.95),
  can_do: z.string().min(1),
  units: z.array(z.object({
    id: idSchema,
    title: z.string().min(1),
    can_do: z.string().min(1),
    grammar: z.string().min(1),
    // Who the player may meet in this unit, "Title: what they are like". The generator picks one per site.
    roles: z.array(z.string().regex(/^[^:]+: .+$/)).min(3),
    lessons: z.array(z.object({
      id: idSchema,
      title: z.string().min(1),
      objectives: z.array(z.object({
        id: idSchema,
        ask: z.string().min(1), // an imperative: "Greet {name}"
        cue: z.string().min(1).optional(), // what the character does that invites it
      }).strict()).min(2).max(4),
    }).strict()).min(2).max(5),
  }).strict()).min(1),
}).strict();

const packEntrySchema = z.object({
  t: z.string().min(1), // the target form
  k: z.enum(['word', 'phrase']).optional(),
  pos: z.string().min(1),
  en: z.array(z.string().min(1)).min(1),
  forms: z.array(z.string().min(1)).min(1).optional(),
  ex: z.tuple([z.string().min(1), z.string().min(1)]), // an example and its English
  n: z.string().min(1).optional(), // a usage note
}).strict();
const packObjectiveSchema = z.object({
  // One list: any of these words meets the objective. A list of lists: one word from each.
  say: z.union([z.array(idSchema).min(1), z.array(z.array(idSchema).min(1)).min(1)]),
  examples: z.array(z.string().min(1)).min(1),
}).strict();
const packStageSchema = z.object({
  stage: idSchema,
  version: z.string().min(1),
  grammar: z.record(idSchema, z.string().min(1)).default({}),
  lessons: z.record(idSchema, z.record(idSchema, packObjectiveSchema)),
  vocabulary: z.record(idSchema, packEntrySchema),
}).strict();

// A form as the matcher compares it: without accents, in lower case, apostrophes alike, white space as one space.
const foldForm = (form) => String(form).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[\u2019\u2018\u02BC\u0060\u00B4\u2032]/gu, "'").replace(/\s+/gu, ' ').trim();
const yamlFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.yaml')).sort() : []);
function parse(path) {
  try { return yaml.load(readFileSync(path, 'utf8')); }
  catch (error) { throw new Error(`Unable to load ${path}: ${error.message}`); }
}
function deepFreeze(value) {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) deepFreeze(item); Object.freeze(value); }
  return value;
}

/**
 * The curriculum of a language pack, or null when the pack has none (the road is then closed in that language).
 *
 *   stages          [{ id, cefr, name, ratio, canDo, units: [unit] }], in order
 *   units           every unit in order: { id, title, canDo, grammar, roles: [{ title, premise }], stageId, lessons, index }
 *   lessonsById     Map(lessonId -> { lesson, unit, stage })
 *   vocabulary      { entries, byId, version(id) }: the curriculum's own entries (ids prefixed c_)
 */
export function loadCurriculum({ contentDir, language }) {
  const skeletonDir = resolve(contentDir, 'curriculum');
  const packDir = resolve(contentDir, 'languages', language.code, 'curriculum');
  const packFiles = yamlFiles(packDir);
  if (!yamlFiles(skeletonDir).length || !packFiles.length) return null;

  const packs = new Map();
  for (const file of packFiles) {
    const pack = packStageSchema.parse(parse(resolve(packDir, file)));
    if (packs.has(pack.stage)) throw new Error(`Curriculum (${language.code}): stage ${pack.stage} has two files`);
    packs.set(pack.stage, pack);
  }

  // Vocabulary first: every stage of the language shares one namespace, so a later stage may reuse an earlier word.
  const entries = [];
  const versionById = new Map();
  for (const pack of packs.values()) {
    for (const [bareId, raw] of Object.entries(pack.vocabulary)) {
      const id = `${CURRICULUM_PREFIX}${bareId}`;
      if (versionById.has(id)) throw new Error(`Curriculum (${language.code}): vocabulary ${bareId} is defined twice`);
      const forms = raw.forms ?? [raw.t];
      if (!forms.some((form) => form.toLowerCase() === raw.t.toLowerCase())) throw new Error(`Curriculum (${language.code}): vocabulary ${bareId} must list its own form "${raw.t}" among its forms`);
      versionById.set(id, pack.version);
      entries.push({
        id, kind: raw.k ?? (raw.t.trim().includes(' ') ? 'phrase' : 'word'), target: raw.t, part_of_speech: raw.pos,
        accepted_translations: raw.en, surface_variants: forms, accent_insensitive: false,
        example: { target: raw.ex[0], english: raw.ex[1] }, ...(raw.n ? { note: raw.n } : {}),
        reference_ids: [`curriculum-${language.code}`],
      });
    }
  }
  // No two entries may share a form, and each form must be read as its own entry (the matcher's rule for the market's
  // vocabulary, language-engine.js's vocabularyFormConflicts). With some hundreds of entries the shared forms are
  // found by folding each form once; each form is then read against its own entry alone.
  const owner = new Map();
  for (const entry of entries) {
    for (const variant of entry.surface_variants) {
      const folded = foldForm(variant);
      const other = owner.get(folded);
      if (other && other !== entry.id) throw new Error(`Curriculum (${language.code}): the form "${variant}" belongs to both ${other} and ${entry.id}; two entries may not share a form`);
      owner.set(folded, entry.id);
      // Read alone, a form is matched whole unless it is padded or holds a run of spaces (the matcher's patterns
      // start and end at the form's own first and last character).
      if (!folded || variant !== variant.trim() || /\s{2,}/u.test(variant)) throw new Error(`Curriculum (${language.code}): the form "${variant}" of ${entry.id} is empty, padded or holds a run of spaces`);
    }
  }
  const byId = new Map(entries.map((entry) => [entry.id, deepFreeze(entry)]));
  const allEntries = Object.freeze([...byId.values()]); // one list for every match, so its patterns are made once

  const stages = [];
  const units = [];
  const lessonsById = new Map();
  const seenUnits = new Set();
  for (const file of yamlFiles(skeletonDir)) {
    const stage = stageSchema.parse(parse(resolve(skeletonDir, file)));
    const pack = packs.get(stage.id);
    // A stage the pack has not written yet ends the curriculum there: stages are played in order.
    if (!pack) break;
    const stageOut = { id: stage.id, cefr: stage.cefr, name: stage.name, ratio: stage.ratio, canDo: stage.can_do, units: [] };
    for (const unit of stage.units) {
      if (seenUnits.has(unit.id)) throw new Error(`Curriculum: unit ${unit.id} is declared twice`);
      seenUnits.add(unit.id);
      const unitOut = {
        id: unit.id, title: unit.title, canDo: unit.can_do, grammar: pack.grammar[unit.id] ?? unit.grammar,
        roles: unit.roles.map((role) => { const at = role.indexOf(': '); return { title: role.slice(0, at), premise: role.slice(at + 2) }; }),
        stageId: stage.id, index: units.length, lessons: [],
      };
      for (const lesson of unit.lessons) {
        if (lessonsById.has(lesson.id)) throw new Error(`Curriculum: lesson ${lesson.id} is declared twice`);
        const words = pack.lessons[lesson.id];
        if (!words) throw new Error(`Curriculum (${language.code}): lesson ${lesson.id} has no words in stage ${stage.id}`);
        const extra = Object.keys(words).filter((id) => !lesson.objectives.some((objective) => objective.id === id));
        if (extra.length) throw new Error(`Curriculum (${language.code}): lesson ${lesson.id} has words for unknown objectives: ${extra.join(', ')}`);
        const lessonOut = { id: lesson.id, title: lesson.title, unitId: unit.id, objectives: [] };
        for (const objective of lesson.objectives) {
          const data = words[objective.id];
          if (!data) throw new Error(`Curriculum (${language.code}): objective ${lesson.id}.${objective.id} has no words`);
          lessonOut.objectives.push(compileObjective({ language, lesson, objective, data, byId, entries: allEntries }));
        }
        unitOut.lessons.push(lessonOut);
        lessonsById.set(lesson.id, { lesson: lessonOut, unit: unitOut, stage: stageOut });
      }
      stageOut.units.push(unitOut);
      units.push(unitOut);
    }
    const unknown = Object.keys(pack.lessons).filter((id) => !stage.units.some((u) => u.lessons.some((l) => l.id === id)));
    if (unknown.length) throw new Error(`Curriculum (${language.code}): stage ${stage.id} has words for unknown lessons: ${unknown.join(', ')}`);
    stages.push(stageOut);
  }
  if (!stages.length) return null;
  return deepFreeze({
    stages, units, lessonsById,
    vocabulary: { entries: allEntries, byId, versionOf: (id) => versionById.get(id) },
    reference: { id: `curriculum-${language.code}`, title: `ParaLLang curriculum, ${language.name} (authored; awaits the owner's review)`, url: 'https://github.com/marcellobarylli/ParaLLang/blob/main/docs/curriculum.md' },
  });
}

// One skeleton objective with a pack's words, in the engine's shape. `{name}` is left in the texts.
function compileObjective({ language, lesson, objective, data, byId, entries }) {
  const where = `${lesson.id}.${objective.id}`;
  const groups = (Array.isArray(data.say[0]) ? data.say : [data.say]).map((group) => group.map((bare) => {
    const id = `${CURRICULUM_PREFIX}${bare}`;
    if (!byId.has(id)) throw new Error(`Curriculum (${language.code}): objective ${where} names unknown vocabulary ${bare}`);
    return id;
  }));
  const targetIds = [...new Set(groups.flat())];
  // The engine passes an objective only on evidence it can find in the answer. Every authored example must hold a
  // form from each group, read by the same matcher (so a longer phrase of another entry cannot hide it).
  for (const example of data.examples) {
    const found = new Set(matchCanonicalVocabulary(example, entries).map((match) => match.id));
    const missing = groups.find((group) => !group.some((id) => found.has(id)));
    if (missing) throw new Error(`Curriculum (${language.code}): the example "${example}" of ${where} holds none of ${missing.map((id) => id.slice(CURRICULUM_PREFIX.length)).join(', ')} (it reads as: ${[...found].join(', ') || 'nothing'})`);
  }
  const first = byId.get(targetIds[0]);
  const forms = targetIds.map((id) => `"${byId.get(id).target}"`).join(', ');
  const ask = objective.ask.replace(/[.!?]+$/, '');
  return {
    id: `${lesson.id}__${objective.id}`,
    lessonId: lesson.id,
    ask,
    cue: objective.cue ?? null,
    prompt: `${objective.cue ? `${objective.cue} ` : ''}${ask}, using ${language.name}.`,
    target_vocabulary_ids: targetIds,
    required_target_groups: groups,
    grammar_constraints: [
      `The player does this in their own words, in ${language.name}: ${ask}. The answer holds ${groups.length > 1 ? 'one form from each group of' : 'one of'}: ${forms}.`,
      'Reject English-only answers, quotations, definitions of a word, and lines that report someone else\'s words.',
    ],
    accepted_examples: data.examples,
    negative_examples: [
      { text: first.example.english, reason: `English-only; it does not use ${language.name}.` },
      { text: `"${first.target}" means ${first.accepted_translations[0]}.`, reason: 'It discusses the word instead of using it.' },
    ],
    reference_meaning: `The player does this: ${ask}.`,
    assessment_reference_ids: [`curriculum-${language.code}`],
  };
}
