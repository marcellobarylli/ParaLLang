import { hexToRgb } from '../palette.js';
import { PRESETS } from './presets.js';

// Round 146: the sky and the light of the endless level at any time of day and in any weather. A preset
// (presets.js) is one moment; this blends moments. `weather` is what server/src/road/weather.js gives: how much
// daylight, how much of a sunrise or sunset, where the sun or the moon stands, how much cloud, rain and mist.
//
// The palettes: the clear day and the two twilights are the package's own presets (day, dawn, golden); the night and
// the two overcast skies are new. Colours are blended as numbers and handed on as hex, which is what a preset holds.

const COLOURS = ['zenith', 'mid', 'horizon', 'fog', 'sun', 'cloud', 'hills'];
const VECTORS = ['sunColor', 'ambientSky', 'ambientGround', 'water'];

const NIGHT = {
  zenith: '#04060e', mid: '#0b1124', horizon: '#1b2740', fog: '#141c2e', sun: '#dde6ff', cloud: '#262d44', hills: '#090d18',
  sunColor: [0.2, 0.25, 0.4], ambientSky: [0.2, 0.24, 0.38], ambientGround: [0.1, 0.11, 0.17], water: [0.45, 0.55, 0.9],
};
const OVERCAST = {
  zenith: '#59636c', mid: '#7c878e', horizon: '#98a1a4', fog: '#8d979a', sun: '#c9cfd2', cloud: '#636c73', hills: '#484f54',
  sunColor: [0.26, 0.27, 0.27], ambientSky: [0.46, 0.49, 0.52], ambientGround: [0.28, 0.29, 0.28], water: [0.7, 0.78, 0.8],
};
const OVERCAST_NIGHT = {
  zenith: '#05070b', mid: '#0c1016', horizon: '#161b23', fog: '#12161d', sun: '#5a6270', cloud: '#141920', hills: '#07090d',
  sunColor: [0.06, 0.07, 0.1], ambientSky: [0.17, 0.19, 0.25], ambientGround: [0.09, 0.1, 0.12], water: [0.4, 0.46, 0.6],
};

const numbers = (preset) => Object.fromEntries([...COLOURS.map((key) => [key, hexToRgb(preset[key])]), ...VECTORS.map((key) => [key, [...preset[key]]])]);
const PALETTE = { day: numbers(PRESETS.day), dawn: numbers(PRESETS.dawn), dusk: numbers(PRESETS.golden), night: numbers(NIGHT), overcast: numbers(OVERCAST), overcastNight: numbers(OVERCAST_NIGHT) };
const mix = (a, b, t) => Object.fromEntries(Object.keys(a).map((key) => [key, a[key].map((value, i) => value + (b[key][i] - value) * t)]));
const toHex = (rgb) => `#${rgb.map((value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0')).join('')}`;

export const ATMOSPHERE = Object.freeze({
  fog: Object.freeze({ near: 46, far: 186, mistNear: 16, mistFar: 120 }), // the far edge never goes beyond the kept chunks
  lowestSun: 0.16, // the sun and the moon are drawn no lower than this, so their light never comes from under the ground
});

/** The preset-shaped values for `weather` ({ daylight, twilight, rising, azimuth, height, cloud, rain, mist }). */
export function atmosphereFor(weather) {
  const { daylight, twilight, rising, azimuth, height, cloud, mist } = weather;
  // Clear sky: night to day, with the sunrise's or the sunset's colours laid over while the sun is near the horizon.
  let sky = mix(PALETTE.night, PALETTE.day, daylight);
  sky = mix(sky, rising ? PALETTE.dawn : PALETTE.dusk, twilight * (0.35 + 0.55 * daylight));
  // Cloud takes the colour out of it.
  sky = mix(sky, mix(PALETTE.overcastNight, PALETTE.overcast, daylight), cloud * 0.92);
  const up = Math.max(ATMOSPHERE.lowestSun, Math.abs(height));
  const flat = Math.sqrt(Math.max(0, 1 - up * up));
  return {
    ...Object.fromEntries(COLOURS.map((key) => [key, toHex(sky[key])])),
    ...Object.fromEntries(VECTORS.map((key) => [key, sky[key]])),
    sunDir: [Math.cos(azimuth) * flat, up, -Math.sin(azimuth) * flat * 0.8 + 0.25],
    fogNear: ATMOSPHERE.fog.near + (ATMOSPHERE.fog.mistNear - ATMOSPHERE.fog.near) * mist,
    fogFar: ATMOSPHERE.fog.far + (ATMOSPHERE.fog.mistFar - ATMOSPHERE.fog.far) * mist,
    corruption: 0,
  };
}
