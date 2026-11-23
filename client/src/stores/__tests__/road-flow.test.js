// @vitest-environment node
// Round 144: The Journey 2 in the store, against the real server logic (src/__tests__/roadServer.js).
// world → the road's hub → a conversation → on rails to the next site → off the rails by the map's choice; a
// conversation left and taken up again; the copy of the save in the browser, and the save put back on a server that
// lost it.
import { afterAll, expect, test, vi } from 'vitest';
import { BACKUP_KEY, RUN_RESTORED, createGameStore } from '../gameStore.js';
import { DUNGEON } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { cleanUp, createRoadServer } from '../../__tests__/roadServer.js';

vi.setConfig({ testTimeout: 30_000 }); // the first test loads the whole content
afterAll(cleanUp);

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

// Round 173: the full pacing, so streamlined mode is off unless a test's storage says otherwise.
const fullPacing = () => memoryStorage({ 'parallang.display': JSON.stringify({ streamlined: false }) });

async function onTheRoad({ storage = fullPacing(), server = createRoadServer() } = {}) {
  const store = createGameStore({ api: server.api, storage, dungeon: DUNGEON, atlas: ATLAS });
  const s = () => store.getState();
  await s().initialize();
  s().enter();
  await s().enterRoad();
  return { store, s, storage, server };
}

// Answers the conversation under way so that it resolves, and waits for the road to be read again.
async function finish({ s, server }) {
  expect(s().roadPhase).toBe('encounter');
  await s().sendMessage(server.fullAnswer(s().learnerId));
  expect(s().encounter.state).toBe('resolved');
  await vi.waitFor(() => expect(s().road.current).toBe(null));
}

test('from the world map onto the road: the first lesson waits at the start with a described character', async () => {
  const { s } = await onTheRoad();
  expect([s().mode, s().roadPhase, s().roadLoading, s().roadError]).toEqual(['road', 'hub', false, null]);
  expect(s().road.at).toBe('0,0');
  expect(s().road.current.kind).toBe('lesson');
  expect(s().road.current.character.description.length).toBeGreaterThan(40);
  expect(s().road.frontier.filter((site) => site.recommended)).toHaveLength(1);
  expect(s().curriculum.position.unitId).toBe('greetings');
  expect(s().roadArrival).toBe('arrive');
  // The camera's arrival opens nothing by itself: the player talks when they like.
  s().onRoadArrived();
  expect(s().roadPhase).toBe('hub');
});

test('a conversation, then on rails: the next site is the pacing\'s, and its conversation opens when the camera is there', async () => {
  const ctx = await onTheRoad();
  const { s, server } = ctx;
  s().onRoadArrived();
  await s().roadTalk();
  expect(s().roadPhase).toBe('encounter');
  expect(s().encounter.road.kind).toBe('lesson');
  expect(s().encounter.character.role).toBeTruthy();
  await finish(ctx);
  expect(s().roadResult).toEqual({ kind: 'lesson', title: 'Saying hello', score: 1 });
  expect(s().road.step).toBe(1);
  expect(s().curriculum.totals.lessonsDone).toBe(1);
  expect(s().xpGained).toBeGreaterThan(0);

  const rails = s().road.rails;
  const from = s().road.at;
  const moving = s().roadContinue();
  await vi.waitFor(() => expect(s().roadPhase).toBe('travel'));
  expect([s().roadFrom, s().road.at, s().roadArrival, s().roadArrived]).toEqual([from, rails, 'travel', false]);
  await moving;
  // The conversation is loaded while the camera is still on its way: the caption stays until it arrives.
  expect(s().encounter.road.node).toBe(rails);
  expect(s().roadPhase).toBe('travel');
  s().onRoadArrived();
  expect(s().roadPhase).toBe('encounter');
  await finish(ctx);
  expect(s().road.step).toBe(2);
  expect(server.provider.calls.some((call) => /teaching_note/.test(call.messages.at(-1).content))).toBe(true);
});

test('off the rails: any site ahead may be walked to, and it holds what the map said', async () => {
  const ctx = await onTheRoad();
  const { s } = ctx;
  s().onRoadArrived();
  await s().roadTalk();
  await finish(ctx);
  await s().roadContinue(); s().onRoadArrived();
  await finish(ctx);
  const other = s().road.frontier.find((site) => !site.recommended);
  expect(other).toBeTruthy();
  await s().roadTravel('500,500'); // not a site ahead: nothing happens
  expect(s().roadPhase).toBe('encounter');
  await s().roadTravel(other.id);
  s().onRoadArrived();
  expect(s().road.at).toBe(other.id);
  expect(s().encounter.road.kind).toBe(other.offer.kind);
  expect(s().encounter.character.name).toBe(other.offer.character.name);
});

