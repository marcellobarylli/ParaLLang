// Round 065: between two reviews the screen says it is loading, or that the load failed; a late reply after the
// player left does not pull them back (critique 1.1–1.5).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import App from '../../App.js';
import ReviewPanel from '../components/ReviewPanel.js';
import { useGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const learner = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: false, language };
const cards = [
  { vocabularyId: 'caffe', kind: 'word', target: 'caffè', meanings: ['coffee'], partOfSpeech: 'noun', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
  { vocabularyId: 'senza_latte', kind: 'phrase', target: 'senza latte', meanings: ['without milk'], partOfSpeech: 'prepositional_phrase', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
];
const spellbook = { cards, dueCount: 2, contentVersion: 'gerald-coffee-v1' };
const world = { currentLocationId: 'market_entrance', locations: [{ id: 'market_entrance', name: 'Market Entrance', state: 'current', adjacent: false, map: { x: 0.5, y: 0.9 }, description: 'An archway.', vocabularyFocus: ['greetings'], encounter: null }], paths: [] };
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const NO_DUE = 'No review is loaded.'; // round 099 (review 2 R2.4)
const LOADING = 'Finding the next review…';
const FAILED = 'The next review could not load.';

let held; // the second (and later) review requests wait here
const challenge = (n, card) => ({ challenge: { id: `challenge-${n}`, vocabularyId: card.vocabularyId, target: card.target, kind: card.kind, practice: false }, spellbook });

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem('parallang.onboardingSeen', '1');
  useGameStore.setState({
    // initialize() runs once per module (its promise is cached), so later tests start from the loaded state.
    learnerId: learner.learnerId, language, encounter: null, spellbook,
    world, onboarding: null, party: [], notice: null, view: 'map', returnView: 'map', reviewChallenge: null, reviewResult: null, assessment: null,
    draft: '', pendingInput: null, isLoading: false, error: null,
  });
  let reviewCalls = 0;
  held = [];
  globalThis.fetch = jest.fn(async (url, init = {}) => {
    const path = new URL(String(url)).pathname;
    if (path === '/api/learner') return response(201, learner);
    if (path === '/api/world') return response(200, { world });
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/party') return response(200, { party: [] });
    if (path === '/api/spellbook/review') {
      reviewCalls += 1;
      if (reviewCalls === 1) return response(200, challenge(1, cards[0]));
      return new Promise((resolve) => { held.push(resolve); });
    }
    if (path === '/api/spellbook/review/submit') return response(200, {
      result: { correct: false, feedback: 'Answer revealed; this recall attempt was recorded as quality 0.', effectiveQuality: 0, canonicalAnswer: 'coffee', nextReviewAt: '2026-01-16T12:00:00Z', scheduleChanged: true },
      spellbook: { ...spellbook, dueCount: 1 },
    });
    if (path === '/api/world/atmosphere') return response(200, { atmosphere: null });
    throw new Error(`Unexpected fetch ${path}`);
  });
});
afterEach(() => { delete globalThis.fetch; });

async function toContinue(user) {
  await render(<App />);
  await screen.findByRole('heading', { name: 'Market Entrance' });
  await user.press(screen.getByRole('button', { name: /^Spellbook/ }));
  await user.press((await screen.findAllByRole('button', { name: 'Review' }))[0]);
  await screen.findByRole('heading', { name: 'caffè' });
  await user.press(screen.getByRole('button', { name: 'Show answer' }));
  await screen.findByText(/recorded as quality 0/);
  await user.press(screen.getByRole('button', { name: 'Continue reviews' }));
  expect(held).toHaveLength(1);
}

test('the loading line replaces the no-due text until the next word arrives', async () => {
  const user = userEvent.setup();
  await toContinue(user);
  expect(screen.getByText(LOADING)).toBeOnTheScreen();
  expect(screen.queryByText(NO_DUE)).not.toBeOnTheScreen();
  await act(async () => { held[0](response(200, challenge(2, cards[1]))); });
  expect(await screen.findByRole('heading', { name: 'senza latte' })).toBeOnTheScreen();
  expect(screen.queryByText(LOADING)).not.toBeOnTheScreen();
});

test('nothing left due goes to the Spellbook without the no-due text', async () => {
  const user = userEvent.setup();
  await toContinue(user);
  expect(screen.getByText(LOADING)).toBeOnTheScreen();
  await act(async () => { held[0](response(200, { challenge: null, spellbook: { ...spellbook, dueCount: 0 } })); });
  expect(await screen.findByRole('heading', { name: 'Spellbook' })).toBeOnTheScreen();
  expect(screen.queryByText(NO_DUE)).not.toBeOnTheScreen();
});

