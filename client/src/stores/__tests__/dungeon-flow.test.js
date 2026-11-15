// @vitest-environment node
// Round 115: the store's dungeon flow with a mocked API. The dialogue waits for both the camera and the encounter.
// The older single-encounter checks (a failed send keeps the draft, startup is deduplicated, stale replies are
// dropped) are kept.
// Round 119: the dungeon is a map under a world map: attract → world → overview → approach → encounter or site →
// walk → … → victory. The fake server keeps its run by the server's own rules (src/__tests__/fakeRun.js).
import { expect, test, vi } from 'vitest';
import { OLD_SERVER, createGameStore, siteStatesOf } from '../gameStore.js';
import { DUNGEON } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { NAMES, TOUR, apiError, createFakeRun } from '../../__tests__/fakeRun.js';

const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language: { code: 'it', name: 'Italian', tag: 'it-IT' } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const index = (siteId) => DUNGEON.sites.findIndex((site) => site.id === siteId);
const encounterOf = (siteId) => DUNGEON.sites[index(siteId)].encounterId;

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: vi.fn((key) => values.get(key) ?? null), setItem: vi.fn((key, value) => values.set(key, value)), values };
}

// A server in miniature: a run on the map, one conversation at a time. `steps` visits of TOUR are already played,
// or `stored` is the run as a save holds it.
function fakeServer({ steps = 0, stored, ...overrides } = {}) {
  const run = createFakeRun(stored).advance(steps);
  const server = { run, session: null, sessions: 0 };
  const encounter = () => ({ ...server.session });
  const api = {
    createLearner: vi.fn(async () => identity),
    getDungeon: vi.fn(async () => run.view()),
    resetDungeon: vi.fn(async () => { server.session = null; return run.reset(); }),
    moveDungeon: vi.fn(async (_learnerId, _dungeonId, { siteId, leave = false }) => {
      const from = run.run.at;
      if (server.session?.state === 'ongoing' && siteId !== from && !leave) throw apiError(`Finish your conversation with ${NAMES[from]} first.`, 'CONVERSATION_UNDER_WAY');
      const view = run.move(siteId);
      if (siteId !== from) server.session = null;
      return view;
    }),
    startEncounter: vi.fn(async (_learnerId, { restart = false } = {}) => {
      const site = run.site;
      if (restart || !server.session || server.session.siteId !== site.id || server.session.state !== 'ongoing') {
        server.sessions += 1;
        server.session = { id: `enc-${server.sessions}`, encounterId: site.encounter, siteId: site.id, dungeonId: DUNGEON.id, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 }, character: { name: NAMES[site.id] } };
      }
      return { encounter: encounter(), spellbook };
    }),
    sendDialogue: vi.fn(async (_learnerId, { message }) => {
      server.session = { ...server.session, version: server.session.version + 1, state: 'resolved', transcript: [{ id: 'p', role: 'player', text: message }] };
      run.clear(server.session.siteId);
      return { encounter: encounter(), spellbook: { ...spellbook, dueCount: run.run.cleared.length }, assessment: { overallFeedback: 'Good', objectiveResults: [] } };
    }),
    revealHelp: vi.fn(), createReview: vi.fn(), submitReview: vi.fn(),
    getSpellbook: vi.fn(async () => ({ ...spellbook, dueCount: 7 })),
    ...overrides,
  };
  return { server, api };
}

function makeStore(options = {}) {
  const { server, api } = fakeServer(options);
  const store = createGameStore({ api, storage: options.storage ?? memoryStorage(), dungeon: DUNGEON, atlas: ATLAS });
  return { server, api, store, s: () => store.getState() };
}

