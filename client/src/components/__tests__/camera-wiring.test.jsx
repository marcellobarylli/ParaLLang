// Round 116: the gameplay and the camera, wired through the real screen and store with the three.js host replaced
// by a recorder. The screen must send the level view each phase with its site, open the dialogue only when the
// camera reports its arrival, and pass every verdict and the resolve on to it.
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen from '../DungeonScreen.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON } from '../../dungeon.js';

const level = vi.hoisted(() => ({ views: [] }));
vi.mock('../../scene/levelView.js', () => ({
  createLevelView: (canvas, options) => {
    const view = {
      canvas, options, calls: [], disposed: false,
      setPhase: (value) => view.calls.push(['phase', value]),
      setEncounter: (value) => view.calls.push(['encounter', value]),
      setInsets: () => {}, setLabels: (labels) => { view.labels = labels; },
      dispose: () => { view.disposed = true; },
    };
    level.views.push(view);
    return view;
  },
}));

const SITE_IDS = DUNGEON.sites.map((site) => site.encounterId);
const NAMES = ['Portia', 'Gerald', 'Bambieshart'];
const response = (data) => ({ ok: true, status: 200, json: async () => data });
const memoryStorage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; };

// Each site has two objectives: a first answer closes one (or none, if it says "wrong"), a second resolves the site.
function fakeServer() {
  const server = { cleared: 0, session: null, sessions: 0 };
  const view = () => ({
    dungeon: { id: DUNGEON.id, name: DUNGEON.name, level: DUNGEON.level, route: DUNGEON.route, sites: DUNGEON.sites.map((site, index) => ({ ...site, characterName: NAMES[index] })) },
    progress: { run: 1, clearedEncounterIds: SITE_IDS.slice(0, server.cleared), nextSiteIndex: server.cleared < 3 ? server.cleared : null, nextEncounterId: SITE_IDS[server.cleared] ?? null, complete: server.cleared >= 3 },
  });
  const encounter = () => {
    const { index, version, closed } = server.session;
    const resolved = closed >= 2;
    return {
      id: `encounter-${server.sessions}`, encounterId: SITE_IDS[index], dungeonId: DUNGEON.id, version, state: resolved ? 'resolved' : 'ongoing',
      committedPlayerTurns: version - 1, difficulty: 0.25, hints_available: true, hints: { used: 0, remaining: 2, limit: 2 },
      character: { name: NAMES[index] }, resolvedMessage: `${NAMES[index]} steps aside.`, companionBriefing: null,
      currentObjective: resolved ? null : { id: `objective-${closed}`, prompt: `Objective ${closed + 1} for ${NAMES[index]}.` },
      transcript: [{ id: 'npc-1', role: 'npc', narrative: 'A pause.', protected: !resolved, dialogue: { speaker: NAMES[index], native: 'Allora?', words: [], ...(resolved ? { translation: 'Well?' } : {}) } }],
    };
  };
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const path = String(url);
    const body = init.body ? JSON.parse(init.body) : {};
    if (path === '/api/learner') return response({ learnerId: '11111111-1111-4111-8111-111111111111', recovered: false, language: { code: 'it', name: 'Italian', tag: 'it-IT' } });
    if (path === '/api/dungeons/ta_prohm') return response(view());
    if (path === '/api/encounter/start') {
      server.sessions += 1;
      server.session = { index: server.cleared, version: 1, closed: 0 };
      return response({ encounter: encounter(), spellbook: { cards: [], dueCount: 0, inEncounter: true } });
    }
    if (path === '/api/encounter/dialogue') {
      const passed = !body.message.includes('wrong');
      server.session.version += 1;
      if (passed) server.session.closed += 1;
      if (server.session.closed >= 2) server.cleared = server.session.index + 1;
      return response({ encounter: encounter(), spellbook: { cards: [], dueCount: 0 }, assessment: { overallFeedback: passed ? 'Yes.' : 'Not yet.', objectiveResults: [{ objectiveId: 'objective', passed, feedback: passed ? 'Closed.' : 'Try again.' }] } });
    }
    throw new Error(`Unexpected fetch ${path}`);
  }));
  return server;
}

beforeEach(() => {
  level.views.length = 0;
  window.WebGLRenderingContext = function WebGLRenderingContext() {}; // the screen takes the 3D path
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window.WebGLRenderingContext; });

const phases = (view) => view.calls.filter(([kind]) => kind === 'phase').map(([, value]) => `${value.phase}:${value.siteIndex}:${value.walkFrom}`);
const lastEncounter = (view) => view.calls.findLast(([kind]) => kind === 'encounter')?.[1];

