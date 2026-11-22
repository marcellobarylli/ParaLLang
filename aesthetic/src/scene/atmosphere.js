import { hexToRgb } from '../palette.js';
import { PRESETS } from './presets.js';

// Round 146: the sky and the light of the endless level at any time of day and in any weather. A preset
// (presets.js) is one moment; this blends moments. `weather` is what server/src/road/weather.js gives: the sun's
// height, whether it is rising, where it stands, how much cloud, rain and mist.
//
// Round 147: sunrise and sunset are scenes of their own, not a tint over the day. The sky passes through a row of
// palettes as the sun goes down: the day, a golden hour, the sunset itself (an orange and red horizon under a
// purple sky), an afterglow, the night. The morning runs the other way through its own: a violet hour before dawn, a
// pink and gold sunrise, a pale gold morning. Each palette also says what the clouds look like from above and from
// below, where the low sun lights them.

const COLOURS = ['zenith', 'mid', 'horizon', 'fog', 'sun', 'cloud', 'cloudUnder', 'hills'];
const VECTORS = ['sunColor', 'ambientSky', 'ambientGround', 'water'];

const DAY = { ...PRESETS.day, cloudUnder: '#c9d3dc' };
const NIGHT = {
  zenith: '#04060e', mid: '#0b1124', horizon: '#1b2740', fog: '#141c2e', sun: '#dde6ff', cloud: '#262d44', cloudUnder: '#12172a', hills: '#090d18',
  sunColor: [0.2, 0.25, 0.4], ambientSky: [0.2, 0.24, 0.38], ambientGround: [0.1, 0.11, 0.17], water: [0.45, 0.55, 0.9],
};
// The evening, from the top of the sky down to the fog on the ground.
const GOLDEN_HOUR = {
  zenith: '#3f5f9e', mid: '#d6b08a', horizon: '#ffc266', fog: '#f0b572', sun: '#ffdf94', cloud: '#fff0d6', cloudUnder: '#ffb466', hills: '#6a6257',
  sunColor: [0.88, 0.62, 0.36], ambientSky: [0.52, 0.48, 0.54], ambientGround: [0.38, 0.3, 0.22], water: [0.95, 0.85, 0.7],
};
const SUNSET = {
  zenith: '#2b1a63', mid: '#c0356a', horizon: '#ff6a1c', fog: '#d8683c', sun: '#ff4f1f', cloud: '#7b4690', cloudUnder: '#ff7436', hills: '#2e1b3c',
  sunColor: [0.86, 0.46, 0.27], ambientSky: [0.5, 0.42, 0.56], ambientGround: [0.34, 0.27, 0.24], water: [1.0, 0.58, 0.5],
};
const AFTERGLOW = {
  zenith: '#0f1138', mid: '#4b2a70', horizon: '#b03f58', fog: '#5c3358', sun: '#c8507a', cloud: '#352a58', cloudUnder: '#a2455e', hills: '#150f26',
  sunColor: [0.3, 0.2, 0.36], ambientSky: [0.27, 0.24, 0.44], ambientGround: [0.14, 0.11, 0.18], water: [0.7, 0.5, 0.8],
};
// The morning, in the order the sun brings it.
const BEFORE_DAWN = {
  zenith: '#12183f', mid: '#5c4280', horizon: '#e27a82', fog: '#7c5278', sun: '#ffb0a0', cloud: '#40386a', cloudUnder: '#d8707e', hills: '#181630',
  sunColor: [0.32, 0.24, 0.36], ambientSky: [0.28, 0.27, 0.46], ambientGround: [0.15, 0.13, 0.2], water: [0.75, 0.6, 0.85],
};
const SUNRISE = {
  zenith: '#31428c', mid: '#e58a9c', horizon: '#ffae45', fog: '#f3a068', sun: '#ffca70', cloud: '#f7bcc8', cloudUnder: '#ffa54e', hills: '#4a3a56',
  sunColor: [0.84, 0.52, 0.34], ambientSky: [0.5, 0.42, 0.56], ambientGround: [0.33, 0.25, 0.24], water: [1.0, 0.75, 0.7],
};
const GOLDEN_MORNING = {
  zenith: '#4b7abb', mid: '#cdd3d8', horizon: '#ffe3ae', fog: '#f1d9ae', sun: '#fff0c0', cloud: '#fff6e6', cloudUnder: '#ffd89c', hills: '#74807c',
  sunColor: [0.84, 0.7, 0.5], ambientSky: [0.52, 0.54, 0.6], ambientGround: [0.37, 0.33, 0.26], water: [0.9, 0.95, 0.9],
};
const OVERCAST = {
  zenith: '#59636c', mid: '#7c878e', horizon: '#98a1a4', fog: '#8d979a', sun: '#c9cfd2', cloud: '#636c73', cloudUnder: '#474e54', hills: '#484f54',
  sunColor: [0.26, 0.27, 0.27], ambientSky: [0.46, 0.49, 0.52], ambientGround: [0.28, 0.29, 0.28], water: [0.7, 0.78, 0.8],
};
const OVERCAST_NIGHT = {
  zenith: '#05070b', mid: '#0c1016', horizon: '#161b23', fog: '#12161d', sun: '#5a6270', cloud: '#141920', cloudUnder: '#0b0e13', hills: '#07090d',
  sunColor: [0.06, 0.07, 0.1], ambientSky: [0.17, 0.19, 0.25], ambientGround: [0.09, 0.1, 0.12], water: [0.4, 0.46, 0.6],
};

