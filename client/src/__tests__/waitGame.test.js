// Round 203: the waiting game's rules, with no canvas and no clock.
import { expect, test } from 'vitest';
import { WAIT_GAME, newGame, stepGame } from '../waitGame.js';

const run = (game, seconds, options = {}) => {
  let next = game;
  for (let t = 0; t < seconds && !next.done; t += 1 / 60) next = stepGame(next, { dt: 1 / 60, random: () => 0.5, ...options });
  return next;
};
const far = { shipX: 0 }; // the figure in the left corner: the invaders, in the middle, are not shot

test('the figure follows the thumb, stays inside the field and fires without pause', () => {
  let game = stepGame(newGame({ width: 300, height: 400 }), { dt: 0.016, shipX: 120 });
  expect(game.shipX).toBe(120);
  expect(game.pellets).toHaveLength(1);
  expect(stepGame(game, { dt: 0.016, shipX: -50 }).shipX).toBe(WAIT_GAME.shipHalf);
  expect(stepGame(game, { dt: 0.016, shipX: 900 }).shipX).toBe(300 - WAIT_GAME.shipHalf);
  game = run(game, 1);
  expect(game.pellets.length).toBeGreaterThanOrEqual(3);
  expect(game.shipX).toBe(120); // it stays where the thumb left it
});

test('invaders come in a stream while the reply is awaited, and a pellet takes one', () => {
  const waiting = run(newGame({ width: 300, height: 400 }), 2, far);
  expect(waiting.invaders.length).toBeGreaterThanOrEqual(2);
  expect(waiting.done).toBe(false);
  const shooting = run(newGame({ width: 300, height: 400 }), 3, { shipX: 150 }); // under them
  expect(shooting.score).toBeGreaterThanOrEqual(2);
  expect(shooting.lives).toBe(WAIT_GAME.lives);
});

test('when the reply is ready no new invader sets out; the last come down and then the game is done', () => {
  let game = run(newGame({ width: 300, height: 400 }), 2, far);
  const out = game.invaders.length + (WAIT_GAME.lives - game.lives);
  game = stepGame(game, { dt: 1 / 60, ready: true, ...far });
  expect(game.done).toBe(false); // the last ones still come
  let seen = game.invaders.length;
  for (let i = 0; i < 60 * 3 && !game.done; i += 1) {
    game = stepGame(game, { dt: 1 / 60, ready: true, random: () => 0.5, shipX: 150 });
    expect(game.invaders.length).toBeLessThanOrEqual(seen);
    seen = game.invaders.length;
  }
  expect(game.done).toBe(true);
  expect(game.lost).toBe(false);
  expect(game.score + (WAIT_GAME.lives - game.lives)).toBe(out); // each was shot or got past; none was added
});

test('a reply that is ready before any invader set out ends the game at once', () => {
  expect(stepGame(newGame(), { dt: 1 / 60, ready: true }).done).toBe(true);
});

test('each invader that gets past costs a life; with none left the game is lost and waits for the reply', () => {
  let game = newGame({ width: 300, height: 200 });
  const lives = [];
  for (let i = 0; i < 60 * 30 && !game.lost; i += 1) {
    game = stepGame(game, { dt: 1 / 60, random: () => 0.5, ...far });
    if (lives.at(-1) !== game.lives) lives.push(game.lives);
  }
  expect(lives).toEqual([3, 2, 1, 0]);
  expect(game.lost).toBe(true);
  expect(game.invaders).toEqual([]);
  game = run(game, 5, far);
  expect(game.done).toBe(false); // lost: the player waits for the reply
  expect(game.invaders).toEqual([]);
  game = stepGame(game, { dt: 1 / 60, ready: true });
  expect(game.done).toBe(true);
  expect(stepGame(game, { dt: 1, ready: false })).toBe(game); // done once and for all
});
