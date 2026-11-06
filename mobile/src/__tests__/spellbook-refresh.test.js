// Round 084: the Spellbook is fetched again behind the screen when the Spellbook or the map opens and when the app
// returns from the background, since cards fall due by the clock. A reply never overwrites a newer Spellbook, never
// reaches another save, and never shows meanings while the app holds an ongoing encounter.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import { AppState } from 'react-native';
import App from '../../App.js';
import { createGameStore, useGameStore } from '../stores/gameStore.js';

const A = '11111111-1111-4111-8111-111111111111';
const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const flush = () => new Promise((done) => setTimeout(done, 0));
const card = (due) => ({ vocabularyId: 'caffe', kind: 'word', target: 'caffè', meanings: ['coffee'], partOfSpeech: 'noun', mastery: 'learning', due, nextReviewAt: '2026-11-07T04:00:00Z', lastOutcome: 4, repetitions: 1 });
const book = (due, extra = {}) => ({ cards: [card(due)], dueCount: due ? 1 : 0, contentVersion: 'v1', inEncounter: false, ...extra });
const world = { currentLocationId: 'market_entrance', locations: [{ id: 'market_entrance', name: 'Market Entrance', state: 'current', adjacent: false, map: { x: 0.5, y: 0.9 }, description: 'An arch.', vocabularyFocus: [], encounter: null }], paths: [] };
const deferred = () => { let resolve; let reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

function setup(first = book(false)) {
  const api = {
    createLearner: jest.fn(async (id) => ({ learnerId: id ?? A, language })),
    getWorld: jest.fn(async () => ({ world })),
    getSpellbook: jest.fn(async () => first),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(async () => ({ onboarding: null })),
  };
  const storage = { getItem: jest.fn(async (key) => (key === 'parallang.onboardingSeen' ? '1' : null)), setItem: jest.fn(async () => {}) };
  const store = createGameStore({ api, storage, cue: () => {}, ambience: () => {} });
  return { api, store };
}

test('opening the Spellbook or the map shows a card that fell due since startup', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  expect(store.getState().spellbook.dueCount).toBe(0);
  api.getSpellbook.mockResolvedValue(book(true));
  store.getState().openSpellbook();
  expect(store.getState().view).toBe('spellbook');
  await flush();
  expect(store.getState().spellbook.dueCount).toBe(1);
  expect(store.getState().isLoading).toBe(false);
  api.getSpellbook.mockResolvedValue(book(false, { dueCount: 0, contentVersion: 'v2' }));
  await store.getState().openMap();
  await flush();
  expect(store.getState().spellbook.contentVersion).toBe('v2');
  expect(store.getState().view).toBe('map');
});

test('a reply that lands after an action wrote a Spellbook is dropped', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  const late = deferred();
  api.getSpellbook.mockReturnValueOnce(late.promise);
  store.getState().openSpellbook();
  await flush();
  const newer = book(false, { contentVersion: 'from-an-action' });
  store.setState({ spellbook: newer });
  late.resolve(book(true));
  await flush();
  expect(store.getState().spellbook).toBe(newer);
});

test('of two refreshes, the older reply is dropped in either order', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  const older = deferred();
  const newer = deferred();
  api.getSpellbook.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
  store.getState().openSpellbook();
  await flush();
  store.getState().refreshSpellbook();
  await flush();
  expect(api.getSpellbook).toHaveBeenCalledTimes(3); // startup and two refreshes: no lock (critique 1.2)
  // Older first: without the sequence check it would apply, and the newer one would then fail the object check.
  older.resolve(book(false, { contentVersion: 'older' }));
  await flush();
  expect(store.getState().spellbook.contentVersion).toBe('v1');
  newer.resolve(book(true, { contentVersion: 'newer' }));
  await flush();
  expect(store.getState().spellbook.contentVersion).toBe('newer');
  // Newer first, older last.
  const third = deferred();
  const fourth = deferred();
  api.getSpellbook.mockReturnValueOnce(third.promise).mockReturnValueOnce(fourth.promise);
  store.getState().refreshSpellbook();
  store.getState().refreshSpellbook();
  await flush();
  fourth.resolve(book(false, { contentVersion: 'fourth' }));
  await flush();
  third.resolve(book(true, { contentVersion: 'third' }));
  await flush();
  expect(store.getState().spellbook.contentVersion).toBe('fourth');
});

test('a reply for a save left behind is dropped (the epoch check, critique 1.4)', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  const late = deferred();
  api.getSpellbook.mockReturnValueOnce(late.promise);
  store.getState().refreshSpellbook();
  await flush();
  const before = store.getState().spellbook;
  store.getState().switchLearnerForTest(A); // same id, new epoch, the snapshot's (same) object restored
  expect(store.getState().spellbook).toBe(before);
  late.resolve(book(true));
  await flush();
  expect(store.getState().spellbook).toBe(before);
});

test('a failed refresh or a reply without cards changes nothing and shows no error', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  const before = store.getState().spellbook;
  api.getSpellbook.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'SERVER_UNREACHABLE' }));
  store.getState().openSpellbook();
  await flush();
  api.getSpellbook.mockResolvedValueOnce({ dueCount: 5 });
  store.getState().refreshSpellbook();
  await flush();
  expect(store.getState().spellbook).toBe(before);
  expect(store.getState().error).toBeNull();
  expect(store.getState().isLoading).toBe(false);
});

test('during an ongoing encounter, a reply that does not know of it is dropped (critique 1.1)', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  const before = { ...book(false), inEncounter: true };
  store.setState({ encounter: { id: 'e1', state: 'ongoing', version: 2 }, spellbook: before });
  api.getSpellbook.mockResolvedValueOnce(book(true)); // inEncounter false: a restarted server
  store.getState().openSpellbook();
  await flush();
  expect(store.getState().spellbook).toBe(before);
  const known = book(true, { inEncounter: true });
  api.getSpellbook.mockResolvedValueOnce(known);
  store.getState().openSpellbook();
  await flush();
  expect(store.getState().spellbook).toBe(known);
});

test('no learner yet: no request (critique 1.5)', () => {
  const { api, store } = setup();
  expect(store.getState().refreshSpellbook()).toBeUndefined();
  store.getState().openSpellbook();
  expect(api.getSpellbook).not.toHaveBeenCalled();
});

describe('the app back from the background', () => {
  let handlers;
  let remove;
  const realInitialize = useGameStore.getState().initialize;
  const realRefresh = useGameStore.getState().refreshSpellbook;
  beforeEach(async () => {
    await AsyncStorage.clear();
    handlers = [];
    remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, fn) => { handlers.push({ type, fn }); return { remove }; });
    useGameStore.setState({ initialize: jest.fn(async () => {}), refreshSpellbook: jest.fn(), view: 'map', world: null, learnerId: null });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    useGameStore.setState({ initialize: realInitialize, refreshSpellbook: realRefresh });
  });

  test('background → active refreshes; inactive → active does not; the listener goes on unmount', async () => {
    const { unmount } = await render(<App />);
    // Other modules may subscribe too (ambience, speech; critique 1.6): fire every change handler the App added.
    const change = (next) => act(() => { handlers.filter((h) => h.type === 'change').forEach((h) => h.fn(next)); });
    const refresh = useGameStore.getState().refreshSpellbook;
    await change('inactive');
    await change('active');
    expect(refresh).not.toHaveBeenCalled();
    await change('background');
    await change('active');
    expect(refresh).toHaveBeenCalledTimes(1);
    await change('active');
    expect(refresh).toHaveBeenCalledTimes(1);
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
