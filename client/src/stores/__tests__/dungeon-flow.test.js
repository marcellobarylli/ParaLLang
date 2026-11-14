// @vitest-environment node
// Round 115: the store's dungeon flow with a mocked API: attract → overview → approach → encounter → walk → … →
// victory. The dialogue waits for both the camera and the encounter. The older single-encounter checks (a failed
// send keeps the draft, startup is deduplicated, stale replies are dropped) are kept.
import { expect, test, vi } from 'vitest';
import { createGameStore } from '../gameStore.js';
import { DUNGEON } from '../../dungeon.js';

const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language: { code: 'it', name: 'Italian', tag: 'it-IT' } };
const SITES = DUNGEON.sites.map((site) => site.encounterId);
const NAMES = ['Portia', 'Gerald', 'Bambieshart'];
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: vi.fn((key) => values.get(key) ?? null), setItem: vi.fn((key, value) => values.set(key, value)), values };
}

const apiError = (message, code, details) => Object.assign(new Error(message), { code, details, status: 409 });

// A server in miniature: a run with cleared sites, one conversation at a time.
function fakeServer({ cleared = 0, ...overrides } = {}) {
  const server = { cleared, run: 1, session: null, sessions: 0 };
  const view = () => ({
    dungeon: { id: DUNGEON.id, name: DUNGEON.name, level: DUNGEON.level, route: DUNGEON.route, sites: DUNGEON.sites.map((site, index) => ({ ...site, characterName: NAMES[index] })) },
    progress: {
      run: server.run, clearedEncounterIds: SITES.slice(0, server.cleared), nextSiteIndex: server.cleared < SITES.length ? server.cleared : null,
      nextEncounterId: SITES[server.cleared] ?? null, complete: server.cleared >= SITES.length,
    },
  });
  const encounter = () => ({ ...server.session });
  const api = {
    createLearner: vi.fn(async () => identity),
    getDungeon: vi.fn(async () => view()),
    resetDungeon: vi.fn(async () => { server.cleared = 0; server.run += 1; server.session = null; return view(); }),
    startEncounter: vi.fn(async (_learnerId, { restart = false } = {}) => {
      if (server.cleared >= SITES.length) throw apiError('Ta Prohm is cleared. Start a new run to play it again.', 'NOT_NEXT_SITE', { nextEncounterId: null });
      const encounterId = SITES[server.cleared];
      if (restart || !server.session || server.session.encounterId !== encounterId || server.session.state !== 'ongoing') {
        server.sessions += 1;
        server.session = { id: `enc-${server.sessions}`, encounterId, dungeonId: DUNGEON.id, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 }, character: { name: NAMES[server.cleared] } };
      }
      return { encounter: encounter(), spellbook };
    }),
    sendDialogue: vi.fn(async (_learnerId, { message }) => {
      server.session = { ...server.session, version: server.session.version + 1, state: 'resolved', transcript: [{ id: 'p', role: 'player', text: message }] };
      server.cleared += 1;
      return { encounter: encounter(), spellbook: { ...spellbook, dueCount: server.cleared }, assessment: { overallFeedback: 'Good', objectiveResults: [] } };
    }),
    revealHelp: vi.fn(), createReview: vi.fn(), submitReview: vi.fn(),
    getSpellbook: vi.fn(async () => ({ ...spellbook, dueCount: 7 })),
    ...overrides,
  };
  return { server, api };
}

function makeStore(options = {}) {
  const { server, api } = fakeServer(options);
  const store = createGameStore({ api, storage: options.storage ?? memoryStorage(), dungeon: DUNGEON });
  return { server, api, store, s: () => store.getState() };
}