function deferred() {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// From the title to the conversation at the Face Gate.
async function toFirstSite(s) {
  await s().initialize();
  s().enter();
  s().enterPlace('ta_prohm');
  await s().start();
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
}

// Plays TOUR from wherever the store stands (the first visit is the site it is at).
async function playTour(s, from = 0) {
  for (const [siteId, clears] of TOUR.slice(from)) {
    if (s().dungeon.sites[s().siteIndex].id !== siteId || !['encounter', 'site'].includes(s().phase)) {
      await s().travel(siteId);
      expect(s(), `on the way to ${siteId}`).toMatchObject({ phase: 'walk', siteIndex: index(siteId) });
      s().onCameraArrived();
    }
    if (clears) {
      expect(s().phase, `at ${siteId}`).toBe('encounter');
      await s().sendMessage('Ecco.');
      expect(s().encounter.state).toBe('resolved');
    } else expect(s().phase, `at ${siteId}`).toBe('site');
  }
}

test('the store needs the dungeon', () => {
  expect(() => createGameStore({ api: {}, storage: memoryStorage() })).toThrow(/needs the dungeon/);
});

test('a whole run: the world map, the temple map, seven sites by a walk of the player\'s choosing, the victory screen and a new run', async () => {
  const { api, s } = makeStore();
  expect(s().phase).toBe('attract');
  await s().initialize();
  expect(s()).toMatchObject({ connection: 'ready', phase: 'attract', learnerId: identity.learnerId });
  // The server's names join the bundled file, as far as the fog allows.
  expect(s().dungeon.sites.map((site) => site.characterName)).toEqual(['Portia', 'Mortimer', 'Gerald', null, null, null, null]);

  s().start(); // not from the title screen
  expect(s().phase).toBe('attract');
  s().enter();
  expect(s().phase).toBe('world');
  s().enterPlace('angkor_wat'); // closed: it has no dungeon
  expect(s().phase).toBe('world');
  s().enterPlace('ta_prohm');
  expect(s().phase).toBe('overview');
  s().toWorld();
  expect(s().phase).toBe('world');
  s().enterPlace('ta_prohm');
  await s().start();
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: 0, walkFrom: null, cameraArrived: false, arrival: 'encounter' });
  expect(api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, { dungeonId: 'ta_prohm', restart: false });
  expect(s().encounter.encounterId).toBe(encounterOf('face_gate')); // loaded, but the camera is still on its way
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');

  // Before Portia is answered nothing can be walked to, and there is no leaving the temple from here.
  await s().travel('root_court');
  s().leaveTemple();
  s().openMap();
  expect(s().phase).toBe('encounter');
  expect(api.moveDungeon).not.toHaveBeenCalled();
  await s().sendMessage('Ciao!');
  expect(s().encounter.state).toBe('resolved');
  expect(siteStatesOf(s()).face_gate.cleared).toBe(true);
  expect(siteStatesOf(s()).root_court.reachable).toBe(true);
  expect(s().phase).toBe('encounter'); // the walk waits for the player

  await s().travel('library'); // not joined to the gate, and under the fog
  expect(s().phase).toBe('encounter');
  await s().travel('buttress_tree');
  expect(api.moveDungeon).toHaveBeenLastCalledWith(identity.learnerId, 'ta_prohm', { siteId: 'buttress_tree' });
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: index('buttress_tree'), walkFrom: 0, cameraArrived: false, assessment: null, arrival: 'encounter' });
  expect(s().encounter.encounterId).toBe(encounterOf('buttress_tree'));
  expect(s().progress.at).toBe('buttress_tree');
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
  await s().sendMessage('Un etto di prosciutto.');

  await playTour(s, 2);
  // The Sunlit Court was walked through a second time: a cleared site opens its card and starts no conversation.
  expect(api.startEncounter).toHaveBeenCalledTimes(7);
  expect(s().progress.complete).toBe(true);
  expect(s()).toMatchObject({ phase: 'encounter', siteIndex: index('sanctuary') });
  s().leaveTemple();
  expect(s()).toMatchObject({ phase: 'victory', encounter: null });

  await s().playAgain();
  expect(api.resetDungeon).toHaveBeenCalledWith(identity.learnerId, 'ta_prohm');
  expect(s()).toMatchObject({ phase: 'world', siteIndex: 0 });
  expect(s().progress).toMatchObject({ run: 2, at: 'face_gate', clearedSiteIds: [], complete: false });
  expect(siteStatesOf(s()).library.state).toBe('hidden'); // the fog is back
  s().enterPlace('ta_prohm');
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
  s().enterPlace('ta_prohm');
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