test('the screen drives the camera through a whole run, and the camera gates the dialogue', async () => {
  const user = userEvent.setup();
  fakeServer();
  const store = createGameStore({ dungeon: DUNGEON, storage: memoryStorage() });
  render(<DungeonScreen useStore={store} />);
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  const arrive = (mode) => act(() => view.options.onArrive(mode));
  const answer = async (text) => {
    await user.type(screen.getByLabelText('Your response'), text);
    await user.click(screen.getByRole('button', { name: 'Send' }));
  };
  expect(view.options.dungeon.id).toBe('ta_prohm');
  await waitFor(() => expect(phases(view)).toEqual(['attract:0:null']));
  await waitFor(() => expect(view.labels.filter(Boolean).length).toBe(3)); // the site labels the view places

  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(phases(view).at(-1)).toBe('overview:0:null');
  arrive('overview'); // an arrival outside a move opens nothing
  expect(screen.queryByLabelText('Your response')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('approach:0:null'));
  // The encounter has loaded, but the camera is still coming down: a caption, no dialogue.
  await waitFor(() => expect(store.getState().encounter?.encounterId).toBe(SITE_IDS[0]));
  expect(screen.getByRole('status').textContent).toBe('Approaching The Face Gate…');
  expect(screen.queryByLabelText('Your response')).toBeNull();
  expect(lastEncounter(view)).toBeUndefined();
  arrive('approach');
  expect(await screen.findByLabelText('Conversation with Portia')).toBeTruthy();
  expect(phases(view).at(-1)).toBe('encounter:0:null');
  expect(lastEncounter(view)).toEqual({ closed: 0, resolved: false, beatId: null, beatKind: null });

  // Each verdict reaches the camera: a miss, a closed objective, the resolve.
  await answer('wrong');
  await waitFor(() => expect(lastEncounter(view)).toEqual({ closed: 0, resolved: false, beatId: 1, beatKind: 'fail' }));
  await answer('Ciao!');
  await waitFor(() => expect(lastEncounter(view)).toEqual({ closed: 1, resolved: false, beatId: 2, beatKind: 'pass' }));
  await answer('Sono Sam.');
  await waitFor(() => expect(lastEncounter(view)).toEqual({ closed: 2, resolved: true, beatId: 3, beatKind: 'resolved' }));
  expect(phases(view).at(-1)).toBe('encounter:0:null'); // the walk waits for the player

  // The walk: the camera sets off, the dialogue closes, and it opens again only on arrival.
  await user.click(screen.getByRole('button', { name: 'Walk on to The Root Court' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('walk:1:0'));
  await waitFor(() => expect(store.getState().encounter?.encounterId).toBe(SITE_IDS[1]));
  expect(screen.getByRole('status').textContent).toBe('Walking to The Root Court…');
  expect(screen.queryByLabelText('Your response')).toBeNull();
  arrive('walk');
  expect(await screen.findByLabelText('Conversation with Gerald')).toBeTruthy();
  expect(lastEncounter(view)).toEqual({ closed: 0, resolved: false, beatId: 3, beatKind: 'resolved' }); // a new site starts unshaped; the old verdict is not replayed
  await answer('Un caffè.');
  await answer('Senza latte.');
  await waitFor(() => expect(lastEncounter(view)).toMatchObject({ closed: 2, resolved: true, beatId: 5 }));
  await user.click(screen.getByRole('button', { name: 'Walk on to Before the Sanctuary' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('walk:2:1'));
  arrive('walk');
  await screen.findByLabelText('Conversation with Bambieshart');
  await answer('Grazie.');
  await answer('La montagna?');
  await user.click(await screen.findByRole('button', { name: 'Leave the temple' }));
  expect(await screen.findByRole('heading', { name: 'Dungeon cleared' })).toBeTruthy();

  expect(phases(view)).toEqual([
    'attract:0:null', 'overview:0:null', 'approach:0:null', 'encounter:0:null',
    'walk:1:0', 'encounter:1:0', 'walk:2:1', 'encounter:2:1', 'victory:2:1',
  ]);
  expect(view.disposed).toBe(false);
  cleanup();
  expect(view.disposed).toBe(true);
});

test('the camera arriving before the encounter has loaded waits for it', async () => {
  const user = userEvent.setup();
  fakeServer();
  const real = globalThis.fetch;
  let release;
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    if (String(url) === '/api/encounter/start') await new Promise((resolve) => { release = resolve; });
    return real(url, init);
  }));
  const store = createGameStore({ dungeon: DUNGEON, storage: memoryStorage() });
  render(<DungeonScreen useStore={store} />);
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('approach:0:null'));
  act(() => view.options.onArrive('approach'));
  expect((await screen.findByRole('status')).textContent).toBe('Portia is getting ready to talk…');
  expect(screen.queryByLabelText('Your response')).toBeNull();
  await act(async () => release());
  expect(await screen.findByLabelText('Conversation with Portia')).toBeTruthy();
});
