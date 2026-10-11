import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createGameStore } from '../gameStore.js';

const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true };
const encounter = { id: 'enc-1', version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const started = { encounter, spellbook };

function memoryStorage(initial) {
  const values = new Map(initial ? [['parallang.learnerId', initial]] : []);
  return { getItem: vi.fn((key) => values.get(key) ?? null), setItem: vi.fn((key, value) => values.set(key, value)) };
}

function fakeApi(overrides = {}) {
  return {
    createLearner: vi.fn(async () => identity),
    startEncounter: vi.fn(async () => started),
    sendDialogue: vi.fn(), revealHelp: vi.fn(), createReview: vi.fn(), submitReview: vi.fn(),
    ...overrides,
  };
}

test('recovers browser identity and deduplicates StrictMode-style startup', async () => {
  const storage = memoryStorage(identity.learnerId);
  const api = fakeApi();
  const store = createGameStore({ api, storage });
  const first = store.getState().initialize();
  const second = store.getState().initialize();
  expect(first).toBe(second);
  await first;
  expect(api.createLearner).toHaveBeenCalledOnce();
  expect(api.createLearner).toHaveBeenCalledWith(identity.learnerId);
  expect(api.startEncounter).toHaveBeenCalledOnce();
  expect(store.getState().encounter).toEqual(encounter);
});

test('failed dialogue preserves pending input for retry', async () => {
  const api = fakeApi({ sendDialogue: vi.fn(async () => { throw new Error('temporary grading failure'); }) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  store.getState().setDraft('Un café');
  await store.getState().sendMessage();
  expect(store.getState().draft).toBe('Un café');
  expect(store.getState().pendingInput).toBe('Un café');
  expect(store.getState().error).toMatch(/temporary grading failure/);
  expect(store.getState().encounter.version).toBe(1);
});

test('CLI provider errors end a long pending request and preserve the exact draft', async () => {
  let rejectDialogue;
  const api = fakeApi({ sendDialogue: vi.fn(() => new Promise((_resolve, reject) => { rejectDialogue = reject; })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  store.getState().setDraft('Sin leche, por favor.');
  const pending = store.getState().sendMessage();
  expect(store.getState().isLoading).toBe(true);
  expect(store.getState().pendingInput).toBe('Sin leche, por favor.');
  rejectDialogue(Object.assign(new Error('The selected CLI timed out. Your progress was not changed.'), { code: 'CLI_TIMEOUT', retryable: true }));
  await pending;
  expect(store.getState().isLoading).toBe(false);
  expect(store.getState().draft).toBe('Sin leche, por favor.');
  expect(store.getState().pendingInput).toBe('Sin leche, por favor.');
  expect(store.getState().error).toMatch(/CLI timed out/);
  expect(store.getState().encounter.version).toBe(1);
});

test('server results synchronize encounter and Spellbook snapshots', async () => {
  const updated = { encounter: { ...encounter, version: 2 }, spellbook: { cards: [{ vocabularyId: 'cafe' }], dueCount: 1 }, assessment: { overallFeedback: 'Good' } };
  const api = fakeApi({ sendDialogue: vi.fn(async () => updated) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  await store.getState().sendMessage('Un café');
  expect(store.getState().encounter.version).toBe(2);
  expect(store.getState().spellbook.dueCount).toBe(1);
  expect(store.getState().assessment.overallFeedback).toBe('Good');
  expect(store.getState().draft).toBe('');
});

test('stale responses are ignored after learner switch and snapshots remain per learner', async () => {
  let resolveDialogue;
  const api = fakeApi({ sendDialogue: vi.fn(() => new Promise((resolve) => { resolveDialogue = resolve; })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  const pending = store.getState().sendMessage('Un café');
  store.getState().switchLearnerForTest('22222222-2222-4222-8222-222222222222');
  resolveDialogue({ encounter: { ...encounter, version: 99 }, spellbook: { cards: [{ vocabularyId: 'wrong' }], dueCount: 1 }, assessment: {} });
  await pending;
  expect(store.getState().learnerId).toBe('22222222-2222-4222-8222-222222222222');
  expect(store.getState().encounter).toBeNull();
  store.getState().switchLearnerForTest(identity.learnerId);
  expect(store.getState().encounter.version).toBe(1);
  expect(store.getState().spellbook.cards).toEqual([]);
});