test('a reload resumes at the site the player stands at: its conversation if it is not cleared, its card if it is; a finished run shows the victory, which the player may stay past', async () => {
  const fresh = makeStore();
  await fresh.s().initialize();
  expect(fresh.s().phase).toBe('attract');
  expect(fresh.api.startEncounter).not.toHaveBeenCalled();

  // At Gerald's court, which is not cleared.
  const midway = makeStore({ stored: { run: 1, at: 'root_court', cleared: ['face_gate'], visited: ['face_gate', 'root_court'] }, storage: memoryStorage({ 'parallang.learnerId': identity.learnerId }) });
  await midway.s().initialize();
  expect(midway.api.createLearner).toHaveBeenCalledWith(identity.learnerId);
  expect(midway.s()).toMatchObject({ phase: 'approach', siteIndex: index('root_court'), walkFrom: null, arrival: 'encounter' });
  expect(midway.s().encounter.encounterId).toBe(encounterOf('root_court'));
  midway.s().onCameraArrived();
  expect(midway.s().phase).toBe('encounter');

  // At Mortimer's tree, cleared: no conversation is asked for.
  const cleared = makeStore({ steps: 2 });
  await cleared.s().initialize();
  expect(cleared.s()).toMatchObject({ phase: 'approach', siteIndex: index('buttress_tree'), arrival: 'site' });
  expect(cleared.api.startEncounter).not.toHaveBeenCalled();
  cleared.s().onCameraArrived();
  expect(cleared.s()).toMatchObject({ phase: 'site', encounter: null });

  // A player who has gone on to the maps before the server answered is left there.
  const hurried = makeStore({ steps: 2 });
  hurried.s().enter();
  await hurried.s().initialize();
  expect(hurried.s().phase).toBe('world');

  const done = makeStore({ steps: TOUR.length });
  await done.s().initialize();
  expect(done.s().phase).toBe('victory');
  expect(done.api.startEncounter).not.toHaveBeenCalled();
  // Critique 1.3: the victory screen a reload opens leads back into the finished run.
  done.s().stay();
  expect(done.s().phase).toBe('overview');
  await done.s().start();
  expect(done.s()).toMatchObject({ phase: 'approach', siteIndex: index('sanctuary'), arrival: 'site' });
  done.s().onCameraArrived();
  expect(done.s().phase).toBe('site');
  expect(siteStatesOf(done.s()).before_sanctuary.reachable).toBe(true);
});

// Round 119: the site card, leaving a conversation, and the pass rule as the player meets it.
test('a retreat: the player leaves a conversation they cannot finish, walks back, and the conversation is left behind', async () => {
  const { api, server, s } = makeStore();
  await toFirstSite(s);
  await s().sendMessage('Ciao!');
  await s().travel('buttress_tree');
  s().onCameraArrived();
  const mortimer = s().encounter.id;
  await s().travel('face_gate'); // no pick while the conversation is open
  expect(s().phase).toBe('encounter');
  expect(api.moveDungeon).toHaveBeenCalledTimes(1);

  s().leaveConversation();
  expect(s()).toMatchObject({ phase: 'site', siteIndex: index('buttress_tree') });
  expect(s().encounter.id).toBe(mortimer); // kept for "Back to the conversation"
  // Mortimer has not let the player pass: Gerald's court is not reachable, the gate is.
  expect(siteStatesOf(s()).root_court.reachable).toBe(false);
  await s().travel('root_court');
  expect(s().phase).toBe('site');
  expect(api.moveDungeon).toHaveBeenCalledTimes(1);

  await s().talk(); // back in, with no new start
  expect(s()).toMatchObject({ phase: 'encounter' });
  expect(s().encounter.id).toBe(mortimer);
  expect(api.startEncounter).toHaveBeenCalledTimes(2);
  s().leaveConversation();

  await s().travel('face_gate');
  expect(api.moveDungeon).toHaveBeenLastCalledWith(identity.learnerId, 'ta_prohm', { siteId: 'face_gate', leave: true });
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: 0, walkFrom: index('buttress_tree'), arrival: 'site', encounter: null });
  expect(server.session).toBeNull();
  expect(api.startEncounter).toHaveBeenCalledTimes(2); // the gate is cleared: no conversation is asked for
  s().onCameraArrived();
  expect(s().phase).toBe('site');
  // From the gate the other way lies open.
  await s().travel('root_court');
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: index('root_court'), walkFrom: 0, arrival: 'encounter' });
});

