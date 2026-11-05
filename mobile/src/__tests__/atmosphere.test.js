// Round 053 (backlog A10): the current location's LLM atmosphere line under its description.
import { render, screen } from '@testing-library/react-native';
import MapPanel from '../components/MapPanel.js';
import { createGameStore } from '../stores/gameStore.js';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const place = (id, completed = false) => ({ id, name: id, state: 'current', adjacent: false, map: { x: 0.5, y: 0.5 }, description: `The ${id}.`, vocabularyFocus: [], encounter: { id: `${id}_enc`, completed, characterName: 'Gerald' } });
const worldAt = (id, completed = false) => ({ currentLocationId: id, locations: [place(id, completed)], paths: [] });

test('MapPanel shows the line for the current location only', async () => {
  const props = { isLoading: false, onMove: jest.fn(), onEnterEncounter: jest.fn() };
  const { rerender } = await render(<MapPanel world={worldAt('cart')} atmosphere={{ locationId: 'cart', text: 'Steam argues with the drizzle.' }} {...props} />);
  expect(screen.getByText('Steam argues with the drizzle.')).toBeOnTheScreen();
  expect(screen.getByText('The cart.')).toBeOnTheScreen();
  await rerender(<MapPanel world={worldAt('cart')} atmosphere={{ locationId: 'fountain', text: 'Steam argues with the drizzle.' }} {...props} />);
  expect(screen.queryByText('Steam argues with the drizzle.')).toBeNull();
  await rerender(<MapPanel world={worldAt('cart')} atmosphere={null} {...props} />);
  expect(screen.getByText('The cart.')).toBeOnTheScreen();
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
const flush = () => new Promise((done) => setTimeout(done, 0));

function storeWith(getAtmosphere) {
  const values = new Map([['parallang.onboardingSeen', '1']]);
  const storage = { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
  const api = {
    createLearner: jest.fn(async () => ({ learnerId: A, language: { code: 'it', name: 'Italian', tag: 'it-IT' } })),
    getWorld: jest.fn(async () => ({ world: worldAt('cart') })),
    getSpellbook: jest.fn(async () => ({ cards: [], dueCount: 0, contentVersion: 'v1' })),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(async () => null),
    moveTo: jest.fn(async () => ({ world: worldAt('fountain') })),
    getAtmosphere,
  };
  return { store: createGameStore({ api, storage, cue: jest.fn(), ambience: jest.fn() }), api };
}

test('the store asks once the world is known, keeps a fresh reply and never sets an error', async () => {
  const { store, api } = storeWith(jest.fn(async () => ({ atmosphere: { locationId: 'cart', text: 'Steam argues with the drizzle.' } })));
  await store.getState().initialize();
  await flush();
  expect(api.getAtmosphere).toHaveBeenCalledWith(A);
  expect(store.getState().atmosphere).toEqual({ locationId: 'cart', text: 'Steam argues with the drizzle.' });
  // The same state asks no more.
  store.setState({ world: worldAt('cart') });
  await flush();
  expect(api.getAtmosphere).toHaveBeenCalledTimes(1);
  // Completion changes the key: the old line goes at once and a new one is asked for.
  api.getAtmosphere.mockImplementationOnce(async () => { throw new Error('offline'); });
  store.setState({ world: worldAt('cart', true) });
  expect(store.getState().atmosphere).toBeNull();
  await flush();
  expect(api.getAtmosphere).toHaveBeenCalledTimes(2);
  expect(store.getState().atmosphere).toBeNull();
  expect(store.getState().error).toBeNull();
  expect(store.getState().isLoading).toBe(false);
});

test('a late reply after a move or a learner switch is dropped', async () => {
  const pending = [];
  const { store } = storeWith(jest.fn(() => { const wait = deferred(); pending.push(wait); return wait.promise; }));
  await store.getState().initialize();
  await flush();
  expect(pending).toHaveLength(1);
  await store.getState().moveTo('fountain');
  await flush();
  expect(pending).toHaveLength(2);
  pending[0].resolve({ atmosphere: { locationId: 'cart', text: 'Old news.' } });
  await flush();
  expect(store.getState().atmosphere).toBeNull();
  // Another learner at the same place: the first learner's reply is not shown.
  store.setState({ learnerId: B });
  await flush();
  pending[1].resolve({ atmosphere: { locationId: 'fountain', text: 'For learner A.' } });
  await flush();
  expect(store.getState().atmosphere).toBeNull();
  pending[2].resolve({ atmosphere: { locationId: 'fountain', text: 'Water forgets to fall.' } });
  await flush();
  expect(store.getState().atmosphere).toEqual({ locationId: 'fountain', text: 'Water forgets to fall.' });
});

test('a fake API without getAtmosphere is left alone', async () => {
  const { store } = storeWith(undefined);
  await store.getState().initialize();
  await flush();
  expect(store.getState().atmosphere).toBeNull();
  expect(store.getState().error).toBeNull();
});
