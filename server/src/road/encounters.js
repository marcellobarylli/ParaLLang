// Round 144: a conversation of The Journey 2 as the encounter engine plays it. An activity of the pacing
// (pacing.js: a lesson, a review, a repair or a checkpoint) and the character of the site (characters.js) are made
// into a definition of the same shape as an authored encounter's ({ encounter, character, narrationEntries,
// ambientEntries }), so starting, grading, hints, hearts, the Spellbook and spaced review all work unchanged.
// Pure: the same road, site, step and activity give the same definition, so one that a restart forgot is built again.

import { worldFor } from '../content-loader.js';
import { hash } from './terrain.js';
import { CHECKPOINT_ROLES, REVIEW_ROLES, characterFor, placeName, roleFor } from './characters.js';
import { PACING } from './pacing.js';

export const ROAD_PLACE = Object.freeze({ id: 'the_long_way', name: 'The Journey 2: Journathan Returns (again)' });

const fill = (text, name) => String(text).replaceAll('{name}', name);

// Round 160 (issue #8): the legacy dungeons as nodes of the road. A unit of the curriculum ends at its gate, and the
// gate stands in one of the old dungeons: the site of the road where a gate is offered is a dungeon's node, and
// walking to it enters the dungeon. Which dungeon follows from the curriculum alone: the unit's place in it, taken
// round LEGACY_ORDER (the first unit's gate is Ta Prohm, in the jungle the road starts in). Nothing is drawn at random.
export const LEGACY_ORDER = Object.freeze(['ta_prohm', 'the_kiln', 'micromort_mountain']);
// Round 218: the gate that ends a level of the curriculum (A1 to A2, A2 to B1: the change that pulls the land, round
// 213) stands in Angkor Wat, whatever the turn of LEGACY_ORDER would give. The other gates go round LEGACY_ORDER as
// before, so none of them moves; Angkor Wat is in no turn.
export const LEVEL_GATE = 'angkor_wat';
const stageCefr = (curriculum, unit) => curriculum.stages?.find((stage) => stage.id === unit?.stageId)?.cefr ?? null;
/** Round 218: whether the unit at `index` is the last of its level (the next unit's level is another). */
export function endsLevel(curriculum, index) {
  const unit = curriculum.units[index];
  const next = curriculum.units[index + 1];
  return Boolean(unit && next) && stageCefr(curriculum, unit) !== stageCefr(curriculum, next);
}
const turnOf = (dungeons) => [...LEGACY_ORDER.filter((id) => dungeons?.has(id)), ...[...(dungeons?.keys() ?? [])].filter((id) => !LEGACY_ORDER.includes(id) && id !== LEVEL_GATE)];
const placed = (dungeon, site) => Object.freeze({ id: dungeon.id, name: dungeon.name, level: dungeon.level, site: Object.freeze({ id: site.id, name: site.name }) });
/** The dungeon a unit's gate stands in ({ id, name, level, site: { id, name } }, the site being its start), or null. */
export function legacyDungeonFor(dungeons, curriculum, unitId) {
  const known = turnOf(dungeons);
  const index = curriculum.units.findIndex((unit) => unit.id === unitId);
  if (!known.length || index < 0) return null;
  const dungeon = endsLevel(curriculum, index) && dungeons.has(LEVEL_GATE) ? dungeons.get(LEVEL_GATE) : dungeons.get(known[index % known.length]);
  const site = dungeon.sites.find((candidate) => candidate.id === dungeon.start) ?? dungeon.sites[0];
  return placed(dungeon, site);
}

/**
 * Round 185: the dungeon a gate of streamlined mode stands in, at the site of its `part`-th conversation (the start
 * first, then the dungeon's other sites in order), in the same shape as legacyDungeonFor's. The gates go round
 * LEGACY_ORDER as the units' gates do: the first gate (after units 1 to 3) is Ta Prohm's.
 */
export function legacyGateFor(dungeons, curriculum, gateId, part = 0) {
  const known = turnOf(dungeons);
  const index = curriculum.units.findIndex((unit) => unit.id === gateId);
  if (!known.length || index < 0) return null;
  const dungeon = endsLevel(curriculum, index) && dungeons.has(LEVEL_GATE) ? dungeons.get(LEVEL_GATE) : dungeons.get(known[Math.floor(index / PACING.gateEvery) % known.length]);
  const start = dungeon.sites.find((candidate) => candidate.id === dungeon.start) ?? dungeon.sites[0];
  const order = [start, ...dungeon.sites.filter((candidate) => candidate !== start)];
  const site = order[part % order.length];
  return placed(dungeon, site);
}