test('a cleared site is played again from its card, and a move after leaving the replay sends leave, also to an unvisited site (critique 1.1)', async () => {
  const { api, s } = makeStore();
  await toFirstSite(s);
  await s().sendMessage('Ciao!');
  s().openMap();
  expect(s()).toMatchObject({ phase: 'overview', encounter: null });
  await s().start();
  expect(s()).toMatchObject({ phase: 'approach', arrival: 'site' });
  s().onCameraArrived();
  expect(s().phase).toBe('site');

  await s().talk();
  expect(s()).toMatchObject({ phase: 'encounter', encounter: { state: 'ongoing', encounterId: encounterOf('face_gate') } });
  expect(api.startEncounter).toHaveBeenCalledTimes(2);
  s().leaveConversation();
  await s().travel('root_court'); // never visited
  expect(api.moveDungeon).toHaveBeenLastCalledWith(identity.learnerId, 'ta_prohm', { siteId: 'root_court', leave: true });
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: index('root_court') });
});

test('a conversation only the server holds (a reload) is left on its refusal, and any other refusal is shown and the map read again', async () => {
  const { api, server, s } = makeStore({ steps: 1 });
  // The server holds a replay of Portia's conversation that this store never saw.
  server.session = { id: 'enc-old', siteId: 'face_gate', state: 'ongoing' };
  await s().initialize();
  s().onCameraArrived();
  expect(s()).toMatchObject({ phase: 'site', encounter: null });
  await s().travel('buttress_tree');
  expect(api.moveDungeon.mock.calls.map(([, , body]) => body)).toEqual([{ siteId: 'buttress_tree' }, { siteId: 'buttress_tree', leave: true }]);
  expect(s()).toMatchObject({ phase: 'walk', siteIndex: index('buttress_tree'), error: null });

  // The map this store holds is out of date: the server refuses, the store says so and reads the run again.
  s().onCameraArrived();
  await s().sendMessage('Un etto.');
  const reads = api.getDungeon.mock.calls.length;
  api.moveDungeon.mockImplementationOnce(async () => { throw apiError('Mortimer has not let you pass yet.', 'BLOCKED'); });
  await s().travel('root_court');
  expect(s()).toMatchObject({ phase: 'encounter', error: 'Mortimer has not let you pass yet.', travelling: false });
  expect(api.getDungeon.mock.calls.length).toBe(reads + 1);
});

test('the map is reached from a site card and from a resolved conversation, not from one under way; a site start still in flight is dropped', async () => {
  const pending = deferred();
  const { api, s } = makeStore();
  await toFirstSite(s);
  s().openMap();
  expect(s().phase).toBe('encounter');
  await s().sendMessage('Ciao!');
  // The walk to Gerald starts, his greeting is slow, and the start fails: the caption offers the map.
  api.startEncounter.mockImplementationOnce(async () => { throw Object.assign(new Error('The selected CLI timed out.'), { code: 'CLI_TIMEOUT' }); });
  await s().travel('root_court');
  expect(s()).toMatchObject({ phase: 'walk', siteError: 'The selected CLI timed out.' });
  s().openMap();
  expect(s()).toMatchObject({ phase: 'overview', siteError: null });
  // From the map, on to the gate again; meanwhile a start for the court is still in flight.
  const started = api.startEncounter.getMockImplementation();
  api.startEncounter.mockImplementationOnce(async (...args) => { const result = await started(...args); await pending.promise; return result; });
  const down = s().start();
  await vi.waitFor(() => expect(s()).toMatchObject({ phase: 'approach', siteIndex: index('root_court'), encounterLoading: true }));
  s().onCameraArrived();
  await s().travel('face_gate'); // not while the camera travels without a problem
  expect(s().phase).toBe('approach');
  pending.resolve();
  await down;
  expect(s().phase).toBe('encounter');
});

