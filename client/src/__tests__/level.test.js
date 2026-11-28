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

import { createGameStore } from '../stores/gameStore.js';
import { LEVEL_KEY, NEW_GAME_KEY, SLOT_KEY } from '../slots.js';
const LEARNER = 'parallang.learnerId';

test('a level belongs to its slot: a new slot is asked again and does not inherit the share', () => {
  const storage = memory();
  const first = createGameStore({ api: {}, storage, dungeon: { id: 'd', sites: [], start: null } });
  first.getState().setLevel('some');
  expect(storage.values.get(LEVEL_KEY)).toBe('some');
  expect(first.getState().display.level).toBe('some');
  storage.setItem(SLOT_KEY, '2');
  const second = createGameStore({ api: {}, storage, dungeon: { id: 'd', sites: [], start: null } });
  expect(second.getState().display.level).toBeNull();
  expect(immersionOf(second.getState())).toBeNull();
});

// Round 218: the review of round 216. The slider and "Follow my level" move the slot's own share, which a reload
// keeps; another slot's game is not moved; a game reloaded on its title before setting out is still asked.
const store = (storage) => createGameStore({ api: {}, storage, dungeon: { id: 'd', sites: [], start: null } });

test('Settings moves the slot\'s share after the level, and a reload keeps it', () => {
  const storage = memory();
  store(storage).getState().setLevel('basic');
  const again = store(storage);
  expect(again.getState().display).toMatchObject({ level: 'basic', immersion: 1, immersionAuto: false });
  again.getState().setImmersion(0.6);
  expect(store(storage).getState().display).toMatchObject({ level: 'basic', immersion: 0.6, immersionAuto: false });
  store(storage).getState().setImmersionAuto(true);
  expect(store(storage).getState().display).toMatchObject({ level: 'basic', immersionAuto: true });
  // Another setting leaves the share where it is.
  store(storage).getState().setMusic(false);
  expect(store(storage).getState().display).toMatchObject({ level: 'basic', immersionAuto: true, music: false });
});

test('a level said in one slot does not move another slot\'s game', () => {
  const storage = memory();
  // Slot 2 holds a game begun before levels, following its level.
  storage.setItem(SLOT_KEY, '2');
  storage.setItem(`${LEARNER}.2`, 'learner-two');
  expect(store(storage).getState().display).toMatchObject({ level: null, immersionAuto: true });
  storage.setItem(SLOT_KEY, '1');
  const first = store(storage);
  first.getState().setLevel('new');
  first.getState().setImmersion(0.4);
  expect(first.getState().display).toMatchObject({ level: 'new', immersion: 0.4 });
  storage.setItem(SLOT_KEY, '2');
  expect(store(storage).getState().display).toMatchObject({ level: null, immersionAuto: true });
});

test('a new game reloaded on its title before setting out is still new', () => {
  const storage = memory();
  expect(store(storage).getState().freshGame).toBe(true);
  storage.setItem(LEARNER, 'made-on-the-title'); // initialize() made the learner as soon as the title was up
  expect(store(storage).getState().freshGame).toBe(true);
  storage.values.delete(NEW_GAME_KEY); // the journey set out
  expect(store(storage).getState().freshGame).toBe(false);
});
