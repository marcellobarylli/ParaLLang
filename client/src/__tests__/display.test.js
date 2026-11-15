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
  expect(loadDisplay(storage)).toEqual({ panelOpacity: PANEL_OPACITY.default });
  expect(saveDisplay({ panelOpacity: 0.32 }, storage)).toEqual({ panelOpacity: 0.3 });
  expect(JSON.parse(storage.values.get(DISPLAY_KEY))).toEqual({ panelOpacity: 0.3 });
  expect(loadDisplay(storage)).toEqual({ panelOpacity: 0.3 });
  expect(storage.values.has('parallang.settings')).toBe(false);
  expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: '{broken' }))).toEqual({ panelOpacity: PANEL_OPACITY.default });
  expect(loadDisplay(memoryStorage({ [DISPLAY_KEY]: '{"panelOpacity":"dark"}' }))).toEqual({ panelOpacity: PANEL_OPACITY.default });
  expect(loadDisplay(null)).toEqual({ panelOpacity: PANEL_OPACITY.default });
});

test('a storage that refuses the write keeps the value for this page', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
  expect(saveDisplay({ panelOpacity: 0.5 }, storage)).toEqual({ panelOpacity: 0.5 });
});
