// Round 144: the pacing of the curriculum: what the next conversation should be. Pure: it reads the curriculum
// (curriculum.js) and a learner's progress and never writes. The numbers are a first setting from the sources read for
// the round (docs/curriculum.md gives each rule its source); none has been tuned by play.
//
// A conversation is one of four kinds:
//
//   lesson      the next new lesson of the current unit: new words, which the character models before asking for them
//   review      three objectives from earlier lessons, from at least two units when there are two (interleaving),
//               cards that are due first; no new words, and the character does not say the answers first (retrieval)
//   repair      a lesson that went badly, again, with someone else, after a gap
//   checkpoint  the unit's gate: one objective from each of its lessons and some from earlier units, without hints,
//               taken at least one conversation after the unit's last lesson (a test after a delay, not straight
//               after teaching). The next unit opens at PACING.checkpointPass.
//   unit        (round 173, streamlined mode) the whole unit in one conversation: the first objective of each of its
//               lessons, taught as a lesson is. Finishing it completes the unit, whatever the score, and the next
//               conversation is the next unit's. No reviews, repairs or gates until the curriculum is finished.
//
// How often a review comes depends on how the last conversations went: the target is about 85 % of objectives met
// cleanly. Above PACING.easyAbove reviews thin out, below PACING.hardBelow each new lesson is followed by one.

export const PACING = Object.freeze({
  targetSuccess: 0.85,
  easyAbove: 0.92,
  hardBelow: 0.75,
  window: 5, // the conversations the success rate is taken over
  newPerReview: Object.freeze({ easy: 3, normal: 2, hard: 1 }), // new lessons between two reviews
  reviewObjectives: 3,
  repairBelow: 0.6, // a lesson that scored below this is offered again ...
  repairGap: 2, // ... once this many conversations have passed
  checkpointPass: 0.8,
  checkpointGap: 1, // conversations between a unit's last lesson (or a failed try) and its checkpoint
  hints: Object.freeze({ lesson: 3, unit: 3, repair: 2, review: 1, checkpoint: 0 }),
  escalation: 0.05, // the share of target language rises by this much per turn
  recent: 8, // scores kept
});

export const emptyProgress = () => ({ lessons: {}, checkpoints: {}, recent: [], sinceReview: 0 });

/**
 * A conversation's score: the share of its objectives met cleanly. One met by a correction or after a hint counts half.
 * Round 154: one not met at all (a light exchange that ran out of turns) counts nothing.
 */
export function scoreOf({ total, corrected = 0, hinted = 0, missed = 0 }) {
  if (!(total > 0)) return 0;
  const met = Math.max(0, total - missed);
  return Math.max(0, Math.min(1, (met - 0.5 * Math.min(met, corrected + hinted)) / total));
}

/** The mean score of the last conversations, or null before there are two. */
export function successRate(progress) {
  const recent = (progress.recent ?? []).slice(-PACING.window);
  return recent.length < 2 ? null : recent.reduce((sum, value) => sum + value, 0) / recent.length;
}

const lessonState = (progress, id) => progress.lessons?.[id] ?? null;
const isDone = (progress, id) => (lessonState(progress, id)?.done ?? 0) > 0;
const passedUnit = (progress, unit) => progress.checkpoints?.[unit.id]?.passed === true;

/**
 * Round 173: the progress as streamlined mode reads it: a unit of which any lesson was finished (one conversation
 * covered it) counts as complete. Pure; marks such a unit's checkpoint `streamlined: true`.
 */
export function streamlineProgress(curriculum, progress, step) {
  const touched = curriculum.units.filter((unit) => !passedUnit(progress, unit) && unit.lessons.some((lesson) => isDone(progress, lesson.id)));
  if (!touched.length) return progress;
  const checkpoints = { ...(progress.checkpoints ?? {}) };
  for (const unit of touched) {
    const before = checkpoints[unit.id];
    checkpoints[unit.id] = { tries: before?.tries ?? 0, best: before?.best ?? 0, last: before?.last ?? 0, passed: true, step: before?.step ?? step, streamlined: true };
  }
  return { ...progress, checkpoints };
}

