// Round 117: display preferences of this browser. They are stored apart from the server URL and the access token
// (api/settings.js), because saving those reconnects and a change here must not.
//
// panelOpacity: how opaque the text panels over the 3D level are, 0 (only the text) to 1 (the level hidden).
// beginner (round 129): whether answers are graded in beginner mode (a mistake is corrected for a heart). On unless switched off.
// music (round 127): whether the ambient music plays. On unless switched off.
// voices (round 126): whether the characters read their new lines aloud. On unless switched off.
// tiltLook (round 125): whether the phone's orientation turns the camera's look at a site. Off unless switched on.
// rails (round 144): on The Long Way Home, whether the way on is chosen for the player. On unless switched off.
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

export const IMMERSION = Object.freeze({ min: 0.1, max: 1, step: 0.1, default: 1 });

/** A share on the slider's scale: clamped, rounded to the step; the default (all of it) for anything that is not a number. */
export function clampImmersion(value) {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return IMMERSION.default;
  const stepped = Math.round(number / IMMERSION.step) * IMMERSION.step;
  return Math.round(Math.min(IMMERSION.max, Math.max(IMMERSION.min, stepped)) * 100) / 100;
}

export function loadDisplay(storage = browserStorage()) {
  let stored = null;
  try { stored = JSON.parse(storage?.getItem?.(DISPLAY_KEY) ?? 'null'); } catch { stored = null; }
  return { panelOpacity: clampPanelOpacity(stored?.panelOpacity), tiltLook: stored?.tiltLook === true, voices: stored?.voices !== false, music: stored?.music !== false, beginner: stored?.beginner !== false, rails: stored?.rails !== false, immersion: clampImmersion(stored?.immersion) };
}

export function saveDisplay(display, storage = browserStorage()) {
  const value = { panelOpacity: clampPanelOpacity(display?.panelOpacity), tiltLook: display?.tiltLook === true, voices: display?.voices !== false, music: display?.music !== false, beginner: display?.beginner !== false, rails: display?.rails !== false, immersion: clampImmersion(display?.immersion) };
  try { storage?.setItem?.(DISPLAY_KEY, JSON.stringify(value)); } catch { /* private mode: kept for this page only */ }
  return value;
}
