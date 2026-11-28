// Round 214: the breathing played over the conversation panel while a reply is on its way (it replaces round 203's
// shooting game). A breath is four seconds in and six out: six breaths a minute, the rate at which slow breathing
// most reliably raises heart-rate variability, with the out-breath the longer (docs/rounds/214/findings.md has the
// sources and how far they go). The player holds the panel for the breath in, lets go where it turns, and presses
// again where the breath out ends. Each turn has a window of tolerance around it and a best moment in its middle.
//
// The breath is a pacer: it starts with the answer and keeps its own time whatever the player does. There are at
// least `minCycles` whole breaths; after that the breath in which the reply is ready is the last. It always ends at
// the end of a breath out.
//
// This file is the breathing alone: no canvas and no clock of its own. `stepBreath` moves it on by `dt` seconds.
export const BREATH = Object.freeze({
  inhale: 4, // seconds
  exhale: 6,
  minCycles: 3,
  tolerance: 0.6, // seconds either side of a turn within which a press or a release is in time,
  perfect: 0.2, // and within which it is at the best moment
  markFor: 1.8, // seconds a kept turn's ripple lasts
  lead: 15 / 360 * 10, // the light starts 15 degrees of the ring before the breath in, a moment to prepare
  maxStep: 0.1,
});
export const BREATH_CYCLE = BREATH.inhale + BREATH.exhale;

export function newBreath() {
  return { time: -BREATH.lead, cycle: 0, phase: 'in', t: -BREATH.lead, held: false, closing: false, done: false, kept: 0, perfect: 0, warmth: 0, marks: [], judged: [] };
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** How full the breath is, 0 (out) to 1 (in), eased so that it slows into each turn. */
export function breathLevel(game) {
  const ease = (share) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(share, 0, 1));
  return game.phase === 'in' ? ease(game.t / BREATH.inhale) : 1 - ease(game.t / BREATH.exhale);
}

/** How far round the breath is, 0 to 1: 0 is the start of the breath in, `BREATH_TURN` where it turns. */
export const BREATH_TURN = BREATH.inhale / BREATH_CYCLE;
export function breathProgress(game) {
  return clamp((game.phase === 'in' ? game.t : BREATH.inhale + game.t) / BREATH_CYCLE, -BREATH.lead / BREATH_CYCLE, 1);
}

/** 'perfect', 'good' or null for a press or a release `delta` seconds from its turn. */
export function gradeOf(delta) {
  const off = Math.abs(delta);
  return off <= BREATH.perfect ? 'perfect' : off <= BREATH.tolerance ? 'good' : null;
}

// The turn a press or a release at `time` belongs to, and how far off it is. The press that opens the first breath
// is not judged (the thumb has only just left the Send button), nor is a press once the last breath is going out.
function judge(game, time, held) {
  const from = held ? 0 : BREATH.inhale;
  const index = Math.max(0, Math.round((time - from) / BREATH_CYCLE));
  if (held && (index === 0 || game.closing)) return null;
  const key = `${held ? 'press' : 'release'}:${index}`;
  if (game.judged.includes(key)) return null;
  const grade = gradeOf(time - (from + index * BREATH_CYCLE));
  return grade ? { key, turn: held ? 'press' : 'release', grade } : null;
}

/**
 * The breathing `dt` seconds on. `held` is whether the panel is being held now; `ready` is whether the reply has
 * come. Returns a new game; `done` is set once and for all, at the end of a breath out.
 */
export function stepBreath(game, { dt = 0, ready = false, held = game.held } = {}) {
  if (game.done) return game;
  const step = clamp(dt, 0, BREATH.maxStep);
  const next = { ...game, time: game.time + step, t: game.t + step, held: held === true };
  next.marks = game.marks.map((mark) => ({ ...mark, age: mark.age + step })).filter((mark) => mark.age < BREATH.markFor);
  next.warmth = game.warmth * Math.exp(-step / 30);
  if (next.phase === 'in' && next.t >= BREATH.inhale) { next.phase = 'out'; next.t -= BREATH.inhale; }
  if (next.phase === 'out') {
    // The reply is in and the breaths are enough: this breath out is the last.
    if (ready && game.cycle + 1 >= BREATH.minCycles) next.closing = true;
    if (next.t >= BREATH.exhale) {
      next.cycle = game.cycle + 1;
      if (next.closing) { next.done = true; next.t = BREATH.exhale; }
      else { next.phase = 'in'; next.t -= BREATH.exhale; }
    }
  }
  if (next.held !== game.held && !next.done) {
    const verdict = judge(next, next.time, next.held);
    if (verdict) {
      next.judged = [...game.judged.slice(-7), verdict.key];
      next.marks = [...next.marks, { turn: verdict.turn, grade: verdict.grade, age: 0 }];
      next.kept = game.kept + 1;
      next.perfect = game.perfect + (verdict.grade === 'perfect' ? 1 : 0);
      next.warmth = clamp(next.warmth + (verdict.grade === 'perfect' ? 0.3 : 0.18), 0, 1);
    }
  }
  return next;
}
