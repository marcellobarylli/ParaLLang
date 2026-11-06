// Round 063 (backlog C10c): no voice outlives the screen that started it.
import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { render, screen, userEvent } from '@testing-library/react-native';
import Spellbook from '../components/Spellbook.js';
import ReviewPanel from '../components/ReviewPanel.js';
import { speak, stopSpeech } from '../speech.js';
import { AMBIENCE_VOLUME, DUCKED_VOLUME, resetAmbienceForTests, setAmbience } from '../ambience.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const alice = { identifier: 'com.apple.voice.compact.it-IT.Alice', language: 'it-IT', name: 'Alice', quality: 'Default' };

function heldStop() {
  let release;
  const speech = { stop: jest.fn(() => new Promise((done) => { release = done; })), speak: jest.fn() };
  return { speech, release: () => release() };
}

test('a stop during speak\'s wait wins: nothing is spoken and the ambience stays restored (critiques 1.1, 1.2)', async () => {
  const duck = jest.fn();
  const { speech, release } = heldStop();
  const pending = speak('caffè', { tag: 'it-IT', voice: alice }, speech, duck);
  const stopped = stopSpeech({ stop: () => Promise.resolve() }, duck);
  release();
  await Promise.all([pending, stopped]);
  expect(speech.speak).not.toHaveBeenCalled();
  expect(duck.mock.calls.at(-1)).toEqual([false]);
});

test('a newer word during the wait: only the newer one speaks', async () => {
  const duck = jest.fn();
  const first = heldStop();
  const second = { stop: jest.fn(async () => {}), speak: jest.fn() };
  const older = speak('caffè', { tag: 'it-IT', voice: alice }, first.speech, duck);
  await speak('cornetto', { tag: 'it-IT', voice: alice }, second, duck);
  first.release();
  await older;
  expect(first.speech.speak).not.toHaveBeenCalled();
  expect(second.speak).toHaveBeenCalledWith('cornetto', expect.anything());
});

// Round 089 (review R1.4 of rounds 040–053): a throw from the speech call, or no voice, restores the ambience.
test('a speak that throws, or has no voice, does not leave the ambience lowered', async () => {
  for (const [voice, speech] of [
    [alice, { stop: jest.fn(async () => {}), speak: jest.fn(() => { throw new Error('native speech error'); }) }],
    [null, { stop: jest.fn(async () => {}), speak: jest.fn() }],
  ]) {
    const duck = jest.fn();
    await expect(speak('caffè', { tag: 'it-IT', voice }, speech, duck)).resolves.toBeUndefined();
    expect(duck.mock.calls).toEqual([[true], [false]]);
  }
});

beforeEach(() => { jest.clearAllMocks(); resetAmbienceForTests(); Speech.getAvailableVoicesAsync.mockResolvedValue([alice]); });
afterEach(() => { resetAmbienceForTests(); });

test('leaving the Spellbook stops a fragment being read and restores the ambience', async () => {
  const user = userEvent.setup();
  await setAmbience('old_bookshop');
  const player = createAudioPlayer.mock.results.at(-1).value;
  const view = await render(<Spellbook language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} spellbook={{
    inEncounter: false, dueCount: 0, cards: [], containmentFiles: [], journeyFragments: [{
      id: 'f', title: 'The Sirens', found: 'Found.', text: 'Le sirene cantavano.', hidden: false, translation: 'The Sirens sang.', glossary: [],
    }],
  }} />);
  await user.press(await screen.findByRole('button', { name: 'Hear the fragment in Italian' }));
  expect(player.volume).toBe(DUCKED_VOLUME);
  const stops = Speech.stop.mock.calls.length;
  await view.unmount();
  expect(Speech.stop.mock.calls.length).toBe(stops + 1);
  expect(player.volume).toBe(AMBIENCE_VOLUME);
});

const review = (props) => render(<ReviewPanel language={language} isLoading={false} onSubmit={() => {}} onReveal={() => {}} onContinue={() => {}} onReturn={() => {}} {...props} />);

test('leaving the review stops the word; the result and the brief "no challenge" renders unmount cleanly (critique 1.5)', async () => {
  const user = userEvent.setup();
  await setAmbience('coffee_cart');
  const player = createAudioPlayer.mock.results.at(-1).value;
  const prompt = await review({ challenge: { id: 'c1', vocabularyId: 'caffe', target: 'caffè', kind: 'word', practice: false } });
  await user.press(await screen.findByRole('button', { name: 'Hear caffè in Italian' }));
  expect(player.volume).toBe(DUCKED_VOLUME);
  await prompt.unmount();
  expect(player.volume).toBe(AMBIENCE_VOLUME);
  for (const props of [{ result: { feedback: 'Correct.', canonicalAnswer: 'coffee', effectiveQuality: 5, nextReviewAt: '2026-01-16T12:00:00Z' } }, { challenge: null }]) {
    const view = await review(props);
    const stops = Speech.stop.mock.calls.length;
    await view.unmount();
    expect(Speech.stop.mock.calls.length).toBe(stops + 1);
  }
});
