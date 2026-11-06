// Ported from client/src/components/__tests__/learning-flow.test.jsx. Fixtures use round 003's field names
// (target, canonicalTarget, language) and the Italian pack.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import App from '../../App.js';
import DialoguePanel from '../components/DialoguePanel.js';
import Spellbook from '../components/Spellbook.js';
import { useGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const learner = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: false, language };
const word = (id, target, meaning) => ({ vocabularyId: id, target, canonicalTarget: target, partOfSpeech: id === 'caffe' ? 'noun' : 'prepositional_phrase', ...(meaning ? { meaning } : {}), meaningAvailable: true });
const npc = (version, { translated = false, caffeMeaning = false, allVisible = false } = {}) => ({
  id: 'message-1', role: 'npc', narrative: 'A tiny barista glares over an espresso cup.', protected: !allVisible,
  dialogue: {
    speaker: 'Gerald', native: 'Vuoi un caffè? Senza latte is civilized.', translationAvailable: true,
    ...(translated || allVisible ? { translation: 'Do you want a coffee? Without milk is civilized.' } : {}),
    words: [word('caffe', 'caffè', caffeMeaning || allVisible ? 'coffee' : null), word('senza_latte', 'senza latte', allVisible ? 'without milk' : null)],
  },
});
const encounter = (version = 1, options = {}) => ({
  id: 'encounter-1', encounterId: 'imp_coffee_greeting', location: 'coffee_cart', character: { name: 'Gerald' },
  resolvedMessage: 'Gerald grudgingly approves. The coffee order is complete.', version, state: options.resolved ? 'resolved' : 'ongoing', encounter_state: options.resolved ? 'resolved' : 'ongoing',
  committedPlayerTurns: options.resolved ? 1 : 0, difficulty: options.resolved ? .3 : .25,
  must_translate: !options.resolved, hints_available: !options.exhausted,
  hints: { used: options.exhausted ? 2 : version - 1, remaining: options.exhausted ? 0 : 3 - version, limit: 2 },
  currentObjective: options.resolved ? null : { id: 'order_coffee', prompt: 'Order a coffee from Gerald, using Italian for the coffee request.' },
  transcript: [npc(version, options), ...(options.resolved ? [{ id: 'player-1', role: 'player', text: 'Vorrei un caffè senza latte.' }] : [])],
});
const cards = [
  { vocabularyId: 'caffe', kind: 'word', target: 'caffè', meanings: ['coffee'], partOfSpeech: 'noun', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
  { vocabularyId: 'senza_latte', kind: 'phrase', target: 'senza latte', meanings: ['without milk', 'no milk'], partOfSpeech: 'prepositional_phrase', mastery: 'discovered', due: true, nextReviewAt: '2026-01-15T12:00:00Z', lastOutcome: null, repetitions: 0 },
];
const spellbook = { cards, dueCount: 2, contentVersion: 'gerald-coffee-v1' };
const place = (id, name, state, adjacent, map, extra = {}) => ({ id, name, state, adjacent, map, ...extra });
const entrance = (state) => place('market_entrance', 'Market Entrance', state, state !== 'current', { x: 0.5, y: 0.92 }, { description: 'An archway that has not decided which language it is in.', vocabularyFocus: ['greetings'], encounter: null });
const cart = (state, completed = false) => state === 'known'
  ? place('coffee_cart', 'The Coffee Cart', 'known', true, { x: 0.2, y: 0.66 })
  : place('coffee_cart', 'The Coffee Cart', state, false, { x: 0.2, y: 0.66 }, { description: 'A cart on three wheels and one strong opinion.', vocabularyFocus: ['drinks'], encounter: { id: 'imp_coffee_greeting', completed, characterName: 'Gerald' } });
const startWorld = { currentLocationId: 'market_entrance', locations: [cart('known'), entrance('current')], paths: [['market_entrance', 'coffee_cart']] };
const cartWorld = (completed = false) => ({ currentLocationId: 'coffee_cart', locations: [cart('current', completed), entrance('visited')], paths: [['market_entrance', 'coffee_cart']] });
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const pathOf = (url) => new URL(String(url)).pathname;

beforeEach(async () => {
  await AsyncStorage.clear();
  // Round 027: a returning player; first launch (the philosophy statement) is tested in onboarding.test.js.
  await AsyncStorage.setItem('parallang.onboardingSeen', '1');
  useGameStore.setState({
    learnerId: null, language: null, encounter: null, spellbook: { cards: [], dueCount: 0, contentVersion: null },
    world: null, onboarding: null, party: [], notice: null, view: 'map', returnView: 'map', reviewChallenge: null, reviewResult: null, assessment: null,
    draft: '', pendingInput: null, isLoading: false, error: null,
  });
});
afterEach(() => { delete globalThis.fetch; });

test('the app enforces help, retains failed input, resolves, reviews, reveals, and returns', async () => {
  const user = userEvent.setup();
  let currentEncounter = encounter();
  let currentWorld = startWorld;
  let dialogueCalls = 0;
  let reviewCalls = 0;
  globalThis.fetch = jest.fn(async (url, init = {}) => {
    const path = pathOf(url);
    const body = init.body ? JSON.parse(init.body) : {};
    if (path === '/api/learner') return response(201, learner);
    if (path === '/api/world') return response(200, { world: currentWorld });
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/party') return response(200, { party: [] });
    if (path === '/api/world/move') {
      if (body.locationId !== 'coffee_cart') return response(409, { error: { code: 'NOT_ADJACENT', message: "You can't get there from here." } });
      currentWorld = cartWorld();
      return response(200, { world: currentWorld });
    }
    if (path === '/api/encounter/start') return response(200, { encounter: currentEncounter, spellbook });
    if (path === '/api/encounter/help') {
      if (body.kind === 'word') currentEncounter = encounter(2, { caffeMeaning: true });
      else currentEncounter = encounter(3, { caffeMeaning: true, translated: true, exhausted: true });
      return response(200, { reveal: { kind: body.kind, value: body.kind === 'word' ? 'coffee' : 'Do you want a coffee?' }, charged: true, encounter: currentEncounter, spellbook });
    }
    if (path === '/api/encounter/dialogue') {
      dialogueCalls += 1;
      if (dialogueCalls === 1) return response(503, { error: { message: 'Grading is temporarily unavailable; retry your answer.', retryable: true } });
      currentEncounter = encounter(4, { resolved: true, allVisible: true });
      currentWorld = cartWorld(true);
      return response(200, {
        encounter: currentEncounter, spellbook,
        assessment: { overallFeedback: 'Your contextual order passed.', objectiveResults: [{ objectiveId: 'order_coffee', passed: true, feedback: 'Coffee requested.' }, { objectiveId: 'no_milk', passed: true, feedback: 'No milk specified.' }] },
      });
    }
    if (path === '/api/spellbook/review') {
      reviewCalls += 1;
      const card = reviewCalls === 1 ? cards[0] : cards[1];
      return response(200, { challenge: { id: `challenge-${reviewCalls}`, vocabularyId: card.vocabularyId, target: card.target, kind: card.kind, practice: false }, spellbook });
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

  await render(<App />);
  expect(await screen.findByRole('heading', { name: 'Market Entrance' })).toBeOnTheScreen();
  expect(screen.getByText(/has not decided which language/)).toBeOnTheScreen();
  expect(screen.getByText('Nothing here wants to talk to you yet.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Market Entrance, you are here' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Restart encounter' })).not.toBeOnTheScreen();
  expect(await AsyncStorage.getItem('parallang.learnerId')).toBe(learner.learnerId);
  await user.press(screen.getByRole('button', { name: 'Walk to The Coffee Cart, unexplored' }));
  expect(await screen.findByRole('heading', { name: 'The Coffee Cart' })).toBeOnTheScreen();
  expect(screen.getByText('The Crumbling Market — The Coffee Cart')).toBeOnTheScreen();
  expect(screen.getByText('Words here: drinks')).toBeOnTheScreen();
  expect(globalThis.fetch.mock.calls.some(([url]) => pathOf(url) === '/api/encounter/start')).toBe(false);
  await user.press(screen.getByRole('button', { name: 'Talk to Gerald' }));

  await screen.findByText('Order a coffee from Gerald, using Italian for the coffee request.');
  expect(screen.getByText(/Italian target: 25%/)).toBeOnTheScreen();
  expect(screen.queryByText('Do you want a coffee? Without milk is civilized.')).not.toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Translate word: caffè, noun' }));
  await screen.findByText(/^coffee/);
  expect(screen.getByText(/Hints: 1\/2/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Translate word: caffè, noun' })).toBeDisabled();
  await user.press(screen.getByRole('button', { name: 'Translate sentence' }));
  await screen.findByText('Do you want a coffee? Without milk is civilized.');
  expect(screen.getByText(/Hints: 0\/2/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Translate word: senza latte' })).toBeDisabled();

  const input = screen.getByLabelText('Your response');
  await user.type(input, 'Vorrei un caffè senza latte.');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/);
  expect(input).toHaveDisplayValue('Vorrei un caffè senza latte.');
  await user.press(screen.getByRole('button', { name: 'Dismiss error' }));
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Send' }));
  await screen.findByText('Your contextual order passed.');
  expect(screen.getByText(/Gerald grudgingly approves/)).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Encounter complete. Restart to play again.')).toBeDisabled();

  await user.press(screen.getByRole('button', { name: /Spellbook/ }));
  expect(await screen.findByRole('heading', { name: 'Spellbook' })).toBeOnTheScreen();
  expect(screen.getByText('2 due for review')).toBeOnTheScreen();
  expect(screen.getAllByText(/discovered/)).toHaveLength(2);
  await user.press(screen.getAllByRole('button', { name: 'Review' })[0]);
  await screen.findByRole('heading', { name: 'caffè' });
  expect(screen.getByText('Due Italian-to-English recall')).toBeOnTheScreen();
  expect(screen.getByText('noun')).toBeOnTheScreen(); // round 059: the class from the Spellbook card
  await user.type(screen.getByLabelText('English meaning'), 'coffee');
  await user.press(screen.getByRole('button', { name: 'Check answer' }));
  await screen.findByText('Correct.');
  await user.press(screen.getByRole('button', { name: 'Continue reviews' }));
  await screen.findByRole('heading', { name: 'senza latte' });
  expect(screen.getByLabelText('English meaning')).toHaveDisplayValue(''); // previous answer must not carry over
  expect(screen.getByText('prepositional phrase')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Show answer' }));
  await screen.findByText(/recorded as quality 0/);
  expect(screen.getByText(/^Answer:/)).toHaveTextContent('Answer: without milk');
  await user.press(screen.getByRole('button', { name: 'Return to Gerald' }));
  expect(await screen.findByLabelText('Conversation with Gerald')).toBeOnTheScreen();

  await user.press(screen.getByRole('button', { name: 'Open the map' }));
  expect(await screen.findByText('✓ Encounter complete')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Talk to Gerald again' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Walk to Market Entrance' })).toBeEnabled();
});

test('loading plus empty and no-due states remain understandable', async () => {
  const loading = await render(<DialoguePanel encounter={encounter()} language={language} isLoading onHelp={() => {}} />);
  expect(screen.getByText(/considering the linguistic implications/)).toBeOnTheScreen();
  await loading.unmount();
  const empty = await render(<Spellbook spellbook={{ cards: [], dueCount: 0 }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} />);
  expect(screen.getByText('No vocabulary yet')).toBeOnTheScreen();
  await empty.unmount();
  await render(<Spellbook spellbook={{ cards: [{ ...cards[0], due: false, nextReviewAt: '2026-01-16T12:00:00Z' }], dueCount: 0 }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={Date.parse('2026-01-15T12:00:00Z')} />);
  expect(screen.getByText(/Nothing is due/)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Review' })).not.toBeOnTheScreen();
});

test('the tutorial shows the companion briefing, Gerald does not, and the first screen does not auto-scroll', async () => {
  const scroll = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => {});
  const briefing = ['Portia only lets in people who greet her properly.', 'Tap a word under her line to see what it means.'];
  const tutorial = { ...encounter(), encounterId: 'market_entrance_tutorial', location: 'market_entrance', character: { name: 'Portia' }, companionBriefing: briefing };
  const view = await render(<DialoguePanel encounter={tutorial} language={language} isLoading={false} onHelp={() => {}} />);
  expect(screen.getByLabelText('Your companion')).toBeOnTheScreen();
  for (const line of briefing) expect(screen.getByText(line)).toBeOnTheScreen();
  const list = screen.getByLabelText('Conversation with Portia');
  fireEvent(list, 'contentSizeChange', 320, 900);
  expect(scroll).not.toHaveBeenCalled();
  await view.rerender(<DialoguePanel encounter={{ ...tutorial, transcript: [...tutorial.transcript, { id: 'player-1', role: 'player', text: 'Ciao!' }] }} language={language} isLoading={false} onHelp={() => {}} />);
  fireEvent(screen.getByLabelText('Conversation with Portia'), 'contentSizeChange', 320, 1200);
  expect(scroll).toHaveBeenCalledWith({ animated: false }); // round 035: jest runs with Reduce Motion on
  await view.unmount();
  await render(<DialoguePanel encounter={{ ...encounter(), companionBriefing: null }} language={language} isLoading={false} onHelp={() => {}} />);
  expect(screen.queryByLabelText('Your companion')).not.toBeOnTheScreen();
  scroll.mockRestore();
});

test('CLI provider error is actionable, clears pending state, and retains input', async () => {
  const user = userEvent.setup();
  let resolveDialogue;
  globalThis.fetch = jest.fn(async (url) => {
    const path = pathOf(url);
    if (path === '/api/learner') return response(201, learner);
    if (path === '/api/encounter/start') return response(200, { encounter: encounter(), spellbook });
    if (path === '/api/world') return response(200, { world: cartWorld() });
    if (path === '/api/spellbook') return response(200, spellbook);
    if (path === '/api/party') return response(200, { party: [] });
    if (path === '/api/encounter/dialogue') return new Promise((resolveRequest) => { resolveDialogue = resolveRequest; });
    throw new Error(`Unexpected fetch ${path}`);
  });
  useGameStore.setState({ learnerId: learner.learnerId, language, encounter: encounter(), spellbook, isLoading: false, view: 'dialogue' });
  await render(<App />);
  await screen.findByText('Order a coffee from Gerald, using Italian for the coffee request.');
  const input = screen.getByLabelText('Your response');
  await user.type(input, 'Vorrei un caffè senza latte.');
  await user.press(screen.getByRole('button', { name: 'Send' }));
  expect(screen.getByText(/considering the linguistic implications/)).toBeOnTheScreen();
  expect(input).toHaveDisplayValue('Vorrei un caffè senza latte.');
  await act(async () => resolveDialogue(response(503, { error: {
    code: 'CLI_AUTH_REQUIRED',
    message: 'The selected CLI is not signed in with its native subscription. Sign in with the official CLI, run npm run check:provider, then retry.',
    retryable: false,
  } })));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Sign in with the official CLI/);
  expect(input).not.toBeDisabled();
  expect(input).toHaveDisplayValue('Vorrei un caffè senza latte.');
});
