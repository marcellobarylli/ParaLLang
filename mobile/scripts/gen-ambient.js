// Round 041 (backlog C4b): one quiet ambience loop per Crumbling Market location, synthesized here (no third-party
// assets). Deterministic (seeded PRNG): running it again writes identical bytes.
// Usage: node mobile/scripts/gen-ambient.js [outDir]. CommonJS so the jest test can compare the committed files.
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { wav } = require('./gen-ui-sounds.js');

const RATE = 16000;
const SECONDS = 6;
const LENGTH = RATE * SECONDS;
const FADE = Math.round(0.5 * RATE); // the tail rendered past the loop is cross-faded into the head
// Loudness by average level, not peak (critique 1.2): RMS -30 dBFS, peaks never above -12 dBFS.
const RMS = 10 ** (-30 / 20);
const CEILING = 10 ** (-12 / 20);

// mulberry32: a small seeded PRNG, so the noise is the same on every run.
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = 2 * Math.PI;
// A frequency rounded to whole cycles per loop, so tones join at the seam without the cross-fade's help.
const whole = (f) => Math.round(f * SECONDS) / SECONDS;
const sine = (f, t) => Math.sin(TAU * whole(f) * t);
// A slow swell with whole cycles per loop, between lo and 1.
const swell = (cycles, t, lo = 0.4, phase = 0) => lo + (1 - lo) * 0.5 * (1 - Math.cos(TAU * (cycles * t / SECONDS) + phase));

function noise(seed, count) {
  const random = prng(seed);
  return Float64Array.from({ length: count }, () => random() * 2 - 1);
}
// One-pole low-pass (cutoff in Hz) and its high-pass complement.
function lowpass(input, cutoff) {
  const k = 1 - Math.exp(-TAU * cutoff / RATE);
  const out = new Float64Array(input.length);
  let y = 0;
  for (let i = 0; i < input.length; i += 1) { y += k * (input[i] - y); out[i] = y; }
  return out;
}
const highpass = (input, cutoff) => { const low = lowpass(input, cutoff); return input.map((v, i) => v - low[i]); };
const bandpass = (input, lo, hi) => lowpass(highpass(input, lo), hi);
const normal = (input) => { const max = input.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1; return input.map((v) => v / max); };

// A decaying event (thunk, tick, drop, glitch) added at a time inside the loop; wraps across the seam.
function event(out, at, length, fn) {
  const from = Math.round(at * RATE);
  const count = Math.round(length * RATE);
  for (let i = 0; i < count; i += 1) out[(from + i) % LENGTH] += fn(i / RATE, i / count);
}

