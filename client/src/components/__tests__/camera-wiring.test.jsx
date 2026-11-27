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
import { openMenu, titleReady, toPlaces } from './menu.js';

const level = vi.hoisted(() => ({ views: [] }));
vi.mock('../../scene/levelView.js', () => ({
  createLevelView: (canvas, options) => {
    const view = {
      canvas, options, calls: [], disposed: false,
      setPhase: (value) => view.calls.push(['phase', value]),
      setEncounter: (value) => view.calls.push(['encounter', value]),
      setLook: (source) => view.calls.push(['look', source]),
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
    if (path === '/api/dungeons/ta_prohm/map?client=121') return response(run.view());
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
  // Round 175: the title is the road's; the dungeon's level starts when the player goes to the other places.
  await titleReady();
  expect(level.views.length).toBe(0);
  await toPlaces(user);
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  const arrive = (mode) => act(() => view.options.onArrive(mode));
  const answer = async (text) => {
    await user.type(screen.getByLabelText('Your response'), text);
    await user.click(screen.getByRole('button', { name: 'Send' }));
  };
  const shown = () => view.labels.filter((label) => label && !label.hidden).map((label) => label.textContent);
  expect(view.options.dungeon.id).toBe('ta_prohm');
  await waitFor(() => expect(phases(view)).toEqual(['world:0:null']));
  // A label per site for the view to place; the fog hides all but the gate's and the two a path leads to.
  await waitFor(() => expect(view.labels.filter(Boolean).length).toBe(7));
  expect(shown()).toEqual(['1The Face Gate', '2', '3']);
  expect(view.fog).toMatchObject({ face_gate: { state: 'current' }, root_court: { state: 'known' }, library: { state: 'hidden' } });
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
    'world:0:null', 'overview:0:null', 'approach:0:null', 'encounter:0:null',
    'walk:2:0', 'encounter:2:0', 'overview:2:0', 'walk:0:2', 'site:0:2',
  ]);

  // Round 120: a talk with a party member happens where the player stands. The view hears the phase and nothing of
  // the conversation: the real view leaves the camera alone in `party` (levelView.setPhase).
  await act(async () => { await store.getState().recruit(encounterOf('root_court')); });
  const before = view.calls.length;
  await openMenu(user, /^Party/);
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
  await titleReady();
  await toPlaces(user);
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(phases(view).at(-1)).toBe('approach:0:null'));
  act(() => view.options.onArrive('approach'));
  expect((await screen.findByRole('status')).textContent).toBe('Portia is getting ready to talk…');
  expect(screen.queryByLabelText('Your response')).toBeNull();
  await act(async () => release());
  expect(await screen.findByLabelText('Conversation with Portia')).toBeTruthy();
});

// Round 125: tilt to look. With the setting on the view gets a look source fed by the phone's orientation events;
// with it off it gets none, and switching it off takes the source away.
test('tilt to look hands the level view a source that the phone\'s orientation moves', async () => {
  fakeServer();
  const store = createGameStore({ dungeon: DUNGEON, atlas: ATLAS, storage: memoryStorage() });
  render(<DungeonScreen useStore={store} />);
  await titleReady();
  await toPlaces(userEvent.setup());
  await waitFor(() => expect(level.views.length).toBe(1));
  const view = level.views[0];
  const looks = () => view.calls.filter(([kind]) => kind === 'look').map(([, source]) => source);
  await waitFor(() => expect(phases(view)).toEqual(['world:0:null']));
  expect(looks()).toEqual([]); // off by default
  const orient = (angles, timeStamp) => { const event = new Event('deviceorientation'); Object.assign(event, angles); Object.defineProperty(event, 'timeStamp', { value: timeStamp }); window.dispatchEvent(event); };

  act(() => store.getState().setTiltLook(true));
  await waitFor(() => expect(looks().length).toBe(1));
  const source = looks()[0];
  expect(source.look).toEqual({ yaw: 0, pitch: 0 });
  orient({ alpha: 0, beta: 50, gamma: 0 }, 1000);
  orient({ alpha: 0, beta: 40, gamma: 10 }, 1016);
  expect(source.look.yaw).toBeGreaterThan(0.08); // right edge down: to the left
  expect(source.look.pitch).toBeLessThan(-0.08); // top away: down

  act(() => store.getState().setTiltLook(false));
  await waitFor(() => expect(looks()).toEqual([source, null]));
  const before = source.look;
  orient({ alpha: 0, beta: 50, gamma: -10 }, 1032);
  expect(source.look).toEqual(before); // no longer listening
});

