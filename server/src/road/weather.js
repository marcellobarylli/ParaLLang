// Round 146: the time of day and the weather of The Journey 2. Pure: a function of the clock and the road's
// seed, with no state, so the server (which tells the narrator what the sky is doing) and the web client (which
// shows it) agree without talking to each other, and the weather goes on while nobody is looking.
//
//   The day    turns once in WEATHER.cycleMs (45 minutes of real time). Phase 0 is sunrise; the sun is up for
//              WEATHER.dayShare of the cycle and the moon for the rest.
//   Rain       Time is cut into slots of WEATHER.slotMs. A slot is rainy with probability WEATHER.rainShare (a hash
//              of the slot and the seed), so it rains 15 % of the time (30 % until round 163). Each rainy slot has a strength; rain fades
//              in and out inside its slot, clouds gather before it and clear after it, and strong rain is a storm.

import { hash, smoothstep } from './terrain.js';

export const WEATHER = Object.freeze({
  cycleMs: 45 * 60_000,
  dayShare: 0.56, // the share of the cycle with the sun up
  // Round 219: the sun's height is its sine raised to this power, so it lingers near the horizon: sunrise and sunset
  // (the sun between 0.24 and -0.17) last about 6 minutes of the 45 rather than 3.
  linger: 1.7,
  slotMs: 3 * 60_000, // 15 slots a cycle
  rainShare: 0.15,
  rampMs: 25_000, // rain fades in and out over this, inside its slot
  cloudMs: 70_000, // clouds gather this long before rain and take as long to clear
  stormAbove: 0.8, // rain this strong comes with lightning
});

const clamp = (value) => Math.min(1, Math.max(0, value));
const lerp = (a, b, t) => a + (b - a) * t;
const PARTS = [[0.06, 'morning'], [0.2, 'midday'], [0.36, 'afternoon'], [0.5, 'dusk'], [0.6, 'night'], [0.96, 'dawn']];

/** The part of the day at `phase` (0 to 1, 0 being sunrise). */
export function partOfDay(phase) {
  let part = 'dawn';
  for (const [from, name] of PARTS) if (phase >= from) part = name;
  return part;
}

const SKIES = { storm: 'a storm', heavy: 'heavy rain', rain: 'light rain', grey: 'grey skies', clear: 'clear' };
const SENTENCES = {
  storm: 'a storm is overhead, with hard rain and lightning', heavy: 'it is raining hard', rain: 'a light rain is falling',
  grey: 'the sky is grey', clear: 'the sky is clear',
};
const PART_NAMES = { dawn: 'dawn', morning: 'morning', midday: 'the middle of the day', afternoon: 'afternoon', dusk: 'dusk', night: 'night' };

/**
 * The weather for a phase of the day and an amount of rain: everything the level and the narrator need.
 *
 *   phase      0 to 1; 0 is sunrise
 *   part       'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night'
 *   height     the sun's height, 1 at noon, 0 at the horizon, down to -1 at midnight
 *   daylight   0 at night to 1 by day
 *   twilight   0 to 1: how much of a sunrise or a sunset is in the sky; `rising` says which
 *   azimuth    where the sun (by night the moon) stands, in radians
 *   rain       0 to 1; `storm` when it is strong enough for lightning
 *   cloud      0 to 1
 *   wind       0 to 1
 *   mist       0 to 1: the morning's mist, and what rain does to the distance
 *   sky        'clear' | 'grey skies' | 'light rain' | 'heavy rain' | 'a storm'
 *   label      "Dusk · light rain", for the screen
 *   sentence   "It is dusk and a light rain is falling.", for the narrator
 */
