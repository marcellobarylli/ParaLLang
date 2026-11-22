// Round 115: the dungeon screen through its real components, in jsdom (no WebGL: the still backdrop stands in and
// the camera arrives at once). The Spellbook and pronunciation checks below are the old single-encounter screen's.
// Round 119: the dungeon is a map under a world map. The fake server keeps its run by the server's own rules.
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen, { FOG_LEGEND } from '../DungeonScreen.jsx';
import DialoguePanel from '../DialoguePanel.jsx';
import PronounceButton from '../PronounceButton.jsx';
import Spellbook from '../Spellbook.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { createFakeParty, createFakeRun } from '../../__tests__/fakeRun.js';

const spanishLanguage = { code: 'es', name: 'Spanish', tag: 'es-ES' };
const italianLanguage = { code: 'it', name: 'Italian', tag: 'it-IT' };
const word = (id, target, meaning) => ({ vocabularyId: id, target, canonicalTarget: target, partOfSpeech: id === 'cafe' ? 'noun' : 'prepositional_phrase', ...(meaning ? { meaning } : {}), meaningAvailable: true });
const npc = (version, { translated = false, cafeMeaning = false, allVisible = false } = {}) => ({
  id: 'message-1', role: 'npc', narrative: 'A tiny barista glares over an espresso cup.', protected: !allVisible,
  dialogue: {
    speaker: 'Gerald', native: '¿Quieres un café? Sin leche is civilized.', translationAvailable: true,
    ...(translated || allVisible ? { translation: 'Do you want a coffee? Without milk is civilized.' } : {}),
    words: [word('cafe', 'café', cafeMeaning || allVisible ? 'coffee' : null), word('sin_leche', 'sin leche', allVisible ? 'without milk' : null)],
  },
});
const encounter = (version = 1, options = {}) => ({
  id: 'encounter-1', version, state: options.resolved ? 'resolved' : 'ongoing', encounter_state: options.resolved ? 'resolved' : 'ongoing',
  committedPlayerTurns: options.resolved ? 1 : 0, difficulty: options.resolved ? .3 : .25,
  must_translate: !options.resolved, hints_available: !options.exhausted,
  hints: { used: options.exhausted ? 2 : version - 1, remaining: options.exhausted ? 0 : 3 - version, limit: 2 },
  currentObjective: options.resolved ? null : { id: 'order_coffee', prompt: 'Order a coffee using Spanish.' },
  transcript: [npc(version, options), ...(options.resolved ? [{ id: 'player-1', role: 'player', text: 'Un café sin leche.' }] : [])],
});
const cards = [
  { vocabularyId: 'cafe', kind: 'word', target: 'café', meanings: ['coffee'], partOfSpeech: 'noun', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
  { vocabularyId: 'sin_leche', kind: 'phrase', target: 'sin leche', meanings: ['without milk', 'no milk'], partOfSpeech: 'prepositional_phrase', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
];
const spellbook = { cards, dueCount: 2, contentVersion: 'gerald-coffee-v1' };
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });


const learnerId = '11111111-1111-4111-8111-111111111111';
const CAST = {
  face_gate: { name: 'Portia', objective: 'Greet Portia in Italian.', resolved: 'Portia sighs with relief, unlocks herself and lets you into the market.', briefing: ['Portia only lets in people who greet her properly.'] },
  buttress_tree: { name: 'Mortimer', objective: 'Order some ham in Italian.', resolved: null, briefing: null },
  root_court: { name: 'Gerald', objective: 'Order a coffee using Italian.', resolved: null, briefing: null },
  sunlit_court: { name: 'Flick', objective: 'Ask Flick the time.', resolved: null, briefing: null },
  library: { name: 'Marginalia', objective: 'Ask Marginalia for a book.', resolved: null, briefing: null },
  before_sanctuary: { name: 'Bambieshart', objective: 'Thank Bambieshart.', resolved: 'Bambieshart bows and steps aside.', briefing: null },
  sanctuary: { name: 'Errata', objective: 'Answer Errata.', resolved: 'Errata reads herself out of existence.', briefing: null },
};
const memoryStorage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; };