test('where the browser wants to be asked, a visit with the setting on asks at the first click, once', async () => {
  fakeServer();
  const requestPermission = vi.fn(async () => 'granted');
  vi.stubGlobal('DeviceOrientationEvent', { requestPermission });
  const storage = memoryStorage();
  storage.setItem('parallang.display', '{"tiltLook":true}');
  const store = createGameStore({ dungeon: DUNGEON, atlas: ATLAS, storage });
  render(<DungeonScreen useStore={store} />);
  await titleReady();
  await toPlaces(userEvent.setup());
  requestPermission.mockClear(); // the menu's own clicks were the first; the visit is asked from the next
  await waitFor(() => expect(level.views.length).toBe(1));
  await waitFor(() => expect(level.views[0].calls.some(([kind]) => kind === 'look')).toBe(true));
  expect(requestPermission).not.toHaveBeenCalled(); // a page may not ask on its own
  await act(async () => { document.body.click(); });
  expect(requestPermission).toHaveBeenCalledOnce();
  await act(async () => { document.body.click(); });
  expect(requestPermission).toHaveBeenCalledOnce();
});

// Round 126: the characters are voiced and the player may speak. The speaker and the listener are fakes of
// speech.js's; the conversation is the fake server's, with later lines put into the store.
function fakeSpeech() {
  const speech = {
    spoken: [], told: [], stops: 0, heard: null,
    // Round 196: `say` and `narrate` read parts; the narrator's go to `told`, a character's lines to `spoken`.
    speaker: {
      supported: true, available: () => true, prime: () => {}, speak: (line) => { speech.spoken.push(line); }, stop: () => { speech.stops += 1; },
      say: (parts) => { for (const part of parts) { if (part.narrator) speech.told.push(part.text); else speech.spoken.push(part); } },
      narrate: (parts) => { for (const part of parts) speech.told.push(part.text); },
    },
    listener: { supported: true, start: (options) => { speech.heard = options; return true; }, stop: () => { speech.heard?.onEnd(null); } },
  };
  return speech;
}
async function openConversation(speech, storage = memoryStorage()) {
  const user = userEvent.setup();
  fakeServer();
  const store = createGameStore({ dungeon: DUNGEON, atlas: ATLAS, storage });
  render(<DungeonScreen useStore={store} speech={speech} />);
  await titleReady();
  await toPlaces(user);
  await waitFor(() => expect(level.views.length).toBe(1));
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(store.getState().encounter?.encounterId).toBe(encounterOf('face_gate')));
  // The server's encounter names the character's voice, and the pack its language.
  act(() => store.setState({ language: { code: 'it', name: 'Italian', tag: 'it-IT' }, encounter: { ...store.getState().encounter, character: { name: 'Portia', voice: { kind: 'female', pitch: 1, rate: 0.9 } } } }));
  expect(speech.spoken).toEqual([]); // the camera is still on its way: no sheet, no voice
  act(() => level.views[0].options.onArrive('approach'));
  await screen.findByLabelText('Conversation with Portia');
  return { user, store };
}
const PORTIA = { kind: 'female', pitch: 1, rate: 0.9 };