test('no walk while Talk is with the server, and the map is read again when it opens', async () => {
  const pending = deferred();
  const { api, s } = makeStore({ steps: 1 });
  await s().initialize();
  s().onCameraArrived();
  expect(s().phase).toBe('site');
  const started = api.startEncounter.getMockImplementation();
  api.startEncounter.mockImplementationOnce(async (...args) => { await pending.promise; return started(...args); });
  const talk = s().talk();
  expect(s().encounterLoading).toBe(true);
  await s().travel('root_court'); // the reply to Talk would find the player gone
  expect(api.moveDungeon).not.toHaveBeenCalled();
  pending.resolve();
  await talk;
  expect(s()).toMatchObject({ phase: 'encounter', encounterLoading: false });

  // The read of the run after the last answer fails: the store still holds the map from before it.
  api.getDungeon.mockImplementationOnce(async () => { throw new Error('The server did not answer.'); });
  await s().sendMessage('Ciao!');
  s().leaveConversation(); // resolved: there is nothing to leave
  expect(s().phase).toBe('encounter');
  const reads = api.getDungeon.mock.calls.length;
  s().openMap();
  expect(s().phase).toBe('overview');
  await vi.waitFor(() => expect(api.getDungeon.mock.calls.length).toBe(reads + 1));
});

// Review 1 of round 119 (R1.5).
test('a move whose reply comes after a new run has started is dropped, and Stay waits for Play again', async () => {
  const late = deferred();
  const slowReset = deferred();
  const { api, server, s } = makeStore({ steps: TOUR.length });
  await s().initialize();
  expect(s().phase).toBe('victory');
  const reset = api.resetDungeon.getMockImplementation();
  api.resetDungeon.mockImplementationOnce(async (...args) => { await slowReset.promise; return reset(...args); });
  const again = s().playAgain();
  expect(s().isLoading).toBe(true);
  s().stay(); // Play again is with the server
  expect(s().phase).toBe('victory');
  slowReset.resolve();
  await again;
  expect(s()).toMatchObject({ phase: 'world', progress: { run: 2 } });

  // A second store plays the other half: a move made in run 1 that answers after the reset.
  const other = makeStore({ steps: TOUR.length });
  await other.s().initialize();
  other.s().stay();
  await other.s().start();
  other.s().onCameraArrived();
  const moved = other.api.moveDungeon.getMockImplementation();
  other.api.moveDungeon.mockImplementationOnce(async (...args) => { const view = await moved(...args); await late.promise; return view; });
  const walk = other.s().travel('before_sanctuary');
  await vi.waitFor(() => expect(other.server.run.run.at).toBe('before_sanctuary'));
  other.s().openMap();
  other.store.setState({ phase: 'victory' }); // the reload's victory screen, where Play again lives
  await other.s().playAgain();
  expect(other.s()).toMatchObject({ phase: 'world', progress: { run: 2, at: 'face_gate' } });
  late.resolve();
  await walk;
  expect(other.s()).toMatchObject({ phase: 'world', travelling: false, progress: { run: 2, at: 'face_gate' } });
  expect(server.run.run.run).toBe(2);
});