export function weatherOf({ phase = 0.25, rain = 0, cloud = null, wind = null } = {}) {
  const p = ((phase % 1) + 1) % 1;
  const up = p < WEATHER.dayShare;
  const arc = up ? Math.sin((Math.PI * p) / WEATHER.dayShare) : -Math.sin((Math.PI * (p - WEATHER.dayShare)) / (1 - WEATHER.dayShare));
  const height = Math.sign(arc) * Math.abs(arc) ** WEATHER.linger;
  const daylight = smoothstep(-0.14, 0.22, height);
  const twilight = clamp(1 - Math.abs(height) / 0.42);
  const rising = p < WEATHER.dayShare / 2 || p > WEATHER.dayShare + (1 - WEATHER.dayShare) / 2;
  const wet = clamp(rain);
  const cover = clamp(Math.max(cloud ?? 0.15, wet > 0 ? 0.75 + 0.25 * wet : 0));
  const part = partOfDay(p);
  const kind = wet >= WEATHER.stormAbove ? 'storm' : wet >= 0.55 ? 'heavy' : wet > 0.02 ? 'rain' : cover > 0.6 ? 'grey' : 'clear';
  const clearNight = kind === 'clear' && part === 'night';
  return Object.freeze({
    phase: p, part, height, daylight, twilight, rising,
    // The sun rises in the east (+x) and goes round by the south; the moon follows the same road at night.
    azimuth: up ? Math.PI * (p / WEATHER.dayShare) : Math.PI * ((p - WEATHER.dayShare) / (1 - WEATHER.dayShare)),
    rain: wet, storm: wet >= WEATHER.stormAbove, cloud: cover,
    wind: clamp(wind ?? 0.15 + 0.6 * wet),
    mist: clamp(Math.max(0.55 * wet, (part === 'dawn' || (part === 'morning' && p < 0.1) ? 0.6 : 0) * (1 - wet))),
    sky: SKIES[kind],
    label: `${part.charAt(0).toUpperCase()}${part.slice(1)} · ${clearNight ? 'stars' : SKIES[kind]}`,
    sentence: `It is ${PART_NAMES[part]} and ${clearNight ? 'the stars are out' : SENTENCES[kind]}.`,
  });
}

const rainy = (slot, seed) => hash(slot, 17, seed + 900) < WEATHER.rainShare;
const strength = (slot, seed) => 0.3 + 0.7 * hash(slot, 29, seed + 901);

/** The weather at `timeMs` (milliseconds since the epoch) on the road of `seed`. */
export function weatherAt(timeMs, seed = 0) {
  const t = Number(timeMs) || 0;
  const s = Number(seed) | 0;
  // Each road has its own hour: the seed shifts the cycle, so two roads are not at the same time of day.
  const phase = ((t + hash(s, 3, 902) * WEATHER.cycleMs) % WEATHER.cycleMs) / WEATHER.cycleMs;
  const slot = Math.floor(t / WEATHER.slotMs);
  const into = t - slot * WEATHER.slotMs;
  const left = WEATHER.slotMs - into;
  const [before, now, after] = [rainy(slot - 1, s), rainy(slot, s), rainy(slot + 1, s)];
  let rain = 0;
  if (now) {
    // The strength slides to the next slot's when that is rainy too; the rain itself fades at a dry edge.
    rain = lerp(strength(slot, s), after ? strength(slot + 1, s) : strength(slot, s), smoothstep(WEATHER.slotMs - WEATHER.rampMs, WEATHER.slotMs, into));
    if (!before) rain *= smoothstep(0, WEATHER.rampMs, into);
    if (!after) rain *= smoothstep(0, WEATHER.rampMs, left);
  }
  // Clouds: a slow drift of their own, thick over rain, gathering before it and clearing after it.
  const span = WEATHER.slotMs * 2;
  const piece = Math.floor(t / span);
  const cover = (n) => 0.12 + 0.4 * hash(n, 41, s + 903) ** 2;
  const drift = lerp(cover(piece), cover(piece + 1), smoothstep(0, 1, (t - piece * span) / span));
  let cloud = drift;
  if (now) cloud = 1;
  else {
    if (after) cloud = Math.max(cloud, smoothstep(WEATHER.cloudMs, 0, left));
    if (before) cloud = Math.max(cloud, smoothstep(WEATHER.cloudMs, 0, into));
  }
  const gust = hash(Math.floor(t / 40_000), 53, s + 904);
  return weatherOf({ phase, rain, cloud, wind: 0.1 + 0.25 * gust + 0.6 * rain });
}