test('a character\'s line is read aloud once in its sheet\'s voice, a new line too, and the 🔊 repeats it', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  expect(speech.spoken).toEqual([{ text: 'Allora?', tag: 'it-IT', voice: PORTIA }]);
  expect(speech.told).toEqual(['A pause.']); // round 196: the narrator reads the line's narrative first
  // A translation revealed on the same line is not a new line.
  act(() => store.setState({ encounter: { ...store.getState().encounter, version: 2 } }));
  expect(speech.spoken).toHaveLength(1);
  // The player's turn and the character's reply.
  const before = store.getState().encounter;
  act(() => store.setState({ encounter: { ...before, transcript: [...before.transcript, { id: 'player-1', role: 'player', text: 'Ciao!' }, { id: 'npc-2', role: 'npc', narrative: 'A stamp falls.', protected: true, dialogue: { speaker: 'Portia', native: 'Bene. *Piacere!*', words: [] } }] } }));
  expect(speech.spoken).toHaveLength(2);
  expect(speech.spoken[1]).toEqual({ text: 'Bene. *Piacere!*', tag: 'it-IT', voice: PORTIA });
  expect(speech.told).toEqual(['A pause.', 'A stamp falls.']);
  // Each line has its own button.
  const buttons = screen.getAllByRole('button', { name: 'Hear Portia say this line' });
  expect(buttons).toHaveLength(2);
  await user.click(buttons[0]);
  expect(speech.spoken[2]).toEqual({ text: 'Allora?', tag: 'it-IT', voice: PORTIA });
});

test('sending stops the voice, and so does leaving the conversation', async () => {
  const speech = fakeSpeech();
  const { user } = await openConversation(speech);
  const stops = speech.stops;
  await user.type(screen.getByLabelText('Your response'), 'Ciao!');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(speech.stops).toBeGreaterThan(stops);
  await waitFor(() => expect(screen.getByLabelText('Your response').value).toBe(''));
  const sent = speech.stops;
  await waitFor(() => expect(screen.getByRole('button', { name: 'Leave' }).disabled).toBe(false));
  await user.click(screen.getByRole('button', { name: 'Leave' }));
  await waitFor(() => expect(screen.queryByLabelText('Your response')).toBeNull());
  expect(speech.stops).toBeGreaterThan(sent);
});

test('with voices off nothing is read on its own, the 🔊 still reads, and switching off stops the voice', async () => {
  const speech = fakeSpeech();
  const storage = memoryStorage();
  storage.setItem('parallang.display', '{"voices":false}');
  const { user, store } = await openConversation(speech, storage);
  expect(speech.spoken).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'Hear Portia say this line' }));
  expect(speech.spoken).toHaveLength(1);
  act(() => store.getState().setVoices(true));
  expect(speech.spoken).toHaveLength(2); // switched on in a conversation: the line is read
  const stops = speech.stops;
  act(() => store.getState().setVoices(false));
  expect(speech.stops).toBe(stops + 1);
});

test('the microphone writes what it hears into the reply box after what was there, stops the voice, and does not send', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  const box = screen.getByLabelText('Your response');
  await user.type(box, 'Buongiorno.');
  const stops = speech.stops;
  await user.click(screen.getByRole('button', { name: 'Speak your response in Italian' }));
  expect(speech.stops).toBe(stops + 1); // the character does not talk into the microphone
  expect(speech.heard.tag).toBe('it-IT');
  expect(box.placeholder).toBe('Listening for Italian…');
  act(() => speech.heard.onText('sono', false));
  expect(box.value).toBe('Buongiorno. sono');
  act(() => speech.heard.onText('sono Sam', true));
  expect(box.value).toBe('Buongiorno. sono Sam');
  // A second tap ends it; the text stays and nothing was sent.
  await user.click(screen.getByRole('button', { name: 'Stop listening' }));
  expect(screen.getByRole('button', { name: 'Speak your response in Italian' })).toBeTruthy();
  expect(box.value).toBe('Buongiorno. sono Sam');
  expect(store.getState().encounter.transcript).toHaveLength(1);
  expect(fetch.mock.calls.some(([url]) => String(url).includes('/api/encounter/dialogue'))).toBe(false);
});

