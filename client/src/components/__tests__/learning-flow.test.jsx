import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App.jsx';
import DialoguePanel from '../DialoguePanel.jsx';
import PronounceButton from '../PronounceButton.jsx';
import Spellbook from '../Spellbook.jsx';
import { useGameStore } from '../../stores/gameStore.js';

const word = (id, spanish, meaning) => ({ vocabularyId: id, spanish, canonicalSpanish: spanish, partOfSpeech: id === 'cafe' ? 'noun' : 'prepositional_phrase', ...(meaning ? { meaning } : {}), meaningAvailable: true });
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
  { vocabularyId: 'cafe', kind: 'word', spanish: 'café', meanings: ['coffee'], partOfSpeech: 'noun', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
  { vocabularyId: 'sin_leche', kind: 'phrase', spanish: 'sin leche', meanings: ['without milk', 'no milk'], partOfSpeech: 'prepositional_phrase', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
];
const spellbook = { cards, dueCount: 2, contentVersion: 'gerald-coffee-v1' };
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState({
    learnerId: null, encounter: null, spellbook: { cards: [], dueCount: 0, contentVersion: null },
    view: 'dialogue', reviewChallenge: null, reviewResult: null, assessment: null,
    draft: '', pendingInput: null, isLoading: false, error: null,
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('actual learning UI enforces help, retains failed input, resolves, reviews, reveals, and returns', async () => {
  const user = userEvent.setup();
  let currentEncounter = encounter();
  let dialogueCalls = 0;
  let reviewCalls = 0;
  const fetchMock = vi.fn(async (url, init = {}) => {
    const path = String(url);
    const body = init.body ? JSON.parse(init.body) : {};
    if (path === '/api/learner') return response(201, { learnerId: '11111111-1111-4111-8111-111111111111', recovered: false });
    if (path === '/api/encounter/start') return response(200, { encounter: currentEncounter, spellbook });
    if (path === '/api/encounter/help') {
      if (body.kind === 'word') currentEncounter = encounter(2, { cafeMeaning: true });
      else currentEncounter = encounter(3, { cafeMeaning: true, translated: true, exhausted: true });
      return response(200, { reveal: { kind: body.kind, value: body.kind === 'word' ? 'coffee' : 'Do you want a coffee?' }, charged: true, encounter: currentEncounter, spellbook });
    }
    if (path === '/api/encounter/dialogue') {
      dialogueCalls += 1;
      if (dialogueCalls === 1) return response(503, { error: { message: 'Grading is temporarily unavailable; retry your answer.', retryable: true } });
      currentEncounter = encounter(4, { resolved: true, allVisible: true });
      return response(200, {
        encounter: currentEncounter, spellbook,
        assessment: { overallFeedback: 'Your contextual order passed.', objectiveResults: [{ objectiveId: 'order_coffee', passed: true, feedback: 'Coffee requested.' }, { objectiveId: 'no_milk', passed: true, feedback: 'No milk specified.' }] },
      });
    }
    if (path === '/api/spellbook/review') {
      reviewCalls += 1;
      const target = reviewCalls === 1 ? cards[0] : cards[1];
      return response(200, { challenge: { id: `challenge-${reviewCalls}`, vocabularyId: target.vocabularyId, spanish: target.spanish, kind: target.kind, practice: false }, spellbook });
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
  render(<App />);
  await screen.findByText('Order a coffee using Spanish.');
  expect(screen.queryByText('Do you want a coffee? Without milk is civilized.')).toBeNull();

  const native = screen.getByText('¿Quieres un café? Sin leche is civilized.');
  fireEvent.mouseEnter(native);
  fireEvent.touchStart(native);
  expect(fetchMock).toHaveBeenCalledTimes(2); // identity + start; no hover/touch reveal

  const wordButton = screen.getByRole('button', { name: 'Translate word: café' });
  wordButton.focus();
  await user.keyboard('{Enter}');
  expect((await screen.findByRole('status')).textContent).toContain('coffee');
  expect(screen.getByText(/Hints: 1\/2/)).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Translate sentence' }));
  await screen.findByText('Do you want a coffee? Without milk is civilized.');
  expect(screen.getByText(/Hints: 0\/2/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Translate word: sin leche' }).disabled).toBe(true);

  const input = screen.getByLabelText('Your response');
  await user.type(input, 'Un café sin leche.');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByRole('alert');
  expect(input.value).toBe('Un café sin leche.');
  await user.click(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText('Your contextual order passed.');
  expect(screen.getByText(/Gerald grudgingly approves/)).toBeTruthy();
  expect(screen.getByPlaceholderText('Order accepted. Restart to play again.').disabled).toBe(true);

  await user.click(screen.getByRole('button', { name: /Spellbook/ }));
  expect(await screen.findByRole('heading', { name: 'Spellbook' })).toBeTruthy();
  expect(screen.getByText('2 due for review')).toBeTruthy();
  expect(screen.getAllByText('discovered').length).toBe(2);
  await user.click(screen.getAllByRole('button', { name: 'Review' })[0]);
  await screen.findByRole('heading', { name: 'café' });
  await user.type(screen.getByLabelText('English meaning'), 'coffee');
  await user.click(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByText('Correct.');
  await user.click(screen.getByRole('button', { name: 'Continue reviews' }));
  await screen.findByRole('heading', { name: 'sin leche' });
  expect(screen.getByLabelText('English meaning').value).toBe(''); // previous answer must not carry over
  await user.click(screen.getByRole('button', { name: 'Show answer' }));
  await screen.findByText(/recorded as quality 0/);
  expect(screen.getByText('Answer:').parentElement.textContent).toContain('without milk');
  await user.click(screen.getByRole('button', { name: 'Return to Gerald' }));
  expect(await screen.findByLabelText('Conversation with Gerald')).toBeTruthy();
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
    const view = render(<PronounceButton text="café" />);
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
    const first = render(<PronounceButton text="café" />);
    expect(screen.getByRole('button', { name: 'Spanish pronunciation unavailable' }).disabled).toBe(true);
    first.unmount();
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    const second = render(<PronounceButton text="café" />);
    expect(screen.getByRole('button', { name: 'Spanish pronunciation unavailable' }).disabled).toBe(true);
    second.unmount();
  });
});
