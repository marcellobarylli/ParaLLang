// @vitest-environment node
// Round 133: Micromort Mountain, the minimal version. One site, Eduardo on a ledge halfway up; the summit a snowfield
// with a wine festival. The dungeon file against the level (aesthetic/src/scene/micromort.js), and the store taking
// the mountain over from Ta Prohm on the world map.
import { expect, test, vi } from 'vitest';
import { FIGURES, MICROMORT, WORLDS, micromortHeightAt } from '@parallang/aesthetic';
import { DUNGEON, DUNGEONS } from '../dungeon.js';
import { ATLAS } from '../atlas.js';
import { createGameStore } from '../stores/gameStore.js';
import { createDirector, measurePath } from '../scene/director.js';

const MOUNTAIN = DUNGEONS.find((entry) => entry.id === 'micromort_mountain');
const byId = (id) => DUNGEONS.find((entry) => entry.id === id);
const identity = { learnerId: '22222222-2222-4222-8222-222222222222', recovered: true, language: { code: 'it', name: 'Italian', tag: 'it-IT' } };

test('the bundled mountain: one site, Eduardo\'s ledge, on a level and a figure aesthetic knows', () => {
  expect(MOUNTAIN).toMatchObject({ id: 'micromort_mountain', level: 'micromort', start: 'ankle_ledge', goal: 'ankle_ledge' });
  expect(WORLDS[MOUNTAIN.level]).toBeTruthy();
  expect(MOUNTAIN.sites.map((site) => [site.id, site.encounterId, site.figure])).toEqual([['ankle_ledge', 'micromort_eduardo', 'hiker']]);
  expect(MOUNTAIN.paths).toEqual([]);
  expect(FIGURES.hiker).toBeTruthy();
  expect(MICROMORT.site).toEqual(MOUNTAIN.sites[0].at);
  expect(DUNGEONS.map((entry) => entry.id)).toContain(MOUNTAIN.id);
});

test('the ledge is halfway up and flat, with a drop beside it; the summit is a flat plateau with the festival on it', () => {
  const [x, z] = MOUNTAIN.sites[0].at;
  const here = micromortHeightAt(x, z);
  expect(here / MICROMORT.summitY).toBeGreaterThan(0.4);
  expect(here / MICROMORT.summitY).toBeLessThan(0.6);
  for (const [dx, dz] of [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [8, -6]]) expect(Math.abs(micromortHeightAt(x + dx, z + dz) - here)).toBeLessThan(0.05); // a ledge to stand on
  // The camera comes along the shelf, so the way in is level, and the ground falls away behind Eduardo (east).
  const approach = measurePath(MOUNTAIN.entrance.concat([MOUNTAIN.sites[0].at]));
  for (let s = 0; s <= approach.total; s += 4) {
    const [px, pz] = approach.pointAt(s);
    expect(Math.abs(micromortHeightAt(px, pz) - here)).toBeLessThan(3);
  }
  expect(micromortHeightAt(x + 70, z)).toBeLessThan(here - 10);
  const [fx, fz] = MICROMORT.festival;
  for (const [dx, dz] of [[0, 0], [20, 10], [-20, 10], [0, -30], [0, 30]]) expect(micromortHeightAt(fx + dx, fz + dz)).toBeGreaterThan(MICROMORT.summitY - 2);
  expect(micromortHeightAt(0, 220)).toBeLessThan(10); // the valley
});

test('the camera approaches the ledge from below, above the ground, and the overview looks at the mountainside', () => {
  const director = createDirector({ dungeon: MOUNTAIN, heightAt: micromortHeightAt, levelBox: { minX: -100, maxX: 100, minZ: -200, maxZ: 100, centreY: 50 } });
  director.attract();
  director.update(1);
  director.overview();
  const overview = director.peek(10);
  const [x, z] = MOUNTAIN.sites[0].at;
  expect(overview.position[1]).toBeGreaterThan(micromortHeightAt(x, z) + 10); // not under the slope
  expect(Math.abs(overview.target[1] - micromortHeightAt(overview.target[0], overview.target[2]))).toBeLessThan(0.01);
  director.approach(0);
  for (let t = 0; t <= 8; t += 0.25) {
    const pose = director.peek(t);
    expect(pose.position[1]).toBeGreaterThan(micromortHeightAt(pose.position[0], pose.position[2]) + 0.5);
  }
  const rest = director.peek(10);
  expect(rest.position[1] - micromortHeightAt(rest.position[0], rest.position[2])).toBeGreaterThan(1.5);
});

// A server that holds both dungeons' runs, in miniature.
function twoDungeonApi() {
  const view = (id) => {
    const dungeon = byId(id);
    const states = Object.fromEntries(dungeon.sites.map((site) => [site.id, { state: site.id === dungeon.start ? 'current' : 'hidden', cleared: false, reachable: false }]));
    return {
      dungeon: { id, name: dungeon.name, level: dungeon.level, start: dungeon.start, goal: dungeon.goal, sites: dungeon.sites.map((site) => ({ id: site.id, encounterId: site.encounterId, name: site.name, at: site.at, characterName: site.id === 'ankle_ledge' ? 'Eduardo' : 'Portia', saveable: false })), paths: [] },
      progress: { run: 1, at: dungeon.start, complete: false, clearedSiteIds: [], visitedSiteIds: [dungeon.start], sites: states },
      progression: null,
    };
  };
  return {
    createLearner: vi.fn(async () => identity),
    getDungeon: vi.fn(async (_learnerId, dungeonId) => view(dungeonId)),
    getParty: vi.fn(async () => ({ party: [] })),
    startEncounter: vi.fn(async (_learnerId, { dungeonId }) => ({
      encounter: { id: 'enc-1', encounterId: byId(dungeonId).sites[0].encounterId, siteId: byId(dungeonId).start, dungeonId, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 }, character: { name: 'Eduardo' } },
      spellbook: { cards: [], dueCount: 0, contentVersion: 'v1' },
    })),
  };
}

test('the world map opens the mountain: the store takes its dungeon over and starts at Eduardo\'s ledge', async () => {
  const api = twoDungeonApi();
  const store = createGameStore({ api, storage: { getItem: () => null, setItem: () => {} }, dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS });
  const s = () => store.getState();
  await s().initialize();
  s().enter();
  expect(s().dungeon.id).toBe('ta_prohm');
  s().enterPlace('micromort_mountain');
  expect(s()).toMatchObject({ phase: 'overview', progress: null, siteIndex: 0 });
  expect(s().dungeon.id).toBe('micromort_mountain');
  await vi.waitFor(() => expect(s().progress?.at).toBe('ankle_ledge'));
  expect(api.getDungeon).toHaveBeenLastCalledWith(identity.learnerId, 'micromort_mountain');
  expect(s().dungeon.sites[0].characterName).toBe('Eduardo');
  await s().start();
  expect(s().phase).toBe('approach');
  expect(api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, { dungeonId: 'micromort_mountain', restart: false });
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
  expect(s().encounter.encounterId).toBe('micromort_eduardo');
  // And back: the world map still offers both places.
  store.setState({ phase: 'world' });
  s().enterPlace('ta_prohm');
  expect(s().dungeon.id).toBe('ta_prohm');
  expect(s().phase).toBe('overview');
});
