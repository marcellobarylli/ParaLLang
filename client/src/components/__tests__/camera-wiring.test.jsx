// Round 116: the gameplay and the camera, wired through the real screen and store with the three.js host replaced
// by a recorder. The screen must send the level view each phase with its site, open the dialogue only when the
// camera reports its arrival, and pass every verdict and the resolve on to it.
// Round 119: the dungeon is a map. The view also gets the fog, a walk in either direction, and the site card's phase.
import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen from '../DungeonScreen.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { NAMES, createFakeParty, createFakeRun } from '../../__tests__/fakeRun.js';

const level = vi.hoisted(() => ({ views: [] }));
vi.mock('../../scene/levelView.js', () => ({
  createLevelView: (canvas, options) => {
    const view = {
      canvas, options, calls: [], disposed: false,
      setPhase: (value) => view.calls.push(['phase', value]),
      setEncounter: (value) => view.calls.push(['encounter', value]),
      setInsets: () => {}, setLabels: (labels) => { view.labels = labels; }, setProgress: (sites) => { view.fog = sites; },
      dispose: () => { view.disposed = true; },
    };
    level.views.push(view);
    return view;
  },
}));

const response = (data) => ({ ok: true, status: 200, json: async () => data });
const memoryStorage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; };
const index = (siteId) => DUNGEON.sites.findIndex((site) => site.id === siteId);
const encounterOf = (siteId) => DUNGEON.sites[index(siteId)].encounterId;

