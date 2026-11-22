// Round 133: a second open place on the world map. The store holds every bundled dungeon and plays one at a time:
// entering another place switches the dungeon, reads its run and remembers the place. The fake server keeps one run
// per dungeon by the server's own rules (server/src/dungeon.js) over the real files.
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen from '../DungeonScreen.jsx';
import { PLACE_KEY, createGameStore } from '../../stores/gameStore.js';
import { DUNGEON, DUNGEONS, KILN } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import taProhmFile from '../../../../content/world/dungeons/ta_prohm.yaml';
import kilnFile from '../../../../content/world/dungeons/the_kiln.yaml';
import { cleared, isComplete, moved, readRun, siteStates } from '../../../../server/src/dungeon.js';

const FILES = { ta_prohm: taProhmFile, the_kiln: kilnFile };
const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language: { code: 'it', name: 'Italian', tag: 'it-IT' } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };

function memoryStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

// `runs` holds each dungeon's run as a save would. Level 21, so no level seal is in the way.
function fakeServer(stored = {}, overrides = {}) {
  const runs = Object.fromEntries(Object.entries(FILES).map(([id, file]) => [id, readRun(file, stored[id])]));
  const view = (id) => {
    const file = FILES[id];
    const run = runs[id];
    const sites = siteStates(file, run, 21);
    return {
      dungeon: { id, name: file.name, level: file.level, start: file.start, goal: file.goal, sites: file.sites.map((site) => ({ id: site.id, encounterId: site.encounter, name: site.name, at: site.at, characterName: sites[site.id].state === 'hidden' ? null : 'Portia', saveable: false })), paths: file.paths },
      progress: { run: run.run, at: run.at, complete: isComplete(file, run), clearedSiteIds: run.cleared, visitedSiteIds: run.visited, sites },
      progression: { xp: 5000, level: 21, levelStartsAt: 4800, nextLevelAt: 5460 },
    };
  };
  const api = {
    createLearner: vi.fn(async () => identity),
    getDungeon: vi.fn(async (_learnerId, id) => view(id)),
    moveDungeon: vi.fn(async (_learnerId, id, { siteId }) => { runs[id] = moved(FILES[id], runs[id], siteId); return view(id); }),
    startEncounter: vi.fn(async (_learnerId, { dungeonId }) => {
      const site = FILES[dungeonId].sites.find((entry) => entry.id === runs[dungeonId].at);
      return { encounter: { id: `enc-${dungeonId}`, encounterId: site.encounter, siteId: site.id, dungeonId, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 }, character: { name: 'Portia' } }, spellbook };
    }),
    getParty: vi.fn(async () => ({ party: [] })),
    ...overrides,
  };
  return { api, runs, view };
}

const clearedRun = (file, siteIds) => siteIds.reduce((run, id) => cleared(file, moved(file, run, id), id), readRun(file));
const makeStore = (server, storage = memoryStorage(), extra = {}) => {
  const store = createGameStore({ api: server.api, storage, dungeon: DUNGEON, dungeons: DUNGEONS, atlas: ATLAS, ...extra });
  return { store, storage, s: () => store.getState() };
};
const settle = () => new Promise((resolve) => { setTimeout(resolve, 0); });

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('entering The Kiln switches the dungeon, reads its run, remembers the place, and leaves Ta Prohm\'s run alone', async () => {
  const server = fakeServer({ ta_prohm: clearedRun(taProhmFile, ['face_gate']) });
  const { s, storage } = makeStore(server);
  expect(s()).toMatchObject({ dungeon: { id: 'ta_prohm' }, enterable: ['ta_prohm', 'the_kiln', 'micromort_mountain'] });
  await s().initialize();
  await settle();
  // The world map's counts: Ta Prohm from its own read, The Kiln from the read beside it.
  expect(s().runs).toEqual({ ta_prohm: { cleared: 1, total: 7, complete: false }, the_kiln: { cleared: 0, total: 7, complete: false } });
  // A reload of a run with progress resumes at its site; from there, up to the map and out to the world.
  s().onCameraArrived();
  expect(s().phase).toBe('site');
  s().openMap();
  s().toWorld();
  expect(s().phase).toBe('world');

  s().enterPlace('the_kiln');
  expect(s()).toMatchObject({ phase: 'overview', dungeon: { id: 'the_kiln', name: 'The Kiln', level: 'kiln' }, progress: null, siteIndex: 0, encounter: null });
  expect(storage.values.get(PLACE_KEY)).toBe('the_kiln');
  await settle();
  expect(s().progress).toMatchObject({ run: 1, at: 'face_gate', clearedSiteIds: [] });
  expect(s().dungeon.sites[0]).toMatchObject({ name: 'The Ash Gate', characterName: 'Portia' });

  // The Kiln is played with its own id: the start and the server's run are The Kiln's.
  await s().start();
  s().onCameraArrived();
  expect(s().phase).toBe('encounter');
  expect(server.api.startEncounter).toHaveBeenLastCalledWith(identity.learnerId, { dungeonId: 'the_kiln', restart: false, immersion: 1 });
  expect(server.runs.ta_prohm.cleared).toEqual(['face_gate']);

  // Back in Ta Prohm, its run is as it was left.
  s().openMap(); // not from a conversation under way
  expect(s().phase).toBe('encounter');
});