function deferred() {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('the store needs the dungeon', () => {
  expect(() => createGameStore({ api: {}, storage: memoryStorage() })).toThrow(/needs the dungeon/);
});

test('a whole run: three sites in order, a walk between them, the victory screen and a new run', async () => {
  const { api, s } = makeStore();
  expect(s().phase).toBe('attract');
  await s().initialize();
  expect(s()).toMatchObject({ connection: 'ready', phase: 'attract', learnerId: identity.learnerId });
  expect(s().dungeon.sites.map((site) => site.characterName)).toEqual(NAMES); // the server's names join the bundled file

  s().start(); // not from the title screen
  expect(s().phase).toBe('attract');
  s().enter();
  expect(s().phase).toBe('overview');
  await s().start();
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: 0, walkFrom: null, cameraArrived: false });
  expect(api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, { dungeonId: 'ta_prohm', restart: false });
  expect(s().encounter.encounterId).toBe(SITES[0]); // loaded, but the camera is still on its way
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');

  await s().walkOn(); // not before the site is resolved
  expect(s().phase).toBe('encounter');
  await s().sendMessage('Ciao!');
  expect(s().encounter.state).toBe('resolved');
  expect(s().progress.clearedEncounterIds).toEqual([SITES[0]]);
  expect(s().phase).toBe('encounter'); // the walk waits for the player

  await s().walkOn();
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: 1, walkFrom: 0, cameraArrived: false, assessment: null });
  expect(s().encounter.encounterId).toBe(SITES[1]);
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
  await s().sendMessage('Un caffè.');
  await s().walkOn();
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: 2, walkFrom: 1 });
  s().onCameraArrived();
  await s().sendMessage('Grazie.');
  expect(s().progress.complete).toBe(true);
  await s().walkOn();
  expect(s()).toMatchObject({ phase: 'victory', encounter: null });
  expect(api.startEncounter).toHaveBeenCalledTimes(3);

  await s().playAgain();
  expect(api.resetDungeon).toHaveBeenCalledWith(identity.learnerId, 'ta_prohm');
  expect(s()).toMatchObject({ phase: 'overview', siteIndex: 0 });
  expect(s().progress).toMatchObject({ run: 2, clearedEncounterIds: [], complete: false });
  await s().start();
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: 0 });
});

test('the dialogue opens only when the camera has arrived and the encounter has loaded, in either order', async () => {
  const pending = deferred();
  const { api, s } = makeStore();
  const started = api.startEncounter.getMockImplementation();
  api.startEncounter.mockImplementationOnce(async (...args) => { await pending.promise; return started(...args); });
  await s().initialize();
  s().enter();
  const start = s().start();
  await vi.waitFor(() => expect(s().phase).toBe('approach'));
  s().onCameraArrived(); // the camera is first
  expect(s()).toMatchObject({ phase: 'approach', cameraArrived: true, encounterLoading: true, encounter: null });
  pending.resolve();
  await start;
  expect(s().phase).toBe('encounter');
  s().onCameraArrived(); // a second arrival changes nothing
  expect(s().phase).toBe('encounter');
});

test('a reload resumes: the next site of a run under way, the victory screen of a finished one, the title otherwise', async () => {
  const fresh = makeStore();
  await fresh.s().initialize();
  expect(fresh.s().phase).toBe('attract');
  expect(fresh.api.startEncounter).not.toHaveBeenCalled();

  const midway = makeStore({ cleared: 1, storage: memoryStorage({ 'parallang.learnerId': identity.learnerId }) });
  await midway.s().initialize();
  expect(midway.api.createLearner).toHaveBeenCalledWith(identity.learnerId);
  expect(midway.s()).toMatchObject({ phase: 'approach', siteIndex: 1, walkFrom: null });
  expect(midway.s().encounter.encounterId).toBe(SITES[1]);
  midway.s().onCameraArrived();
  expect(midway.s().phase).toBe('encounter');

  const done = makeStore({ cleared: 3 });
  await done.s().initialize();
  expect(done.s().phase).toBe('victory');
  expect(done.api.startEncounter).not.toHaveBeenCalled();
});

test('startup is deduplicated (StrictMode) and keeps the learner id', async () => {
  const storage = memoryStorage({ 'parallang.learnerId': identity.learnerId });
  const { api, s } = makeStore({ storage });
  const first = s().initialize();
  const second = s().initialize();
  expect(first).toBe(second);
  await first;
  expect(api.createLearner).toHaveBeenCalledOnce();
  expect(api.getDungeon).toHaveBeenCalledOnce();
  expect(storage.setItem).toHaveBeenCalledWith('parallang.learnerId', identity.learnerId);
});