// Each site has two objectives: a first answer closes one (or none, if it says "wrong"), a second resolves the site.
function fakeServer() {
  const run = createFakeRun();
  const party = createFakeParty(run);
  const server = { run, party, session: null, sessions: 0 };
  const encounter = () => {
    const { siteId, version, closed } = server.session;
    const resolved = closed >= 2;
    const name = NAMES[siteId];
    return {
      id: `encounter-${server.sessions}`, encounterId: encounterOf(siteId), dungeonId: DUNGEON.id, siteId, version, state: resolved ? 'resolved' : 'ongoing',
      committedPlayerTurns: version - 1, difficulty: 0.25, hints_available: true, hints: { used: 0, remaining: 2, limit: 2 },
      character: { name }, resolvedMessage: `${name} steps aside.`, companionBriefing: null,
      currentObjective: resolved ? null : { id: `objective-${closed}`, prompt: `Objective ${closed + 1} for ${name}.` },
      transcript: [{ id: 'npc-1', role: 'npc', narrative: 'A pause.', protected: !resolved, dialogue: { speaker: name, native: 'Allora?', words: [], ...(resolved ? { translation: 'Well?' } : {}) } }],
    };
  };
  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const path = String(url);
    const body = init.body ? JSON.parse(init.body) : {};
    if (path === '/api/learner') return response({ learnerId: '11111111-1111-4111-8111-111111111111', recovered: false, language: { code: 'it', name: 'Italian', tag: 'it-IT' } });
    if (path === '/api/dungeons/ta_prohm/map') return response(run.view());
    // Round 120: the party, and a member's conversation (one objective).
    if (path === '/api/party') return response({ party: party.party });
    if (path === '/api/party/recruit') return response(party.recruit(body.encounterId));
    if (path === '/api/encounter/start' && !body.dungeonId) {
      server.sessions += 1;
      server.session = { siteId: party.memberOf(body.encounterId).siteId, version: 1, closed: 1, talk: body.encounterId };
      return response({ encounter: { ...encounter(), encounterId: body.encounterId, partyConversation: true, dungeonId: undefined, siteId: undefined }, spellbook: { cards: [], dueCount: 0, inEncounter: true } });
    }
    if (path === '/api/dungeons/ta_prohm/move') { server.session = null; return response(run.move(body.siteId)); }
    if (path === '/api/encounter/start') {
      server.sessions += 1;
      server.session = { siteId: run.run.at, version: 1, closed: 0 };
      return response({ encounter: encounter(), spellbook: { cards: [], dueCount: 0, inEncounter: true } });
    }
    if (path === '/api/encounter/dialogue') {
      const passed = !body.message.includes('wrong');
      server.session.version += 1;
      if (passed) server.session.closed += 1;
      if (server.session.closed >= 2) run.clear(server.session.siteId);
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

test('the screen drives the camera over the map, and the camera gates the dialogue', async () => {
  const user = userEvent.setup();
  fakeServer();
  const store = createGameStore({ dungeon: DUNGEON, atlas: ATLAS, storage: memoryStorage() });
  render(<DungeonScreen useStore={store} />);
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  const arrive = (mode) => act(() => view.options.onArrive(mode));
  const answer = async (text) => {
    await user.type(screen.getByLabelText('Your response'), text);
    await user.click(screen.getByRole('button', { name: 'Send' }));
  };
  const shown = () => view.labels.filter((label) => label && !label.hidden).map((label) => label.textContent);
  expect(view.options.dungeon.id).toBe('ta_prohm');
  await waitFor(() => expect(phases(view)).toEqual(['attract:0:null']));
  // A label per site for the view to place; the fog hides all but the gate's and the two a path leads to.
  await waitFor(() => expect(view.labels.filter(Boolean).length).toBe(7));
  expect(shown()).toEqual(['1The Face Gate', '2', '3']);

  await screen.findByText(/answer in Italian/);
  expect(view.fog).toMatchObject({ face_gate: { state: 'current' }, root_court: { state: 'known' }, library: { state: 'hidden' } });
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(phases(view).at(-1)).toBe('world:0:null');
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  expect(phases(view).at(-1)).toBe('overview:0:null');
  arrive('overview'); // an arrival outside a move opens nothing
  expect(screen.queryByLabelText('Your response')).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('approach:0:null'));
  // The encounter has loaded, but the camera is still coming down: a caption, no dialogue.
  await waitFor(() => expect(store.getState().encounter?.encounterId).toBe(encounterOf('face_gate')));
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

  // The walk the player picks: the camera sets off, the dialogue closes, and it opens again only on arrival.
  await user.click(await screen.findByRole('button', { name: /Walk to The Root Court/ }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('walk:2:0'));
  await waitFor(() => expect(store.getState().encounter?.encounterId).toBe(encounterOf('root_court')));
  expect(screen.getByRole('status').textContent).toBe('Walking to The Root Court…');
  expect(screen.queryByLabelText('Your response')).toBeNull();
  // The fog has moved with the player: the court's neighbours are known now.
  expect(view.fog).toMatchObject({ root_court: { state: 'current' }, sunlit_court: { state: 'known' }, before_sanctuary: { state: 'known' }, library: { state: 'hidden' } });
  arrive('walk');
  expect(await screen.findByLabelText('Conversation with Gerald')).toBeTruthy();
  expect(lastEncounter(view)).toEqual({ closed: 0, resolved: false, beatId: 3, beatKind: 'resolved' }); // a new site starts unshaped; the old verdict is not replayed
  await answer('Un caffè.');
  await answer('Senza latte.');
  await waitFor(() => expect(lastEncounter(view)).toMatchObject({ closed: 2, resolved: true, beatId: 5 }));

  // Up to the map and back down a path the other way, to a cleared site: its card, and no conversation.
  await user.click(screen.getByRole('button', { name: 'Map' }));
  expect(phases(view).at(-1)).toBe('overview:2:0');
  expect(shown()).toEqual(['1', '2', '3The Root Court', '4', '6']);
  await user.click(screen.getByRole('button', { name: 'Walk to The Face Gate' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('walk:0:2'));
  expect(screen.getByRole('status').textContent).toBe('Walking to The Face Gate…');
  const conversations = view.calls.filter(([kind]) => kind === 'encounter').length;
  arrive('walk');
  expect(await screen.findByRole('button', { name: 'Talk to Portia again' })).toBeTruthy();
  expect(phases(view).at(-1)).toBe('site:0:2');
  expect(view.calls.filter(([kind]) => kind === 'encounter').length).toBe(conversations); // the card does not shape the camera

  expect(phases(view)).toEqual([
    'attract:0:null', 'world:0:null', 'overview:0:null', 'approach:0:null', 'encounter:0:null',
    'walk:2:0', 'encounter:2:0', 'overview:2:0', 'walk:0:2', 'site:0:2',
  ]);

  // Round 120: a talk with a party member happens where the player stands. The view hears the phase and nothing of
  // the conversation: the real view leaves the camera alone in `party` (levelView.setPhase).
  await act(async () => { await store.getState().recruit(encounterOf('root_court')); });
  const before = view.calls.length;
  await user.click(screen.getByRole('button', { name: /^Party/ }));
  await user.click(await screen.findByRole('button', { name: 'Talk to Gerald' }));
  expect(await screen.findByRole('region', { name: 'Gerald, your party' })).toBeTruthy();
  await answer('Con calma.');
  await user.click(await screen.findByRole('button', { name: 'Back to the temple' }));
  expect(await screen.findByRole('button', { name: 'Talk to Portia again' })).toBeTruthy();
  expect(view.calls.slice(before).map(([kind, value]) => (kind === 'phase' ? `${value.phase}:${value.siteIndex}` : kind))).toEqual(['party:0', 'site:0']);
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
  const store = createGameStore({ dungeon: DUNGEON, atlas: ATLAS, storage: memoryStorage() });
  render(<DungeonScreen useStore={store} />);
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('approach:0:null'));
  act(() => view.options.onArrive('approach'));
  expect((await screen.findByRole('status')).textContent).toBe('Portia is getting ready to talk…');
  expect(screen.queryByLabelText('Your response')).toBeNull();
  await act(async () => release());
  expect(await screen.findByLabelText('Conversation with Portia')).toBeTruthy();
});