/** Round 173: the objectives of a unit conversation (streamlined mode): the first of each of the unit's lessons. */
export function composeUnit(curriculum, unitId) {
  const unit = curriculum.units.find((candidate) => candidate.id === unitId);
  return unit ? unit.lessons.map((lesson) => [lesson.id, lesson.objectives[0].id]) : [];
}

/** Where the learner is: the first unit whose checkpoint is not passed, and the totals. */
export function position(curriculum, progress) {
  const unit = curriculum.units.find((candidate) => !passedUnit(progress, candidate)) ?? null;
  const lessons = curriculum.units.flatMap((candidate) => candidate.lessons);
  return {
    unit,
    complete: unit === null,
    lessonsDone: lessons.filter((lesson) => isDone(progress, lesson.id)).length,
    lessonsTotal: lessons.length,
    unitsDone: curriculum.units.filter((candidate) => passedUnit(progress, candidate)).length,
    unitsTotal: curriculum.units.length,
  };
}

// The lessons the learner has finished at least once, in curriculum order.
const doneLessons = (curriculum, progress) => curriculum.units.flatMap((unit) => unit.lessons).filter((lesson) => isDone(progress, lesson.id));

/**
 * What may be played now, the recommended conversation first: [{ kind, lessonId?, unitId?, why }]. `step` is the
 * number of conversations finished so far. On rails the first is taken; on the map the others are offered beside it.
 * Round 173: `streamlined` offers only the current unit, in one conversation, at every site.
 */
export function plan(curriculum, progress, step, { streamlined = false } = {}) {
  const pos = position(curriculum, progress);
  if (streamlined && !pos.complete) return [{ kind: 'unit', unitId: pos.unit.id, why: 'The next exercise, in one conversation.' }];
  const done = doneLessons(curriculum, progress);
  const reviewable = done.length >= 2;
  const rate = successRate(progress);
  const pace = rate === null ? 'normal' : rate >= PACING.easyAbove ? 'easy' : rate < PACING.hardBelow ? 'hard' : 'normal';
  const weak = [...done]
    .filter((lesson) => lessonState(progress, lesson.id).last < PACING.repairBelow && step - lessonState(progress, lesson.id).step >= PACING.repairGap)
    .sort((a, b) => lessonState(progress, a.id).last - lessonState(progress, b.id).last)[0] ?? null;
  const review = reviewable ? { kind: 'review', why: 'Earlier words, mixed, so they stay.' } : null;
  const repair = weak ? { kind: 'repair', lessonId: weak.id, unitId: weak.unitId, why: 'This one went badly last time. Again, with someone else.' } : null;
  const options = [];
  const add = (activity) => { if (activity && !options.some((other) => other.kind === activity.kind && other.lessonId === activity.lessonId)) options.push(activity); };

  if (pos.complete) {
    // The curriculum is finished: the road goes on as review and repair.
    add(repair);
    add(review);
    const oldest = [...done].sort((a, b) => lessonState(progress, a.id).step - lessonState(progress, b.id).step)[0];
    if (oldest) add({ kind: 'repair', lessonId: oldest.id, unitId: oldest.unitId, why: 'An old lesson, for the pleasure of it.' });
    return options;
  }

  const { unit } = pos;
  const pending = unit.lessons.filter((lesson) => !isDone(progress, lesson.id));
  if (!pending.length) {
    const checkpoint = progress.checkpoints?.[unit.id] ?? null;
    // Counted from the last try, or before the first try from when the unit's last lesson was first finished (a
    // repair in between is the corrective conversation, not new teaching).
    const taught = Math.max(...unit.lessons.map((lesson) => lessonState(progress, lesson.id).first ?? lessonState(progress, lesson.id).step));
    const since = step - (checkpoint ? checkpoint.step : taught);
    const gate = { kind: 'checkpoint', unitId: unit.id, why: checkpoint ? 'The gate again, with different questions.' : 'The gate of this unit: everything it taught, without hints.' };
    // After a failed try, the unit's weakest lesson is the corrective conversation.
    const corrective = checkpoint && !checkpoint.passed
      ? [...unit.lessons].sort((a, b) => lessonState(progress, a.id).last - lessonState(progress, b.id).last)[0] : null;
    const fix = corrective ? { kind: 'repair', lessonId: corrective.id, unitId: unit.id, why: 'Before the gate again: the lesson that needs it most.' } : null;
    // The gate is a test after a delay: at least PACING.checkpointGap conversations after the last lesson or try.
    if (since >= PACING.checkpointGap) { add(gate); add(fix ?? repair); add(review); }
    else { add(fix ?? repair ?? review); add(review); }
    if (!options.length) add(gate); // nothing to review yet (a unit of one lesson at the very start)
    return options;
  }

  const next = { kind: 'lesson', lessonId: pending[0].id, unitId: unit.id, why: 'New words.' };
  const reviewNow = (progress.sinceReview ?? 0) >= PACING.newPerReview[pace] && (repair || review);
  if (reviewNow) { add(repair ?? review); add(next); add(review); }
  else { add(next); add(repair); add(review); }
  return options;
}