const numbers = (preset) => Object.fromEntries([...COLOURS.map((key) => [key, hexToRgb(preset[key])]), ...VECTORS.map((key) => [key, [...preset[key]]])]);
const mix = (a, b, t) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key].map((value, i) => value + (b[key][i] - value) * t)]));
const toHex = (rgb) => `#${rgb.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0')).join('')}`;
const smooth = (t) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

// The sun's height (1 at noon, 0 on the horizon, negative below it) at which each palette is the whole sky.
export const STOPS = Object.freeze({ day: 0.5, golden: 0.24, horizon: 0.03, glow: -0.17, night: -0.42 });
const ROWS = {
  evening: [[STOPS.day, numbers(DAY)], [STOPS.golden, numbers(GOLDEN_HOUR)], [STOPS.horizon, numbers(SUNSET)], [STOPS.glow, numbers(AFTERGLOW)], [STOPS.night, numbers(NIGHT)]],
  morning: [[STOPS.day, numbers(DAY)], [STOPS.golden, numbers(GOLDEN_MORNING)], [STOPS.horizon, numbers(SUNRISE)], [STOPS.glow, numbers(BEFORE_DAWN)], [STOPS.night, numbers(NIGHT)]],
};
const GREY = { day: numbers(OVERCAST), night: numbers(OVERCAST_NIGHT) };

// The clear sky for a sun at `height`, rising or setting: the two palettes it lies between, blended.
function clearSky(height, rising) {
  const row = ROWS[rising ? 'morning' : 'evening'];
  if (height >= row[0][0]) return row[0][1];
  for (let n = 1; n < row.length; n += 1) {
    if (height >= row[n][0]) return mix(row[n][1], row[n - 1][1], smooth((height - row[n][0]) / (row[n - 1][0] - row[n][0])));
  }
  return row.at(-1)[1];
}

export const ATMOSPHERE = Object.freeze({
  fog: Object.freeze({ near: 46, far: 186, mistNear: 16, mistFar: 120 }), // the far edge never goes beyond the kept chunks
  lowestSun: 0.16, // the light comes from no lower than this, so it never comes from under the ground
  greyFrom: 0.35, // cloud cover below this leaves the sky its colours: scattered clouds do not grey a sunset
  moonBelow: -0.12, // the sun's height at which the disc in the sky becomes the moon
});

/**
 * The preset-shaped values for `weather` ({ height, daylight, rising, azimuth, cloud, mist }). Beside a preset's own
 * keys: `cloudUnder` (the clouds' undersides), `sunDisc` (where the sun's or the moon's disc is drawn: it sinks to
 * the horizon and under it, while the light, `sunDir`, stays above), `sunScale` (a low sun is a large sun) and
 * `skyBands` (how high the horizon's colours reach).
 */
export function atmosphereFor(weather) {
  const { height, daylight, rising, azimuth, cloud, mist } = weather;
  let sky = clearSky(height, rising);
  const grey = smooth((cloud - ATMOSPHERE.greyFrom) / (1 - ATMOSPHERE.greyFrom)) * 0.94;
  if (grey > 0) sky = mix(sky, mix(GREY.night, GREY.day, daylight), grey);
  const direction = (up) => { const flat = Math.sqrt(Math.max(0, 1 - up * up)); return [Math.cos(azimuth) * flat, up, -Math.sin(azimuth) * flat * 0.8 + 0.25]; };
  // By day the disc is the sun. It is followed a little way under the horizon, and there the moon takes over and
  // rises from the same depth, so the disc never jumps while it can be seen.
  const moon = height <= ATMOSPHERE.moonBelow;
  const discUp = moon ? (ATMOSPHERE.moonBelow + ((ATMOSPHERE.moonBelow - height) / (1 + ATMOSPHERE.moonBelow)) * (1 - ATMOSPHERE.moonBelow)) * 0.92 : height * 0.92;
  const low = 1 - Math.min(1, Math.abs(height) / 0.4);
  return {
    ...Object.fromEntries(COLOURS.map((key) => [key, toHex(sky[key])])),
    ...Object.fromEntries(VECTORS.map((key) => [key, sky[key]])),
    sunDir: direction(Math.max(ATMOSPHERE.lowestSun, Math.abs(height))),
    sunDisc: direction(discUp),
    sunScale: (moon ? 0.7 : 1) * (1 + 0.9 * low * (1 - grey)),
    haloScale: 1 + 0.8 * low,
    // At twilight the colours are brought down the sky, so the purple over a sunset is in sight from the ground.
    skyBands: [0.04, 0.25 - 0.12 * low, 0.75 - 0.33 * low],
    fogNear: ATMOSPHERE.fog.near + (ATMOSPHERE.fog.mistNear - ATMOSPHERE.fog.near) * mist,
    fogFar: ATMOSPHERE.fog.far + (ATMOSPHERE.fog.mistFar - ATMOSPHERE.fog.far) * mist,
    corruption: 0,
  };
}
