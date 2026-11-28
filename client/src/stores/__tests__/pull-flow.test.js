// @vitest-environment node
// Round 213 (issue #23): the pull in the store, against the real server logic (src/__tests__/roadServer.js). The
// developer's jump to the gate that ends A1; the walk there and its conversation; the way on, which leads to the
// world event instead of walking; the event watched, and the land that is the pulled one from then on.
import { afterAll, expect, test, vi } from 'vitest';
import { createGameStore } from '../gameStore.js';
import { TITLE_KEY, titleOf } from '../roadSlice.js';
import { DUNGEON } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { cleanUp, createRoadServer } from '../../__tests__/roadServer.js';
import { PULL } from '../../../../server/src/road/pulls.js';

vi.setConfig({ testTimeout: 30_000 });
afterAll(cleanUp);

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries({ 'parallang.display': '{"strict":true,"breathing":false}', ...entries })); // streamlined, as it is by default
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

async function onTheRoad({ storage = memoryStorage(), server = createRoadServer() } = {}) {
  const store = createGameStore({ api: server.api, storage, dungeon: DUNGEON, atlas: ATLAS });
  const s = () => store.getState();
  await s().initialize();
  s().enter();
  await s().enterRoad();
  s().onRoadArrived();
  return { store, s, storage, server };
}

async function finish({ s, server }) {
  expect(s().roadPhase).toBe('encounter');
  await s().sendMessage(server.fullAnswer(s().learnerId));
  expect(s().encounter.state).toBe('resolved');
  await vi.waitFor(() => expect(s().road.current).toBe(null));
}

// From the start of a road to the end of the gate that closes A1: the jump, the walk, the conversation.
async function throughTheGate(ctx) {
  const { s, server } = ctx;
  const units = server.content.curriculum.units;
  expect(await s().devJump({ unitId: units[11].id, gate: true })).toBe(true);
  expect([s().road.current, s().roadPhase, s().road.gate.hops]).toEqual([null, 'hub', 0]);
  await s().roadContinue();
  expect(s().road.here.dungeon).toBeTruthy();
  s().onRoadArrived();
  await finish(ctx);
}

test('the developer\'s jump puts the player down at a unit, on the road or before it is opened', async () => {
  const ctx = await onTheRoad();
  const { s, server } = ctx;
  const units = server.content.curriculum.units;
  await s().roadTalk();
  expect(s().roadPhase).toBe('encounter');
  const shown = s().roadShown;
  expect(await s().devJump({ unitId: units[14].id })).toBe(true);
  // The conversation that was on the screen is gone; the unit's own waits at the same site.
  expect([s().roadPhase, s().encounter, s().devJumping, s().roadArrival]).toEqual(['hub', null, false, 'stand']);
  expect(s().roadShown).toBe(shown + 1);
  expect([s().curriculum.position.unitId, s().curriculum.position.cefr, s().road.current.unitId]).toEqual([units[14].id, 'A2', units[14].id]);
  expect(s().road.event).toBe(null);
  await s().roadTalk();
  expect(s().encounter.road.unitId ?? s().road.current.unitId).toBe(units[14].id);
  expect(await s().devJump({ unitId: 'no_such_unit' })).toBe(false);
  expect(s().roadError).toMatch(/The jump failed/);
  // From the title, before the road is entered: the road is read with the jump.
  const fresh = createGameStore({ api: createRoadServer().api, storage: memoryStorage(), dungeon: DUNGEON, atlas: ATLAS });
  await fresh.getState().initialize();
  expect(await fresh.getState().devJump({ unitId: units[3].id })).toBe(true);
  expect([fresh.getState().mode, fresh.getState().curriculum.position.unitId]).toEqual(['dungeon', units[3].id]);
});