test('a conversation from outside the dungeon is replaced once; any other refusal is shown with a retry', async () => {
  const { api, s } = makeStore();
  const started = api.startEncounter.getMockImplementation();
  api.startEncounter.mockImplementationOnce(async () => { throw apiError('Finish your conversation with Gerald first.', 'CONVERSATION_UNDER_WAY'); });
  await s().initialize();
  s().enter();
  await s().start();
  expect(api.startEncounter.mock.calls.map(([, options]) => options.restart)).toEqual([false, true]);
  expect(s().encounter.encounterId).toBe(SITES[0]);
  expect(s().siteError).toBeNull();

  s().onCameraArrived();
  await s().sendMessage('Ciao!');
  api.startEncounter.mockImplementationOnce(async () => { throw Object.assign(new Error('The selected CLI timed out.'), { code: 'CLI_TIMEOUT' }); });
  await s().walkOn();
  expect(s()).toMatchObject({ phase: 'walk', siteError: 'The selected CLI timed out.', encounterLoading: false, encounter: null });
  s().onCameraArrived();
  expect(s().phase).toBe('walk'); // nothing to open yet
  api.startEncounter.mockImplementation(started);
  await s().retrySite();
  expect(s()).toMatchObject({ phase: 'encounter', siteError: null });
});

test('the server decides the site: a run another tab moved on is followed, and a finished run shows the victory', async () => {
  const { server, s } = makeStore();
  await s().initialize();
  s().enter();
  server.cleared = 1; // another tab cleared site 1 after this one loaded
  await s().start();
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: 1, cameraArrived: false });
  expect(s().encounter.encounterId).toBe(SITES[1]);

  s().onCameraArrived();
  await s().sendMessage('Un caffè.');
  server.cleared = 3; // and the other tab finished the run
  await s().walkOn();
  expect(s().phase).toBe('victory');
  expect(s().progress.complete).toBe(true);
});

test('start over replaces the conversation of the site', async () => {
  const { api, s } = makeStore();
  await s().initialize();
  s().enter();
  await s().start();
  s().onCameraArrived();
  const first = s().encounter.id;
  await s().restartSite();
  expect(api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, { dungeonId: 'ta_prohm', restart: true });
  expect(s().encounter.id).not.toBe(first);
  expect(s().phase).toBe('encounter');
});

test('with no server the title and the route still work, and Start says what is missing', async () => {
  const { api } = fakeServer();
  const store = createGameStore({ api, storage: memoryStorage(), dungeon: DUNGEON, sameOrigin: false });
  const s = () => store.getState();
  await s().initialize();
  expect(s()).toMatchObject({ connection: 'offline', phase: 'attract', error: null });
  expect(s().serverProblem).toMatch(/No server is set\. Open Settings/);
  s().enter();
  await s().start();
  expect(s()).toMatchObject({ phase: 'overview', starting: false });
  expect(api.createLearner).not.toHaveBeenCalled();
});

test('a server that does not answer is explained, and Start tries again', async () => {
  const { api, s } = makeStore();
  api.createLearner.mockImplementationOnce(async () => { throw Object.assign(new Error('The server did not answer at https://parallang.example.com.'), { code: 'UNREACHABLE' }); });
  await s().initialize();
  expect(s()).toMatchObject({ connection: 'offline', learnerId: null });
  expect(s().serverProblem).toMatch(/did not answer/);
  s().enter();
  await s().start(); // the server has woken
  expect(s()).toMatchObject({ connection: 'ready', serverProblem: null, phase: 'approach' });
  expect(api.createLearner).toHaveBeenCalledTimes(2);
});

test('a failed send keeps the answer for a retry', async () => {
  const pending = deferred();
  const { api, s } = makeStore();
  api.sendDialogue.mockImplementationOnce(() => pending.promise);
  await s().initialize();
  s().enter();
  await s().start();
  s().onCameraArrived();
  s().setDraft('Sin leche, por favor.');
  const send = s().sendMessage();
  expect(s()).toMatchObject({ isLoading: true, pendingInput: 'Sin leche, por favor.' });
  pending.reject(Object.assign(new Error('The selected CLI timed out. Your progress was not changed.'), { code: 'CLI_TIMEOUT', retryable: true }));
  await send;
  expect(s()).toMatchObject({ isLoading: false, draft: 'Sin leche, por favor.', pendingInput: 'Sin leche, por favor.' });
  expect(s().error).toMatch(/CLI timed out/);
  expect(s().encounter.version).toBe(1);
  await s().sendMessage();
  expect(s()).toMatchObject({ draft: '', pendingInput: null, error: null });
  expect(s().assessment.overallFeedback).toBe('Good');
  expect(s().spellbook.dueCount).toBe(1);
});