/**
 * Round 155 (issue #3): what the character of a site knows of the world. The road's region has two pools of things
 * noticed: ordinary people at the A levels, people who have seen more from B1 on. The draw is fixed by the seed, the
 * site and the step, like the character itself.
 */
export function roadWorld(knowledge, languageCode, { seed, node, step, cefr }) {
  const pools = knowledge?.regions[ROAD_PLACE.id]?.noticed;
  if (!pools) return null;
  const pool = /^A/i.test(cefr) ? pools.plain : pools.knowing;
  const noticed = pool[Math.min(pool.length - 1, Math.floor(hash(node.i * 71 + step * 3, node.j * 73 - step, seed + 909) * pool.length))];
  return worldFor(knowledge, languageCode, ROAD_PLACE.id, noticed);
}

/** The objectives an activity asks for, as the curriculum compiled them (with `{name}` still in their texts). */
export function objectivesOf(curriculum, activity) {
  if (activity.kind === 'lesson' || activity.kind === 'repair') return curriculum.lessonsById.get(activity.lessonId)?.lesson.objectives ?? [];
  return (activity.picks ?? []).map(([lessonId, objectiveId]) => curriculum.lessonsById.get(lessonId)?.lesson.objectives.find((objective) => objective.id === objectiveId)).filter(Boolean);
}

// The unit an activity belongs to: its own, or (a review) the unit the learner is in.
function unitOf(curriculum, activity, currentUnitId) {
  const byLesson = activity.lessonId ? curriculum.lessonsById.get(activity.lessonId)?.unit : null;
  return byLesson ?? curriculum.units.find((unit) => unit.id === (activity.unitId ?? currentUnitId)) ?? curriculum.units.at(-1);
}

/** What the map and the site card say of an activity at a site, without building its conversation. */
export function describeActivity({ curriculum, seed, node, step, activity, currentUnitId, dungeons = null }) {
  const unit = unitOf(curriculum, activity, currentUnitId);
  const stage = curriculum.stages.find((candidate) => candidate.id === unit.stageId);
  const lesson = activity.lessonId ? curriculum.lessonsById.get(activity.lessonId)?.lesson : null;
  const role = activity.kind === 'review' ? roleFor(seed, node, step, REVIEW_ROLES)
    : activity.kind === 'checkpoint' || activity.kind === 'gate' ? roleFor(seed, node, step, CHECKPOINT_ROLES)
      : roleFor(seed, node, step, unit.roles);
  // Round 185: a gate of streamlined mode is legacyGateFor's dungeon, at the site of its conversation.
  const gateDungeon = activity.kind === 'gate' ? legacyGateFor(dungeons, curriculum, activity.gateId, activity.part) : null;
  const title = activity.kind === 'lesson' ? lesson.title
    : activity.kind === 'gate' ? `The gate, ${(activity.part ?? 0) + 1} of ${activity.unitIds?.length ?? 1}: ${unit.title}`
    : activity.kind === 'unit' ? unit.title // round 173: streamlined mode, the whole unit at once
    : activity.kind === 'repair' ? `${lesson.title}, again`
      : activity.kind === 'checkpoint' ? `The gate: ${unit.title}` : 'Old words, mixed';
  const character = characterFor({ seed, node, step, role, ratio: stage.ratio, focus: { vocabulary: unit.title, grammar: unit.grammar } });
  // Round 160: a unit's gate stands in a legacy dungeon.
  const dungeon = activity.kind === 'checkpoint' ? legacyDungeonFor(dungeons, curriculum, unit.id) : gateDungeon;
  return { unit, stage, lesson, role, title, character, dungeon };
}

/**
 * The definition of the conversation of `activity` at `node`.
 *
 *   curriculum, language   the pack's curriculum and language
 *   seed, node, step       the road's seed, the site and the number of conversations finished before this one
 *   activity               { kind, lessonId?, unitId?, picks? }
 *   currentUnitId          the unit the learner is in (a review speaks at its stage's share of target language)
 */