test('a conversation left for the hub is taken up again; walking on leaves it; the world map is a way out', async () => {
  const { s } = await onTheRoad();
  s().onRoadArrived();
  await s().roadTalk();
  const held = s().encounter.id;
  s().leaveRoadConversation();
  expect(s().roadPhase).toBe('hub');
  await s().roadTalk();
  expect([s().roadPhase, s().encounter.id]).toEqual(['encounter', held]);
  s().leaveRoadConversation();
  const target = s().road.frontier[0].id;
  await s().roadTravel(target);
  s().onRoadArrived();
  expect(s().road.at).toBe(target);
  expect(s().road.step).toBe(0);
  expect(s().encounter.id).not.toBe(held);
  s().leaveRoadConversation();
  s().leaveRoad();
  expect([s().mode, s().phase, s().encounter]).toEqual(['dungeon', 'world', null]);
  // Back on the road, the player is where they were.
  await s().enterRoad();
  expect(s().road.at).toBe(target);
});

test('the browser keeps a copy of the save and puts it back on a server that lost it', async () => {
  const storage = memoryStorage();
  const ctx = await onTheRoad({ storage });
  const { s } = ctx;
  s().onRoadArrived();
  await s().roadTalk();
  await finish(ctx);
  await vi.waitFor(() => expect(storage.values.has(BACKUP_KEY)).toBe(true));
  const copy = JSON.parse(storage.values.get(BACKUP_KEY));
  expect(copy.save.learnerId).toBe(s().learnerId);
  expect(copy.save.road.step).toBe(1);
  expect(s().savedAt).toBe(copy.exportedAt);
  const learnerId = s().learnerId;
  const before = { at: s().road.at, step: s().road.step, totals: s().curriculum.totals, seed: s().road.seed };

  // A page load against a server with an empty disk (a redeploy on the free plan).
  const fresh = await onTheRoad({ storage, server: createRoadServer({ seed: 777 }) });
  expect(fresh.s().learnerId).toBe(learnerId);
  expect(fresh.s().error).toBe(RUN_RESTORED);
  expect({ at: fresh.s().road.at, step: fresh.s().road.step, totals: fresh.s().curriculum.totals, seed: fresh.s().road.seed }).toEqual(before);

  // The server restarts under an open page: the next request finds no learner, and the page recovers by itself.
  const lost = createRoadServer({ seed: 888 });
  const page = await onTheRoad({ storage, server: createRoadServer() });
  Object.assign(page.server.api, lost.api);
  await page.s().roadTravel(page.s().road.frontier[0].id);
  await vi.waitFor(() => expect(page.s().error).toBe(RUN_RESTORED));
  await vi.waitFor(() => expect(page.s().mode).toBe('road'));
  await vi.waitFor(() => expect(page.s().road?.step).toBe(1));
  expect(page.s().road.seed).toBe(before.seed);
});

test('a copy can be taken as a file and loaded on another device', async () => {
  const ctx = await onTheRoad();
  const { s } = ctx;
  s().onRoadArrived();
  await s().roadTalk();
  await finish(ctx);
  const text = await s().exportCopy();
  expect(JSON.parse(text).save.road.step).toBe(1);
  // Another browser, another server.
  const other = await onTheRoad({ server: createRoadServer({ seed: 5 }) });
  expect(other.s().road.step).toBe(0);
  expect(await other.s().importCopy('not a save')).toBe(false);
  expect(await other.s().importCopy(text)).toBe(true);
  await vi.waitFor(() => expect(other.s().road?.step).toBe(1));
  expect(other.s().learnerId).toBe(s().learnerId);
});