test('replies that arrive after new settings are dropped', async () => {
  const pending = deferred();
  const storage = memoryStorage();
  const { api, s } = makeStore({ storage });
  await s().initialize();
  s().enter();
  await s().start();
  s().onCameraArrived();
  api.sendDialogue.mockImplementationOnce(() => pending.promise);
  const send = s().sendMessage('Ciao!');
  await s().saveSettings({ serverUrl: 'https://other.example.com', token: 'another-token' });
  expect(s()).toMatchObject({ phase: 'overview', encounter: null, connection: 'ready', settingsOpen: false });
  pending.resolve({ encounter: { id: 'enc-1', version: 99, state: 'resolved', encounterId: SITES[0] }, spellbook, assessment: {} });
  await send;
  expect(s().encounter).toBeNull();
  expect(JSON.parse(storage.values.get('parallang.settings'))).toEqual({ serverUrl: 'https://other.example.com', token: 'another-token' });
});

test('opening the Spellbook shows the last snapshot and then the one the server holds', async () => {
  const { api, s } = makeStore();
  await s().initialize();
  s().openSpellbook();
  expect(s()).toMatchObject({ view: 'spellbook' });
  expect(s().spellbook.dueCount).toBe(0);
  await vi.waitFor(() => expect(s().spellbook.dueCount).toBe(7));
  expect(api.getSpellbook).toHaveBeenCalledWith(identity.learnerId);
  s().returnToDialogue();
  expect(s().view).toBe('dialogue');
});

// Review 1 (Codex), findings R1.2 to R1.5.
async function playToVictory(s) {
  await s().initialize();
  s().enter();
  await s().start();
  for (const answer of ['Ciao!', 'Un caffè.', 'Grazie.']) {
    s().onCameraArrived();
    await s().sendMessage(answer);
    await s().walkOn();
  }
  expect(s().phase).toBe('victory');
}

test('the last answer and Play again: the answer\'s own read of the run is dropped when the reset lands first (R1.2)', async () => {
  const late = deferred();
  const { server, api, s } = makeStore({ cleared: 2 });
  await s().initialize();
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
  const view = api.getDungeon.getMockImplementation();
  api.getDungeon.mockImplementationOnce(async () => { const finished = await view(); await late.promise; return finished; });
  const send = s().sendMessage('Grazie.'); // resolves the run; its read of the progress hangs
  await vi.waitFor(() => expect(s().encounter.state).toBe('resolved'));
  expect(server.cleared).toBe(3);
  // The player leaves (walkOn reads the run itself, which outdates the hanging read) and starts a new run.
  await s().walkOn();
  expect(s().phase).toBe('victory');
  await s().playAgain();
  expect(s().progress).toMatchObject({ run: 2, clearedEncounterIds: [], complete: false });
  late.resolve();
  await send;
  expect(s().progress).toMatchObject({ run: 2, clearedEncounterIds: [], complete: false });
  await s().start();
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: 0 });
});

test('a reset that answers after new settings changes nothing (R1.3)', async () => {
  const late = deferred();
  const { api, s } = makeStore();
  await playToVictory(s);
  const reset = api.resetDungeon.getMockImplementation();
  api.resetDungeon.mockImplementationOnce(async (...args) => { await late.promise; return reset(...args); });
  const again = s().playAgain();
  await s().saveSettings({ serverUrl: 'https://other.example.com', token: 'another-token' });
  expect(s()).toMatchObject({ phase: 'victory', isLoading: false }); // the new server's view of the run
  const startsBefore = api.startEncounter.mock.calls.length;
  late.resolve();
  await again;
  expect(s()).toMatchObject({ phase: 'victory', isLoading: false, encounterLoading: false });
  expect(api.startEncounter.mock.calls.length).toBe(startsBefore);
});