test('a refusal to listen is said under the box with the way round it; without recognition there is no microphone', async () => {
  const speech = fakeSpeech();
  const { user } = await openConversation(speech);
  await user.click(screen.getByRole('button', { name: 'Speak your response in Italian' }));
  act(() => speech.heard.onEnd('service-not-allowed'));
  expect(screen.getByRole('button', { name: 'Speak your response in Italian' })).toBeTruthy();
  expect(screen.getByText(/will not listen here.*keyboard's microphone key/)).toBeTruthy();
  cleanup();
  level.views.length = 0;
  const deaf = fakeSpeech();
  deaf.listener.supported = false;
  await openConversation(deaf);
  expect(screen.queryByRole('button', { name: /Speak your response/ })).toBeNull();
});

// Round 188: the microphone stays on through silences; sending switches it off, and so does a browser that ends
// every stretch at once with nothing heard (it would otherwise start and end without pause).
test('the microphone stays on until tapped off, is switched off by sending, and gives up on a browser that never listens', async () => {
  const speech = fakeSpeech();
  const { user } = await openConversation(speech);
  const box = screen.getByLabelText('Your response', { selector: 'textarea' });
  await user.click(screen.getByRole('button', { name: 'Speak your response in Italian' }));
  act(() => speech.heard.onText('Buongiorno', true));
  act(() => speech.heard.onEnd(null));
  act(() => speech.heard.onText('sono Sam', true));
  expect(box.value).toBe('Buongiorno sono Sam');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect(screen.getByRole('button', { name: 'Speak your response in Italian' })).toBeTruthy();
  cleanup();
  level.views.length = 0;
  const brief = fakeSpeech();
  await openConversation(brief);
  await act(async () => { screen.getByRole('button', { name: 'Speak your response in Italian' }).click(); });
  for (let i = 0; i < 3; i += 1) act(() => brief.heard.onEnd(null));
  expect(screen.getByRole('button', { name: 'Speak your response in Italian' })).toBeTruthy();
  expect(screen.getByText(/Listening could not start/)).toBeTruthy();
});

// Round 190: "Follow the reply" in Settings (the default) brings a character's new line to the top of the panel; off,
// the panel stays where the player left it (round 140). jsdom has no layout, so the panel's scroll and the line's
// place are set.
test('by default a new line of the character comes to the top of the panel; with Follow the reply off, the panel stays', async () => {
  const speech = fakeSpeech();
  const { store } = await openConversation(speech);
  const panel = document.querySelector('.sheet-scroll');
  let top = 0;
  Object.defineProperty(panel, 'scrollTop', { configurable: true, get: () => top, set: (value) => { top = value; } });
  panel.getBoundingClientRect = () => ({ top: 100 });
  const reply = (n) => {
    const before = store.getState().encounter;
    act(() => store.setState({ encounter: { ...before, transcript: [...before.transcript, { id: `player-${n}`, role: 'player', text: 'Ciao!' }, { id: `npc-${n}`, role: 'npc', narrative: 'A stamp falls.', protected: true, dialogue: { speaker: 'Portia', native: 'Bene.', words: [] } }] } }));
  };
  let lineAt = 400; // the newest line's place in the text
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function place() { return this.classList?.contains('npc-message') ? { top: 100 + lineAt - top } : original.call(this); };
  try {
    expect(store.getState().display.follow).toBe(true);
    reply(2);
    expect(top).toBe(392); // the line's top, 8 px down from the panel's edge
    act(() => store.getState().setFollow(false));
    expect(store.getState().display.follow).toBe(false);
    lineAt = 900;
    reply(3);
    expect(top).toBe(392); // where it was, not the new line's 892
  } finally {
    Element.prototype.getBoundingClientRect = original;
  }
});

// Round 129: beginner mode on the screen. The server's verdict is put into the store as the server sends it.
const CORRECTION = { text: 'Buongiorno! Mi chiamo Luigione. Come ti chiami?', translation: 'Good morning! My name is Luigione. What is your name?', heartLost: true };
const corrected = (store, { correction = CORRECTION, used = 1 } = {}) => act(() => store.setState({
  encounter: { ...store.getState().encounter, version: store.getState().encounter.version + 1, hearts: { used, limit: 3 } },
  assessment: { overallFeedback: 'You got your meaning across.', correction, objectiveResults: [{ objectiveId: 'objective-0', passed: true, corrected: true, feedback: 'Nearly: the greeting is spelled buongiorno.' }] },
}));
const dialogueCalls = () => fetch.mock.calls.filter(([url]) => String(url).includes('/api/encounter/dialogue'));

test('beginner mode: the hearts, the corrected sentence with its heart, and a practice box that sends nothing', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  act(() => store.setState({ encounter: { ...store.getState().encounter, hearts: { used: 0, limit: 3 } } }));
  expect(screen.getByLabelText('3 of 3 hearts left').textContent).toBe('♥♥♥');
  corrected(store);
  expect(screen.getByLabelText('2 of 3 hearts left').textContent).toBe('♥♥♡');
  const card = screen.getByRole('region', { name: 'What you meant' });
  expect(card.textContent).toContain(CORRECTION.text);
  expect(card.textContent).toContain(CORRECTION.translation);
  expect(screen.getByLabelText('One heart used').textContent).toBe('−1 ♥');
  expect(screen.getByText(/✎ Nearly: the greeting is spelled buongiorno\./)).toBeTruthy();
  expect(screen.queryByText(/No hearts left/)).toBeNull();
  // Hear it.
  await user.click(screen.getByRole('button', { name: 'Hear the corrected sentence' }));
  expect(speech.spoken.at(-1)).toEqual({ text: CORRECTION.text, tag: 'it-IT' });
  // Type it wrongly, then rightly: the app answers, the server hears nothing.
  const box = screen.getByLabelText('Say it yourself');
  expect(screen.getByRole('button', { name: 'Check' }).disabled).toBe(true);
  await user.type(box, 'Buongiorno! Me chiamo Luigione. Come ti chiami?');
  await user.click(screen.getByRole('button', { name: 'Check' }));
  expect(screen.getByText(/Not quite\. Look again at:/).textContent).toContain('Mi');
  expect(screen.getByText(/you have moved on either way/)).toBeTruthy();
  await user.clear(box);
  await user.type(box, 'buongiorno mi chiamo luigione come ti chiami');
  await user.click(screen.getByRole('button', { name: 'Check' }));
  expect(screen.getByText("✓ That's it.")).toBeTruthy();
  expect(dialogueCalls()).toHaveLength(0);
  expect(store.getState().encounter.hearts.used).toBe(1);
  // The reply box for the next answer is still there.
  expect(screen.getByLabelText('Your response')).toBeTruthy();
});

test('beginner mode: the correction can be spoken, and is checked when the listening ends', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  corrected(store);
  await user.click(screen.getByRole('button', { name: 'Say the corrected sentence in Italian' }));
  expect(speech.heard.tag).toBe('it-IT');
  act(() => speech.heard.onText('buongiorno mi chiamo Luigione come ti chiami', true));
  expect(screen.getByLabelText('Say it yourself').value).toBe('buongiorno mi chiamo Luigione come ti chiami');
  act(() => speech.heard.onEnd(null));
  expect(screen.getByText("✓ That's it.")).toBeTruthy();
  expect(dialogueCalls()).toHaveLength(0);
});

