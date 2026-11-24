// Round 178: save slots.
import { expect, test, vi } from 'vitest';
import { SLOT_KEY, chooseSlot, clearSlot, currentSlot, keyIn, slotSummaries, slottedStorage } from '../slots.js';
import { createGameStore } from '../stores/gameStore.js';
import { DUNGEON } from '../dungeon.js';
import { ATLAS } from '../atlas.js';

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key), values };
}

test('slot 1 keeps the keys as they were; slots 2 and 3 suffix the per-learner ones; settings are shared', () => {
  expect(keyIn('parallang.learnerId', 1)).toBe('parallang.learnerId');
  expect(keyIn('parallang.save', 2)).toBe('parallang.save.2');
  expect(keyIn('parallang.title', 3)).toBe('parallang.title.3');
  expect(keyIn('parallang.display', 3)).toBe('parallang.display');
  const storage = memoryStorage({ 'parallang.learnerId': 'old' });
  expect(currentSlot(storage)).toBe(1);
  expect(slottedStorage(storage, 1).getItem('parallang.learnerId')).toBe('old');
  const two = slottedStorage(storage, 2);
  expect(two.getItem('parallang.learnerId')).toBe(null);
  two.setItem('parallang.learnerId', 'second');
  two.setItem('parallang.display', '{}');
  expect(storage.values.get('parallang.learnerId.2')).toBe('second');
  expect(storage.values.get('parallang.learnerId')).toBe('old');
  expect(storage.values.get('parallang.display')).toBe('{}');
});

test('the summaries, choosing a slot, and emptying one that is not in use', () => {
  const copy = { exportedAt: '2026-11-24T10:00:00.000Z', save: { learnerId: 'old', road: { step: 7 }, spellbook: { words: { a: {}, b: {} }, phrases: { c: {} } } } };
  const storage = memoryStorage({ 'parallang.learnerId': 'old', 'parallang.save': JSON.stringify(copy), 'parallang.learnerId.3': 'third' });
  expect(slotSummaries(storage)).toEqual([
    { slot: 1, current: true, used: true, savedAt: copy.exportedAt, conversations: 7, words: 3 },
    { slot: 2, current: false, used: false, savedAt: null, conversations: null, words: null },
    { slot: 3, current: false, used: true, savedAt: null, conversations: null, words: null },
  ]);
  expect(clearSlot(storage, 1)).toBe(false); // the slot in use is never emptied
  expect(chooseSlot(storage, 4)).toBe(false);
  expect(chooseSlot(storage, 3)).toBe(true);
  expect(storage.values.get(SLOT_KEY)).toBe('3');
  expect(currentSlot(storage)).toBe(3);
  expect(clearSlot(storage, 3)).toBe(false);
  expect(clearSlot(storage, 1)).toBe(true);
  expect(storage.values.has('parallang.learnerId')).toBe(false);
  expect(storage.values.has('parallang.save')).toBe(false);
  expect(storage.values.get('parallang.learnerId.3')).toBe('third');
});

test('the store plays the slot chosen: a new slot asks for a new learner and leaves slot 1 alone; switching reloads', async () => {
  const storage = memoryStorage({ 'parallang.learnerId': 'first-learner', [SLOT_KEY]: '2' });
  const createLearner = vi.fn(async () => ({ learnerId: 'second-learner', recovered: false }));
  const reload = vi.fn();
  const store = createGameStore({ api: { createLearner, getDungeon: async () => { throw new Error('offline'); } }, storage, dungeon: DUNGEON, atlas: ATLAS, reload });
  const s = () => store.getState();
  expect(s().slot).toBe(2);
  await s().initialize();
  expect(createLearner).toHaveBeenCalledWith(null); // slot 2 had no learner of its own
  expect(storage.values.get('parallang.learnerId.2')).toBe('second-learner');
  expect(storage.values.get('parallang.learnerId')).toBe('first-learner');
  s().openSlots();
  expect(s().saveSlots.map((entry) => [entry.slot, entry.current, entry.used])).toEqual([[1, false, true], [2, true, true], [3, false, false]]);
  expect(s().switchSlot(2)).toBe(false);
  expect(reload).not.toHaveBeenCalled();
  expect(s().switchSlot(1)).toBe(true);
  expect(storage.values.get(SLOT_KEY)).toBe('1');
  expect(reload).toHaveBeenCalledTimes(1);
});

// Round 179: deleting a slot removes its save on the server too; the slot in use is started over (deleted, reloaded).
test('deleting another slot removes its save from the server and the browser; starting over the slot in use reloads into a new game', async () => {
  const storage = memoryStorage({ 'parallang.learnerId': 'first', 'parallang.save': '{"save":{"learnerId":"first"}}', 'parallang.learnerId.2': 'second', 'parallang.title.2': '{}' });
  const deleteLearner = vi.fn(async () => ({ deleted: true }));
  const reload = vi.fn();
  const store = createGameStore({ api: { createLearner: async () => ({ learnerId: 'first' }), getDungeon: async () => { throw new Error('offline'); }, deleteLearner }, storage, dungeon: DUNGEON, atlas: ATLAS, reload });
  const s = () => store.getState();
  s().openSlots();
  expect(await s().deleteSlot(2)).toEqual({ done: true, serverDeleted: true, reloading: false });
  expect(deleteLearner).toHaveBeenLastCalledWith('second');
  expect([storage.values.has('parallang.learnerId.2'), storage.values.has('parallang.title.2')]).toEqual([false, false]);
  expect(s().saveSlots.map((entry) => entry.used)).toEqual([true, false, false]);
  expect(reload).not.toHaveBeenCalled();
  // The slot in use: its save goes, and the page reloads into a new game in the same slot.
  expect(await s().deleteSlot(1)).toEqual({ done: true, serverDeleted: true, reloading: true });
  expect(deleteLearner).toHaveBeenLastCalledWith('first');
  expect([storage.values.has('parallang.learnerId'), storage.values.has('parallang.save')]).toEqual([false, false]);
  expect(storage.values.get('parallang.slot') ?? '1').toBe('1');
  expect(reload).toHaveBeenCalledTimes(1);
});

test('a server that cannot be reached still empties the slot, and says so', async () => {
  const storage = memoryStorage({ 'parallang.learnerId.3': 'third' });
  const store = createGameStore({ api: { createLearner: async () => ({ learnerId: 'x' }), getDungeon: async () => { throw new Error('offline'); }, deleteLearner: async () => { throw new Error('offline'); } }, storage, dungeon: DUNGEON, atlas: ATLAS, reload: vi.fn() });
  expect(await store.getState().deleteSlot(3)).toEqual({ done: true, serverDeleted: false, reloading: false });
  expect(storage.values.has('parallang.learnerId.3')).toBe(false);
});