/**
 * The objectives of a review: PACING.reviewObjectives of them, each as [lessonId, objectiveId]. Lessons with a card
 * due come first, then the weakest, then those not seen for longest; a second unit is brought in when there is one.
 * `isDue(objective)` says whether any card of the objective's words is due.
 */
export function composeReview(curriculum, progress, step, isDue = () => false) {
  const done = doneLessons(curriculum, progress);
  const order = done.map((lesson, index) => ({
    lesson, index,
    due: lesson.objectives.filter((objective) => isDue(objective)),
    state: lessonState(progress, lesson.id),
  })).sort((a, b) => (b.due.length > 0) - (a.due.length > 0)
    || a.state.last - b.state.last
    || (a.state.seen ?? a.state.step) - (b.state.seen ?? b.state.step)
    || a.index - b.index);
  const picks = [];
  const used = new Set();
  const units = new Set();
  const take = (entry) => {
    const pool = entry.due.length ? entry.due : entry.lesson.objectives;
    const free = pool.filter((objective) => !picks.some(([, id]) => id === objective.id));
    const objective = free[(step + entry.index) % Math.max(1, free.length)] ?? null;
    if (!objective) return false;
    picks.push([entry.lesson.id, objective.id]);
    used.add(entry.lesson.id);
    units.add(entry.lesson.unitId);
    return true;
  };
  while (picks.length < PACING.reviewObjectives) {
    const fresh = order.filter((entry) => !used.has(entry.lesson.id));
    // Interleave: while only one unit is in the review, a lesson of another unit goes first.
    const other = units.size === 1 ? fresh.find((entry) => !units.has(entry.lesson.unitId)) : null;
    const entry = other ?? fresh[0] ?? order.find((candidate) => candidate.lesson.objectives.some((objective) => !picks.some(([, id]) => id === objective.id)));
    if (!entry || !take(entry)) break;
  }
  return picks;
}

/**
 * The objectives of a unit's checkpoint: one from each of its lessons (a different one on each try), one from the
 * unit before, and at the end of a stage one from each of up to three other units of the stage.
 */
export function composeCheckpoint(curriculum, progress, unitId) {
  const unit = curriculum.units.find((candidate) => candidate.id === unitId);
  if (!unit) return [];
  const tries = progress.checkpoints?.[unitId]?.tries ?? 0;
  const one = (lesson, turn) => [lesson.id, lesson.objectives[(tries + turn) % lesson.objectives.length].id];
  const picks = unit.lessons.map((lesson, turn) => one(lesson, turn));
  const stageUnits = curriculum.units.filter((candidate) => candidate.stageId === unit.stageId);
  const lastOfStage = stageUnits.at(-1).id === unit.id;
  const earlier = lastOfStage
    ? stageUnits.filter((candidate) => candidate.id !== unit.id).slice(-3)
    : curriculum.units.slice(Math.max(0, unit.index - 1), unit.index);
  earlier.forEach((other, turn) => { const lesson = other.lessons[(tries + turn) % other.lessons.length]; picks.push(one(lesson, turn + 1)); });
  return picks;
}

