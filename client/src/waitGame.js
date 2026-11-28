// Round 203 (brought back in round 227 as one of the choices of "While you wait" in Settings): the game played over
// the conversation panel while a reply is on its way. A little figure at the bottom follows the thumb and fires
// pellets without pause; invaders come down in a steady stream. Round 227: one invader that gets past the figure
// loses the game (one life, no hearts), and the stream is 10 % faster than round 203's. When the reply is ready no
// new invader sets out and the last ones come down; the game is over when the field is empty, or, lost, when the
// reply is ready.
//
// This file is the game alone: no canvas, no clock, no randomness of its own. `stepGame` moves it on by `dt` seconds.
const FASTER = 1.1; // round 227: the owner asked for it 10 % faster (the invaders' speed and how often they set out; not the figure's fire)
export const WAIT_GAME = Object.freeze({
  lives: 1,
  shipY: 76, // the figure's line, in pixels above the field's bottom: room under it for the thumb
  shipHalf: 11,
  pelletEvery: 0.17, // seconds
  pelletSpeed: 560, // pixels a second
  invaderEvery: 0.85 / FASTER, // seconds between invaders at the start,
  invaderEveryMin: 0.42 / FASTER, // and at the fastest,
  quicken: 0.985, // each gap this share of the one before
  invaderSpeed: [62 * FASTER, 104 * FASTER], // pixels a second, slowest and fastest
  invaderHalf: 11,
  firstInvader: 0.5 / FASTER,
  maxStep: 0.05,
});

export function newGame({ width = 320, height = 320 } = {}) {
  return { width, height, shipX: width / 2, lives: WAIT_GAME.lives, score: 0, lost: false, done: false, time: 0, pellets: [], invaders: [], bursts: [], nextPellet: 0, nextInvader: WAIT_GAME.firstInvader, gap: WAIT_GAME.invaderEvery };
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Where the figure may stand: the whole of it inside the field. */
export const shipWithin = (game, x) => clamp(Number.isFinite(x) ? x : game.width / 2, WAIT_GAME.shipHalf, Math.max(WAIT_GAME.shipHalf, game.width - WAIT_GAME.shipHalf));

/**
 * The game `dt` seconds on. `shipX` is where the thumb is (null: where the figure stands); `ready` is whether the
 * reply has come; `random` gives numbers in [0, 1). Returns a new game; `done` is set once and for all.
 */
export function stepGame(game, { dt = 0, shipX = null, ready = false, random = Math.random, width = game.width, height = game.height } = {}) {
  if (game.done) return game;
  const step = clamp(dt, 0, WAIT_GAME.maxStep);
  const next = { ...game, width, height, time: game.time + step };
  next.shipX = shipWithin(next, shipX ?? game.shipX);
  next.bursts = game.bursts.map((burst) => ({ ...burst, age: burst.age + step })).filter((burst) => burst.age < 0.3);
  if (game.lost) { // overrun: nothing moves; the wait is the forfeit
    next.done = ready;
    return next;
  }
  const shipLine = height - WAIT_GAME.shipY;
  let pellets = game.pellets.map((pellet) => ({ ...pellet, y: pellet.y - WAIT_GAME.pelletSpeed * step })).filter((pellet) => pellet.y > -8);
  let invaders = game.invaders.map((invader) => ({ ...invader, y: invader.y + invader.speed * step }));
  next.nextPellet = game.nextPellet - step;
  if (next.nextPellet <= 0) {
    pellets.push({ x: next.shipX, y: shipLine - WAIT_GAME.shipHalf });
    next.nextPellet += WAIT_GAME.pelletEvery;
  }
  next.nextInvader = game.nextInvader - step;
  if (!ready && next.nextInvader <= 0) { // the stream: it stops with the reply
    const half = WAIT_GAME.invaderHalf;
    const [slow, fast] = WAIT_GAME.invaderSpeed;
    invaders.push({ x: half + random() * Math.max(0, width - 2 * half), y: -half, speed: slow + random() * (fast - slow), kind: Math.floor(random() * 3) });
    next.gap = Math.max(WAIT_GAME.invaderEveryMin, game.gap * WAIT_GAME.quicken);
    next.nextInvader += next.gap;
  }
  // A pellet that meets an invader takes it, and is spent.
  const reach = WAIT_GAME.invaderHalf + 2;
  const bursts = [...next.bursts];
  let score = game.score;
  invaders = invaders.filter((invader) => {
    const hit = pellets.findIndex((pellet) => Math.abs(pellet.x - invader.x) <= reach && Math.abs(pellet.y - invader.y) <= reach);
    if (hit < 0) return true;
    pellets = pellets.filter((_, index) => index !== hit);
    bursts.push({ x: invader.x, y: invader.y, age: 0 });
    score += 1;
    return false;
  });
  // One that gets past the figure costs the life: there is one.
  let lives = game.lives;
  invaders = invaders.filter((invader) => {
    if (invader.y - WAIT_GAME.invaderHalf < shipLine) return true;
    lives -= 1;
    return false;
  });
  next.lives = Math.max(0, lives);
  next.score = score;
  next.bursts = bursts;
  next.lost = next.lives === 0;
  next.pellets = next.lost ? [] : pellets;
  next.invaders = next.lost ? [] : invaders;
  next.done = ready && (next.lost || next.invaders.length === 0);
  return next;
}
