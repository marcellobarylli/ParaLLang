// Round 117: display preferences of this browser. They are stored apart from the server URL and the access token
// (api/settings.js), because saving those reconnects and a change here must not.
//
// panelOpacity: how opaque the text panels over the 3D level are, 0 (only the text) to 1 (the level hidden).
// beginner (round 129): whether answers are graded in beginner mode (a mistake is corrected for a heart). On unless switched off.
// music (round 127): whether the ambient music plays. On unless switched off.
// voices (round 126): whether the characters read their new lines aloud. On unless switched off.
// narrator (round 196): whether the narrator reads the narration aloud too (with voices on). On unless switched off.
// tiltLook (round 125): whether the phone's orientation turns the camera's look at a site. Off unless switched on.
// rails (round 144): on The Journey 2, whether the way on is chosen for the player. On unless switched off.
// light (round 153): whether answers go unchecked: the character works out what was meant and replies.
//   Round 198: on unless strict checking is chosen from this round on, which `strict` records: a display saved
//   before it held `light: false` for everyone, as the default of its day, and is read as light.
// volume (round 163): the Audio sliders, { master, music, effects, voice }, each 0 to 1. Effects are the rain, the
//   thunder and the other sounds of the place; voice is the characters reading aloud. All at 1 unless moved.
// streamlined (round 173): on The Journey 2, each unit is one conversation and finishing it completes the unit; the
//   server keeps it on the road (POST /api/road/mode). On unless switched off.
// follow (round 190): whether a character's new reply is brought to the top of the conversation panel. On unless
//   switched off (off, the panel stays where the player left it, round 140).
// glitch (round 205): whether the wind may tear the legacy dungeons' leaves into shards (levelView.js). Off unless switched on.
// waitGame (round 203, experimental): whether a game is played over the conversation panel while a reply is on its
//   way (waitGame.js). Off unless switched on.
// immersion (round 148): the share of a character's lines in the language being learned, 0.1 to 1. 1 unless moved.
import { browserStorage } from './api/settings.js';

export const DISPLAY_KEY = 'parallang.display';
export const PANEL_OPACITY = Object.freeze({ min: 0, max: 1, step: 0.05, default: 0.7 });

/** A number on the slider's scale: clamped, rounded to the step; the default for anything that is not a number. */
export function clampPanelOpacity(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return PANEL_OPACITY.default;
  const stepped = Math.round(number / PANEL_OPACITY.step) * PANEL_OPACITY.step;
  return Math.round(Math.min(PANEL_OPACITY.max, Math.max(PANEL_OPACITY.min, stepped)) * 100) / 100;
}

// Round 177: `immersionAuto` (on by default, and for a display saved before it): the characters speak the stage's share
// of the language; the slider's share applies once it is moved.
export const IMMERSION = Object.freeze({ min: 0.1, max: 1, step: 0.1, default: 1 });

/** A share on the slider's scale: clamped, rounded to the step; the default (all of it) for anything that is not a number. */
export function clampImmersion(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return IMMERSION.default;
  const stepped = Math.round(number / IMMERSION.step) * IMMERSION.step;
  return Math.round(Math.min(IMMERSION.max, Math.max(IMMERSION.min, stepped)) * 100) / 100;
}

// Round 177: the share sent with a start or an answer: null (the stage's share, the server's own) while the share
// follows the learner's level.
export const immersionOf = (state) => (state?.display?.immersionAuto !== false ? null : clampImmersion(state?.display?.immersion));

export const VOLUME = Object.freeze({ min: 0, max: 1, step: 0.05, default: 1 });
export const VOLUME_CHANNELS = Object.freeze(['master', 'music', 'effects', 'voice']);

/** A volume on the slider's scale: clamped, rounded to the step; full for anything that is not a number. */
export function clampVolume(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return VOLUME.default;
  const stepped = Math.round(number / VOLUME.step) * VOLUME.step;
  return Math.round(Math.min(VOLUME.max, Math.max(VOLUME.min, stepped)) * 100) / 100;
}
/** All four volumes, each clamped. */
export const volumesOf = (volume) => Object.fromEntries(VOLUME_CHANNELS.map((channel) => [channel, clampVolume(volume?.[channel])]));

export function loadDisplay(storage = browserStorage()) {
  let stored = null;
  try { stored = JSON.parse(storage?.getItem?.(DISPLAY_KEY) ?? 'null'); } catch { stored = null; }
  return { panelOpacity: clampPanelOpacity(stored?.panelOpacity), tiltLook: stored?.tiltLook === true, voices: stored?.voices !== false, narrator: stored?.narrator !== false, music: stored?.music !== false, beginner: stored?.beginner !== false, rails: stored?.rails !== false, immersion: clampImmersion(stored?.immersion), immersionAuto: stored?.immersionAuto !== false, light: stored?.strict !== true, strict: stored?.strict === true, streamlined: stored?.streamlined !== false, follow: stored?.follow !== false, waitGame: stored?.waitGame === true, glitch: stored?.glitch === true, volume: volumesOf(stored?.volume) };
}

export function saveDisplay(display, storage = browserStorage()) {
  const value = { panelOpacity: clampPanelOpacity(display?.panelOpacity), tiltLook: display?.tiltLook === true, voices: display?.voices !== false, narrator: display?.narrator !== false, music: display?.music !== false, beginner: display?.beginner !== false, rails: display?.rails !== false, immersion: clampImmersion(display?.immersion), immersionAuto: display?.immersionAuto !== false, light: display?.light !== false, strict: display?.light === false, streamlined: display?.streamlined !== false, follow: display?.follow !== false, waitGame: display?.waitGame === true, glitch: display?.glitch === true, volume: volumesOf(display?.volume) };
  try { storage?.setItem?.(DISPLAY_KEY, JSON.stringify(value)); } catch { /* private mode: kept for this page only */ }
  return value;
}
