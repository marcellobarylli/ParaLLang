// Round 096: fixes from a review of the store as a whole (review R1.1-R1.6, R1.9; critique 1.1-1.9).
import { SAVE_LOST, STALE_CLOSED, STALE_HELP, STALE_REVIEW, createGameStore } from '../stores/gameStore.js';
import { SLOTS_KEY } from '../stores/saveSlots.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const learner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const identity = { learnerId: learner, recovered: true, language };
const encounter = { id: 'enc-1', encounterId: 'imp_coffee_greeting', character: { name: 'Gerald' }, version: 1, state: 'ongoing', transcript: [{ id: 'm1', role: 'npc' }], hints: { remaining: 2, limit: 2 }, currentObjective: { id: 'order_coffee' } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const world = (here = 'coffee_cart') => ({ currentLocationId: here, locations: [{ id: here, name: 'Cart', state: 'current', adjacent: false, map: { x: 0.5, y: 0.5 }, description: 'A cart.', encounter: { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald' } }], paths: [] });
const assessment = { overallFeedback: 'ok', objectiveResults: [] };
const challenge = { id: 'ch1', vocabularyId: 'caffe', target: 'caffè', kind: 'word', practice: false };
const reviewResult = { correct: true, feedback: 'Correct.', effectiveQuality: 5 };
const lost = () => Object.assign(new Error('The server could not be reached.'), { code: 'SERVER_UNREACHABLE', retryable: true });
const coded = (code, message = 'Refresh before retrying.') => Object.assign(new Error(message), { code, status: 409 });

function memoryStorage(initial = []) {
  const values = new Map([['parallang.onboardingSeen', '1'], ...initial]);
  return { values, getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}
function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function setup(overrides = {}, storage = memoryStorage()) {
  const cue = jest.fn();
  const api = {
    createLearner: jest.fn(async () => identity),
    startEncounter: jest.fn(async () => ({ encounter, spellbook })),
    getWorld: jest.fn(async () => ({ world: world() })),
    getSpellbook: jest.fn(async () => spellbook),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(), moveTo: jest.fn(), recruit: jest.fn(),
    currentEncounter: jest.fn(async () => ({ encounter: null, spellbook })),
    sendDialogue: jest.fn(), revealHelp: jest.fn(), createReview: jest.fn(async () => ({ challenge, spellbook })), submitReview: jest.fn(),
    ...overrides,
  };
  const store = createGameStore({ api, storage, cue, ambience: jest.fn() });
  return { api, store, cue, storage };
}
const flush = () => new Promise((resolve) => setImmediate(resolve));

// R1.1 -------------------------------------------------------------------------------------------------------------

test('a review resent after a lost reply reuses its attempt id and shows the replayed verdict without a cue', async () => {
  const { api, store, cue } = setup({
    submitReview: jest.fn().mockRejectedValueOnce(lost()).mockResolvedValueOnce({ result: reviewResult, spellbook, replayed: true }),
  });
  await store.getState().initialize();
  await store.getState().startReview('caffe');
  await store.getState().submitReview('coffee');
  expect(store.getState().reviewChallenge).toEqual(challenge);
  await store.getState().submitReview(' coffee ');
  const [[, first], [, second]] = api.submitReview.mock.calls;
  expect(second.attemptId).toBe(first.attemptId);
  expect(store.getState().reviewResult).toEqual(reviewResult);
  expect(cue).not.toHaveBeenCalled();
});

test('a different answer, or the reveal, gets its own attempt id; a success clears them', async () => {
  const { api, store } = setup({
    submitReview: jest.fn().mockRejectedValueOnce(lost()).mockRejectedValueOnce(lost()).mockRejectedValueOnce(lost())
      .mockResolvedValueOnce({ result: reviewResult, spellbook, replayed: false })
      .mockResolvedValueOnce({ result: reviewResult, spellbook, replayed: false }),
  });
  await store.getState().initialize();
  await store.getState().startReview('caffe');
  await store.getState().submitReview('coffee');
  await store.getState().submitReview('tea');
  await store.getState().revealReviewAnswer();
  await store.getState().revealReviewAnswer();
  const calls = api.submitReview.mock.calls.map(([, payload]) => payload);
  expect(new Set(calls.slice(0, 3).map((call) => call.attemptId)).size).toBe(3);
  expect(calls[3].attemptId).toBe(calls[2].attemptId);
  expect(calls[3].action).toBe('reveal');
  // After the success the same card and answer would get a fresh id.
  store.setState({ reviewChallenge: challenge });
  await store.getState().submitReview('coffee');
  expect(api.submitReview.mock.calls[4][1].attemptId).not.toBe(calls[0].attemptId);
});

test('STALE_CHALLENGE drops the card and stays on the review screen with a message', async () => {
  const { api, store } = setup({ submitReview: jest.fn().mockRejectedValueOnce(coded('STALE_CHALLENGE', 'That review challenge is stale.')) });
  await store.getState().initialize();
  await store.getState().startReview('caffe');
  await store.getState().submitReview('coffee');
  expect(store.getState()).toMatchObject({ reviewChallenge: null, view: 'review', error: STALE_REVIEW, isLoading: false });
  expect(api.getSpellbook).toHaveBeenCalled();
});

// R1.2, R1.3 -------------------------------------------------------------------------------------------------------

test('a slow start keeps the Spellbook the player opened; the return button leads to the conversation', async () => {
  const held = deferred();
  const { store } = setup({ startEncounter: jest.fn(() => held.promise) });
  await store.getState().initialize();
  const start = store.getState().enterEncounter();
  store.getState().openSpellbook();
  held.resolve({ encounter, spellbook });
  await start;
  expect(store.getState()).toMatchObject({ view: 'spellbook', returnView: 'dialogue', encounter });
  store.getState().returnToDialogue();
  expect(store.getState().view).toBe('dialogue');
});

test('a start with no screen change opens the dialogue; a held restart keeps the Party screen', async () => {
  const held = deferred();
  const { store } = setup();
  await store.getState().initialize();
  await store.getState().enterEncounter();
  expect(store.getState().view).toBe('dialogue');
  const restarted = { ...encounter, id: 'enc-2' };
  // A restart that is held while the Party screen opens.
  const { store: second } = setup({ startEncounter: jest.fn().mockResolvedValueOnce({ encounter, spellbook }).mockReturnValueOnce(held.promise) });
  await second.getState().initialize();
  await second.getState().enterEncounter();
  const restart = second.getState().restartEncounter();
  second.getState().openParty();
  held.resolve({ encounter: restarted, spellbook });
  await restart;
  expect(second.getState()).toMatchObject({ view: 'party', returnView: 'dialogue', encounter: restarted });
});

test('two restarts in one tick send one request; a failed restart keeps the verdict', async () => {
  const { api, store } = setup({
    startEncounter: jest.fn().mockResolvedValueOnce({ encounter, spellbook }).mockRejectedValueOnce(lost()).mockResolvedValue({ encounter: { ...encounter, id: 'enc-3' }, spellbook }),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  store.setState({ assessment });
  await Promise.all([store.getState().restartEncounter(), store.getState().restartEncounter()]);
  expect(api.startEncounter).toHaveBeenCalledTimes(2); // the enter, then one restart
  expect(store.getState().assessment).toEqual(assessment);
  expect(store.getState().error).toMatch(/could not be reached/);
  await store.getState().restartEncounter();
  expect(store.getState()).toMatchObject({ assessment: null, encounter: { id: 'enc-3' }, view: 'dialogue' });
  expect(api.startEncounter.mock.calls.at(-1)[1]).toBe(true);
});

// R1.4 -------------------------------------------------------------------------------------------------------------

const member = { characterId: 'gerald', encounterId: 'imp_coffee_greeting', name: 'Gerald', conversations: 0 };

test('after a resolve, a recruit that lands before the post-resolve reads keeps the recruited party', async () => {
  const party = deferred();
  const { api, store } = setup({
    sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2, state: 'resolved' }, spellbook, assessment, replayed: false })),
    getParty: jest.fn(async () => ({ party: [] })),
    recruit: jest.fn(async () => ({ party: [member], joined: true })),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  api.getParty.mockImplementationOnce(() => party.promise);
  const sent = store.getState().sendMessage('Vorrei un caffè.');
  await flush();
  await store.getState().recruit('imp_coffee_greeting');
  party.resolve({ party: [] });
  await sent;
  expect(store.getState().party).toEqual([member]);
});

test('the post-resolve reads apply when nothing wrote meanwhile', async () => {
  const { store } = setup({
    sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2, state: 'resolved' }, spellbook, assessment, replayed: false })),
    getParty: jest.fn().mockResolvedValueOnce({ party: [] }).mockResolvedValueOnce({ party: [member] }),
    getWorld: jest.fn().mockResolvedValueOnce({ world: world() }).mockResolvedValueOnce({ world: world('fountain') }),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  await store.getState().sendMessage('Vorrei un caffè.');
  expect(store.getState().party).toEqual([member]);
  expect(store.getState().world.currentLocationId).toBe('fountain');
});

test('openMap racing a move keeps the move\'s world; openMap and openParty alone apply their reads', async () => {
  const read = deferred();
  const { api, store } = setup({ moveTo: jest.fn(async () => ({ world: world('fountain'), spellbook })) });
  await store.getState().initialize();
  api.getWorld.mockImplementationOnce(() => read.promise);
  const opened = store.getState().openMap();
  await store.getState().moveTo('fountain');
  read.resolve({ world: world('coffee_cart') });
  await opened;
  expect(store.getState().world.currentLocationId).toBe('fountain');

  api.getWorld.mockResolvedValueOnce({ world: world('bookshop') });
  await store.getState().openMap();
  expect(store.getState().world.currentLocationId).toBe('bookshop');
  api.getParty.mockResolvedValueOnce({ party: [member] });
  store.getState().openParty();
  await flush();
  expect(store.getState().party).toEqual([member]);
});

test('openParty racing a recruit keeps the recruited party', async () => {
  const read = deferred();
  const { api, store } = setup({ recruit: jest.fn(async () => ({ party: [member], joined: true })) });
  await store.getState().initialize();
  api.getParty.mockImplementationOnce(() => read.promise);
  store.getState().openParty();
  await store.getState().recruit('imp_coffee_greeting');
  read.resolve({ party: [] });
  await flush();
  expect(store.getState().party).toEqual([member]);
});

// R1.5, R1.6 -------------------------------------------------------------------------------------------------------

test('a stale help reveal reloads the server\'s conversation with the help message; the draft is untouched', async () => {
  const moved = { ...encounter, version: 3 };
  const { api, store } = setup({ revealHelp: jest.fn().mockRejectedValueOnce(coded('STALE_VERSION')), currentEncounter: jest.fn(async () => ({ encounter: moved, spellbook })) });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  store.getState().setDraft('half an answer');
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(api.currentEncounter).toHaveBeenCalled();
  expect(store.getState()).toMatchObject({ encounter: moved, error: STALE_HELP, draft: 'half an answer', isLoading: false, view: 'dialogue' });
});

test('a stale help reveal on a closed conversation returns to the map; STALE_MESSAGE keeps the server text', async () => {
  const { api, store } = setup({
    revealHelp: jest.fn().mockRejectedValueOnce(coded('STALE_MESSAGE', 'Help is only available for the current Gerald message.')).mockRejectedValueOnce(coded('STALE_ENCOUNTER')),
    currentEncounter: jest.fn(async () => ({ encounter: null, spellbook })),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  api.currentEncounter.mockClear();
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'old' });
  expect(api.currentEncounter).not.toHaveBeenCalled();
  expect(store.getState()).toMatchObject({ error: 'Help is only available for the current Gerald message.', encounter, isLoading: false });
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(store.getState()).toMatchObject({ encounter: null, view: 'map', error: STALE_CLOSED, isLoading: false });
});

test('a help reply that comes back after a new save started is dropped', async () => {
  const held = deferred();
  const { store } = setup({
    revealHelp: jest.fn(() => held.promise),
    createLearner: jest.fn().mockResolvedValueOnce(identity).mockResolvedValueOnce({ learnerId: other, recovered: true, language }).mockResolvedValue({ learnerId: other, recovered: true, language }),
    currentEncounter: jest.fn(async () => ({ encounter: null, spellbook })),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  const help = store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  store.setState({ isLoading: false }); // the player reached Saves (the lock is what normally prevents this)
  await store.getState().newSave();
  held.resolve({ encounter: { ...encounter, version: 2 }, spellbook });
  await help;
  expect(store.getState()).toMatchObject({ learnerId: other, encounter: null, isLoading: false });
});

// R1.9 -------------------------------------------------------------------------------------------------------------

test('a stored save the server no longer had is announced at launch; a first launch is not', async () => {
  const storage = memoryStorage([['parallang.learnerId', learner]]);
  const { store } = setup({ createLearner: jest.fn(async () => ({ ...identity, recovered: false })) }, storage);
  await store.getState().initialize();
  expect(store.getState().notice).toBe(SAVE_LOST);
  const { store: fresh } = setup({ createLearner: jest.fn(async () => ({ ...identity, recovered: false })) });
  await fresh.getState().initialize();
  expect(fresh.getState().notice).toBeNull();
});

test('a switch to a lost save says so on the same line; a new save does not', async () => {
  const slots = JSON.stringify({ activeId: learner, nextNumber: 3, slots: [{ learnerId: learner, label: 'Save 1', createdAt: '2026-01-01T00:00:00.000Z' }, { learnerId: other, label: 'Save 2', createdAt: '2026-01-02T00:00:00.000Z' }] });
  const storage = memoryStorage([[SLOTS_KEY, slots]]);
  const { store } = setup({
    createLearner: jest.fn(async (id) => (id === other ? { learnerId: other, recovered: false, language } : identity)),
  }, storage);
  await store.getState().initialize();
  expect(store.getState().saves).toHaveLength(2);
  expect(store.getState().notice).toBeNull();
  await store.getState().switchSave(other);
  expect(store.getState().notice).toBe(`Now playing Save 2. ${SAVE_LOST}`);
});

test('a new save is not announced as lost', async () => {
  const third = '33333333-3333-4333-8333-333333333333';
  const { store } = setup({
    // The server's answers: a new learner is not recovered; asked for again by id, it is.
    createLearner: jest.fn().mockResolvedValueOnce({ ...identity, recovered: false })
      .mockResolvedValueOnce({ learnerId: third, recovered: false, language })
      .mockImplementation(async (id) => ({ learnerId: id, recovered: true, language })),
  });
  await store.getState().initialize();
  await store.getState().newSave();
  expect(store.getState().learnerId).toBe(third);
  expect(store.getState().notice).toBe('Now playing Save 2.');
});