test('a Spellbook read sent before a conversation opened is not applied over the conversation\'s Spellbook (R1.4)', async () => {
  const late = deferred();
  const opening = deferred();
  const { api, s } = makeStore();
  const started = api.startEncounter.getMockImplementation();
  api.startEncounter.mockImplementation(async (...args) => { await opening.promise; return { ...(await started(...args)), spellbook: { ...spellbook, inEncounter: true, dueCount: 3 } }; });
  api.getSpellbook.mockImplementationOnce(() => late.promise);
  await s().initialize();
  s().enter();
  const start = s().start();
  await vi.waitFor(() => expect(s().encounterLoading).toBe(true));
  s().openSpellbook(); // the read leaves while the greeting is still being written
  opening.resolve(); // the conversation opens and brings its own Spellbook
  await start;
  expect(s()).toMatchObject({ view: 'spellbook', spellbook: { inEncounter: true, dueCount: 3 } });
  late.resolve({ ...spellbook, inEncounter: false, dueCount: 9, cards: [{ vocabularyId: 'ciao', meanings: ['hello'] }] });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(s().spellbook).toMatchObject({ inEncounter: true, dueCount: 3 });
  expect(s().spellbook.cards).toEqual([]);
});

test('a Start over that fails says so in the conversation, which stays as it was (R1.5)', async () => {
  const { api, s } = makeStore();
  await s().initialize();
  s().enter();
  await s().start();
  s().onCameraArrived();
  const conversation = s().encounter.id;
  api.startEncounter.mockImplementationOnce(async () => { throw Object.assign(new Error('The selected CLI timed out.'), { code: 'CLI_TIMEOUT' }); });
  await s().restartSite();
  expect(s()).toMatchObject({ phase: 'encounter', siteError: null, encounterLoading: false });
  expect(s().error).toBe('The conversation could not start over: The selected CLI timed out.');
  expect(s().encounter.id).toBe(conversation);
});

// Round 116: what the camera follows in a conversation.
test('the store counts the objectives a conversation has closed and numbers each verdict', async () => {
  const { api, s } = makeStore();
  const turn = (objectiveResults, state = 'ongoing') => async () => ({
    encounter: { ...s().encounter, version: s().encounter.version + 1, state }, spellbook, assessment: { overallFeedback: '', objectiveResults },
  });
  await s().initialize();
  s().enter();
  await s().start();
  s().onCameraArrived();
  expect(s()).toMatchObject({ closedObjectives: 0, beat: null });

  api.sendDialogue.mockImplementationOnce(turn([{ objectiveId: 'greet', passed: false }]));
  await s().sendMessage('Hello!');
  expect(s()).toMatchObject({ closedObjectives: 0, beat: { id: 1, kind: 'fail' } });
  // A pass said too early is held: it closes nothing, so it is no step in.
  api.sendDialogue.mockImplementationOnce(turn([{ objectiveId: 'greet', passed: false }, { objectiveId: 'introduce', passed: true, held: true }]));
  await s().sendMessage('Sono Sam.');
  expect(s()).toMatchObject({ closedObjectives: 0, beat: { id: 2, kind: 'fail' } });
  api.sendDialogue.mockImplementationOnce(turn([{ objectiveId: 'greet', passed: true }, { objectiveId: 'introduce', passed: true }]));
  await s().sendMessage('Ciao, sono Sam.');
  expect(s()).toMatchObject({ closedObjectives: 2, beat: { id: 3, kind: 'pass' } });
  api.sendDialogue.mockImplementationOnce(async () => { throw new Error('The selected CLI timed out.'); });
  await s().sendMessage('E tu?');
  expect(s()).toMatchObject({ closedObjectives: 2, beat: { id: 3, kind: 'pass' } }); // no verdict, no beat

  await s().restartSite();
  expect(s()).toMatchObject({ closedObjectives: 0, beat: { id: 3 } }); // the count starts again; the numbering goes on
  await s().sendMessage('Ciao!'); // the fake server resolves the site
  expect(s()).toMatchObject({ closedObjectives: 0, beat: { id: 4, kind: 'resolved' } });
  await s().walkOn();
  expect(s()).toMatchObject({ phase: 'walk', closedObjectives: 0 });
});