test('the gate that ends A1 pulls the land: the way on leads to the event, and the land is the pulled one once it is watched', async () => {
  const ctx = await onTheRoad();
  const { s, storage } = ctx;
  const start = s().road.at;
  await throughTheGate(ctx);
  const gateSite = s().road.at;
  expect(s().roadResult.worldEvent).toEqual({ kind: 'pull', number: 1, from: 'A1', to: 'A2' });
  // Round 215: the pull takes the sites whose conversation was finished: the gate's. The start was only stood at.
  expect(s().road.event).toMatchObject({ kind: 'pull', number: 1, pull: { depth: PULL.depth, sites: [gateSite], from: 'A1', to: 'A2' } });
  expect([s().road.pulled, s().titlePulled, s().roadEventOpen]).toEqual([[], [], false]);
  // Continue does not walk: it opens the event, with the journey it draws.
  await s().roadContinue();
  expect([s().roadEventOpen, s().roadEventLoading, s().road.at, s().roadPhase]).toEqual([true, false, gateSite, 'encounter']);
  expect(s().roadEventWalk).toEqual([start, gateSite]);
  // The map's "Walk here" leads there too, and a second call changes nothing.
  await s().roadTravel(s().road.frontier[0].id);
  await s().playRoadEvent();
  expect([s().roadEventOpen, s().road.at]).toEqual([true, gateSite]);
  // Watched to the end.
  const shown = s().roadShown;
  await s().endRoadEvent();
  expect([s().roadEventOpen, s().roadEventWalk, s().roadPhase, s().encounter, s().roadError, s().roadArrival]).toEqual([false, null, 'hub', null, null, 'stand']);
  expect(s().roadShown).toBe(shown + 1);
  expect(s().road.event).toBe(null);
  expect(s().road.pulled.map((pull) => pull.sites)).toEqual([[gateSite]]);
  expect(s().titlePulled).toEqual(s().road.pulled);
  // The title of the next visit shows the pulled land.
  expect(titleOf(storage).pulled).toEqual(s().road.pulled);
  expect(JSON.parse(storage.values.get(TITLE_KEY)).seed).toBe(s().road.seed);
  // And now the way on walks.
  await s().endRoadEvent();
  await s().roadContinue();
  expect([s().roadPhase, s().road.at === gateSite, s().roadEventOpen]).toEqual(['travel', false, false]);
});

test('an event not watched is still owed after a reload, and one the server could not be told of plays again', async () => {
  const server = createRoadServer();
  const storage = memoryStorage();
  const ctx = await onTheRoad({ storage, server });
  await throughTheGate(ctx);
  // Another page on the same save: the road still owes the event, and its land is not pulled.
  const again = await onTheRoad({ storage, server });
  expect(again.s().road.event.number).toBe(1);
  expect(again.s().road.pulled).toEqual([]);
  await again.s().roadContinue();
  expect(again.s().roadEventOpen).toBe(true);
  // The server cannot be reached when the event ends.
  const seeRoadEvent = server.api.seeRoadEvent;
  server.api.seeRoadEvent = async () => { throw new Error('offline'); };
  await again.s().endRoadEvent();
  expect([again.s().roadEventOpen, again.s().road.event.number, again.s().roadPhase]).toEqual([false, 1, 'hub']);
  expect(again.s().roadError).toMatch(/could not be told/);
  server.api.seeRoadEvent = seeRoadEvent;
  await again.s().roadContinue();
  expect(again.s().roadEventOpen).toBe(true);
  // Without the journey (an older server), the event still opens: it draws the pull's own sites.
  again.s().leaveRoad();
  expect(again.s().roadEventOpen).toBe(false);
  server.api.getRoadWalk = async () => { throw new Error('no such route'); };
  again.s().enter();
  await again.s().enterRoad();
  await again.s().playRoadEvent();
  expect([again.s().roadEventOpen, again.s().roadEventWalk]).toEqual([true, null]);
  await again.s().endRoadEvent();
  expect(again.s().road.pulled).toHaveLength(1);
});
