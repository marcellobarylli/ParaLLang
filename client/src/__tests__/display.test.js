// @vitest-environment node
// Round 117: the display preference (how opaque the text panels are) and its storage.
import { expect, test, vi } from 'vitest';
import { DISPLAY_KEY, PANEL_OPACITY, clampPanelOpacity, loadDisplay, saveDisplay } from '../display.js';

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: vi.fn((key) => values.get(key) ?? null), setItem: vi.fn((key, value) => values.set(key, value)), values };
}

test('the opacity is clamped to the slider and rounded to its step', () => {
  expect(clampPanelOpacity(0.42)).toBe(0.4);
  expect(clampPanelOpacity(0.43)).toBe(0.45);
  expect(clampPanelOpacity('0.3')).toBe(0.3);
  expect(clampPanelOpacity(0)).toBe(0);
  expect(clampPanelOpacity(-3)).toBe(0);
  expect(clampPanelOpacity(7)).toBe(1);
  for (const junk of [undefined, null, '', 'grey', NaN, Infinity, {}, true]) expect(clampPanelOpacity(junk), String(junk)).toBe(PANEL_OPACITY.default);
});

test('the preference loads with a default, saves under its own key, and survives a broken stored value', () => {
  const storage = memoryStorage();
  expect(loadDisplay(storage)).toEqual({ panelOpacity: PANEL_OPACITY.default, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(saveDisplay({ panelOpacity: 0.32 }, storage)).toEqual({ panelOpacity: 0.3, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(JSON.parse(storage.values.get(DISPLAY_KEY))).toEqual({ panelOpacity: 0.3, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(storage)).toEqual({ panelOpacity: 0.3, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(storage.values.has('parallang.settings')).toBe(false);
  expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: '{broken' }))).toEqual({ panelOpacity: PANEL_OPACITY.default, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: '{"panelOpacity":"dark"}' }))).toEqual({ panelOpacity: PANEL_OPACITY.default, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(null)).toEqual({ panelOpacity: PANEL_OPACITY.default, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
});

test('a storage that refuses the write keeps the value for this page', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  expect(saveDisplay({ panelOpacity: 0.5 }, storage)).toEqual({ panelOpacity: 0.5, tiltLook: false, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
});

// Round 125: tilt to look is off unless it was switched on, and is stored beside the opacity.
test('tilt to look loads off, saves as a boolean, and anything but true is off', () => {
  const storage = memoryStorage();
  expect(loadDisplay(storage).tiltLook).toBe(false);
  expect(saveDisplay({ panelOpacity: 0.5, tiltLook: true }, storage)).toEqual({ panelOpacity: 0.5, tiltLook: true, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(storage)).toEqual({ panelOpacity: 0.5, tiltLook: true, voices: true, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  for (const junk of ['true', 1, 'yes', null, {}]) expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: JSON.stringify({ tiltLook: junk }) })).tiltLook, String(junk)).toBe(false);
  expect(saveDisplay({ tiltLook: 'on' }, storage).tiltLook).toBe(false);
});

// Round 126: character voices are on unless they were switched off.
test('voices load on, save as a boolean, and only false is off', () => {
  const storage = memoryStorage();
  expect(loadDisplay(storage).voices).toBe(true);
  expect(saveDisplay({ panelOpacity: 0.5, voices: false }, storage)).toEqual({ panelOpacity: 0.5, tiltLook: false, voices: false, music: true, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(storage).voices).toBe(false);
  for (const junk of ['false', 0, null, {}]) expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: JSON.stringify({ voices: junk }) })).voices, String(junk)).toBe(true);
});

// Round 127: the ambient music is on unless it was switched off.
test('music loads on, saves as a boolean, and only false is off', () => {
  const storage = memoryStorage();
  expect(loadDisplay(storage).music).toBe(true);
  expect(saveDisplay({ panelOpacity: 0.5, music: false }, storage)).toEqual({ panelOpacity: 0.5, tiltLook: false, voices: true, music: false, beginner: true, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(storage).music).toBe(false);
  for (const junk of ['false', 0, null]) expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: JSON.stringify({ music: junk }) })).music, String(junk)).toBe(true);
});

// Round 129: beginner mode is on unless it was switched off.
test('beginner mode loads on, saves as a boolean, and only false is off', () => {
  const storage = memoryStorage();
  expect(loadDisplay(storage).beginner).toBe(true);
  expect(saveDisplay({ panelOpacity: 0.5, beginner: false, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true }, storage)).toEqual({ panelOpacity: 0.5, tiltLook: false, voices: true, music: true, beginner: false, rails: true, immersion: 1, immersionAuto: true, light: false, treeModels: true, streamlined: true, follow: false, volume: { master: 1, music: 1, effects: 1, voice: 1 } });
  expect(loadDisplay(storage).beginner).toBe(false);
});

// Round 148: how much of a character's lines is in the language being learned.
test('the share of the language loads as all of it, moves in tenths from 10 % to 100 %, and anything else is all of it', async () => {
  const { IMMERSION, clampImmersion } = await import('../display.js');
  expect(IMMERSION).toEqual({ min: 0.1, max: 1, step: 0.1, default: 1 });
  expect(clampImmersion(0.64)).toBe(0.6);
  expect(clampImmersion('0.3')).toBe(0.3);
  expect(clampImmersion(0)).toBe(0.1);
  expect(clampImmersion(4)).toBe(1);
  for (const junk of [undefined, null, '', 'all', NaN, {}, true]) expect(clampImmersion(junk), String(junk)).toBe(1);
  const storage = memoryStorage();
  expect(loadDisplay(storage).immersion).toBe(1);
  expect(saveDisplay({ ...loadDisplay(storage), immersion: 0.52 }, storage).immersion).toBe(0.5);
  expect(loadDisplay(storage).immersion).toBe(0.5);
  expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: '{"immersion":"lots"}' })).immersion).toBe(1);
});