test('beginner mode: with no heart left the correction says so and can be put in the reply box', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  corrected(store, { correction: { ...CORRECTION, text: 'Buongiorno!', translation: 'Good morning!', heartLost: false }, used: 3 });
  expect(screen.getByLabelText('0 of 3 hearts left').textContent).toBe('♡♡♡');
  expect(screen.queryByLabelText('One heart used')).toBeNull();
  expect(screen.getByText(/No hearts left, so this one has to be said right to move on\./)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Put it in the reply box' }));
  expect(screen.getByLabelText('Your response').value).toBe('Buongiorno!');
});

test('the answer is sent as a beginner\'s while the mode is on, and plainly when it is off; off shows no hearts', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  const body = () => JSON.parse(dialogueCalls().at(-1)[1].body);
  await user.type(screen.getByLabelText('Your response'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(dialogueCalls()).toHaveLength(1));
  expect(body().beginner).toBe(true);
  await waitFor(() => expect(screen.getByLabelText('Your response').value).toBe(''));
  act(() => store.getState().setBeginner(false));
  act(() => store.setState({ encounter: { ...store.getState().encounter, hearts: { used: 0, limit: 3 } } }));
  expect(screen.queryByLabelText(/hearts left/)).toBeNull();
  await user.type(screen.getByLabelText('Your response'), 'wrong');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(dialogueCalls()).toHaveLength(2));
  expect('beginner' in body()).toBe(false);
});

