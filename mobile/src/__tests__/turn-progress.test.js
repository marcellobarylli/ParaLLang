// Round 070 (backlog I1): while a turn's reply is written, the app polls for the grader's verdict and shows it as
// provisional; the final response replaces it, and a failure or a late poll never leaves it behind.
import { render, screen } from '@testing-library/react-native';
import DialoguePanel from '../components/DialoguePanel.js';
import { PROGRESS_INTERVAL_MS, createGameStore } from '../stores/gameStore.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const identity = { learnerId: '11111111-1111-4111-8111-111111111111', recovered: true, language };
const encounter = { id: 'enc-1', encounterId: 'imp_coffee_greeting', character: { name: 'Gerald' }, version: 1, state: 'ongoing', transcript: [], hints: { remaining: 2, limit: 2 }, difficulty: 0.3, currentObjective: { id: 'order_coffee', prompt: 'Order a coffee.' } };
const spellbook = { cards: [], dueCount: 0, contentVersion: 'v1' };
const world = { currentLocationId: 'coffee_cart', locations: [{ id: 'coffee_cart', name: 'Cart', state: 'current', adjacent: false, map: { x: 0.5, y: 0.5 }, description: 'A cart.', encounter: { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald' } }], paths: [] };
const verdict = (feedback) => ({ overallFeedback: feedback, objectiveResults: [{ objectiveId: 'order_coffee', passed: true, feedback: 'Ordered.', vocabularyEvidence: [] }] });

function memoryStorage() {
  const values = new Map([['parallang.onboardingSeen', '1']]);
  return { getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
}
function deferred() { let resolve; let reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }

function setup(overrides = {}) {
  const api = {
    createLearner: jest.fn(async () => identity),
    startEncounter: jest.fn(async () => ({ encounter, spellbook })),
    getWorld: jest.fn(async () => ({ world })),
    getSpellbook: jest.fn(async () => spellbook),
    getParty: jest.fn(async () => ({ party: [] })),
    getOnboarding: jest.fn(),
    moveTo: jest.fn(),
    sendDialogue: jest.fn(), revealHelp: jest.fn(), createReview: jest.fn(), submitReview: jest.fn(),
    ...overrides,
  };
  const store = createGameStore({ api, storage: memoryStorage(), cue: jest.fn(), ambience: jest.fn() });
  return { api, store };
}
async function ready(store) {
  await store.getState().initialize();
  await store.getState().enterEncounter();
  expect(store.getState().encounter).toEqual(encounter);
}
const tick = () => jest.advanceTimersByTimeAsync(PROGRESS_INTERVAL_MS);

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test('the verdict shows while the reply is written; the response replaces it and the polls stop', async () => {
  const post = deferred();
  const early = verdict('Good order.');
  const progress = jest.fn(async () => ({ progress: { assessment: null } }));
  const { api, store } = setup({ sendDialogue: jest.fn(() => post.promise), getTurnProgress: progress });
  await ready(store);
  const sending = store.getState().sendMessage('Vorrei un caffè.');
  await tick();
  expect(progress).toHaveBeenCalledTimes(1);
  const attemptId = api.sendDialogue.mock.calls[0][1].attemptId;
  expect(progress).toHaveBeenCalledWith(identity.learnerId, attemptId);
  expect(store.getState().earlyAssessment).toBeNull();
  progress.mockImplementation(async () => ({ progress: { attemptId, assessment: early } }));
  await tick();
  expect(store.getState().earlyAssessment).toEqual(early);
  // The loop stops once it has the verdict.
  await tick();
  expect(progress).toHaveBeenCalledTimes(2);
  post.resolve({ encounter: { ...encounter, version: 2 }, spellbook, assessment: early, replayed: false });
  await sending;
  expect(store.getState().assessment).toEqual(early);
  expect(store.getState().earlyAssessment).toBeNull();
  await tick();
  expect(progress).toHaveBeenCalledTimes(2);
});

test('a failed POST clears the verdict, and a poll that answers after it settled does not bring it back (critique 1.1)', async () => {
  const post = deferred();
  const slowPoll = deferred();
  const progress = jest.fn(() => slowPoll.promise);
  const { store } = setup({ sendDialogue: jest.fn(() => post.promise), getTurnProgress: progress });
  await ready(store);
  const sending = store.getState().sendMessage('Vorrei un caffè.');
  await tick();
  expect(progress).toHaveBeenCalledTimes(1);
  post.reject(new Error('The NPC is temporarily unavailable.'));
  await sending;
  expect(store.getState().error).toBe('The NPC is temporarily unavailable.');
  slowPoll.resolve({ progress: { assessment: verdict('Too late.') } });
  await tick();
  expect(store.getState().earlyAssessment).toBeNull();
  expect(store.getState().pendingInput).toBe('Vorrei un caffè.');
});

test('a poll from the first send that answers during the second is ignored', async () => {
  const firstPost = deferred();
  const secondPost = deferred();
  const firstPoll = deferred();
  const posts = [firstPost, secondPost];
  const progress = jest.fn()
    .mockImplementationOnce(() => firstPoll.promise)
    .mockImplementation(async () => ({ progress: { assessment: null } }));
  const { store } = setup({ sendDialogue: jest.fn(() => posts.shift().promise), getTurnProgress: progress });
  await ready(store);
  const first = store.getState().sendMessage('Vorrei un caffè.');
  await tick();
  firstPost.reject(new Error('Try again.'));
  await first;
  const second = store.getState().sendMessage('Vorrei un caffè, per favore.');
  firstPoll.resolve({ progress: { assessment: verdict('From the first send.') } });
  await tick();
  expect(store.getState().earlyAssessment).toBeNull();
  secondPost.resolve({ encounter: { ...encounter, version: 2 }, spellbook, assessment: verdict('Final.'), replayed: false });
  await second;
  expect(store.getState().assessment.overallFeedback).toBe('Final.');
});

test('a save switch during a send drops its verdict', async () => {
  const post = deferred();
  const progress = jest.fn(async () => ({ progress: { assessment: verdict('Old save.') } }));
  const { store } = setup({ sendDialogue: jest.fn(() => post.promise), getTurnProgress: progress });
  await ready(store);
  const sending = store.getState().sendMessage('Vorrei un caffè.');
  store.getState().switchLearnerForTest('22222222-2222-4222-8222-222222222222');
  await tick();
  expect(store.getState().earlyAssessment).toBeNull();
  post.resolve({ encounter: { ...encounter, version: 2 }, spellbook, assessment: verdict('x'), replayed: false });
  await sending;
  expect(store.getState().earlyAssessment).toBeNull();
});

test('without getTurnProgress (the web client\'s shape, old fakes) a send works as before', async () => {
  const { store } = setup({ sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2 }, spellbook, assessment: verdict('Done.'), replayed: false })) });
  await ready(store);
  await store.getState().sendMessage('Vorrei un caffè.');
  expect(store.getState().assessment.overallFeedback).toBe('Done.');
  expect(store.getState().earlyAssessment).toBeNull();
});

test('the panel shows the provisional verdict under the pending answer, then the final one without the note', async () => {
  const early = verdict('Good order.');
  const old = verdict('The previous turn.');
  await render(<DialoguePanel encounter={encounter} language={language} isLoading assessment={old} earlyAssessment={early} pendingInput="Vorrei un caffè." onHelp={() => {}} />);
  expect(screen.getByText('Gerald is replying…')).toBeOnTheScreen();
  expect(screen.getByText('Your answer: “Vorrei un caffè.”')).toBeOnTheScreen();
  expect(screen.getByText('Good order.')).toBeOnTheScreen();
  expect(screen.getByText('Not counted until Gerald replies.')).toBeOnTheScreen();
  expect(screen.queryByText('The previous turn.')).not.toBeOnTheScreen();
  await screen.rerender(<DialoguePanel encounter={{ ...encounter, version: 2 }} language={language} isLoading={false} assessment={early} earlyAssessment={null} pendingInput={null} onHelp={() => {}} />);
  expect(screen.getByText('Good order.')).toBeOnTheScreen();
  expect(screen.queryByText('Not counted until Gerald replies.')).not.toBeOnTheScreen();
  expect(screen.queryByText(/Your answer:/)).not.toBeOnTheScreen();
  expect(screen.queryByText('Gerald is replying…')).not.toBeOnTheScreen();
});

test('while grading, the panel keeps the waiting line and the previous assessment', async () => {
  const old = verdict('The previous turn.');
  await render(<DialoguePanel encounter={encounter} language={language} isLoading assessment={old} earlyAssessment={null} pendingInput="Vorrei un caffè." onHelp={() => {}} />);
  expect(screen.getByText('Gerald is considering the linguistic implications…')).toBeOnTheScreen();
  expect(screen.getByText('The previous turn.')).toBeOnTheScreen();
});

// Round 075 (critiques 1.2, 1.3): the counted verdict is marked, announced once, and never after a failed send.
describe('counted', () => {
  const { AccessibilityInfo } = require('react-native');
  const { COUNTED, assessmentKey } = require('../components/DialoguePanel.js');
  let announce;
  beforeEach(() => { announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {}); });
  afterEach(() => { announce.mockRestore(); });

  async function provisionalThen(settle) {
    const post = deferred();
    const early = verdict('Good order.');
    const { store } = setup({ sendDialogue: jest.fn(() => post.promise), getTurnProgress: jest.fn(async () => ({ progress: { assessment: early } })) });
    await ready(store);
    const sending = store.getState().sendMessage('Vorrei un caffè.');
    await tick();
    expect(store.getState().earlyAssessment).toEqual(early);
    expect(store.getState().assessmentCounted).toBe(false);
    settle(post, early);
    await sending;
    return { store, early };
  }

  test('the store marks the committed verdict of a send whose provisional verdict was shown, and a new send clears it', async () => {
    const { store } = await provisionalThen((post, early) => post.resolve({ encounter: { ...encounter, version: 2 }, spellbook, assessment: early, replayed: false }));
    expect(store.getState().assessmentCounted).toBe(true);
    const next = store.getState().sendMessage('Senza latte.');
    expect(store.getState().assessmentCounted).toBe(false);
    await next.catch(() => {});
  });

  test('a success with no provisional verdict is not marked', async () => {
    const { store } = setup({ sendDialogue: jest.fn(async () => ({ encounter: { ...encounter, version: 2 }, spellbook, assessment: verdict('Quick.'), replayed: false })) });
    await ready(store);
    await store.getState().sendMessage('Vorrei un caffè.');
    expect(store.getState().assessment.overallFeedback).toBe('Quick.');
    expect(store.getState().assessmentCounted).toBe(false);
  });

  test('a failed POST after a provisional verdict leaves the previous verdict unmarked (critique 1.3)', async () => {
    const { store } = await provisionalThen((post) => post.reject(new Error('The NPC is temporarily unavailable.')));
    expect(store.getState().assessmentCounted).toBe(false);
    expect(store.getState().earlyAssessment).toBeNull();
  });

  test('the panel shows "Counted." after the provisional box, in a new box, and announces it once', async () => {
    const early = verdict('Good order.');
    await render(<DialoguePanel encounter={encounter} language={language} isLoading assessment={null} earlyAssessment={early} pendingInput="Vorrei un caffè." onHelp={() => {}} />);
    expect(screen.queryByText(COUNTED)).not.toBeOnTheScreen();
    const provisionalBox = screen.getByText('Not counted until Gerald replies.').parent;
    await screen.rerender(<DialoguePanel encounter={{ ...encounter, version: 2 }} language={language} isLoading={false} assessment={early} assessmentCounted earlyAssessment={null} pendingInput={null} onHelp={() => {}} />);
    expect(screen.getByText(COUNTED)).toBeOnTheScreen();
    expect(screen.queryByText('Not counted until Gerald replies.')).not.toBeOnTheScreen();
    expect(screen.getByText(COUNTED).parent).not.toBe(provisionalBox);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(COUNTED);
    await screen.rerender(<DialoguePanel encounter={{ ...encounter, version: 2 }} language={language} isLoading={false} assessment={early} assessmentCounted earlyAssessment={null} pendingInput={null} onHelp={() => {}} party={[]} />);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  test('a remount with the same counted verdict (a return from the map) does not announce again (Amendment 1)', async () => {
    const v = verdict('Once.');
    const props = { encounter: { ...encounter, version: 2 }, language, isLoading: false, assessment: v, assessmentCounted: true, earlyAssessment: null, pendingInput: null, onHelp: () => {} };
    const first = await render(<DialoguePanel {...props} />);
    expect(announce).toHaveBeenCalledTimes(1);
    await first.unmount();
    await render(<DialoguePanel {...props} />);
    expect(screen.getByText(COUNTED)).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledTimes(1);
  });

  test('a counted turn, then a failed one: the first verdict shows again without "Counted." (Amendment 1)', async () => {
    const first = verdict('First counted.');
    const second = deferred();
    const progress = jest.fn(async () => ({ progress: { assessment: first } }));
    const post = jest.fn().mockResolvedValueOnce({ encounter: { ...encounter, version: 2 }, spellbook, assessment: first, replayed: false }).mockImplementationOnce(() => second.promise);
    const { store } = setup({ sendDialogue: jest.fn(async (...args) => { if (post.mock.calls.length === 0) await tick(); return post(...args); }), getTurnProgress: progress });
    await ready(store);
    await store.getState().sendMessage('Vorrei un caffè.');
    expect(store.getState().assessmentCounted).toBe(true);
    progress.mockImplementation(async () => ({ progress: { assessment: verdict('Second provisional.') } }));
    const sending = store.getState().sendMessage('Senza latte.');
    await tick();
    expect(store.getState().earlyAssessment.overallFeedback).toBe('Second provisional.');
    second.reject(new Error('The NPC is temporarily unavailable.'));
    await sending;
    const s = store.getState();
    expect(s.assessment).toEqual(first);
    expect(s.assessmentCounted).toBe(false);
    await render(<DialoguePanel encounter={s.encounter} language={language} isLoading={s.isLoading} assessment={s.assessment} assessmentCounted={s.assessmentCounted} earlyAssessment={s.earlyAssessment} pendingInput={s.pendingInput} onHelp={() => {}} />);
    expect(screen.getByText('First counted.')).toBeOnTheScreen();
    expect(screen.queryByText(COUNTED)).not.toBeOnTheScreen();
  });

  test('an unmarked verdict shows no "Counted." and announces nothing', async () => {
    await render(<DialoguePanel encounter={encounter} language={language} isLoading={false} assessment={verdict('Old.')} earlyAssessment={null} pendingInput={null} onHelp={() => {}} />);
    expect(screen.getByText('Old.')).toBeOnTheScreen();
    expect(screen.queryByText(COUNTED)).not.toBeOnTheScreen();
    expect(announce).not.toHaveBeenCalled();
  });

  test('the key differs by phase for the same verdict and is equal for equal verdicts in a phase', () => {
    const v = verdict('Same.');
    expect(assessmentKey(v, 'provisional')).not.toBe(assessmentKey(v, 'counted'));
    expect(assessmentKey(v, 'counted')).not.toBe(assessmentKey(v, 'final'));
    expect(assessmentKey(v, 'final')).toBe(assessmentKey(verdict('Same.')));
  });
});