test('a place that is entered and left again: back to Ta Prohm with its cleared site, and the choice is remembered', async () => {
  const server = fakeServer({ ta_prohm: clearedRun(taProhmFile, ['face_gate']), the_kiln: clearedRun(kilnFile, ['face_gate', 'buttress_tree']) });
  const { s, storage } = makeStore(server, memoryStorage({ [PLACE_KEY]: 'the_kiln' }));
  // A new store opens the place last entered.
  expect(s().dungeon.id).toBe('the_kiln');
  await s().initialize();
  await settle();
  expect(server.api.getDungeon.mock.calls[0][1]).toBe('the_kiln');
  expect(s().progress.clearedSiteIds).toEqual(['face_gate', 'buttress_tree']);
  expect(s().runs).toMatchObject({ ta_prohm: { cleared: 1 }, the_kiln: { cleared: 2 } });
  // It resumes in The Kiln, at the site the player stands at.
  expect(s()).toMatchObject({ phase: 'approach', siteIndex: 1 });
  s().onCameraArrived();
  s().openMap();
  s().toWorld();
  s().enterPlace('ta_prohm');
  await settle();
  expect(s()).toMatchObject({ phase: 'overview', dungeon: { id: 'ta_prohm' }, progress: { clearedSiteIds: ['face_gate'] } });
  expect(storage.values.get(PLACE_KEY)).toBe('ta_prohm');
  // A walk in Ta Prohm goes to Ta Prohm's run.
  await s().travel('buttress_tree');
  expect(server.api.moveDungeon).toHaveBeenLastCalledWith(identity.learnerId, 'ta_prohm', { siteId: 'buttress_tree' });
  expect(server.runs.the_kiln.at).toBe('buttress_tree');
});

test('a reply of the place left is dropped', async () => {
  const late = deferred();
  const server = fakeServer({ ta_prohm: clearedRun(taProhmFile, ['face_gate', 'buttress_tree']) });
  const { s } = makeStore(server);
  await s().initialize();
  await settle();
  s().onCameraArrived();
  // The map's read of Ta Prohm is still on its way when the player goes out and into The Kiln.
  const stale = server.view('ta_prohm');
  server.api.getDungeon.mockImplementationOnce(() => late.promise);
  s().openMap();
  s().toWorld();
  s().enterPlace('the_kiln');
  await settle();
  expect(s().progress.clearedSiteIds).toEqual([]);
  late.resolve(stale);
  await settle();
  expect(s()).toMatchObject({ dungeon: { id: 'the_kiln' }, progress: { clearedSiteIds: [] } });
  expect(s().dungeon.sites[0].name).toBe('The Ash Gate');
});

test('a place entered while the first read is with the server gets its own run, not the other place\'s', async () => {
  const first = deferred();
  const server = fakeServer({ ta_prohm: clearedRun(taProhmFile, ['face_gate']) });
  server.api.getDungeon.mockImplementationOnce(() => first.promise);
  const { s } = makeStore(server);
  const starting = s().initialize();
  await settle(); // the learner is known and the read of Ta Prohm is out
  expect(server.api.getDungeon).toHaveBeenCalledWith(identity.learnerId, 'ta_prohm');
  s().enter();
  s().enterPlace('the_kiln');
  first.resolve(server.view('ta_prohm'));
  await starting;
  await settle();
  expect(s()).toMatchObject({ connection: 'ready', phase: 'overview', dungeon: { id: 'the_kiln' }, progress: { clearedSiteIds: [] } });
});

test('a store that holds one dungeon cannot enter the other place, and a stored place it does not hold is ignored', async () => {
  const server = fakeServer();
  const store = createGameStore({ api: server.api, storage: memoryStorage({ [PLACE_KEY]: 'the_kiln' }), dungeon: DUNGEON, atlas: ATLAS });
  const s = () => store.getState();
  expect(s()).toMatchObject({ dungeon: { id: 'ta_prohm' }, enterable: ['ta_prohm'] });
  await s().initialize();
  s().enter();
  s().enterPlace('the_kiln');
  expect(s()).toMatchObject({ phase: 'world', dungeon: { id: 'ta_prohm' } });
  s().enterPlace('angkor_wat');
  expect(s().phase).toBe('world');
  expect(server.api.getDungeon).toHaveBeenCalledTimes(1);
});

test('the world card: two open places, each with its count and its button; The Kiln opens its own map', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ the_kiln: clearedRun(kilnFile, ['face_gate']) });
  const { store } = makeStore(server);
  render(<DungeonScreen useStore={store} />);
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(screen.getByRole('img', { name: 'A map of 5 places' })).toBeTruthy();
  const rows = () => screen.getAllByRole('listitem').filter((item) => item.closest('.place-list')).map((item) => item.textContent);
  expect(rows()[0]).toMatch(/^Ta Prohm.*0 of 7 cleared$/);
  expect(await screen.findByText('1 of 7 cleared')).toBeTruthy();
  expect(rows()[1]).toMatch(/^The Kiln.*caught fire.*1 of 7 cleared$/);
  expect(screen.getByRole('button', { name: 'Enter Ta Prohm' }).className).toContain('primary-button');
  expect(screen.getByRole('button', { name: 'Enter The Kiln' }).className).toContain('secondary-button');
  expect(screen.queryByRole('button', { name: /Enter Angkor Wat/ })).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Enter The Kiln' }));
  expect(await screen.findByRole('heading', { name: 'The Kiln' })).toBeTruthy();
  expect((await screen.findAllByText(/The Ash Gate/)).length).toBeGreaterThan(0);
  expect(await screen.findByLabelText('1 of 7 sites cleared')).toBeTruthy();
  // Out again: the marker and the main button are The Kiln's now.
  await user.click(screen.getByRole('button', { name: 'World map' }));
  expect(screen.getByRole('button', { name: 'Enter The Kiln' }).className).toContain('primary-button');
  expect(KILN.sites.length).toBe(7);
});