// Round 153 (issue #1): light mode. Nothing is marked: the answer goes out as `light`, and what comes back is shown as
// what was understood, with the sentence in the language under it.
test('light mode: the answer is sent as light and not as a beginner\'s; the reply shows what was understood, without hearts', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  act(() => store.getState().setLight(true));
  act(() => store.setState({ encounter: { ...store.getState().encounter, hearts: { used: 0, limit: 3 } } }));
  expect(screen.queryByLabelText(/hearts left/)).toBeNull();
  expect(screen.getByText(/Light mode: nothing is marked\./)).toBeTruthy();
  // Round 154 (issue #2): the exchange of turns, and the nudge to ask something back.
  act(() => store.setState({ encounter: { ...store.getState().encounter, exchange: { turn: 1, min: 3, max: 5 } } }));
  expect(screen.getByText(/Turn 2 of 3 to 5\. You can ask \w+ questions back\./)).toBeTruthy();
  const open = store.getState().encounter;
  act(() => store.setState({ encounter: { ...open, currentObjective: null, openObjectives: [] } }));
  expect(screen.getByText('Keep talking')).toBeTruthy();
  expect(screen.queryByText('Conversation complete')).toBeNull();
  expect(screen.getByLabelText('Your response')).toBeTruthy();
  act(() => store.setState({ encounter: open }));
  await user.type(screen.getByLabelText('Your response'), 'good morning');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(dialogueCalls()).toHaveLength(1));
  const body = JSON.parse(dialogueCalls()[0][1].body);
  expect(body.light).toBe(true);
  expect('beginner' in body).toBe(false);
  await waitFor(() => expect(screen.getByLabelText('Your response').value).toBe(''));
  act(() => store.setState({
    encounter: { ...store.getState().encounter, version: store.getState().encounter.version + 1 },
    assessment: { light: true, overallFeedback: 'Good morning!', correction: { text: 'Buongiorno!', translation: 'Good morning!', heartLost: false, light: true },
      objectiveResults: [{ objectiveId: 'objective-0', passed: true, feedback: 'Greet Portia.' }, { objectiveId: 'objective-1', passed: false, feedback: 'Say your name.' }] },
  }));
  expect(screen.getByText('Understood')).toBeTruthy();
  expect(screen.queryByText('Assessment')).toBeNull();
  const card = screen.getByRole('region', { name: 'What you meant' });
  expect(card.textContent).toContain('In Italian');
  expect(card.textContent).toContain('Buongiorno!');
  expect(screen.queryByText(/No hearts left/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Put it in the reply box' })).toBeNull();
  // Only what the answer covered is listed: nothing is marked as missing.
  expect(screen.getByText(/✓ Greet Portia\./)).toBeTruthy();
  expect(screen.queryByText(/Say your name\./)).toBeNull();
  expect(store.getState().display.light).toBe(true);
});

