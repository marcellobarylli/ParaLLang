// Round 071: resending the same answer reuses its attempt id, so the server replays a committed turn whose response
// was lost; a stale session is reloaded (or, if closed, the player returns to the map), and the answer stays unsent.
import { STALE_CLOSED, STALE_RELOADED, createGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language };
const other = '22222222-2222-4222-8222-222222222222';
const encounter = { id: 'enc-1', encounterId: 'imp_coffee_greeting', character: { name: 'Gerald' }, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 }, currentObjective: { id: 'order_coffee' } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const world = { currentLocationId: 'coffee_cart', locations: [{ id: 'coffee_cart', name: 'Cart', state: 'current', adjacent: false, map: { x: 0.5, y: 0.5 }, description: 'A cart.', encounter: { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald' } }], paths: [] };
const assessment = { overallFeedback: 'ok', objectiveResults: [] };
const lost = () => Object.assign(new Error('The server at 127.0.0.1 could not be reached.'), { code: 'SERVER_UNREACHABLE', retryable: true });
const stale = (code = 'STALE_VERSION') => Object.assign(new Error('This encounter changed in another tab. Refresh before retrying.'), { code, status: 409 });

function memoryStorage() {
  const values = new Map([['parallang.onboardingSeen', '1']]);
  return { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}
function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function setup(overrides = {}) {
  const cue = jest.fn();
  const api = {
    createLearner: jest.fn(async () => identity),
    startEncounter: jest.fn(async () => ({ encounter, spellbook })),
    getWorld: jest.fn(async () => ({ world })),
    getSpellbook: jest.fn(async () => spellbook),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(), moveTo: jest.fn(),
    currentEncounter: jest.fn(async () => ({ encounter, spellbook })),
    sendDialogue: jest.fn(), revealHelp: jest.fn(), createReview: jest.fn(), submitReview: jest.fn(),
    ...overrides,
  };
  const store = createGameStore({ api, storage: memoryStorage(), cue, ambience: jest.fn() });
  return { api, store, cue };
}
async function ready(store) {
  await store.getState().initialize();
  await store.getState().enterEncounter();
  expect(store.getState().encounter).toEqual(encounter);
}
const ids = (api) => api.sendDialogue.mock.calls.map(([, payload]) => payload.attemptId);
const advanced = (version, extra = {}) => ({ ...encounter, version, ...extra });

test('a lost response, then the same answer: the same attempt id, and the replay is applied without a cue', async () => {
  const { api, store, cue } = setup({
    sendDialogue: jest.fn()
      .mockRejectedValueOnce(lost())
      .mockResolvedValueOnce({ encounter: advanced(2, { currentObjective: { id: 'no_milk' } }), spellbook, assessment, replayed: true }),
  });
  await ready(store);
  await store.getState().sendMessage('Vorrei un caffè.');
  expect(store.getState().draft).toBe('Vorrei un caffè.');
  await store.getState().sendMessage();
  const [first, second] = ids(api);
  expect(second).toBe(first);
  expect(store.getState().encounter.version).toBe(2);
  expect(cue).not.toHaveBeenCalled();
});

test('A → B → A after failures brings back A\'s id; a success, then the same text, gets a new one', async () => {
  const { api, store } = setup({
    sendDialogue: jest.fn()
      .mockRejectedValueOnce(lost()).mockRejectedValueOnce(lost())
      .mockResolvedValueOnce({ encounter: advanced(2), spellbook, assessment, replayed: false })
      .mockResolvedValueOnce({ encounter: advanced(3), spellbook, assessment, replayed: false }),
  });
  await ready(store);
  await store.getState().sendMessage('A');
  await store.getState().sendMessage('B');
  await store.getState().sendMessage('A');
  await store.getState().sendMessage('A');
  const [a1, b, a2, a3] = ids(api);
  expect(b).not.toBe(a1);
  expect(a2).toBe(a1);
  expect(a3).not.toBe(a1);
  expect(api.sendDialogue.mock.calls[3][1].version).toBe(2);
});

test('another learner sending the same text gets its own id', async () => {
  const { api, store } = setup({ sendDialogue: jest.fn().mockRejectedValue(lost()) });
  await ready(store);
  await store.getState().sendMessage('A');
  store.getState().switchLearnerForTest(other);
  store.setState({ encounter, view: 'dialogue' });
  await store.getState().sendMessage('A');
  const [mine, theirs] = ids(api);
  expect(theirs).not.toBe(mine);
});

test('STALE_VERSION reloads the conversation, keeps the answer unsent, clears the old assessment and updates the snapshot', async () => {
  const reloaded = advanced(2, { transcript: [{ id: 'm2', role: 'npc' }] });
  const { store } = setup({
    sendDialogue: jest.fn().mockRejectedValueOnce(stale()),
    currentEncounter: jest.fn(async () => ({ encounter: reloaded, spellbook })),
  });
  await ready(store);
  store.setState({ assessment });
  await store.getState().sendMessage('Vorrei un caffè.');
  const state = store.getState();
  expect(state.encounter).toEqual(reloaded);
  expect(state.error).toBe(STALE_RELOADED);
  expect(state.draft).toBe('Vorrei un caffè.');
  expect(state.assessment).toBeNull();
  expect(state.isLoading).toBe(false);
  // The snapshot holds the reload: away to another save and back.
  store.getState().switchLearnerForTest(other);
  store.getState().switchLearnerForTest(identity.learnerId);
  expect(store.getState().encounter).toEqual(reloaded);
});

test('STALE_ENCOUNTER with a different conversation back follows the same rules', async () => {
  const another = { ...encounter, id: 'enc-2', encounterId: 'butchers_stall_charcutier', version: 1 };
  const { store } = setup({ sendDialogue: jest.fn().mockRejectedValueOnce(stale('STALE_ENCOUNTER')), currentEncounter: jest.fn(async () => ({ encounter: another, spellbook })) });
  await ready(store);
  await store.getState().sendMessage('Vorrei un caffè.');
  expect(store.getState().encounter).toEqual(another);
  expect(store.getState().error).toBe(STALE_RELOADED);
});

test('a closed conversation returns to the map; a failed reload keeps the original error', async () => {
  const closed = setup({ sendDialogue: jest.fn().mockRejectedValueOnce(stale()), currentEncounter: jest.fn(async () => ({ encounter: null, spellbook })) });
  await ready(closed.store);
  await closed.store.getState().sendMessage('Vorrei un caffè.');
  expect(closed.store.getState()).toMatchObject({ encounter: null, view: 'map', error: STALE_CLOSED, draft: 'Vorrei un caffè.', isLoading: false });

  const failing = setup({ sendDialogue: jest.fn().mockRejectedValueOnce(stale()), currentEncounter: jest.fn(async () => { throw lost(); }) });
  await ready(failing.store);
  await failing.store.getState().sendMessage('Vorrei un caffè.');
  expect(failing.store.getState()).toMatchObject({ encounter, error: 'This encounter changed in another tab. Refresh before retrying.', isLoading: false });
});

test('a reload that answers after a save switch is ignored (critique 1.3)', async () => {
  const reload = deferred();
  const { store } = setup({ sendDialogue: jest.fn().mockRejectedValueOnce(stale()), currentEncounter: jest.fn(() => reload.promise) });
  await ready(store);
  const sending = store.getState().sendMessage('Vorrei un caffè.');
  await Promise.resolve();
  await Promise.resolve();
  expect(store.getState().isLoading).toBe(true);
  store.getState().switchLearnerForTest(other);
  reload.resolve({ encounter: advanced(5), spellbook });
  await sending;
  expect(store.getState().learnerId).toBe(other);
  expect(store.getState().encounter?.version).not.toBe(5);
  expect(store.getState().error).toBeNull();
});

test('after a replay, a newer server version of the same conversation is applied (critique 1.1)', async () => {
  const { store } = setup({
    sendDialogue: jest.fn().mockRejectedValueOnce(lost()).mockResolvedValueOnce({ encounter: advanced(2), spellbook, assessment, replayed: true }),
    currentEncounter: jest.fn(async () => ({ encounter: advanced(4), spellbook })),
  });
  await ready(store);
  await store.getState().sendMessage('A');
  await store.getState().sendMessage('A');
  expect(store.getState().encounter.version).toBe(4);
  // Round 075: the replayed verdict belongs to an older turn than the one now shown.
  expect(store.getState().assessment).toBeNull();
});

test('a replay whose reconcile finds the same version keeps the replayed verdict (round 075)', async () => {
  const { store } = setup({
    sendDialogue: jest.fn().mockRejectedValueOnce(lost()).mockResolvedValueOnce({ encounter: advanced(2), spellbook, assessment, replayed: true }),
    currentEncounter: jest.fn(async () => ({ encounter: advanced(2), spellbook })),
  });
  await ready(store);
  await store.getState().sendMessage('A');
  await store.getState().sendMessage('A');
  expect(store.getState().encounter.version).toBe(2);
  expect(store.getState().assessment).toEqual(assessment);
});

test('a response that arrives after the conversation was replaced by another of the same version is not applied (critique 1.2)', async () => {
  const post = deferred();
  const { store } = setup({ sendDialogue: jest.fn(() => post.promise) });
  await ready(store);
  const sending = store.getState().sendMessage('A');
  const another = { ...encounter, id: 'enc-9', version: 1 };
  store.setState({ encounter: another });
  post.resolve({ encounter: advanced(2), spellbook, assessment, replayed: false });
  await sending;
  expect(store.getState().encounter).toEqual(another);
});