/** The progress after a conversation of `activity` ({ kind, lessonId?, unitId?, picks? }) scored `score`, as conversation number `step`. */
export function record(progress, activity, score, step) {
  const next = {
    lessons: { ...(progress.lessons ?? {}) },
    checkpoints: { ...(progress.checkpoints ?? {}) },
    recent: [...(progress.recent ?? []), score].slice(-PACING.recent),
    sinceReview: activity.kind === 'lesson' ? (progress.sinceReview ?? 0) + 1 : 0,
  };
  const touch = (lessonId, change) => {
    const before = next.lessons[lessonId];
    if (!before && !change.done) return; // a review cannot finish a lesson that was never taught
    next.lessons[lessonId] = { done: 0, best: 0, last: 0, step, ...(before ?? {}), ...change, seen: step };
  };
  if (activity.kind === 'unit') {
    // Round 173: the whole unit in one conversation: each of its lessons counts as done, and the unit is complete.
    for (const lessonId of new Set((activity.picks ?? []).map(([id]) => id))) {
      const before = next.lessons[lessonId];
      touch(lessonId, { done: (before?.done ?? 0) + 1, best: Math.max(before?.best ?? 0, score), last: score, step, first: before?.first ?? before?.step ?? step });
    }
    const before = next.checkpoints[activity.unitId];
    next.checkpoints[activity.unitId] = { tries: (before?.tries ?? 0) + 1, best: Math.max(before?.best ?? 0, score), last: score, passed: true, step, streamlined: true };
  } else if (activity.kind === 'lesson' || activity.kind === 'repair') {
    const before = next.lessons[activity.lessonId];
    touch(activity.lessonId, { done: (before?.done ?? 0) + 1, best: Math.max(before?.best ?? 0, score), last: score, step, first: before?.first ?? before?.step ?? step });
  } else {
    for (const [lessonId] of activity.picks ?? []) touch(lessonId, {});
  }
  if (activity.kind === 'checkpoint') {
    const before = next.checkpoints[activity.unitId];
    next.checkpoints[activity.unitId] = {
      tries: (before?.tries ?? 0) + 1, best: Math.max(before?.best ?? 0, score), last: score,
      passed: before?.passed === true || score >= PACING.checkpointPass, step,
    };
  }
  return next;
}

/** The curriculum with the learner's marks, for the "where am I" view. */
export function overview(curriculum, progress) {
  const pos = position(curriculum, progress);
  const rate = successRate(progress);
  return {
    stages: curriculum.stages.map((stage) => ({
      id: stage.id, cefr: stage.cefr, name: stage.name, canDo: stage.canDo.trim(),
      units: stage.units.map((unit) => {
        const checkpoint = progress.checkpoints?.[unit.id] ?? null;
        return {
          id: unit.id, title: unit.title, canDo: unit.canDo, grammar: unit.grammar,
          state: checkpoint?.passed ? 'done' : pos.unit?.id === unit.id ? 'current' : 'locked',
          lessons: unit.lessons.map((lesson) => {
            const state = lessonState(progress, lesson.id);
            return { id: lesson.id, title: lesson.title, done: state?.done ?? 0, best: state?.best ?? null, last: state?.last ?? null };
          }),
          checkpoint: checkpoint ? { tries: checkpoint.tries, best: checkpoint.best, passed: checkpoint.passed } : { tries: 0, best: null, passed: false },
        };
      }),
    })),
    position: pos.unit ? { stageId: pos.unit.stageId, unitId: pos.unit.id, unitTitle: pos.unit.title, cefr: curriculum.stages.find((stage) => stage.id === pos.unit.stageId).cefr } : null,
    complete: pos.complete,
    totals: { lessonsDone: pos.lessonsDone, lessonsTotal: pos.lessonsTotal, unitsDone: pos.unitsDone, unitsTotal: pos.unitsTotal },
    successRate: rate === null ? null : Math.round(rate * 100) / 100,
    target: PACING.targetSuccess,
  };
}