// Round 159 (issue #7): what a character utters once the conversation is over.
test('a finished conversation with a revelation shows the narrator\'s line and the text in turmeric, before the last word', async () => {
  const speech = fakeSpeech();
  const { store } = await openConversation(speech);
  expect(screen.queryByRole('region', { name: /^What .* utters$/ })).toBeNull();
  const revelation = { id: 'revelation_x', segments: [{ text: 'Portia utters the following: ' }, { text: 'Ogni luogo è un nodo.', kind: 'truth', lang: 'it-IT' }] };
  act(() => store.setState({ encounter: { ...store.getState().encounter, state: 'resolved', resolvedMessage: 'Portia lets you in.', currentObjective: null, openObjectives: [], revelation } }));
  const region = screen.getByRole('region', { name: /^What .* utters$/ });
  expect(region.textContent).toBe('Portia utters the following: Ogni luogo è un nodo.');
  const span = region.querySelector('.narration-truth');
  expect(span.textContent).toBe('Ogni luogo è un nodo.');
  expect(region.querySelectorAll('button')).toHaveLength(0);
  // It stands before the conversation's last word.
  const last = screen.getByText('Portia lets you in.');
  expect(region.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

// Round 129 (amendment): the browser listens in one language at a time, so the microphone can be switched between
// the target language and English; each stretch of speech is added to the box.
test('the microphone listens in Italian or in English by a switch, and adds each stretch to the reply box', async () => {
  const speech = fakeSpeech();
  const { user } = await openConversation(speech);
  const box = screen.getByLabelText('Your response', { selector: 'textarea' });
  const toggle = screen.getByRole('button', { name: 'Listening in Italian. Switch to English' });
  expect(toggle.textContent).toBe('IT');
  await user.click(screen.getByRole('button', { name: 'Speak your response in Italian' }));
  expect(speech.heard.tag).toBe('it-IT');
  expect(toggle.disabled).toBe(false); // round 188: the language switches while it listens
  act(() => speech.heard.onText('Buongiorno', true));
  // Round 188: a silence ends the browser's stretch, and the microphone starts the next one itself.
  const first = speech.heard;
  act(() => first.onEnd(null));
  expect(speech.heard).not.toBe(first);
  expect(speech.heard.tag).toBe('it-IT');
  expect(screen.getByRole('button', { name: 'Stop listening' })).toBeTruthy();
  // The switch ends the stretch in Italian and the next one is in English, with the microphone still on.
  await user.click(toggle);
  expect(screen.getByRole('button', { name: 'Listening in English. Switch to Italian' }).textContent).toBe('EN');
  expect(speech.heard.tag).toBe('en-US');
  expect(screen.getByRole('button', { name: 'Stop listening' })).toBeTruthy();
  expect(box.placeholder).toBe('Listening for English…');
  act(() => speech.heard.onText('my name is Luigione', true));
  await user.click(screen.getByRole('button', { name: 'Stop listening' }));
  expect(screen.getByRole('button', { name: 'Speak your response in English' })).toBeTruthy();
  expect(box.value).toBe('Buongiorno my name is Luigione');
});

// The owner's screenshot of 2026-11-19: the hosted server had restarted (a deploy; the free plan wipes its saves) and
// the first answer at Mortimer's site came back "Unknown learner ID. Create a learner identity first.", with the
// dead conversation left on the screen. The page now says what happened and starts a new run.
test('a server that has forgotten the learner: the page says so, drops the dead conversation and starts a new run', async () => {
  const speech = fakeSpeech();
  const { user, store } = await openConversation(speech);
  const before = store.getState().learnerId;
  const served = fetch.getMockImplementation();
  let learners = 0;
  fetch.mockImplementation(async (url, init) => {
    if (String(url).includes('/api/encounter/dialogue')) return { ok: false, status: 400, json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Unknown learner ID. Create a learner identity first.' } }) };
    if (String(url).endsWith('/api/learner')) learners += 1;
    return served(url, init);
  });
  await user.type(screen.getByLabelText('Your response', { selector: 'textarea' }), 'Io quiero un vegetable');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  // The reason, in the banner; no conversation; the temple map of a new run.
  expect(await screen.findByText('The server was restarted and lost your run with it. A new run has started.')).toBeTruthy();
  expect(screen.queryByText(/Unknown learner ID/)).toBeNull();
  await waitFor(() => expect(screen.queryByLabelText('Your response', { selector: 'textarea' })).toBeNull());
  await waitFor(() => expect(store.getState().connection).toBe('ready'));
  const state = store.getState();
  expect(learners).toBe(1); // the learner was created again
  expect(state.learnerId).toBeTruthy();
  expect(before).toBeTruthy();
  expect([state.phase, state.encounter, state.assessment, state.isLoading, state.draft]).toEqual(['overview', null, null, false, '']);
  expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  // The banner can be closed, and the new run plays.
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await waitFor(() => expect(store.getState().encounter?.encounterId).toBe(encounterOf('face_gate')));
  expect(store.getState().error).toBeNull();
});

// Round 131: a turn asks for a paragraph. The card lists every open objective, and the reply box takes several lines.
test('the objective card lists every open objective with its advice; one alone reads as before', async () => {
  const speech = fakeSpeech();
  const { store } = await openConversation(speech);
  expect(screen.getByText('Current objective')).toBeTruthy(); // a server that sends no list
  const open = [{ id: 'greet', prompt: 'Greet Portia in Italian.' }, { id: 'introduce', prompt: 'Tell Portia who you are, in Italian.' }, { id: 'ask_back', prompt: 'Ask Portia who she is in return, in Italian.' }];
  act(() => store.setState({ encounter: { ...store.getState().encounter, currentObjective: open[0], openObjectives: open } }));
  expect(screen.getByText('In your answer')).toBeTruthy();
  expect([...document.querySelectorAll('.objective-list li')].map((item) => item.textContent)).toEqual(open.map((objective) => objective.prompt));
  expect(screen.getByText('Answer in a few sentences, and do as many of these as you can in one go.')).toBeTruthy();
  expect(screen.queryByText('Current objective')).toBeNull();
  act(() => store.setState({ encounter: { ...store.getState().encounter, currentObjective: open[2], openObjectives: [open[2]] } }));
  expect(screen.getByText('Current objective')).toBeTruthy();
  expect(screen.getByText(open[2].prompt)).toBeTruthy();
  expect(screen.queryByText('In your answer')).toBeNull();
});

test('the reply box takes a paragraph: several lines, Shift+Enter for a new line, Enter to send', async () => {
  const speech = fakeSpeech();
  const { user } = await openConversation(speech);
  const box = screen.getByLabelText('Your response', { selector: 'textarea' });
  expect(box.tagName).toBe('TEXTAREA');
  expect(box.placeholder).toBe('Answer Portia in a few sentences…');
  await user.type(box, 'Buongiorno, Portia!{Shift>}{Enter}{/Shift}Io sono Sam.');
  expect(box.value).toBe('Buongiorno, Portia!\nIo sono Sam.');
  expect(dialogueCalls()).toHaveLength(0);
  await user.type(box, '{Enter}');
  await waitFor(() => expect(dialogueCalls()).toHaveLength(1));
  expect(JSON.parse(dialogueCalls()[0][1].body).message).toBe('Buongiorno, Portia!\nIo sono Sam.');
});
