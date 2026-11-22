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
export function describeActivity({ curriculum, seed, node, step, activity, currentUnitId }) {
  const unit = unitOf(curriculum, activity, currentUnitId);
  const stage = curriculum.stages.find((candidate) => candidate.id === unit.stageId);
  const lesson = activity.lessonId ? curriculum.lessonsById.get(activity.lessonId)?.lesson : null;
  const role = activity.kind === 'review' ? roleFor(seed, node, step, REVIEW_ROLES)
    : activity.kind === 'checkpoint' ? roleFor(seed, node, step, CHECKPOINT_ROLES)
      : roleFor(seed, node, step, unit.roles);
  const title = activity.kind === 'lesson' ? lesson.title
    : activity.kind === 'repair' ? `${lesson.title}, again`
      : activity.kind === 'checkpoint' ? `The gate: ${unit.title}` : 'Old words, mixed';
  const character = characterFor({ seed, node, step, role, ratio: stage.ratio, focus: { vocabulary: unit.title, grammar: unit.grammar } });
  return { unit, stage, lesson, role, title, character };
}

/**
 * The definition of the conversation of `activity` at `node`.
 *
 *   curriculum, language   the pack's curriculum and language
 *   seed, node, step       the road's seed, the site and the number of conversations finished before this one
 *   activity               { kind, lessonId?, unitId?, picks? }
 *   currentUnitId          the unit the learner is in (a review speaks at its stage's share of target language)
 */
export function buildRoadDefinition({ curriculum, language, seed, node, step, activity, currentUnitId, knowledge = null }) {
  const { unit, stage, lesson, title, character } = describeActivity({ curriculum, seed, node, step, activity, currentUnitId });
  const first = character.name.split(' ')[0];
  const teaches = activity.kind === 'lesson' || activity.kind === 'repair';
  const source = objectivesOf(curriculum, activity);
  if (!source.length) throw new Error(`The activity ${JSON.stringify(activity)} has no objectives in this curriculum.`);
  const byId = curriculum.vocabulary.byId;
  const objectives = source.map((objective, index) => {
    const forms = objective.target_vocabulary_ids.map((id) => `"${byId.get(id).target}"`).join(', ');
    const ask = fill(objective.ask, first);
    return {
      id: objective.id,
      prompt: fill(objective.prompt, first),
      intent: teaches
        ? `${first} gives the player a natural reason to do this: ${ask}. The words for it (${forms}) are new to the player, so ${first} uses one or two of them in ${first}'s own lines first, as part of what ${first} is saying and never as an instruction, and then leaves room for the player to use them back.`
        : `${first} gives the player a natural reason to do this: ${ask}. The player has learned the words for it before. ${first} never says them (in dialogue or narration) before the player has, and does not tell the player what to say.`,
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
  const place = placeName(seed, node);
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
    scene: Object.freeze({ name: place, place: ROAD_PLACE.name, seed }), // the seed gives the scene its weather (round 146)
    teachingNote: teaches
      ? `This is a first lesson. The player has never seen the ${language.name} words the learning data asks for. Model each of them naturally in ${first}'s own lines before expecting it back; for this conversation that replaces the rule against using the words of an answer. Never tell the player what to say.`
      : null,
    road: Object.freeze({
      kind: activity.kind, title, unitId: unit.id, unitTitle: unit.title, stageId: stage.id, cefr: stage.cefr,
      lessonId: lesson?.id ?? null, place, role: character.species, description: character.appearance,
    }),
  });
}
