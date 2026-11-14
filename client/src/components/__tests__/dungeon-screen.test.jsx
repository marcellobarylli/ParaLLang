// Round 115: the dungeon screen through its real components, in jsdom (no WebGL: the still backdrop stands in and
// the camera arrives at once). The Spellbook and pronunciation checks below are the old single-encounter screen's.
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DungeonScreen from '../DungeonScreen.jsx';
import DialoguePanel from '../DialoguePanel.jsx';
import PronounceButton from '../PronounceButton.jsx';
import Spellbook from '../Spellbook.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON } from '../../dungeon.js';

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
const SITE_IDS = DUNGEON.sites.map((site) => site.encounterId);
const CAST = [
  { name: 'Portia', objective: 'Greet Portia in Italian.', resolved: 'Portia sighs with relief, unlocks herself and lets you into the market.', briefing: ['Portia only lets in people who greet her properly.'] },
  { name: 'Gerald', objective: 'Order a coffee using Italian.', resolved: null, briefing: null },
  { name: 'Bambieshart', objective: 'Thank Bambieshart.', resolved: 'Bambieshart bows and steps aside.', briefing: null },
];
const memoryStorage = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } }; };

// The server in miniature, behind fetch: a run of three sites, one conversation at a time.
function fakeServer({ cleared = 0, failFirstSend = false, failFirstStart = false } = {}) {
  const server = { cleared, session: null, sessions: 0, sends: 0, starts: 0, reviews: 0, paths: [] };
  const siteEncounter = (index, version, options = {}) => ({
    ...encounter(version, options), id: `encounter-${server.sessions}`, encounterId: SITE_IDS[index], dungeonId: DUNGEON.id,
    character: { id: CAST[index].name.toLowerCase(), name: CAST[index].name }, resolvedMessage: CAST[index].resolved, companionBriefing: CAST[index].briefing,
    currentObjective: options.resolved ? null : { id: 'objective', prompt: CAST[index].objective },
  });
  const view = () => ({
    dungeon: { id: DUNGEON.id, name: DUNGEON.name, level: DUNGEON.level, route: DUNGEON.route, sites: DUNGEON.sites.map((site, index) => ({ ...site, characterName: CAST[index].name })) },
    progress: { run: 1, clearedEncounterIds: SITE_IDS.slice(0, server.cleared), nextSiteIndex: server.cleared < 3 ? server.cleared : null, nextEncounterId: SITE_IDS[server.cleared] ?? null, complete: server.cleared >= 3 },
  });
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url);
    const body = init.body ? JSON.parse(init.body) : {};
    server.paths.push(path);
    if (path === '/api/learner') return response(201, { learnerId, recovered: false, language: italianLanguage });
    if (path === '/api/dungeons/ta_prohm') return response(200, view());
    if (path === '/api/dungeons/ta_prohm/reset') { server.cleared = 0; server.session = null; return response(200, view()); }
    if (path === '/api/encounter/start') {
      server.starts += 1;
      if (failFirstStart && server.starts === 1) return response(503, { error: { code: 'CLI_TIMEOUT', message: 'The selected CLI timed out. Your progress was not changed.', retryable: true } });
      expect(body.dungeonId).toBe('ta_prohm');
      server.sessions += 1;
      server.session = { index: server.cleared, version: 1 };
      return response(200, { encounter: siteEncounter(server.cleared, 1), spellbook: { ...spellbook, inEncounter: true } });
    }
    if (path === '/api/encounter/help') {
      const options = body.kind === 'word' ? { cafeMeaning: true } : { cafeMeaning: true, translated: true, exhausted: true };
      server.session.version = body.kind === 'word' ? 2 : 3;
      return response(200, { reveal: { kind: body.kind }, charged: true, encounter: siteEncounter(server.session.index, server.session.version, options), spellbook });
    }
    if (path === '/api/encounter/dialogue') {
      server.sends += 1;
      if (failFirstSend && server.sends === 1) return response(503, { error: { message: 'Grading is temporarily unavailable; retry your answer.', retryable: true } });
      const index = server.session.index;
      server.cleared = index + 1;
      return response(200, {
        encounter: siteEncounter(index, 4, { resolved: true, allVisible: true }), spellbook,
        assessment: { overallFeedback: `Your answer to ${CAST[index].name} passed.`, objectiveResults: [{ objectiveId: 'objective', passed: true, feedback: 'Well said.' }] },
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
      });
    }
    throw new Error(`Unexpected fetch ${path}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return server;
}

function renderScreen(options = {}) {
  const store = createGameStore({ dungeon: DUNGEON, storage: memoryStorage(), ...options });
  render(<DungeonScreen useStore={store} />);
  return store;
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('a whole run on the screen: title, route, three conversations with a walk between them, victory, reviews, a new run', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ failFirstSend: true });
  renderScreen();

  // Attract: the title and Enter. The level is a still backdrop here (no WebGL in jsdom).
  expect(screen.getByRole('heading', { name: 'ParaLLang' })).toBeTruthy();
  await screen.findByText(/answer in Italian/); // the language arrives with the learner
  await user.click(screen.getByRole('button', { name: 'Enter' }));

  // Overview: the three sites in order, with the characters the server named.
  expect(screen.getByRole('heading', { name: 'Ta Prohm' })).toBeTruthy();
  const sites = screen.getAllByRole('listitem').filter((item) => item.closest('.site-list'));
  expect(sites.map((item) => item.textContent)).toEqual(['1The Face GatePortia', '2The Root CourtGerald', '3Before the SanctuaryBambieshart']);
  expect(screen.getByLabelText('0 of 3 sites cleared')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Start' }));

  // Site 1: Portia's tutorial, with the companion's briefing.
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
  await screen.findByText('Do you want a coffee? Without milk is civilized.');
  expect(screen.getByText(/Hints: 0\/2/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Translate word: sin leche' }).disabled).toBe(true);

  // A failed send keeps the answer.
  const input = screen.getByLabelText('Your response');
  expect(input.placeholder).toBe('Reply to Portia…');
  await user.type(input, 'Ciao, Portia!');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/Grading is temporarily unavailable/);
  expect(input.value).toBe('Ciao, Portia!');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText('Your answer to Portia passed.');
  expect(screen.getByText(/Portia sighs with relief/)).toBeTruthy();
  expect(screen.queryByLabelText('Your response')).toBeNull();
  expect(screen.getByLabelText('1 of 3 sites cleared')).toBeTruthy();

  // The walk starts when the player says so.
  await user.click(screen.getByRole('button', { name: 'Walk on to The Root Court' }));
  await screen.findByText('Order a coffee using Italian.');
  expect(screen.getByLabelText('Conversation with Gerald')).toBeTruthy();
  expect(screen.queryByLabelText("Your companion's briefing")).toBeNull();
  await user.type(screen.getByLabelText('Your response'), 'Un caffè senza latte.');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText('Your answer to Gerald passed.');
  expect(screen.getByText('Gerald lets you pass.')).toBeTruthy(); // no authored message: a plain one
  await user.click(screen.getByRole('button', { name: 'Walk on to Before the Sanctuary' }));
  await screen.findByText('Thank Bambieshart.');
  await user.type(screen.getByLabelText('Your response'), 'Grazie!');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText(/Bambieshart bows/);
  await user.click(screen.getByRole('button', { name: 'Leave the temple' }));

  // Victory, and the reviews that waited during the conversations.
  expect(await screen.findByRole('heading', { name: 'Dungeon cleared' })).toBeTruthy();
  expect(screen.getByLabelText('3 of 3 sites cleared')).toBeTruthy();
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

  await user.click(screen.getByRole('button', { name: 'Play again' }));
  expect(await screen.findByRole('button', { name: 'Start' })).toBeTruthy();
  expect(screen.getByLabelText('0 of 3 sites cleared')).toBeTruthy();
});

test('a reload in the middle of a run opens the next site, and Start over begins its conversation again', async () => {
  const user = userEvent.setup();
  const server = fakeServer({ cleared: 1 });
  renderScreen();
  await screen.findByText('Order a coffee using Italian.');
  expect(screen.getByLabelText('1 of 3 sites cleared')).toBeTruthy();
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
  fakeServer({ cleared: 1 });
  const store = renderScreen();
  await screen.findByText('Order a coffee using Italian.');
  act(() => store.setState({ spellbook: { cards: [{ ...cards[0], due: false, nextReviewAt: '2999-01-01T00:00:00Z' }], dueCount: 0, inEncounter: false } }));
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // the refresh behind the snapshot never answers
  await user.click(screen.getByRole('button', { name: /Spellbook/ }));
  expect(await screen.findByText(/Meanings are hidden and reviews wait/)).toBeTruthy();
  expect(screen.getByText('Meaning hidden')).toBeTruthy();
  expect(screen.queryByText('coffee')).toBeNull();
});

test('with no server the title and the route show, and Start explains and leads to the settings', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  renderScreen({ sameOrigin: false });
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  expect(screen.getByText('The Face Gate')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Start' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/No server is set/);
  expect(fetchMock).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Open Settings' }));
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
});

test('a site that fails to start says why and offers another try', async () => {
  const user = userEvent.setup();
  fakeServer({ failFirstStart: true });
  renderScreen();
  await screen.findByText(/answer in Italian/);
  await user.click(screen.getByRole('button', { name: 'Enter' }));
  await user.click(screen.getByRole('button', { name: 'Start' }));
  expect((await screen.findByRole('alert')).textContent).toMatch(/CLI timed out/);
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
