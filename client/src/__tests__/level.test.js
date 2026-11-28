import { expect, test } from 'vitest';
import { LEVELS, immersionOf, levelOf, loadDisplay, saveDisplay } from '../display.js';

const memory = () => { const values = new Map(); return { values, getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }; };

test('three tiers: low but not zero, half, and all of it', () => {
  expect(LEVELS.map((entry) => [entry.id, entry.share])).toEqual([['new', 0.3], ['some', 0.5], ['basic', 1]]);
});

test('a level is stored with its share and is sent in place of the stage\'s', () => {
  const storage = memory();
  const some = LEVELS[1];
  const display = saveDisplay({ ...loadDisplay(storage), level: some.id, immersion: some.share, immersionAuto: false }, storage);
  expect(loadDisplay(storage).level).toBe('some');
  expect(immersionOf({ display })).toBe(0.5);
  expect(levelOf('expert')).toBeNull();
  expect(loadDisplay(memory()).level).toBeNull();
});