export function buildRoadDefinition({ curriculum, language, seed, node, step, activity, currentUnitId, knowledge = null, dungeons = null }) {
  const { unit, stage, lesson, title, character, dungeon } = describeActivity({ curriculum, seed, node, step, activity, currentUnitId, dungeons });
  const first = character.name.split(' ')[0];
  const teaches = activity.kind === 'lesson' || activity.kind === 'repair' || activity.kind === 'unit';
  const source = objectivesOf(curriculum, activity);
  if (!source.length) throw new Error(`The activity ${JSON.stringify(activity)} has no objectives in this curriculum.`);
  const byId = curriculum.vocabulary.byId;
  const objectives = source.map((objective, index) => {
    const forms = objective.target_vocabulary_ids.map((id) => `"${byId.get(id).target}"`).join(', ');
    const ask = fill(objective.ask, first);
    const recall = `${first} gives the player a natural reason to do this: ${ask}. The player has met the words for it before. ${first} never says them (in dialogue or narration) before the player has, and does not tell the player what to say.`;
    return {
      id: objective.id,
      prompt: fill(objective.prompt, first),
      intent: teaches
        ? `${first} gives the player a natural reason to do this: ${ask}. The words for it (${forms}) are new to the player, so ${first} uses one or two of them in ${first}'s own lines first, as part of what ${first} is saying about ${first}'s own situation, and then leaves room for the player to use them back. Never as an instruction, never as what someone says or should say (no "everyone says X", no "I answer X", no quoted reply), and never in the very line that asks for them.`
        : recall,
      // Round 177: a taught objective whose words the learner had met when the conversation began is asked for as a
      // review's is: the character does not say the words first (learning-service.js, voiced).
      ...(teaches ? { recall_intent: recall } : {}),
      target_vocabulary_ids: objective.target_vocabulary_ids,
      required_target_groups: objective.required_target_groups,
      grammar_constraints: objective.grammar_constraints.map((line) => fill(line, first)),
      accepted_examples: objective.accepted_examples,
      negative_examples: objective.negative_examples,
      reference_meaning: fill(objective.reference_meaning, first),
      hint_limit: PACING.hints[activity.kind],
      next_objective: teaches ? (source[index + 1]?.id ?? null) : null,
      assessment_reference_ids: objective.assessment_reference_ids,
    };
  });
  // The words a line of this conversation may show as chips: a lesson's whole unit, a review's own objectives.
  const chipIds = new Set(teaches
    ? unit.lessons.flatMap((other) => other.objectives.flatMap((objective) => objective.target_vocabulary_ids))
    : objectives.flatMap((objective) => objective.target_vocabulary_ids));
  for (const objective of objectives) for (const id of objective.target_vocabulary_ids) chipIds.add(id);
  // Round 160: a gate in a legacy dungeon is set at that dungeon's first site.
  const place = dungeon ? `${dungeon.site.name}, ${dungeon.name}` : placeName(seed, node);
  return Object.freeze({
    encounter: Object.freeze({
      id: `road_${activity.kind}_${activity.lessonId ?? activity.unitId ?? 'mixed'}`,
      character: 'generated',
      location: ROAD_PLACE.id,
      type: 'dialogue',
      initial_prompt_template: 'encounter/greeting.txt',
      turn_prompt_template: 'encounter/dialogue_turn.txt',
      defeat_condition: { type: 'comprehension_and_response', description: `${title} (${unit.title})` },
      max_turns: 20,
      escalation: { target_ratio_increase_per_turn: PACING.escalation },
      resolved_message: character.farewell,
      objectives,
      ...(teaches ? {} : { objectives_unordered: true }),
    }),
    character,
    narrationEntries: Object.freeze([...chipIds].map((id) => byId.get(id))),
    ambientEntries: Object.freeze([]),
    // What sets a road conversation apart from an authored one (learning-service.js reads these).
    scope: curriculum.vocabulary.entries,
    world: roadWorld(knowledge, language.code, { seed, node, step, cefr: stage.cefr }), // round 155
    scene: Object.freeze({ name: dungeon ? dungeon.site.name : place, place: dungeon ? dungeon.name : ROAD_PLACE.name, seed }), // the seed gives the scene its weather (round 146)
    teachingNote: teaches
      ? `This is a first lesson. The player has never seen the ${language.name} words the learning data asks for. Model each of them naturally in ${first}'s own lines before expecting it back, about ${first}'s own situation; for this conversation that replaces the rule against using the words of an answer. Never tell the player what to say, and never put the words in a quoted reply or in what "people say".`
      : null,
    road: Object.freeze({
      kind: activity.kind, title, unitId: unit.id, unitTitle: unit.title, stageId: stage.id, cefr: stage.cefr,
      lessonId: lesson?.id ?? null, place, role: character.species, description: character.appearance,
      ...(dungeon ? { dungeon: { id: dungeon.id, name: dungeon.name } } : {}),
    }),
  });
}