test('a failed load says so and Try again loads the word', async () => {
  const user = userEvent.setup();
  await toContinue(user);
  await act(async () => { held[0](response(503, { error: { message: 'Reviews are temporarily unavailable.', retryable: true } })); });
  expect(await screen.findByText(FAILED)).toBeOnTheScreen();
  expect(screen.getByText('Reviews are temporarily unavailable.')).toBeOnTheScreen();
  expect(screen.queryByText(NO_DUE)).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Try again' }));
  expect(held).toHaveLength(2);
  expect(screen.getByText(LOADING)).toBeOnTheScreen();
  await act(async () => { held[1](response(200, challenge(3, cards[1]))); });
  expect(await screen.findByRole('heading', { name: 'senza latte' })).toBeOnTheScreen();
});

test('a reply after the player left does not pull them back', async () => {
  const user = userEvent.setup();
  await toContinue(user);
  await user.press(screen.getByRole('button', { name: 'Return to the map' }));
  expect(await screen.findByRole('heading', { name: 'Market Entrance' })).toBeOnTheScreen();
  await act(async () => { held[0](response(200, challenge(2, cards[1]))); });
  expect(screen.getByRole('heading', { name: 'Market Entrance' })).toBeOnTheScreen();
  expect(screen.queryByRole('heading', { name: 'senza latte' })).not.toBeOnTheScreen();
  expect(useGameStore.getState().isLoading).toBe(false);
  expect(useGameStore.getState().reviewChallenge).toBeNull();
});

test('a failure after the player left shows no error', async () => {
  const user = userEvent.setup();
  await toContinue(user);
  await user.press(screen.getByRole('button', { name: 'Return to the map' }));
  await act(async () => { held[0](response(503, { error: { message: 'Reviews are temporarily unavailable.' } })); });
  expect(screen.queryByText('Reviews are temporarily unavailable.')).not.toBeOnTheScreen();
  expect(useGameStore.getState().isLoading).toBe(false);
});

test('the panel without a challenge: loading, failed, or nothing due', async () => {
  const onContinue = jest.fn();
  const props = { challenge: null, result: null, language, onSubmit() {}, onReveal() {}, onContinue, onReturn() {} };
  const view = await render(<ReviewPanel {...props} isLoading />);
  expect(screen.getByText(LOADING)).toBeOnTheScreen();
  expect(screen.queryByText(NO_DUE)).not.toBeOnTheScreen();
  await view.rerender(<ReviewPanel {...props} error="Boom" />);
  expect(screen.getByText(FAILED)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
  expect(onContinue).toHaveBeenCalledTimes(1);
  await view.rerender(<ReviewPanel {...props} />);
  // Round 099 (review 2 R2.4): after a dismissed error the screen still offers a way on.
  expect(screen.getByText(NO_DUE)).toBeOnTheScreen();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Try again' }));
  expect(onContinue).toHaveBeenCalledTimes(2);
});

test('Try again twice sends one request (round 065 Amendment 1)', async () => {
  const user = userEvent.setup();
  await toContinue(user);
  await act(async () => { held[0](response(503, { error: { message: 'Reviews are temporarily unavailable.' } })); });
  const tryAgain = await screen.findByRole('button', { name: 'Try again' });
  await act(async () => { useGameStore.getState().startReview(); useGameStore.getState().startReview(); });
  expect(held).toHaveLength(2);
  expect(tryAgain).toBeTruthy();
  await act(async () => { held[1](response(200, challenge(3, cards[1]))); });
  expect(await screen.findByRole('heading', { name: 'senza latte' })).toBeOnTheScreen();
});

test('an older reply never overtakes a newer request on the same screen (round 065 Amendment 1)', async () => {
  const user = userEvent.setup();
  await toContinue(user); // request A held, on the review view
  await act(async () => { useGameStore.setState({ isLoading: false }); useGameStore.getState().startReview(); }); // B
  expect(held).toHaveLength(2);
  await act(async () => { held[1](response(200, challenge(3, cards[1]))); });
  expect(await screen.findByRole('heading', { name: 'senza latte' })).toBeOnTheScreen();
  await act(async () => { held[0](response(200, challenge(2, cards[0]))); });
  expect(screen.getByRole('heading', { name: 'senza latte' })).toBeOnTheScreen();
  expect(useGameStore.getState().reviewChallenge.id).toBe('challenge-3');
});
