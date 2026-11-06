// Round 099: fixes from a second review of rounds 093-098, store part (review 2 R2.1-R2.6; critique 1.4-1.7).
import { SAVE_LOST, STALE_HELP, STALE_HELP_PENDING, STALE_REVIEW, createGameStore } from '../stores/gameStore.js';
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
const member = { characterId: 'gerald', encounterId: 'imp_coffee_greeting', name: 'Gerald', conversations: 0 };

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

// R2.1 -------------------------------------------------------------------------------------------------------------

test('help after a lost send keeps the conversation; the next Send resends at the same version and attempt id', async () => {
  const replayed = { encounter: { ...encounter, version: 2 }, spellbook, assessment, replayed: true };
  const { api, store, cue } = setup({
    sendDialogue: jest.fn().mockRejectedValueOnce(lost()).mockResolvedValueOnce(replayed),
    revealHelp: jest.fn().mockRejectedValueOnce(coded('STALE_VERSION')),
    currentEncounter: jest.fn(async () => ({ encounter: { ...encounter, version: 2 }, spellbook })),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  await store.getState().sendMessage('ciao');
  api.currentEncounter.mockClear();
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(api.currentEncounter).not.toHaveBeenCalled();
  expect(store.getState()).toMatchObject({ encounter, pendingInput: 'ciao', draft: 'ciao', error: STALE_HELP_PENDING, isLoading: false, view: 'dialogue' });
  await store.getState().sendMessage();
  expect(api.revealHelp).toHaveBeenCalledTimes(1);
  expect(api.sendDialogue).toHaveBeenCalledTimes(2);
  const [[, first], [, second]] = api.sendDialogue.mock.calls;
  expect(second).toMatchObject({ version: 1, attemptId: first.attemptId, message: 'ciao' });
  expect(store.getState()).toMatchObject({ assessment, pendingInput: null, draft: '' });
  expect(cue).not.toHaveBeenCalled();
});

test('help after a lost send keeps a draft the player edited meanwhile', async () => {
  const { store } = setup({
    sendDialogue: jest.fn().mockRejectedValueOnce(lost()),
    revealHelp: jest.fn().mockRejectedValueOnce(coded('STALE_ENCOUNTER')),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  await store.getState().sendMessage('ciao');
  store.getState().setDraft('ciao, Gerald');
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(store.getState()).toMatchObject({ encounter, pendingInput: 'ciao', draft: 'ciao, Gerald', error: STALE_HELP_PENDING });
});

test('a pending answer sent at another version, or none, still reloads as in round 096', async () => {
  const moved = { ...encounter, version: 3 };
  const { api, store } = setup({
    sendDialogue: jest.fn().mockRejectedValueOnce(lost()),
    revealHelp: jest.fn().mockRejectedValue(coded('STALE_VERSION')),
    currentEncounter: jest.fn(async () => ({ encounter: moved, spellbook })),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  await store.getState().sendMessage('ciao');
  // The app learned of version 2 meanwhile (another path); the pending answer was sent at version 1.
  store.setState({ encounter: { ...encounter, version: 2 } });
  api.currentEncounter.mockClear();
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(api.currentEncounter).toHaveBeenCalledTimes(1);
  expect(store.getState()).toMatchObject({ encounter: moved, error: STALE_HELP });
  // No pending answer at all.
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(api.currentEncounter).toHaveBeenCalledTimes(2);
  expect(store.getState().error).toBe(STALE_HELP);
});

test('help\'s reload when the server cannot be read shows the error and clears loading', async () => {
  const { store } = setup({
    revealHelp: jest.fn().mockRejectedValueOnce(coded('STALE_VERSION', 'Refresh before retrying.')),
    currentEncounter: jest.fn().mockResolvedValueOnce({ encounter: null, spellbook }).mockRejectedValueOnce(lost()),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  store.getState().setDraft('half');
  await store.getState().revealHelp({ kind: 'sentence', messageId: 'm1' });
  expect(store.getState()).toMatchObject({ encounter, error: 'Refresh before retrying.', isLoading: false, draft: 'half' });
});

// R2.2 -------------------------------------------------------------------------------------------------------------

test('a lost save is announced after a load that failed and was tried again, once', async () => {
  const storage = memoryStorage([['parallang.learnerId', learner]]);
  const { api, store } = setup({
    createLearner: jest.fn().mockResolvedValueOnce({ ...identity, recovered: false }).mockResolvedValue(identity),
    getWorld: jest.fn().mockRejectedValueOnce(lost()).mockResolvedValue({ world: world() }),
  }, storage);
  await store.getState().initialize();
  expect(store.getState().error).toBe('The server could not be reached.');
  await store.getState().initialize();
  expect(api.createLearner).toHaveBeenCalledTimes(2);
  expect(store.getState().notice).toBe(SAVE_LOST);
  store.setState({ notice: null });
  await store.getState().switchSave(learner); // the current save: nothing happens, nothing announced
  expect(store.getState().notice).toBeNull();
});

test('a switch to a lost save that failed and was tried again says so', async () => {
  const slots = JSON.stringify({ activeId: learner, nextNumber: 3, slots: [{ learnerId: learner, label: 'Save 1', createdAt: '2026-01-01T00:00:00.000Z' }, { learnerId: other, label: 'Save 2', createdAt: '2026-01-02T00:00:00.000Z' }] });
  let first = true;
  const { store } = setup({
    createLearner: jest.fn(async (id) => {
      if (id !== other) return identity;
      const answer = { learnerId: other, recovered: !first, language };
      first = false;
      return answer;
    }),
    currentEncounter: jest.fn().mockResolvedValueOnce({ encounter: null, spellbook }).mockRejectedValueOnce(lost()).mockResolvedValue({ encounter: null, spellbook }),
  }, memoryStorage([[SLOTS_KEY, slots]]));
  await store.getState().initialize();
  await store.getState().switchSave(other);
  expect(store.getState()).toMatchObject({ learnerId: learner, error: 'The server could not be reached.' });
  await store.getState().switchSave(other);
  expect(store.getState().notice).toBe(`Now playing Save 2. ${SAVE_LOST}`);
});

// R2.3 -------------------------------------------------------------------------------------------------------------

test('a recruit during the post-resolve reads keeps the resolve\'s world', async () => {
  const party = deferred();
  const resolvedWorld = world('fountain');
  const { api, store } = setup({
    sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2, state: 'resolved' }, spellbook, assessment, replayed: false })),
    recruit: jest.fn(async () => ({ party: [member], joined: true })),
  });
  await store.getState().initialize();
  await store.getState().enterEncounter();
  api.getWorld.mockResolvedValueOnce({ world: resolvedWorld });
  api.getParty.mockImplementationOnce(() => party.promise);
  const sent = store.getState().sendMessage('Vorrei un caffè.');
  await flush();
  await store.getState().recruit('imp_coffee_greeting');
  party.resolve({ party: [] });
  await sent;
  expect(store.getState().party).toEqual([member]);
  expect(store.getState().world).toEqual(resolvedWorld);
});

test('a move while the Party screen opens keeps the party it read', async () => {
  const read = deferred();
  const { api, store } = setup({ moveTo: jest.fn(async () => ({ world: world('fountain'), spellbook })) });
  await store.getState().initialize();
  api.getParty.mockImplementationOnce(() => read.promise);
  store.getState().openParty();
  await store.getState().moveTo('fountain');
  read.resolve({ party: [member] });
  await flush();
  expect(store.getState().party).toEqual([member]);
});

test('an empty party reply is ignored without an unhandled error', async () => {
  const { api, store } = setup();
  await store.getState().initialize();
  api.getParty.mockResolvedValueOnce(undefined);
  store.getState().openParty();
  await flush();
  expect(store.getState().party).toEqual([]);
});

// R2.4, R2.5 -------------------------------------------------------------------------------------------------------

test('a stale card, its error dismissed, can still be retried from the review screen', async () => {
  const { api, store } = setup({ submitReview: jest.fn().mockRejectedValueOnce(coded('STALE_CHALLENGE')) });
  await store.getState().initialize();
  await store.getState().startReview('caffe');
  await store.getState().submitReview('coffee');
  expect(store.getState()).toMatchObject({ view: 'review', reviewChallenge: null, error: STALE_REVIEW });
  store.getState().clearError();
  // The panel's "Try again" (onContinue) calls startReview.
  await store.getState().startReview();
  expect(api.createReview).toHaveBeenCalledTimes(2);
  expect(store.getState()).toMatchObject({ view: 'review', reviewChallenge: challenge });
});

for (const [label, outcome] of [
  ['a success', (held) => held.resolve({ result: reviewResult, spellbook: { ...spellbook, dueCount: 7 }, replayed: false })],
  ['STALE_CHALLENGE', (held) => held.reject(coded('STALE_CHALLENGE'))],
  ['a network error', (held) => held.reject(lost())],
]) {
  test(`a review reply after Return lands silently: ${label}`, async () => {
    const held = deferred();
    const { api, store, cue } = setup({ submitReview: jest.fn().mockReturnValueOnce(held.promise).mockResolvedValue({ result: reviewResult, spellbook, replayed: false }) });
    await store.getState().initialize();
    await store.getState().startReview('caffe');
    const sent = store.getState().submitReview('coffee');
    store.getState().returnToDialogue();
    outcome(held);
    await sent;
    expect(store.getState()).toMatchObject({ view: 'map', error: null, reviewResult: null, isLoading: false });
    expect(cue).not.toHaveBeenCalled();
    if (label === 'a success') expect(store.getState().spellbook.dueCount).toBe(7);
    // The card's attempt ids are gone after a success or a stale card: the same answer gets a fresh id.
    if (label !== 'a network error') {
      store.setState({ reviewChallenge: challenge, view: 'review' });
      await store.getState().submitReview('coffee');
      expect(api.submitReview.mock.calls[1][1].attemptId).not.toBe(api.submitReview.mock.calls[0][1].attemptId);
    }
  });
}