// WAV/PCM on purpose: compressed formats pad the start and end, which would put a gap in every loop.
// Each recipe returns LENGTH + FADE samples of bed (continuous parts) and may add events afterwards on the loop.
const RECIPES = {
  market_entrance(n) {
    const murmur = normal(lowpass(lowpass(noise(11, n), 500), 900));
    const chatter = normal(bandpass(noise(12, n), 300, 1600));
    return { bed: murmur.map((v, i) => { const t = i / RATE; return v * swell(2, t, 0.6) + 0.35 * chatter[i] * swell(3, t, 0.2, 1); }) };
  },
  coffee_cart(n) {
    const hiss = normal(highpass(noise(21, n), 3000));
    return { bed: Float64Array.from({ length: n }, (_, i) => {
      const t = i / RATE;
      const hum = sine(200, t) + 0.6 * sine(400, t) + 0.3 * sine(600, t);
      return 0.35 * hum + 0.6 * hiss[i] * swell(1, t, 0.05) ** 2;
    }) };
  },
  butchers_stall(n) {
    const room = normal(bandpass(noise(31, n), 200, 700));
    return {
      bed: room.map((v, i) => 0.35 * v + 0.1 * sine(240, i / RATE) * swell(1, i / RATE, 0.3)),
      events: (out) => {
        const click = noise(32, RATE);
        for (const at of [1.2, 4.1]) {
          event(out, at, 0.35, (t) => Math.exp(-18 * t) * (Math.sin(TAU * 180 * t) + 0.6 * Math.sin(TAU * 360 * t)) * 1.2 + Math.exp(-120 * t) * click[Math.round(t * RATE)] * 0.6);
        }
      },
    };
  },
  cracked_fountain(n) {
    const water = normal(bandpass(noise(41, n), 400, 2500));
    return {
      bed: water.map((v, i) => 0.55 * v * swell(3, i / RATE, 0.7)),
      events: (out) => {
        const random = prng(42);
        for (let k = 0; k < 14; k += 1) {
          const at = random() * SECONDS;
          const f = 900 + random() * 1400;
          event(out, at, 0.06, (t) => Math.exp(-70 * t) * Math.sin(TAU * f * t * (1 + 2 * t)) * 0.5);
        }
      },
    };
  },
  old_bookshop(n) {
    const room = normal(lowpass(noise(51, n), 400));
    return {
      bed: room.map((v) => 0.12 * v),
      events: (out) => {
        const click = noise(52, RATE);
        for (let s = 0; s < SECONDS; s += 1) {
          event(out, s + 0.25, 0.05, (t) => Math.exp(-160 * t) * (Math.sin(TAU * (s % 2 ? 1800 : 2100) * t) * 0.6 + click[Math.round(t * RATE)] * 0.4));
        }
      },
    };
  },
  the_rift(n) {
    return {
      bed: Float64Array.from({ length: n }, (_, i) => {
        const t = i / RATE;
        // 220 Hz against 222 Hz: two beats a second, twelve per loop, in the range a phone speaker plays.
        return 0.4 * (Math.sin(TAU * 220 * t) + Math.sin(TAU * 222 * t)) + 0.15 * sine(330, t) * swell(1, t, 0.2);
      }),
      events: (out) => {
        const random = prng(61);
        const grit = noise(62, RATE);
        for (let k = 0; k < 5; k += 1) {
          const at = random() * SECONDS;
          const length = 0.04 + random() * 0.12;
          const step = 1 + Math.floor(random() * 12); // bit-crush: hold every step-th sample
          event(out, at, length, (t, p) => grit[Math.floor(Math.round(t * RATE) / step) * step] * 0.5 * Math.sin(Math.PI * p));
        }
      },
    };
  },
};
const AMBIENCE_IDS = Object.freeze(Object.keys(RECIPES));

// Wraps a bed of LENGTH + FADE samples into a loop of LENGTH: samples [LENGTH, LENGTH + FADE) are blended into
// [0, FADE) with equal-power gains (critique 1.3), so the end of the loop runs on into its start.
function loop(bed) {
  const out = new Float64Array(LENGTH);
  for (let i = 0; i < LENGTH; i += 1) {
    if (i >= FADE) { out[i] = bed[i]; continue; }
    const angle = (Math.PI / 2) * (i / FADE);
    out[i] = bed[i] * Math.sin(angle) + bed[LENGTH + i] * Math.cos(angle);
  }
  return out;
}

function level(samples) {
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const rms = Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length) || 1;
  const gain = Math.min(RMS / rms, CEILING / peak);
  return samples.map((v) => v * gain);
}

function render(id) {
  const { bed, events } = RECIPES[id](LENGTH + FADE);
  const out = loop(bed);
  events?.(out);
  return level(out);
}

const ambienceBytes = (id) => wav(render(id), RATE);

module.exports = { RATE, SECONDS, LENGTH, FADE, AMBIENCE_IDS, loop, render, ambienceBytes };

if (require.main === module) {
  const outDir = process.argv[2] ?? join(__dirname, '..', 'assets', 'ambience');
  mkdirSync(outDir, { recursive: true });
  for (const id of AMBIENCE_IDS) writeFileSync(join(outDir, `${id}.wav`), ambienceBytes(id));
  console.log(`wrote ${AMBIENCE_IDS.join(', ')} to ${outDir}`);
}