test('a server from before the map is named, and Start tries again', async () => {
  const { api, s } = makeStore();
  const view = api.getDungeon.getMockImplementation();
  api.getDungeon.mockImplementationOnce(async () => ({ dungeon: { id: 'ta_prohm', sites: [] }, progress: { run: 1, clearedEncounterIds: [], nextSiteIndex: 0, nextEncounterId: 'market_entrance_tutorial', complete: false } }));
  await s().initialize();
  expect(s()).toMatchObject({ connection: 'offline', serverProblem: OLD_SERVER, progress: null });
  // The maps still show the unexplored temple.
  expect(siteStatesOf(s())).toMatchObject({ face_gate: { state: 'current' }, root_court: { state: 'known' }, library: { state: 'hidden' } });
  s().enter();
  s().enterPlace('ta_prohm');
  api.getDungeon.mockImplementation(view);
  await s().start(); // the new server is up
  expect(s()).toMatchObject({ connection: 'ready', serverProblem: null, phase: 'approach' });
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
  s().enterPlace('ta_prohm');
  await s().start();
  expect(api.startEncounter.mock.calls.map(([, options]) => options.restart)).toEqual([false, true]);
  expect(s().encounter.encounterId).toBe(encounterOf('face_gate'));
  expect(s().siteError).toBeNull();

  s().onCameraArrived();
  await s().sendMessage('Ciao!');
  api.startEncounter.mockImplementationOnce(async () => { throw Object.assign(new Error('The selected CLI timed out.'), { code: 'CLI_TIMEOUT' }); });
  await s().travel('root_court');
  expect(s()).toMatchObject({ phase: 'walk', siteError: 'The selected CLI timed out.', encounterLoading: false, encounter: null });
  s().onCameraArrived();
  expect(s().phase).toBe('walk'); // nothing to open yet
  api.startEncounter.mockImplementation(started);
  await s().retrySite();
  expect(s()).toMatchObject({ phase: 'encounter', siteError: null });
});

test('the server decides the site: a player another tab moved is followed', async () => {
  const { server, s } = makeStore();
  await s().initialize();
  s().enter();
  s().enterPlace('ta_prohm');
  server.run.advance(1); // another tab cleared the gate
  server.run.move('root_court'); // and walked on
  await s().start(); // this tab still believes the player is at the gate
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: index('root_court'), cameraArrived: false, arrival: 'encounter' });
  expect(s().encounter.encounterId).toBe(encounterOf('root_court'));
  // Review 1 of round 119 (R1.4): the map follows too, so the way back to the gate is offered after Leave.
  await vi.waitFor(() => expect(s().progress.at).toBe('root_court'));
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
  s().leaveConversation();
  expect(siteStatesOf(s()).face_gate.reachable).toBe(true);
});

test('start over replaces the conversation of the site', async () => {
  const { api, s } = makeStore();
  await toFirstSite(s);
  const first = s().encounter.id;
  await s().restartSite();
  expect(api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, { dungeonId: 'ta_prohm', restart: true });
  expect(s().encounter.id).not.toBe(first);
  expect(s().phase).toBe('encounter');
});

test('with no server the title and the maps still work, and Start says what is missing', async () => {
  const { api } = fakeServer();
  const store = createGameStore({ api, storage: memoryStorage(), dungeon: DUNGEON, sameOrigin: false });
  const s = () => store.getState();
  await s().initialize();
  expect(s()).toMatchObject({ connection: 'offline', phase: 'attract', error: null });
  expect(s().serverProblem).toMatch(/No server is set\. Open Settings/);
  s().enter();
  expect(s().phase).toBe('world');
  s().enterPlace('ta_prohm');
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
  s().enterPlace('ta_prohm');
  await s().start(); // the server has woken
  expect(s()).toMatchObject({ connection: 'ready', serverProblem: null, phase: 'approach' });
  expect(api.createLearner).toHaveBeenCalledTimes(2);
});

