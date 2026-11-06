// Round 073 (backlog I3): while an encounter's greeting is generated, the pressed Talk button gets a status line.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent } from '@testing-library/react-native';
import App from '../../App.js';
import MapPanel from '../components/MapPanel.js';
import PartyPanel from '../components/PartyPanel.js';
import { createGameStore, useGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language };
const other = '22222222-2222-4222-8222-222222222222';
const encounter = { id: 'enc-1', encounterId: 'imp_coffee_greeting', location: 'coffee_cart', character: { name: 'Gerald' }, version: 1, state: 'ongoing', difficulty: 0.25, transcript: [], hints: { remaining: 2, limit: 2 }, currentObjective: { id: 'order_coffee', prompt: 'Order a coffee from Gerald.' } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const place = (id, name, state, adjacent, extra = {}) => ({ id, name, state, adjacent, map: { x: 0.5, y: 0.5 }, ...extra });
const world = (characterName = 'Gerald') => ({
  currentLocationId: 'coffee_cart',
  locations: [place('coffee_cart', 'The Coffee Cart', 'current', false, { description: 'A cart.', encounter: { id: 'imp_coffee_greeting', completed: false, characterName } }),
    place('butchers_stall', "The Butcher's Stall", 'visited', true, { description: 'A stall.', encounter: { id: 'butchers_stall_charcutier', completed: false, characterName: 'Mortimer' } })],
  paths: [['coffee_cart', 'butchers_stall']],
});
const party = [
  { characterId: 'gerald', name: 'Gerald', locationName: 'The Coffee Cart', conversationId: 'gerald_coffee_break', conversations: 0 },
  { characterId: 'mortimer', name: 'Mortimer', locationName: "The Butcher's Stall", conversationId: 'mortimer_tasting', conversations: 0 },
];
function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function memoryStorage() {
  const values = new Map([['parallang.onboardingSeen', '1']]);
  return { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}
function setup(overrides = {}) {
  const api = {
    createLearner: jest.fn(async () => identity), getWorld: jest.fn(async () => ({ world: world() })),
    getSpellbook: jest.fn(async () => spellbook), getParty: jest.fn(async () => ({ party })), getOnboarding: jest.fn(), moveTo: jest.fn(),
    startEncounter: jest.fn(async () => ({ encounter, spellbook })), sendDialogue: jest.fn(), revealHelp: jest.fn(), createReview: jest.fn(), submitReview: jest.fn(),
    ...overrides,
  };
  return { api, store: createGameStore({ api, storage: memoryStorage(), cue: jest.fn(), ambience: jest.fn() }) };
}
const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

test('starting holds the encounter while its greeting is generated, and clears on success', async () => {
  const start = deferred();
  const { store } = setup({ startEncounter: jest.fn(() => start.promise) });
  await store.getState().initialize();
  const entering = store.getState().enterEncounter();
  expect(store.getState().starting).toMatchObject({ encounterId: 'imp_coffee_greeting' });
  expect(store.getState().isLoading).toBe(true);
  // A second start while loading changes nothing.
  await store.getState().talkTo('gerald_coffee_break');
  expect(store.getState().starting).toMatchObject({ encounterId: 'imp_coffee_greeting' });
  start.resolve({ encounter, spellbook });
  await entering;
  expect(store.getState()).toMatchObject({ starting: null, isLoading: false, view: 'dialogue' });
});

test('a rejected start clears it; a start without an id (the default encounter) never sets it', async () => {
  const { store } = setup({ startEncounter: jest.fn().mockRejectedValueOnce(new Error('Gerald is unavailable.')) });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  expect(store.getState()).toMatchObject({ starting: null, isLoading: false, error: 'Gerald is unavailable.' });
  const pending = deferred();
  const second = setup({ startEncounter: jest.fn(() => pending.promise) });
  await second.store.getState().initialize();
  const going = second.store.getState()._startNamed(null);
  expect(second.store.getState().isLoading).toBe(true);
  expect(second.store.getState().starting).toBeNull();
  pending.resolve({ encounter, spellbook });
  await going;
});

test('a late success or rejection after a reset touches neither the new state nor its starting (test-only transition)', async () => {
  for (const settle of ['resolve', 'reject']) {
    const start = deferred();
    const { store } = setup({ startEncounter: jest.fn(() => start.promise) });
    await store.getState().initialize();
    const entering = store.getState().enterEncounter();
    // switchSave refuses while loading (critique 1.3), so the reset here is the test-only switch.
    expect(store.getState().switchSave(other)).toBeUndefined();
    expect(store.getState().starting).toMatchObject({ encounterId: 'imp_coffee_greeting' });
    store.getState().switchLearnerForTest(other);
    expect(store.getState().starting).toBeNull();
    store.setState({ starting: { encounterId: 'imp_coffee_greeting', seq: 999 } }); // the new save's own start
    if (settle === 'resolve') start.resolve({ encounter, spellbook }); else start.reject(new Error('late'));
    await entering;
    expect(store.getState().starting).toEqual({ encounterId: 'imp_coffee_greeting', seq: 999 });
    expect(store.getState().error).toBeNull();
  }
});

test('an older start settling late leaves a newer start\'s indicator (the request token)', async () => {
  const first = deferred();
  const second = deferred();
  const starts = [first, second];
  const { store } = setup({ startEncounter: jest.fn(() => starts.shift().promise) });
  await store.getState().initialize();
  const one = store.getState().enterEncounter();
  const seqOne = store.getState().starting.seq;
  // The same encounter started again by a newer request (as after a released lock).
  store.setState({ isLoading: false });
  const two = store.getState().enterEncounter();
  expect(store.getState().starting.seq).toBeGreaterThan(seqOne);
  first.reject(new Error('older'));
  await one;
  expect(store.getState().starting).toMatchObject({ encounterId: 'imp_coffee_greeting' });
  second.resolve({ encounter, spellbook });
  await two;
  expect(store.getState().starting).toBeNull();
});

test('recruit without an encounter id does nothing (round 073 Amendment 1: the guard a replace removed)', async () => {
  const { api, store } = setup({ recruit: jest.fn() });
  await store.getState().initialize();
  await store.getState().recruit(undefined);
  expect(api.recruit).not.toHaveBeenCalled();
  expect(store.getState().isLoading).toBe(false);
});

test('MapPanel shows the line for the current location\'s encounter only, with a fallback name', async () => {
  const props = { world: world(), isLoading: true, onMove: () => {}, onEnterEncounter: () => {} };
  const view = await render(<MapPanel {...props} starting={{ encounterId: 'imp_coffee_greeting', seq: 1 }} />);
  expect(screen.getByText('Gerald is getting ready to talk…')).toBeOnTheScreen();
  await view.rerender(<MapPanel {...props} starting={{ encounterId: 'butchers_stall_charcutier', seq: 2 }} />);
  expect(screen.queryByText(/is getting ready to talk/)).not.toBeOnTheScreen();
  await view.rerender(<MapPanel {...props} world={world('')} starting={{ encounterId: 'imp_coffee_greeting', seq: 3 }} />);
  expect(screen.getByText('Someone is getting ready to talk…')).toBeOnTheScreen();
  await view.rerender(<MapPanel {...props} starting={null} />);
  expect(screen.queryByText(/is getting ready to talk/)).not.toBeOnTheScreen();
});

test('PartyPanel shows the line under the matching member only', async () => {
  await render(<PartyPanel party={party} isLoading starting={{ encounterId: 'mortimer_tasting', seq: 1 }} onTalk={() => {}} onReturn={() => {}} returnLabel="Back" />);
  expect(screen.getByText('Mortimer is getting ready to talk…')).toBeOnTheScreen();
  expect(screen.queryByText('Gerald is getting ready to talk…')).not.toBeOnTheScreen();
});

describe('in the app', () => {
  const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('parallang.onboardingSeen', '1');
    useGameStore.setState({ learnerId: null, encounter: null, world: null, party: [], view: 'map', isLoading: false, error: null, starting: null });
  });
  afterEach(() => { delete globalThis.fetch; });

  test('pressing Talk shows the line until the greeting arrives (critique 1.4)', async () => {
    const start = deferred();
    globalThis.fetch = jest.fn(async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === '/api/learner') return response(201, identity);
      if (path === '/api/world') return response(200, { world: world() });
      if (path === '/api/spellbook') return response(200, spellbook);
      if (path === '/api/party') return response(200, { party: [] });
      if (path === '/api/encounter/start') return start.promise;
      throw new Error(`Unexpected fetch ${path}`);
    });
    const user = userEvent.setup();
    await render(<App />);
    expect(await screen.findByRole('heading', { name: 'The Coffee Cart' })).toBeOnTheScreen();
    expect(screen.queryByText(/is getting ready to talk/)).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Talk to Gerald' }));
    expect(await screen.findByText('Gerald is getting ready to talk…')).toBeOnTheScreen();
    start.resolve(response(200, { encounter, spellbook }));
    expect(await screen.findByText('Order a coffee from Gerald.')).toBeOnTheScreen();
    await flush();
    expect(screen.queryByText(/is getting ready to talk/)).not.toBeOnTheScreen();
  });
});
