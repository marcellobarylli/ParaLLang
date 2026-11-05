// Round 027 (backlog C2): the philosophy statement on first launch.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';
import App from '../../App.js';
import { createGameStore, ONBOARDING_KEY, useGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: false, language };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const world = {
  currentLocationId: 'market_entrance',
  locations: [{ id: 'market_entrance', name: 'Market Entrance', state: 'current', adjacent: false, map: { x: 0.5, y: 0.9 }, description: 'An arch.', encounter: null }],
  paths: [],
};
const onboarding = {
  title: 'Before you enter', statement: 'We believe that language learning shouldn\'t be too rigid.',
  notes: ['One thing stays structured: repetition.', 'The Crumbling Market is through the archway.'], beginLabel: 'Enter the market',
};

function memoryStorage(entries = []) {
  const values = new Map(entries);
  return { values, getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}
function fakeApi(overrides = {}) {
  return {
    createLearner: jest.fn(async () => identity),
    getWorld: jest.fn(async () => ({ world })),
    getSpellbook: jest.fn(async () => spellbook),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(async () => ({ onboarding })),
    ...overrides,
  };
}

test('first launch shows the statement once, even with duplicate startup calls', async () => {
  const api = fakeApi();
  const store = createGameStore({ api, storage: memoryStorage() });
  await Promise.all([store.getState().initialize(), store.getState().initialize()]);
  expect(api.getOnboarding).toHaveBeenCalledTimes(1);
  expect(store.getState()).toMatchObject({ view: 'onboarding', onboarding, world, learnerId: identity.learnerId, error: null });
});

test('a returning player goes straight to the map without fetching the statement', async () => {
  const api = fakeApi();
  const store = createGameStore({ api, storage: memoryStorage([[ONBOARDING_KEY, '1']]) });
  await store.getState().initialize();
  expect(api.getOnboarding).not.toHaveBeenCalled();
  expect(store.getState()).toMatchObject({ view: 'map', onboarding: null });
});

test('a failing statement fetch skips the screen and never blocks startup', async () => {
  const api = fakeApi({ getOnboarding: jest.fn(async () => { throw new Error('server down'); }) });
  const store = createGameStore({ api, storage: memoryStorage() });
  await store.getState().initialize();
  expect(store.getState()).toMatchObject({ view: 'map', onboarding: null, error: null, world });
});

test('a screen opened during startup is not replaced by the statement', async () => {
  let releaseWorld;
  const api = fakeApi({ getWorld: jest.fn(() => new Promise((resolve) => { releaseWorld = () => resolve({ world }); })) });
  const storage = memoryStorage();
  const store = createGameStore({ api, storage });
  const pending = store.getState().initialize();
  await new Promise((resolve) => setTimeout(resolve, 0));
  store.getState().openSpellbook();
  releaseWorld();
  await pending;
  expect(store.getState().view).toBe('spellbook');
  expect(storage.values.has(ONBOARDING_KEY)).toBe(false);
});

test('a superseded startup does not set the statement', async () => {
  let releaseWorld;
  const api = fakeApi({ getWorld: jest.fn(() => new Promise((resolve) => { releaseWorld = () => resolve({ world }); })) });
  const store = createGameStore({ api, storage: memoryStorage() });
  const pending = store.getState().initialize();
  await new Promise((resolve) => setTimeout(resolve, 0));
  store.getState().switchLearnerForTest('22222222-2222-4222-8222-222222222222');
  releaseWorld();
  await pending;
  expect(store.getState().onboarding).toBeNull();
  expect(store.getState().view).toBe('map');
});

test('entering the market writes the flag and lands on the map, never in a dialogue', async () => {
  const storage = memoryStorage();
  const store = createGameStore({ api: fakeApi(), storage });
  await store.getState().initialize();
  await store.getState().finishOnboarding();
  expect(store.getState()).toMatchObject({ view: 'map', returnView: 'map', onboarding: null });
  expect(storage.values.get(ONBOARDING_KEY)).toBe('1');
});

test('a failed flag write still lands on the map', async () => {
  const storage = memoryStorage();
  storage.setItem = jest.fn(async (key, value) => { if (key === ONBOARDING_KEY) throw new Error('disk full'); storage.values.set(key, value); });
  const store = createGameStore({ api: fakeApi(), storage });
  await store.getState().initialize();
  await store.getState().finishOnboarding();
  expect(store.getState()).toMatchObject({ view: 'map', onboarding: null, error: null });
});

test('in the app, the statement hides the header actions and its button opens the map', async () => {
  await AsyncStorage.clear();
  useGameStore.setState({
    learnerId: null, language: null, encounter: null, spellbook, world: null, onboarding: null, party: [], notice: null, view: 'map', returnView: 'map',
    reviewChallenge: null, reviewResult: null, assessment: null, draft: '', pendingInput: null, isLoading: false, error: null,
  });
  const response = (status, data) => ({ ok: status < 300, status, json: async () => data });
  globalThis.fetch = jest.fn(async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === '/api/learner') return response(201, identity);
    if (path === '/api/world') return response(200, { world });
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/party') return response(200, { party: [] });
    if (path === '/api/onboarding') return response(200, { onboarding });
    throw new Error(`Unexpected fetch ${path}`);
  });
  const user = userEvent.setup();
  await render(<App />);
  expect(await screen.findByRole('heading', { name: 'Before you enter' })).toBeTruthy();
  expect(screen.getByText(onboarding.statement)).toBeTruthy();
  expect(screen.getByText(onboarding.notes[1])).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Spellbook, \d+ reviews due/ })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Enter the market: open the map' }));
  expect(await screen.findByRole('button', { name: /Spellbook, 0 reviews due/ })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Before you enter' })).toBeNull();
  expect(await AsyncStorage.getItem(ONBOARDING_KEY)).toBe('1');
  delete globalThis.fetch;
});