test('a failed send keeps the answer for a retry', async () => {
  const pending = deferred();
  const { api, s } = makeStore();
  api.sendDialogue.mockImplementationOnce(() => pending.promise);
  await toFirstSite(s);
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
  await toFirstSite(s);
  api.sendDialogue.mockImplementationOnce(() => pending.promise);
  const send = s().sendMessage('Ciao!');
  await s().saveSettings({ serverUrl: 'https://other.example.com', token: 'another-token' });
  expect(s()).toMatchObject({ phase: 'overview', encounter: null, connection: 'ready', settingsOpen: false });
  pending.resolve({ encounter: { id: 'enc-1', version: 99, state: 'resolved', encounterId: encounterOf('face_gate') }, spellbook, assessment: {} });
  await send;
  expect(s().encounter).toBeNull();
  expect(JSON.parse(storage.values.get('parallang.settings'))).toEqual({ serverUrl: 'https://other.example.com', token: 'another-token' });
});

// Round 117: the opacity of the text panels is a display preference. Unlike new settings it must not reconnect.
test('a new panel opacity is stored and leaves the conversation and the server alone', async () => {
  const storage = memoryStorage({ 'parallang.display': '{"panelOpacity":0.4}' });
  const { api, s } = makeStore({ storage });
  expect(s().display).toEqual({ panelOpacity: 0.4 });
  await toFirstSite(s);
  s().setDraft('Buongiorno');
  const before = s();
  const mocks = Object.entries(api).filter(([, fn]) => fn?.mock);
  const calls = Object.fromEntries(mocks.map(([name, fn]) => [name, fn.mock.calls.length]));
  s().openSettings();
  s().setPanelOpacity(0.23);
  s().setPanelOpacity(2);
  expect(s().display).toEqual({ panelOpacity: 1 });
  s().setPanelOpacity(0.23);
  expect(s().display).toEqual({ panelOpacity: 0.25 });
  expect(JSON.parse(storage.values.get('parallang.display'))).toEqual({ panelOpacity: 0.25 });
  expect(storage.values.has('parallang.settings')).toBe(false);
  expect(s()).toMatchObject({ phase: 'encounter', settingsOpen: true, draft: 'Buongiorno', learnerId: before.learnerId, cameraArrived: true });
  expect(s().encounter).toBe(before.encounter);
  expect(mocks.length).toBeGreaterThan(5);
  for (const [name, fn] of mocks) expect(fn.mock.calls.length, name).toBe(calls[name]);
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
  await toFirstSite(s);
  await playTour(s);
  s().leaveTemple();
  expect(s().phase).toBe('victory');
}

test('the last answer and Play again: the answer\'s own read of the run is dropped when the reset lands first (R1.2)', async () => {
  const late = deferred();
  const { server, api, s } = makeStore({ steps: TOUR.length - 1 });
  server.run.move('sanctuary');
  await s().initialize();
  s().onCameraArrived();
  expect(s()).toMatchObject({ phase: 'encounter', siteIndex: index('sanctuary') });
  const view = api.getDungeon.getMockImplementation();
  api.getDungeon.mockImplementationOnce(async () => { const finished = await view(); await late.promise; return finished; });
  const send = s().sendMessage('Grazie.'); // resolves the run; its read of the progress hangs
  await vi.waitFor(() => expect(s().encounter.state).toBe('resolved'));
  expect(server.run.complete).toBe(true);
  // The player leaves and starts a new run, which outdates the hanging read.
  s().leaveTemple();
  expect(s().phase).toBe('victory');
  await s().playAgain();
  expect(s().progress).toMatchObject({ run: 2, clearedSiteIds: [], complete: false });
  late.resolve();
  await send;
  expect(s().progress).toMatchObject({ run: 2, clearedSiteIds: [], complete: false });
  s().enterPlace('ta_prohm');
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
  expect(s()).toMatchObject({ phase: 'overview', isLoading: false, progress: { complete: true } }); // the new server's view of the run
  const startsBefore = api.startEncounter.mock.calls.length;
  late.resolve();
  await again;
  expect(s()).toMatchObject({ phase: 'overview', isLoading: false, encounterLoading: false });
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
  s().enterPlace('ta_prohm');
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
  await toFirstSite(s);
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
  await toFirstSite(s);
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
  await s().travel('root_court');
  expect(s()).toMatchObject({ phase: 'walk', closedObjectives: 0 });
});