// The server in miniature, behind fetch: a run on the map (after `steps` visits of fakeRun's TOUR, or as `stored`),
// one conversation at a time.
function fakeServer({ steps = 0, stored, xp, failFirstSend = false, failFirstStart = false } = {}) {
  const run = createFakeRun(stored, xp === undefined ? {} : { xp }).advance(steps);
  const party = createFakeParty(run);
  const server = { run, party, session: null, sessions: 0, sends: 0, starts: 0, reviews: 0, paths: [], moves: [] };
  const siteEncounter = (siteId, version, options = {}) => ({
    ...encounter(version, options), id: `encounter-${server.sessions}`, encounterId: run.view().dungeon.sites.find((site) => site.id === siteId).encounterId, dungeonId: DUNGEON.id, siteId,
    character: { id: CAST[siteId].name.toLowerCase(), name: CAST[siteId].name, saveable: ['buttress_tree', 'root_court', 'sunlit_court', 'library'].includes(siteId) }, resolvedMessage: CAST[siteId].resolved, companionBriefing: CAST[siteId].briefing,
    currentObjective: options.resolved ? null : { id: 'objective', prompt: CAST[siteId].objective },
  });
  // A party member's conversation: no site, no dungeon.
  const talkEncounter = (session) => ({
    ...encounter(session.resolved ? 4 : 1, { resolved: session.resolved, allVisible: session.resolved }), id: `encounter-${server.sessions}`, encounterId: session.talk, partyConversation: true,
    character: { id: CAST[session.siteId].name.toLowerCase(), name: CAST[session.siteId].name, saveable: true }, resolvedMessage: null, companionBriefing: null,
    currentObjective: session.resolved ? null : { id: 'objective', prompt: `Chat with ${CAST[session.siteId].name}.` },
  });
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url);
    const body = init.body ? JSON.parse(init.body) : {};
    server.paths.push(path);
    if (path === '/api/learner') return response(201, { learnerId, recovered: false, language: italianLanguage });
    if (path === '/api/dungeons/ta_prohm/map?client=121') return response(200, run.view());
    if (path === '/api/dungeons/ta_prohm/reset') { expect(body.client).toBe(121); server.session = null; return response(200, run.reset()); }
    if (path === '/api/dungeons/ta_prohm/move') {
      expect(body.client).toBe(121);
      delete body.client;
      server.moves.push(body);
      // As the server: a conversation under way holds the player unless the move says `leave` (review 1, R1.6).
      if (server.session && !server.session.talk && !server.session.resolved && body.siteId !== run.run.at && body.leave !== true) {
        return response(409, { error: { code: 'CONVERSATION_UNDER_WAY', message: 'Finish your conversation first.' } });
      }
      try {
        const from = run.run.at;
        const moved = run.move(body.siteId);
        if (body.siteId !== from && !server.session?.talk) server.session = null;
        return response(200, moved);
      } catch (error) { return response(error.status, { error: { code: error.code, message: error.message } }); }
    }
    // Round 120: the party, and a member's conversation (a named start with no dungeon).
    if (path === '/api/party') return response(200, { party: party.party });
    if (path === '/api/party/recruit') {
      try { return response(200, party.recruit(body.encounterId)); }
      catch (error) { return response(error.status, { error: { code: error.code, message: error.message } }); }
    }
    if (path === '/api/encounter/start' && !body.dungeonId) {
      const member = party.memberOf(body.encounterId);
      if (!member) return response(409, { error: { code: 'NOT_IN_PARTY', message: 'They are not in your party yet.' } });
      if (server.session && !server.session.resolved && server.session.talk !== body.encounterId && !body.restart) {
        return response(409, { error: { code: 'CONVERSATION_UNDER_WAY', message: `Finish your conversation with ${CAST[server.session.siteId].name} first.` } });
      }
      if (!(server.session && !server.session.resolved && server.session.talk === body.encounterId && !body.restart)) {
        server.sessions += 1;
        server.talks = (server.talks ?? 0) + 1;
        server.session = { siteId: member.siteId, version: 1, resolved: false, talk: body.encounterId };
      }
      return response(200, { encounter: talkEncounter(server.session), spellbook: { ...spellbook, inEncounter: true } });
    }
    if (path === '/api/encounter/start') {
      server.starts += 1;
      if (failFirstStart && server.starts === 1) return response(503, { error: { code: 'CLI_TIMEOUT', message: 'The selected CLI timed out. Your progress was not changed.', retryable: true } });
      expect(body.dungeonId).toBe('ta_prohm');
      expect(body.client).toBe(121); // round 121: a dungeon call names the client's contract
      if (server.session?.talk && !server.session.resolved && !body.restart) return response(409, { error: { code: 'CONVERSATION_UNDER_WAY', message: 'Finish your conversation first.' } });
      server.sessions += 1;
      server.session = { siteId: run.run.at, version: 1, resolved: false };
      return response(200, { encounter: siteEncounter(run.run.at, 1), spellbook: { ...spellbook, inEncounter: true } });
    }
    if (path === '/api/encounter/help') {
      const options = body.kind === 'word' ? { cafeMeaning: true } : { cafeMeaning: true, translated: true, exhausted: true };
      server.session.version = body.kind === 'word' ? 2 : 3;
      return response(200, { reveal: { kind: body.kind }, charged: true, encounter: siteEncounter(server.session.siteId, server.session.version, options), spellbook });
    }
    if (path === '/api/encounter/dialogue') {
      server.sends += 1;
      if (failFirstSend && server.sends === 1) return response(503, { error: { message: 'Grading is temporarily unavailable; retry your answer.', retryable: true } });
      const { siteId } = server.session;
      server.session.resolved = true;
      if (server.session.talk) {
        party.finished(server.session.talk);
        return response(200, { encounter: talkEncounter(server.session), spellbook, assessment: { overallFeedback: `${CAST[siteId].name} enjoyed that.`, objectiveResults: [] }, xpGained: 45, progression: run.earn(45) });
      }
      run.clear(siteId);
      return response(200, {
        encounter: siteEncounter(siteId, 4, { resolved: true, allVisible: true }), spellbook,
        assessment: { overallFeedback: `Your answer to ${CAST[siteId].name} passed.`, objectiveResults: [{ objectiveId: 'objective', passed: true, feedback: 'Well said.' }] },
        xpGained: 35, progression: run.earn(35), // round 121: one objective and the resolve
      });
    }
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/spellbook/review') {
      server.reviews += 1;
      const target = server.reviews === 1 ? cards[0] : cards[1];
      return response(200, { challenge: { id: `challenge-${server.reviews}`, vocabularyId: target.vocabularyId, target: target.target, kind: target.kind, practice: false }, spellbook });
    }
    if (path === '/api/spellbook/review/submit') {
      const revealed = body.action === 'reveal';
      return response(200, {
        result: { correct: !revealed, feedback: revealed ? 'Answer revealed; this recall attempt was recorded as quality 0.' : 'Correct.', effectiveQuality: revealed ? 0 : 5, canonicalAnswer: revealed ? 'without milk' : 'coffee', nextReviewAt: '2026-01-16T12:00:00Z', scheduleChanged: true },
        spellbook: { ...spellbook, dueCount: revealed ? 0 : 1 },
        xpGained: revealed ? 0 : 5, progression: run.earn(revealed ? 0 : 5),
      });
    }
    throw new Error(`Unexpected fetch ${path}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return server;
}

function renderScreen(options = {}) {
  const store = createGameStore({ dungeon: DUNGEON, atlas: ATLAS, storage: memoryStorage(), ...options });
  render(<DungeonScreen useStore={store} />);
  return store;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const siteRows = () => screen.getAllByRole('listitem').filter((item) => item.closest('.site-list')).map((item) => item.textContent);
const ways = () => within(screen.getByRole('list', { name: 'Ways on' })).getAllByRole('button').map((button) => [button.textContent, button.disabled]);
// Answers the conversation that is open and waits for the verdict.
async function answer(user, name, text = 'Ecco.') {
  await user.type(screen.getByLabelText('Your response'), text);
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText(`Your answer to ${name} passed.`);
}

test('a whole run on the screen: title, world map, temple map, seven conversations by a walk the player picks, victory, reviews, a new run', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ failFirstSend: true });
  renderScreen();

  // Attract: the title and Enter. The level is a still backdrop here (no WebGL in jsdom).
  expect(screen.getByRole('heading', { name: 'ParaLLang' })).toBeTruthy();
  await screen.findByText(/answer in Italian/); // the language arrives with the learner
  expect(screen.getByText(/^7 stand between you and the sanctuary/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Enter' }));

  // The world map: Ta Prohm is open, its neighbours are known, The Bone Dome is under the fog. (Round 133: The Kiln
  // is a neighbour. This store holds Ta Prohm alone, so The Kiln has no count and no button here; place-switch.test.jsx
  // plays both.)
  expect(screen.getByRole('region', { name: 'The world map' })).toBeTruthy();
  expect(screen.getByRole('img', { name: 'A map of 5 places' })).toBeTruthy();
  expect(siteRows().map((row) => row.split(/(?<=[a-z])(?=[A-Z])/)[0])).toEqual(['Ta Prohm', 'The Kiln', 'Angkor Wat', 'Micromort Mountain', 'The Long Way Home']);
  expect(screen.queryByRole('button', { name: 'Enter The Kiln' })).toBeNull();
  expect(screen.getByText('The causeway is under review. Nobody will say by whom.')).toBeTruthy();
  expect(screen.getByText('0 of 7 cleared')).toBeTruthy();
  expect(screen.queryByText(/Bone Dome/)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));

  // The temple map: the gate and the two sites a path leads to. The rest is under the fog.
  expect(screen.getByRole('heading', { name: 'Ta Prohm' })).toBeTruthy();
  expect(siteRows()).toEqual(['1The Face GatePortia · you are here', '2The Buttress TreeunexploredWalk here', '3The Root CourtunexploredWalk here']);
  expect(screen.getByLabelText('0 of 7 sites cleared')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /^Walk/ })).toHaveLength(2); // round 143: out of the fog, so open before Portia is answered
  expect(screen.getByText(FOG_LEGEND)).toBeTruthy(); // round 124: the map says what its dark patches are
  await user.click(screen.getByRole('button', { name: 'World map' }));
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));

  // The Face Gate: Portia's tutorial, with the companion's briefing.
  await screen.findByText('Greet Portia in Italian.');
  expect(screen.getByLabelText('Conversation with Portia')).toBeTruthy();
  expect(screen.getByLabelText("Your companion's briefing").textContent).toContain('Portia only lets in people who greet her properly.');
  expect(screen.getByText(/Italian target: 25%/)).toBeTruthy();
  expect(screen.queryByText('Do you want a coffee? Without milk is civilized.')).toBeNull();

  // Help is paid from the hint allowance, never given by hover or touch.
  const native = screen.getByText('¿Quieres un café? Sin leche is civilized.');
  fireEvent.mouseEnter(native);
  fireEvent.touchStart(native);
  expect(server.paths.filter((path) => path === '/api/encounter/help')).toEqual([]);
  await user.click(screen.getByRole('button', { name: 'Translate word: café' }));
  await screen.findByText(/Hints: 1\/2/);
  await user.click(screen.getByRole('button', { name: 'Translate sentence' }));
  // Matched sentences are split into coloured spans (round 142), so the line is read as one paragraph.
  await waitFor(() => expect(document.querySelector('p.translation')?.textContent).toBe('Do you want a coffee? Without milk is civilized.'));
  expect(screen.getByText(/Hints: 0\/2/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Translate word: sin leche' }).disabled).toBe(true);

  // A failed send keeps the answer.
  const input = screen.getByLabelText('Your response');
  expect(input.placeholder).toBe('Answer Portia in a few sentences…');
  await user.type(input, 'Ciao, Portia!');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/Grading is temporarily unavailable/);
  expect(input.value).toBe('Ciao, Portia!');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText('Your answer to Portia passed.');
  expect(screen.getByText(/Portia sighs with relief/)).toBeTruthy();
  expect(screen.queryByLabelText('Your response')).toBeNull();
  expect(screen.getByLabelText('1 of 7 sites cleared')).toBeTruthy();

  // The ways on: the player picks. Both lead to places not yet seen.
  await waitFor(() => expect(ways()).toEqual([['Walk to The Buttress Tree · unexplored', false], ['Walk to The Root Court · unexplored', false]]));
  await user.click(screen.getByRole('button', { name: /Walk to The Root Court/ }));
  await screen.findByText('Order a coffee using Italian.');
  expect(screen.getByLabelText('Conversation with Gerald')).toBeTruthy();
  expect(screen.queryByLabelText("Your companion's briefing")).toBeNull();
  expect(screen.queryByRole('list', { name: 'Ways on' })).toBeNull(); // no pick while the conversation is open
  await answer(user, 'Gerald', 'Un caffè senza latte.');
  expect(screen.getByText('Gerald lets you pass.')).toBeTruthy(); // no authored message: a plain one
  await waitFor(() => expect(ways().map(([text]) => text)).toEqual(['Walk to The Face Gate · cleared', 'Walk to The Buttress Tree · unexplored', 'Walk to The Sunlit Court · unexplored', 'Walk to Before the Sanctuary · unexplored']));

  // Up to the map: more of the temple is out of the fog, and a walk can be picked there too.
  await user.click(screen.getByRole('button', { name: 'Map' }));
  expect(siteRows()).toEqual([
    '1The Face GatePortia · clearedWalk here', '2The Buttress TreeunexploredWalk here', '3The Root CourtGerald · you are here · cleared',
    '4The Sunlit CourtunexploredWalk here', '6Before the SanctuaryunexploredWalk here',
  ]);
  await user.click(screen.getByRole('button', { name: 'Walk to The Buttress Tree' }));
  await screen.findByText('Order some ham in Italian.');

  // Mortimer is too much for now: the player leaves, and his card says what that costs.
  await user.click(screen.getByRole('button', { name: 'Leave' }));
  const card = screen.getByRole('region', { name: 'The Buttress Tree' });
  expect(within(card).getByText('Mortimer has not let you pass yet')).toBeTruthy();
  expect(ways()).toEqual([['Walk to The Face Gate · cleared', false], ['Walk to The Root Court · cleared', false], ['Walk to The Sunlit Court · unexplored', false], ['Walk to Before the Sanctuary · unexplored', false]]); // every site out of the fog is open (round 143)
  // He walks back to the gate: the move says it leaves the conversation (review 1, R1.6), and the server drops it.
  await user.click(screen.getByRole('button', { name: /Walk to The Face Gate/ }));
  expect(await screen.findByRole('button', { name: 'Talk to Portia again' })).toBeTruthy();
  expect(server.moves.at(-1)).toEqual({ siteId: 'face_gate', leave: true });
  await user.click(screen.getByRole('button', { name: /Walk to The Buttress Tree/ }));
  await screen.findByText('Order some ham in Italian.');
  expect(server.starts).toBe(4); // Mortimer starts again from his first line
  await user.click(screen.getByRole('button', { name: 'Leave' }));
  await user.click(screen.getByRole('button', { name: 'Back to the conversation' }));
  expect(screen.getByLabelText('Conversation with Mortimer')).toBeTruthy();
  expect(server.starts).toBe(4); // the same conversation, not a new one
  await answer(user, 'Mortimer');

  // Back through Gerald's court, which is cleared: its card, and Gerald will talk again.
  await user.click(await screen.findByRole('button', { name: /Walk to The Root Court/ }));
  expect(await screen.findByRole('button', { name: 'Talk to Gerald again' })).toBeTruthy();
  expect(server.starts).toBe(4);
  await user.click(screen.getByRole('button', { name: /Walk to The Sunlit Court/ }));
  await screen.findByText('Ask Flick the time.');
  await answer(user, 'Flick');
  await user.click(await screen.findByRole('button', { name: /Walk to The Library/ }));
  await screen.findByText('Ask Marginalia for a book.');
  await answer(user, 'Marginalia');
  await user.click(await screen.findByRole('button', { name: /Walk to The Sunlit Court/ }));
  await user.click(await screen.findByRole('button', { name: /Walk to Before the Sanctuary/ }));
  await screen.findByText('Thank Bambieshart.');
  expect(screen.getByLabelText('5 of 7 sites cleared')).toBeTruthy();
  await answer(user, 'Bambieshart', 'Grazie!');
  await screen.findByText(/Bambieshart bows/);

  // The six are cleared: the Sanctuary's seal is off.
  await user.click(await screen.findByRole('button', { name: /Walk to The Sanctuary/ }));
  await screen.findByText('Answer Errata.');
  await answer(user, 'Errata');
  expect(screen.queryByRole('list', { name: 'Ways on' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Leave the temple' }));

  // Victory, and the reviews that waited during the conversations.
  expect(await screen.findByRole('heading', { name: 'Dungeon cleared' })).toBeTruthy();
  expect(screen.getByLabelText('7 of 7 sites cleared')).toBeTruthy();
  expect(screen.getByText(/^All 7 let you pass/)).toBeTruthy();
  await user.click(screen.getAllByRole('button', { name: /Spellbook/ })[0]);
  expect(await screen.findByRole('heading', { name: 'Spellbook' })).toBeTruthy();
  expect(screen.getByText('2 due for review')).toBeTruthy();
  await user.click(screen.getAllByRole('button', { name: 'Review' })[0]);
  await screen.findByRole('heading', { name: 'café' });
  await user.type(screen.getByLabelText('English meaning'), 'coffee');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByText('Correct.');
  await user.click(screen.getByRole('button', { name: 'Continue reviews' }));
  await screen.findByRole('heading', { name: 'sin leche' });
  expect(screen.getByLabelText('English meaning').value).toBe(''); // the previous answer does not carry over
  await user.click(screen.getByRole('button', { name: 'Show answer' }));
  await screen.findByText(/recorded as quality 0/);
  expect(screen.getByText('Answer:').parentElement.textContent).toContain('without milk');
  await user.click(screen.getByRole('button', { name: 'Back to the temple' }));
  expect(screen.queryByRole('heading', { name: 'Review feedback' })).toBeNull();

  // The finished run stays open (critique 1.3), and a new run starts from the world map with the fog back.
  await user.click(screen.getByRole('button', { name: 'Stay in the temple' }));
  expect(siteRows().length).toBe(7);
  expect(screen.queryByText(FOG_LEGEND)).toBeNull(); // no site is hidden, so there is no patch to explain
  await user.click(screen.getByRole('button', { name: 'Go down to The Sanctuary' }));
  await user.click(await screen.findByRole('button', { name: 'Talk to Errata again' }));
  await screen.findByText('Answer Errata.');
  expect(server.moves.filter((move) => move.leave !== undefined)).toEqual([{ siteId: 'face_gate', leave: true }]); // only the walk out of a conversation
});

test('Play again starts a new run from the world map, with the fog back', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ steps: 8 });
  renderScreen();
  // A reload of a finished run opens the victory screen, with both ways out of it.
  expect(await screen.findByRole('heading', { name: 'Dungeon cleared' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Stay in the temple' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Play again' }));
  expect(await screen.findByRole('region', { name: 'The world map' })).toBeTruthy();
  expect(server.run.run.run).toBe(2);
  expect(screen.getByText('0 of 7 cleared')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  expect(siteRows().length).toBe(3);
  expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
});

test('a sealed or hidden way on says why, and a move the server refuses is shown', async () => {
  const user = userEvent.setup();
  // At Bambieshart's site with three sites cleared: the Sanctuary is in sight and sealed.
  const server = fakeServer({ stored: { run: 1, at: 'before_sanctuary', cleared: ['face_gate', 'root_court'], visited: ['face_gate', 'root_court', 'before_sanctuary'] } });
  renderScreen();
  await screen.findByText('Thank Bambieshart.');
  await user.click(screen.getByRole('button', { name: 'Leave' }));
  expect(ways()).toEqual([['Walk to The Face Gate · cleared', false], ['Walk to The Buttress Tree · unexplored', false], ['Walk to The Root Court · cleared', false], ['Walk to The Sunlit Court · unexplored', false], ['Walk to The Sanctuary · unexplored', true]]);
  const list = screen.getByRole('list', { name: 'Ways on' });
  expect(within(list).getByText('sealed: 2 of 6 cleared')).toBeTruthy(); // the fake's level is above every site's
  // The map names the seal too.
  await user.click(screen.getByRole('button', { name: 'Map' }));
  expect(siteRows()).toContain('7The Sanctuarysealed: 2 of 6 cleared');
  // Another tab started a new run: the walk this tab offers is refused, said so, and the map is read again.
  server.run.reset();
  await user.click(screen.getByRole('button', { name: 'Walk to The Sunlit Court' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/You can't get there/);
  await waitFor(() => expect(siteRows()).toEqual(['1The Face GatePortia · you are here', '2The Buttress TreeunexploredWalk here', '3The Root CourtunexploredWalk here']));
});

// Round 121: levels.
test('levels on the screen: the level in the top bar, what an answer earned, a level reached, and a seal that asks for a level', async () => {
  const user = userEvent.setup();
  // Five sites cleared, 320 XP (level 4): at Bambieshart's site, with the Sanctuary in sight.
  const server = fakeServer({ xp: 320, stored: { run: 1, at: 'before_sanctuary', cleared: ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court', 'library'], visited: ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court', 'library', 'before_sanctuary'] } });
  renderScreen();
  await screen.findByText('Thank Bambieshart.');
  expect(screen.getByRole('img', { name: 'Level 4: 320 XP, level 5 at 360' })).toBeTruthy();
  expect(screen.getByText('Lv 4')).toBeTruthy();
  await answer(user, 'Bambieshart', 'Grazie!');
  // 35 XP: 355, still level 4. The six are cleared, and the seal now asks only for the level.
  expect(screen.getByText('+35 XP')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Level 4: 355 XP, level 5 at 360' })).toBeTruthy();
  await waitFor(() => expect(ways()).toEqual([['Walk to The Face Gate · cleared', false], ['Walk to The Buttress Tree · cleared', false], ['Walk to The Root Court · cleared', false], ['Walk to The Sunlit Court · cleared', false], ['Walk to The Library · cleared', false], ['Walk to The Sanctuary · unexplored', true]]));
  expect(within(screen.getByRole('list', { name: 'Ways on' })).getByText('opens at level 5 (you are level 4)')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Map' }));
  expect(siteRows()).toContain('7The Sanctuaryopens at level 5 (you are level 4)');

  // A due review answered: 5 XP, level 5. The review says so, and the map opens the Sanctuary.
  await user.click(screen.getByRole('button', { name: /Spellbook/ }));
  await user.click((await screen.findAllByRole('button', { name: 'Review' }))[0]);
  await user.type(await screen.findByLabelText('English meaning'), 'coffee');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  expect(await screen.findByText('+5 XP · Level 5')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Back to the temple' }));
  expect(screen.getByText('Lv 5')).toBeTruthy();
  await waitFor(() => expect(siteRows()).toContain('7The SanctuaryunexploredWalk here'));
  expect(server.run.level).toBe(5);
});

test('an answer that reaches a level says so, and a server without experience shows no level', async () => {
  const user = userEvent.setup();
  fakeServer({ xp: 30 });
  renderScreen();
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(screen.getByText('Lv 1')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await screen.findByText('Greet Portia in Italian.');
  await answer(user, 'Portia', 'Ciao!');
  expect(screen.getByText('+35 XP · Level 2')).toBeTruthy();
  expect(screen.getByRole('img', { name: 'Level 2: 65 XP, level 3 at 140' })).toBeTruthy();
  cleanup();

  // An older server: the map and the replies carry no experience.
  fakeServer();
  const real = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    const reply = await real(url, init);
    const data = await reply.json();
    const { progression, xpGained, ...rest } = data;
    return { ...reply, json: async () => rest };
  }));
  renderScreen();
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(screen.queryByText(/^Lv /)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  await screen.findByText('Greet Portia in Italian.');
  await answer(user, 'Portia', 'Ciao!');
  expect(screen.queryByText(/XP/)).toBeNull();
});

// Round 120: the party.
test('the party on the screen: the offer after a saveable site, the panel, a talk with a member, and the invitation on a site card', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ stored: { run: 1, at: 'root_court', cleared: ['face_gate'], visited: ['face_gate', 'root_court'] } });
  renderScreen();
  await screen.findByText('Order a coffee using Italian.');
  expect(screen.getByLabelText('0 in your party')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: /^Party/ }));
  expect(screen.getByText('No one has joined you yet. Win someone over who is worth keeping.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Back to Gerald' }));

  // Gerald lets the player pass: he could join. Portia, who cannot be saved, got no such offer.
  await answer(user, 'Gerald', 'Un caffè.');
  const offer = await screen.findByRole('region', { name: 'Gerald could join your party' });
  expect(within(offer).getByText('Gerald could join your party.')).toBeTruthy();
  await user.click(within(offer).getByRole('button', { name: 'Save Gerald' }));
  expect((await screen.findByText('Gerald is in your party.')).getAttribute('role')).toBe('status');
  expect(screen.queryByRole('button', { name: 'Save Gerald' })).toBeNull();
  expect(screen.getByLabelText('1 in your party')).toBeTruthy();

  // The panel: where he was met is the temple's site, not the market's stall; no story is announced (critique 1.3).
  await user.click(screen.getByRole('button', { name: /^Party/ }));
  const member = screen.getByRole('article', { name: 'Gerald, met at The Root Court' });
  expect(within(member).getByText('Met at The Root Court · Conversations: 0')).toBeTruthy();
  expect(within(member).queryByText(/story/i)).toBeNull();
  expect(within(member).queryByText(/deeper conversation/)).toBeNull();
  await user.click(within(member).getByRole('button', { name: 'Talk to Gerald' }));

  // The talk: his name and "your party" in the header, no site number, no ways on.
  const sheet = await screen.findByRole('region', { name: 'Gerald, your party' });
  expect(within(sheet).getByText('your party')).toBeTruthy();
  expect(within(sheet).getByText('Chat with Gerald.')).toBeTruthy();
  expect(within(sheet).getByRole('button', { name: 'Leave for now' })).toBeTruthy();
  expect(screen.queryByRole('list', { name: 'Ways on' })).toBeNull();
  await user.type(screen.getByLabelText('Your response'), 'Con calma.');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText('Gerald enjoyed that.');
  expect(screen.getByText('Gerald has said what there was to say.')).toBeTruthy();
  await user.click(within(sheet).getByRole('button', { name: 'Back to the temple' }));
  // Back on his site's card: he is in the party, and the count went up.
  const card = await screen.findByRole('region', { name: 'The Root Court' });
  expect(within(card).getByText('Gerald is in your party.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: /^Party/ }));
  expect(await screen.findByText('Met at The Root Court · Conversations: 1')).toBeTruthy();
  expect(server.talks).toBe(1);
  await user.click(screen.getByRole('button', { name: 'Back to the temple' }));

  // Flick is answered and left unsaved: "Leave" closes the offer, and the invitation waits on his card.
  await user.click(screen.getByRole('button', { name: /Walk to The Sunlit Court/ }));
  await screen.findByText('Ask Flick the time.');
  // While his conversation is open, Talk waits.
  await user.click(screen.getByRole('button', { name: /^Party/ }));
  expect(screen.getByRole('button', { name: 'Talk to Gerald' }).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Back to Flick' }));
  await answer(user, 'Flick');
  await user.click(within(await screen.findByRole('region', { name: 'Flick could join your party' })).getByRole('button', { name: 'Leave' }));
  expect(screen.queryByText('Flick could join your party.')).toBeNull();
  expect(screen.getByRole('list', { name: 'Ways on' })).toBeTruthy();
});

test('after a reload a cleared site\'s card offers the invitation, and the deeper conversation is announced (critique 1.1)', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ stored: { run: 1, at: 'sunlit_court', cleared: ['face_gate', 'root_court', 'sunlit_court'], visited: ['face_gate', 'root_court', 'sunlit_court'] } });
  server.party.recruit('imp_coffee_greeting');
  for (let i = 0; i < 3; i += 1) server.party.finished('gerald_coffee_break');
  renderScreen();
  const card = await screen.findByRole('region', { name: 'The Sunlit Court' });
  expect(server.starts).toBe(0); // no conversation is loaded
  await user.click(await within(card).findByRole('button', { name: 'Invite Flick to your party' }));
  expect(await within(card).findByText('Flick is in your party.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: /^Party/ }));
  expect(screen.getByLabelText('2 in your party')).toBeTruthy();
  const gerald = screen.getByRole('article', { name: 'Gerald, met at The Root Court' });
  expect(within(gerald).getByText('Gerald trusts you with a deeper conversation now.')).toBeTruthy();
  expect(within(gerald).getByText('Met at The Root Court · Conversations: 3')).toBeTruthy();
  expect(screen.getByRole('article', { name: 'Flick, met at The Sunlit Court' })).toBeTruthy();
});

test('a reload in the middle of a run opens the site the player stands at, and Start over begins its conversation again', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ stored: { run: 1, at: 'root_court', cleared: ['face_gate'], visited: ['face_gate', 'root_court'] } });
  renderScreen();
  await screen.findByText('Order a coffee using Italian.');
  expect(screen.getByLabelText('1 of 7 sites cleared')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Enter' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Start over' }));
  await waitFor(() => expect(server.starts).toBe(2));
  // The Spellbook says where it returns to while a conversation is open.
  await user.click(screen.getByRole('button', { name: /Spellbook/ }));
  await user.click(await screen.findByRole('button', { name: 'Back to Gerald' }));
  expect(screen.getByLabelText('Conversation with Gerald')).toBeTruthy();
});

// Review 1 (R1.4): round 017's rule holds on the screen even when the store's snapshot says no conversation is open.
test('the Spellbook hides meanings while a conversation is open, whatever its snapshot says', async () => {
  const user = userEvent.setup();
  fakeServer({ stored: { run: 1, at: 'root_court', cleared: ['face_gate'], visited: ['face_gate', 'root_court'] } });
  const store = renderScreen();
  await screen.findByText('Order a coffee using Italian.');
  act(() => store.setState({ spellbook: { cards: [{ ...cards[0], due: false, nextReviewAt: '2999-01-01T00:00:00Z' }], dueCount: 0, inEncounter: false } }));
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // the refresh behind the snapshot never answers
  await user.click(screen.getByRole('button', { name: /Spellbook/ }));
  expect(await screen.findByText(/Meanings are hidden and reviews wait/)).toBeTruthy();
  expect(screen.getByText('Meaning hidden')).toBeTruthy();
  expect(screen.queryByText('coffee')).toBeNull();
});

test('with no server the title and the maps show, and Start explains and leads to the settings', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  renderScreen({ sameOrigin: false });
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(screen.getAllByText('Angkor Wat').length).toBe(2); // on the map and in the list
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  expect(screen.getByText('The Face Gate')).toBeTruthy();
  expect(siteRows().length).toBe(3); // the unexplored temple
  await user.click(screen.getByRole('button', { name: 'Start' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/No server is set/);
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Open Settings' }));
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
});

test('a site that fails to start says why and offers another try and the map', async () => {
  const user = userEvent.setup();
  fakeServer({ failFirstStart: true });
  renderScreen();
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  await user.click(screen.getByRole('button', { name: 'Enter Ta Prohm' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/CLI timed out/);
  expect(screen.getByRole('button', { name: 'Map' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('Greet Portia in Italian.');
});

test('loading plus empty and no-due states remain understandable', () => {
  const loading = render(<DialoguePanel encounter={encounter()} isLoading onHelp={() => {}} />);
  expect(screen.getByRole('status').textContent).toMatch(/considering/);
  loading.unmount();
  const empty = render(<Spellbook spellbook={{ cards: [], dueCount: 0 }} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.getByText('No vocabulary yet')).toBeTruthy();
  empty.unmount();
  render(<Spellbook spellbook={{ cards: [{ ...cards[0], due: false, nextReviewAt: '2026-01-16T12:00:00Z' }], dueCount: 0 }} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.getByText(/Nothing is due/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
});

// Round 103: round 017's rule in the web Spellbook.
test('the Spellbook hides meanings during an encounter and on due cards, and reviews wait', () => {
  const during = render(<Spellbook spellbook={{ cards: [cards[0], { ...cards[1], due: false, nextReviewAt: '2999-01-01T00:00:00Z' }], dueCount: 1, inEncounter: true }} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.getByText(/Meanings are hidden and reviews wait/)).toBeTruthy();
  expect(screen.getAllByText('Meaning hidden').length).toBe(2);
  expect(screen.queryByText('coffee')).toBeNull();
  expect(screen.queryByText(/without milk/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Review' })).toBeNull();
  during.unmount();
  render(<Spellbook spellbook={{ cards: [cards[0], { ...cards[1], due: false, nextReviewAt: '2999-01-01T00:00:00Z' }], dueCount: 1, inEncounter: false }} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.queryByText(/Meanings are hidden/)).toBeNull();
  expect(screen.getAllByText('Meaning hidden').length).toBe(1);
  expect(screen.queryByText('coffee')).toBeNull();
  expect(screen.getByText('without milk · no milk')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Review' }).length).toBe(1);
});

test('a card that fell due while the Spellbook is open hides its meaning (round 104)', () => {
  render(<Spellbook spellbook={{ cards: [{ ...cards[0], due: false, nextReviewAt: '2000-01-01T00:00:00Z' }, { ...cards[1], due: false, nextReviewAt: '2999-01-01T00:00:00Z' }], dueCount: 0 }} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.getAllByText('Meaning hidden').length).toBe(1);
  expect(screen.queryByText('coffee')).toBeNull();
  expect(screen.getByText('without milk · no milk')).toBeTruthy();
});

test('a card the server withheld (round 106) renders as hidden, not as a crash', () => {
  render(<Spellbook spellbook={{ cards: [{ ...cards[1], due: false, nextReviewAt: '2999-01-01T00:00:00Z', meanings: null, note: null, withheld: { meaning: true, example: true } }], dueCount: 0, inEncounter: false }} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.getAllByText('Meaning hidden').length).toBe(1);
});

describe('pronunciation boundary', () => {
  function installSpeech(initialVoices) {
    let voices = initialVoices;
    let listener;
    const speech = { getVoices: vi.fn(() => voices), speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn((_event, callback) => { listener = callback; }), removeEventListener: vi.fn() };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: speech });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: function Utterance(text) { this.text = text; } });
    return { speech, setVoices(value) { voices = value; listener?.(); } };
  }

  test('uses a Spanish voice and reacts when voices arrive late', async () => {
    const user = userEvent.setup();
    const spanish = { lang: 'es-ES', name: 'Spanish' };
    const installed = installSpeech([]);
    const view = render(<PronounceButton text="café" language={spanishLanguage} />);
    expect(screen.getByRole('button', { name: 'Spanish pronunciation unavailable' }).disabled).toBe(true);
    act(() => installed.setVoices([spanish]));
    const speak = await screen.findByRole('button', { name: 'Hear café in Spanish' });
    await user.click(speak);
    expect(installed.speech.speak).toHaveBeenCalledOnce();
    expect(installed.speech.speak.mock.calls[0][0].voice).toBe(spanish);
    view.unmount();
  });

  test('shows a clear fallback for unsupported or non-Spanish voices', () => {
    installSpeech([{ lang: 'en-US', name: 'English' }]);
    const first = render(<PronounceButton text="café" language={spanishLanguage} />);
    expect(screen.getByRole('button', { name: 'Spanish pronunciation unavailable' }).disabled).toBe(true);
    first.unmount();
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    const second = render(<PronounceButton text="café" language={spanishLanguage} />);
    expect(screen.getByRole('button', { name: 'Spanish pronunciation unavailable' }).disabled).toBe(true);
    second.unmount();
  });

  test('an Italian pack picks an Italian voice and ignores a Spanish one', async () => {
    const user = userEvent.setup();
    const italian = { lang: 'it-IT', name: 'Italian' };
    const installed = installSpeech([{ lang: 'es-ES', name: 'Spanish' }]);
    const view = render(<PronounceButton text="caffè" language={italianLanguage} />);
    expect(screen.getByRole('button', { name: 'Italian pronunciation unavailable' }).disabled).toBe(true);
    act(() => installed.setVoices([{ lang: 'es-ES', name: 'Spanish' }, italian]));
    await user.click(await screen.findByRole('button', { name: 'Hear caffè in Italian' }));
    expect(installed.speech.speak.mock.calls[0][0].voice).toBe(italian);
    view.unmount();
  });

  test('labels and lang attributes follow the pack', () => {
    const italianCard = { ...cards[0], vocabularyId: 'caffe', target: 'caffè' };
    const book = render(<Spellbook spellbook={{ cards: [italianCard], dueCount: 1 }} language={italianLanguage} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
    expect(screen.getByRole('heading', { name: 'caffè' }).getAttribute('lang')).toBe('it-IT');
    book.unmount();
    render(<DialoguePanel encounter={encounter()} language={italianLanguage} isLoading={false} onHelp={() => {}} />);
    expect(screen.getByText(/Italian target: 25%/)).toBeTruthy();
  });
});
