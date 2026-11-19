// Round 117: display preferences of this browser. They are stored apart from the server URL and the access token
// (api/settings.js), because saving those reconnects and a change here must not.
//
// panelOpacity: how opaque the text panels over the 3D level are, 0 (only the text) to 1 (the level hidden).
// voices (round 126): whether the characters read their new lines aloud. On unless switched off.
// tiltLook (round 125): whether the phone's orientation turns the camera's look at a site. Off unless switched on.
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

export function loadDisplay(storage = browserStorage()) {
  let stored = null;
  try { stored = JSON.parse(storage?.getItem?.(DISPLAY_KEY) ?? 'null'); } catch { stored = null; }
  return { panelOpacity: clampPanelOpacity(stored?.panelOpacity), tiltLook: stored?.tiltLook === true, voices: stored?.voices !== false };
}

export function saveDisplay(display, storage = browserStorage()) {
  const value = { panelOpacity: clampPanelOpacity(display?.panelOpacity), tiltLook: display?.tiltLook === true, voices: display?.voices !== false };
  try { storage?.setItem?.(DISPLAY_KEY, JSON.stringify(value)); } catch { /* private mode: kept for this page only */ }
  return value;
}
