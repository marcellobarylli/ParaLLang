// Round 214: the breathing's rules, without a canvas or a clock.
import { expect, test } from 'vitest';
import { BREATH, BREATH_CYCLE, BREATH_TURN, breathLevel, breathProgress, gradeOf, newBreath, stepBreath } from '../breath.js';

// The breath as it is once its lead-in is over: the breath in begins at time 0.
const start = () => ({ ...newBreath(), time: 0, t: 0 });

/** The breathing `seconds` on, in frames; `held(time)` says whether the panel is held, `ready(time)` whether the reply has come. */
function run(game, seconds, { held = () => game.held, ready = () => false } = {}) {
  let next = game;
  const frames = Math.round(seconds * 100);
  for (let i = 0; i < frames && !next.done; i += 1) next = stepBreath(next, { dt: 0.01, held: held(next.time + 0.01), ready: ready(next.time + 0.01) });
  return next;
}

test('a breath is four seconds in and six out: six breaths a minute, the breath out the longer', () => {
  expect(BREATH.inhale).toBe(4);
  expect(BREATH.exhale).toBe(6);
  expect(60 / BREATH_CYCLE).toBe(6);
  expect(BREATH.minCycles).toBe(3);
  expect(BREATH.perfect).toBeLessThan(BREATH.tolerance);
});

test('it starts on a breath in at once, swells to full at the turn and sinks to nothing', () => {
  let game = start();
  expect(game.phase).toBe('in');
  expect(breathLevel(game)).toBe(0);
  game = run(game, 2);
  expect(game.phase).toBe('in');
  expect(breathLevel(game)).toBeCloseTo(0.5, 1);
  game = run(game, 2 - 0.01);
  expect(breathLevel(game)).toBeGreaterThan(0.99);
  expect(breathProgress(game)).toBeCloseTo(BREATH_TURN, 2);
  game = run(game, 0.02);
  expect(game.phase).toBe('out');
  game = run(game, 3);
  expect(breathLevel(game)).toBeCloseTo(0.5, 1);
  game = run(game, 2.9);
  expect(breathLevel(game)).toBeLessThan(0.01);
  expect(game.cycle).toBe(0);
  game = run(game, 0.2);
  expect(game.cycle).toBe(1);
  expect(game.phase).toBe('in');
});

test('a reply that is ready at once still gets three whole breaths, and the breathing ends on the breath out', () => {
  let game = run(start(), 29.9, { ready: () => true });
  expect(game.done).toBe(false);
  expect(game.cycle).toBe(2);
  expect(game.phase).toBe('out');
  expect(game.closing).toBe(true); // the third breath out is known to be the last
  game = run(game, 0.2, { ready: () => true });
  expect(game.done).toBe(true);
  expect(game.cycle).toBe(3);
  expect(game.phase).toBe('out');
  expect(breathLevel(game)).toBe(0);
  expect(stepBreath(game, { dt: 1, ready: true })).toBe(game); // done once and for all
});

test('with no reply it goes on breathing; the breath in which the reply comes is finished, and is the last', () => {
  let game = run(start(), 42, { ready: () => false });
  expect(game.done).toBe(false);
  expect(game.cycle).toBe(4);
  expect(game.phase).toBe('in'); // two seconds into the fifth breath in
  game = run(game, 1, { ready: () => true });
  expect(game.done).toBe(false);
  expect(game.closing).toBe(false); // still breathing in: nothing fades yet
  game = run(game, 6.9, { ready: () => true });
  expect(game.done).toBe(false);
  expect(game.closing).toBe(true);
  game = run(game, 0.2, { ready: () => true });
  expect(game.done).toBe(true);
  expect(game.cycle).toBe(5);
  expect(game.time).toBeCloseTo(50, 1);
});

test('a reply that comes during a breath out, after the third, ends with that breath out', () => {
  let game = run(start(), 37, { ready: () => false }); // three seconds into the fourth breath out
  expect(game.phase).toBe('out');
  game = run(game, 3.1, { ready: () => true });
  expect(game.done).toBe(true);
  expect(game.cycle).toBe(4);
});

test('the light starts 15 degrees of the ring before the breath in, and the lead-in is not a turn', () => {
  const game = newBreath();
  expect(breathProgress(game)).toBeCloseTo(-15 / 360, 5);
  expect(breathLevel(game)).toBe(0);
  const begun = run(game, BREATH.lead + 0.01, { held: () => true });
  expect(begun.t).toBeGreaterThan(0);
  expect(begun.kept).toBe(0);
});

test('a turn is in time within the tolerance, and at its best in the middle of it', () => {
  expect(gradeOf(0)).toBe('perfect');
  expect(gradeOf(-BREATH.perfect)).toBe('perfect');
  expect(gradeOf(BREATH.perfect + 0.05)).toBe('good');
  expect(gradeOf(-BREATH.tolerance)).toBe('good');
  expect(gradeOf(BREATH.tolerance + 0.05)).toBe(null);
});

test('held for the breath in, let go at the turn, pressed again where the next begins: each turn kept leaves a mark', () => {
  // Held from 0.5 s to 4.05 s (the turn, at its best), pressed again at 9.7 s (in time), let go at 15 s (far too late).
  const held = (time) => (time >= 0.5 && time < 4.05) || (time >= 9.7 && time < 15);
  let game = run(start(), 1, { held });
  expect(game.held).toBe(true);
  expect(game.kept).toBe(0); // the press that opens the first breath is not judged
  game = run(game, 3.5, { held });
  expect(game.held).toBe(false);
  expect(game.kept).toBe(1);
  expect(game.perfect).toBe(1);
  expect(game.marks.at(-1)).toMatchObject({ turn: 'release', grade: 'perfect' });
  expect(game.warmth).toBeGreaterThan(0.25);
  game = run(game, 5.5, { held });
  expect(game.kept).toBe(2);
  expect(game.perfect).toBe(1);
  expect(game.marks).toEqual([{ turn: 'press', grade: 'good', age: expect.any(Number) }]); // the first mark has faded
  game = run(game, 6, { held });
  expect(game.held).toBe(false);
  expect(game.kept).toBe(2); // a second late: nothing is kept, and nothing is taken away
  expect(game.marks).toEqual([]);
});

test('a turn is judged once, and nothing is asked of the player: a breath left alone is still a breath', () => {
  const flutter = (time) => time >= 1 && Math.floor(time * 20) % 2 === 0 && time < 4.4; // let go and pressed again all through the window
  const game = run(start(), 5, { held: flutter });
  expect(game.kept).toBe(1);
  const alone = run(start(), 30.1, { ready: () => true });
  expect(alone.done).toBe(true);
  expect(alone.kept).toBe(0);
});

test('the last breath out asks for no press: one made as it ends is not judged', () => {
  const held = (time) => time >= 29.9;
  const game = run(start(), 29.95, { ready: () => true, held });
  expect(game.closing).toBe(true);
  expect(game.held).toBe(true);
  expect(game.kept).toBe(0);
});

test('a long step is taken as a short one, so a stalled page does not skip a breath', () => {
  const game = stepBreath(start(), { dt: 30 });
  expect(game.time).toBe(BREATH.maxStep);
});
