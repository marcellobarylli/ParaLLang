// Ported from client/src/stores/__tests__/learning-state.test.js; storage is async and the store keeps the language.
import { createGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language };
const encounter = { id: 'enc-1', encounterId: 'imp_coffee_greeting', character: { name: 'Gerald' }, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const started = { encounter, spellbook };
const place = (id, state, adjacent, extra = {}) => ({ id, name: id, state, adjacent, map: { x: 0.5, y: 0.5 }, ...extra });
const world = {
  currentLocationId: 'market_entrance',
  locations: [place('coffee_cart', 'known', true), place('market_entrance', 'current', false, { description: 'An arch.', encounter: null })],
  paths: [['market_entrance', 'coffee_cart']],
};
const atCart = {
  currentLocationId: 'coffee_cart',
  locations: [place('coffee_cart', 'current', false, { description: 'A cart.', encounter: { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald' } })],
  paths: [],
};

function memoryStorage(initial) {
  const values = new Map(initial ? [['parallang.learnerId', initial]] : []);
  return { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}

function fakeApi(overrides = {}) {
  return {
    createLearner: jest.fn(async () => identity),
    startEncounter: jest.fn(async () => started),
    getWorld: jest.fn(async () => ({ world })),
    getSpellbook: jest.fn(async () => spellbook),
    getParty: jest.fn(async () => ({ party: [] })),
    moveTo: jest.fn(async () => ({ world: atCart })),
    sendDialogue: jest.fn(), revealHelp: jest.fn(), createReview: jest.fn(), submitReview: jest.fn(),
    ...overrides,
  };
}

// Round 005: the app opens on the map; an encounter starts when the player enters it.
async function ready(store) {
  await store.getState().initialize();
  await store.getState().moveTo('coffee_cart');
  await store.getState().enterEncounter();
}

test('recovers the stored identity from async storage and deduplicates startup', async () => {
  const storage = memoryStorage(identity.learnerId);
  const api = fakeApi();
  const store = createGameStore({ api, storage });
  const first = store.getState().initialize();
  const second = store.getState().initialize();
  expect(first).toBe(second);
  await first;
  expect(api.createLearner).toHaveBeenCalledTimes(1);
  expect(api.createLearner).toHaveBeenCalledWith(identity.learnerId);
  expect(api.startEncounter).not.toHaveBeenCalled();
  expect(api.getWorld).toHaveBeenCalledTimes(1);
  expect(storage.setItem).toHaveBeenCalledWith('parallang.learnerId', identity.learnerId);
  expect(store.getState().view).toBe('map');
  expect(store.getState().world).toEqual(world);
  expect(store.getState().encounter).toBeNull();
});

test('moving on the map and entering the Coffee Cart starts Gerald, and the Spellbook returns to where it opened', async () => {
  const api = fakeApi();
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  store.getState().openSpellbook();
  store.getState().returnToDialogue();
  expect(store.getState().view).toBe('map');
  await store.getState().moveTo('coffee_cart');
  expect(api.moveTo).toHaveBeenCalledWith(identity.learnerId, 'coffee_cart');
  expect(store.getState().world.currentLocationId).toBe('coffee_cart');
  await store.getState().enterEncounter();
  expect(api.startEncounter).toHaveBeenCalledWith(identity.learnerId, false, 'imp_coffee_greeting');
  expect(store.getState().view).toBe('dialogue');
  expect(store.getState().encounter).toEqual(encounter);
  store.getState().openSpellbook();
  store.getState().returnToDialogue();
  expect(store.getState().view).toBe('dialogue');
  await store.getState().openMap();
  expect(store.getState().view).toBe('map');
  expect(api.getWorld).toHaveBeenCalledTimes(2);
});

test('entering a different encounter clears the old assessment and draft; resuming keeps them', async () => {
  const api = fakeApi({ sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2 }, spellbook, assessment: { overallFeedback: 'Not yet' } })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await ready(store);
  await store.getState().sendMessage('Un caffè');
  store.getState().setDraft('senza');
  await store.getState().enterEncounter();
  expect(store.getState().assessment.overallFeedback).toBe('Not yet');
  expect(store.getState().draft).toBe('senza');
  api.startEncounter.mockResolvedValueOnce({ encounter: { ...encounter, id: 'enc-2', encounterId: 'fixture_butcher', character: { name: 'Bernard' } }, spellbook });
  await store.getState().enterEncounter();
  expect(store.getState().encounter.character.name).toBe('Bernard');
  expect(store.getState().assessment).toBeNull();
  expect(store.getState().draft).toBe('');
  expect(store.getState().pendingInput).toBeNull();
  await store.getState().restartEncounter();
  expect(api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, true, 'fixture_butcher');
});

test('a failed move keeps the map and reports the error', async () => {
  const api = fakeApi({ moveTo: jest.fn(async () => { throw new Error("You can't get to The Rift from here."); }) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  await store.getState().moveTo('the_rift');
  expect(store.getState().world).toEqual(world);
  expect(store.getState().error).toMatch(/can't get to The Rift/);
  expect(store.getState().isLoading).toBe(false);
});

test('resolving an encounter refreshes the map', async () => {
  const completed = { ...atCart, locations: [{ ...atCart.locations[0], encounter: { id: 'imp_coffee_greeting', completed: true } }] };
  const api = fakeApi({ sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2, state: 'resolved' }, spellbook, assessment: { overallFeedback: 'Done' } })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await ready(store);
  api.getWorld.mockResolvedValueOnce({ world: completed });
  await store.getState().sendMessage('Vorrei un caffè senza latte.');
  expect(store.getState().world.locations[0].encounter.completed).toBe(true);
});

test('keeps the target language from the learner response', async () => {
  const store = createGameStore({ api: fakeApi(), storage: memoryStorage() });
  expect(store.getState().language).toBeNull();
  await store.getState().initialize();
  expect(store.getState().language).toEqual(language);
});

test('failed dialogue preserves pending input for retry', async () => {
  const api = fakeApi({ sendDialogue: jest.fn(async () => { throw new Error('temporary grading failure'); }) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await ready(store);
  store.getState().setDraft('Un caffè');
  await store.getState().sendMessage();
  expect(store.getState().draft).toBe('Un caffè');
  expect(store.getState().pendingInput).toBe('Un caffè');
  expect(store.getState().error).toMatch(/temporary grading failure/);
  expect(store.getState().encounter.version).toBe(1);
});

test('CLI provider errors end a long pending request and keep the trimmed submitted text', async () => {
  let rejectDialogue;
  const api = fakeApi({ sendDialogue: jest.fn(() => new Promise((_resolve, reject) => { rejectDialogue = reject; })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await ready(store);
  store.getState().setDraft('  Vorrei un caffè senza latte.  ');
  const pending = store.getState().sendMessage();
  expect(store.getState().isLoading).toBe(true);
  expect(store.getState().pendingInput).toBe('Vorrei un caffè senza latte.');
  rejectDialogue(Object.assign(new Error('The selected CLI timed out. Your progress was not changed.'), { code: 'CLI_TIMEOUT', retryable: true }));
  await pending;
  expect(store.getState().isLoading).toBe(false);
  expect(store.getState().draft).toBe('Vorrei un caffè senza latte.');
  expect(store.getState().pendingInput).toBe('Vorrei un caffè senza latte.');
  expect(store.getState().error).toMatch(/CLI timed out/);
  expect(store.getState().encounter.version).toBe(1);
});

test('server results synchronize encounter and Spellbook snapshots', async () => {
  const updated = { encounter: { ...encounter, version: 2 }, spellbook: { cards: [{ vocabularyId: 'caffe' }], dueCount: 1 }, assessment: { overallFeedback: 'Good' } };
  const api = fakeApi({ sendDialogue: jest.fn(async () => updated) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await ready(store);
  await store.getState().sendMessage('Un caffè');
  expect(store.getState().encounter.version).toBe(2);
  expect(store.getState().spellbook.dueCount).toBe(1);
  expect(store.getState().assessment.overallFeedback).toBe('Good');
  expect(store.getState().draft).toBe('');
});

test('a stale dialogue response is ignored after a learner switch and snapshots remain per learner', async () => {
  let resolveDialogue;
  const api = fakeApi({ sendDialogue: jest.fn(() => new Promise((resolve) => { resolveDialogue = resolve; })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await ready(store);
  const pending = store.getState().sendMessage('Un caffè');
  store.getState().switchLearnerForTest('22222222-2222-4222-8222-222222222222');
  resolveDialogue({ encounter: { ...encounter, version: 99 }, spellbook: { cards: [{ vocabularyId: 'wrong' }], dueCount: 1 }, assessment: {} });
  await pending;
  expect(store.getState().learnerId).toBe('22222222-2222-4222-8222-222222222222');
  expect(store.getState().encounter).toBeNull();
  store.getState().switchLearnerForTest(identity.learnerId);
  expect(store.getState().encounter.version).toBe(1);
  expect(store.getState().spellbook.cards).toEqual([]);
});