// Round 148: the slider in Settings. By default a character speaks the language only and the line being answered
// comes with its translation; lower, the lines are mixed and the translation is a hint again.
test('by default the lines are in full Italian with their translation; the slider changes the next line', async () => {
  const world = await onTheRoad();
  const { s, server } = world;
  const narrations = () => server.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');
  const line = () => s().encounter.transcript.filter((message) => message.role === 'npc').at(-1);
  expect(s().display.immersion).toBe(1);
  await s().roadTalk();
  expect(narrations().at(-1).messages[0].content).toMatch(/Dialogue is entirely in Italian/);
  expect(typeof line().dialogue.translation).toBe('string');
  expect(server.service.encounters.get(s().learnerId).immersion).toBe(1);

  // Down to 40 %: stored at once, and the answer carries it, so the reply is mixed and its translation is a hint.
  s().setImmersion(0.4);
  expect(JSON.parse(world.storage.values.get('parallang.display')).immersion).toBe(0.4);
  await s().sendMessage('Boh.');
  expect(s().encounter.state).toBe('ongoing');
  expect(narrations().at(-1).messages[0].content).toMatch(/about 40% of the words in each dialogue line are Italian/);
  expect(line().dialogue.translation).toBeUndefined();

  // Back to all of it, and Start over: the new greeting is in Italian only.
  s().setImmersion(1);
  await s().restartRoadConversation();
  expect(narrations().at(-1).messages[0].content).toMatch(/Dialogue is entirely in Italian/);
  expect(typeof line().dialogue.translation).toBe('string');
});

// Round 161 (issue #9): the map's "Show Journey so far".
test('the journey: turned on, the whole walk is read from the server; walked on and opened again, it is read again', async () => {
  const game = await onTheRoad();
  const { s } = game;
  expect([s().journeyShown, s().journey]).toEqual([false, null]);
  expect(s().road.hops).toBe(0);
  await s().toggleJourney();
  expect(s().journeyShown).toBe(true);
  expect(s().journey).toEqual({ seed: 4242, nodes: ['0,0'], hops: 0, kept: 1 });
  await s().roadTalk();
  await finish(game);
  const next = s().road.rails;
  await s().roadContinue();
  expect(s().road.hops).toBe(1);
  s().openRoadPanel('map');
  await vi.waitFor(() => expect(s().journey.nodes).toEqual(['0,0', next]));
  expect(s().journey.hops).toBe(1);
  await s().toggleJourney();
  expect(s().journeyShown).toBe(false);
  expect(s().journey.nodes).toHaveLength(2); // kept for the next time it is shown
});

// Round 163 (issue #13): the narrator's remark on a journey of a hundred walks.
test('the journey shown: no remark for a short one; the server\'s remark is kept beside a long one and the guidebook hears of it', async () => {
  const game = await onTheRoad();
  const { s, server } = game;
  await s().toggleJourney();
  expect(s().journeyRemark).toBe(null);
  await s().toggleJourney();
  // A hundred walks on, made on the server (a walk needs no finished conversation).
  for (let n = 0; n < 100; n += 1) {
    const view = await server.api.getRoad(s().learnerId);
    await server.api.moveRoad(s().learnerId, { nodeId: view.road.rails ?? view.road.frontier[0].id, leave: true });
  }
  await s().refreshRoad();
  expect(s().road.hops).toBe(100);
  await s().toggleJourney();
  expect(s().journey.hops).toBe(100);
  expect(s().journeyRemark.id).toBe('journey_random_walk');
  expect(s().guideNote.unread.map((entry) => entry.id)).toContain('the_long_way_round');
});


// Round 173: streamlined mode is on unless switched off: one conversation a unit, and the next is the next unit.
test('streamlined by default: each unit is one conversation, and switching it off in Settings gives the lessons back', async () => {
  const ctx = await onTheRoad({ storage: memoryStorage() });
  const { s } = ctx;
  expect(s().display.streamlined).toBe(true);
  expect([s().road.streamlined, s().road.current.kind, s().road.current.unitId]).toEqual([true, 'unit', 'greetings']);
  await s().roadTalk();
  await finish(ctx);
  expect(s().curriculum.position.unitId).toBe('origins');
  expect(s().road.frontier.every((site) => site.offer.kind === 'unit' && site.offer.unitId === 'origins')).toBe(true);
  await s().roadContinue();
  await vi.waitFor(() => expect(s().encounter?.road?.unitId).toBe('origins'));
  await s().setStreamlined(false);
  expect(JSON.parse(ctx.storage.values.get('parallang.display')).streamlined).toBe(false);
  expect([s().road.streamlined, s().road.current.kind]).toEqual([false, 'lesson']);
});
