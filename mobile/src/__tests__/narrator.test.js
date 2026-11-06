// Round 061 (backlog C10): the narration can be heard in an English voice, on demand.
import * as Speech from 'expo-speech';
import { render, screen, userEvent, within } from '@testing-library/react-native';
import DialoguePanel from '../components/DialoguePanel.js';
import { createAudioPlayer } from 'expo-audio';
import { AMBIENCE_VOLUME, DUCKED_VOLUME, resetAmbienceForTests, setAmbience } from '../ambience.js';
import { findVoice } from '../speech.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const alice = { identifier: 'com.apple.voice.compact.it-IT.Alice', language: 'it-IT', name: 'Alice', quality: 'Default' };
const daniel = { identifier: 'com.apple.voice.compact.en-GB.Daniel', language: 'en-GB', name: 'Daniel', quality: 'Default' };
const samantha = { identifier: 'com.apple.voice.compact.en-US.Samantha', language: 'en-US', name: 'Samantha', quality: 'Default' };
const bubbles = { identifier: 'com.apple.speech.synthesis.voice.Bubbles', language: 'en-US', name: 'Bubbles', quality: 'Default' };
const eloquence = { identifier: 'com.apple.eloquence.en-GB.Reed', language: 'en-GB', name: 'Reed', quality: 'Default' };

const message = (id, narrative) => ({
  id, role: 'npc', narrative, protected: false,
  dialogue: { speaker: 'Gerald', native: 'Un caffè?', translation: 'A coffee?', translationAvailable: true, words: [
    { vocabularyId: 'caffe', target: 'caffè', canonicalTarget: 'caffè', partOfSpeech: 'noun', meaningAvailable: true },
  ] },
});
const encounter = (transcript) => ({
  id: 'session-1', encounterId: 'imp_coffee_greeting', state: 'ongoing', character: { name: 'Gerald', saveable: true },
  transcript, hints: { remaining: 2, limit: 2 }, hints_available: true, difficulty: 0.25,
  currentObjective: { id: 'order', prompt: 'Order a coffee, in Italian.' },
});
const panel = (transcript) => render(<DialoguePanel language={language} isLoading={false} onHelp={() => {}} encounter={encounter(transcript)} />);

beforeEach(() => { jest.clearAllMocks(); });

test('the narrator reads the narration in a British voice (decision 2)', async () => {
  const user = userEvent.setup();
  Speech.getAvailableVoicesAsync.mockResolvedValue([alice, eloquence, samantha, daniel]);
  await panel([message('npc-1', 'Gerald polishes a cup with deep suspicion.')]);
  expect(screen.getByText('Gerald polishes a cup with deep suspicion.')).toBeOnTheScreen();
  await user.press(await screen.findByRole('button', { name: 'Hear the narrator' }));
  expect(Speech.speak).toHaveBeenCalledWith('Gerald polishes a cup with deep suspicion.', expect.objectContaining({ language: 'en-GB', voice: daniel.identifier }));
});

test('with only American voices, a novelty voice listed first is skipped (critique 1.5)', async () => {
  const user = userEvent.setup();
  Speech.getAvailableVoicesAsync.mockResolvedValue([bubbles, samantha, alice]);
  await panel([message('npc-1', 'Gerald sighs.')]);
  await user.press(await screen.findByRole('button', { name: 'Hear the narrator' }));
  expect(Speech.speak).toHaveBeenCalledWith('Gerald sighs.', expect.objectContaining({ voice: samantha.identifier }));
});

test('no English voice but a novelty one: no narrator button (critique 1.7)', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([alice, bubbles]);
  await panel([message('npc-1', 'Gerald sighs.')]);
  expect(await screen.findByRole('button', { name: 'Hear caffè in Italian' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Hear the narrator' })).not.toBeOnTheScreen();
});

test('findVoice folds en_GB to en-GB', async () => {
  const android = { identifier: 'en-gb-x-rjs-local', language: 'en_GB', name: 'en-gb-x-rjs-local', quality: 'Default' };
  const us = { identifier: 'en-us-x-sfg-local', language: 'en_US', name: 'en-us-x-sfg-local', quality: 'Default' };
  expect(await findVoice('en-GB', { getAvailableVoicesAsync: async () => [us, android] })).toBe(android);
});

test('a missing or blank narration renders no text and no button; two messages, two buttons (critiques 1.3, 1.6)', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([daniel, alice]);
  await panel([message('npc-1', undefined), message('npc-2', ''), message('npc-3', '   '), message('npc-4', 'Gerald waits.'), message('npc-5', 'Gerald waits longer.')]);
  expect(await screen.findAllByRole('button', { name: 'Hear the narrator' })).toHaveLength(2);
});

test('a chip pressed during the narration cuts it; the narration\'s late stop leaves the ambience ducked (critique 1.8)', async () => {
  resetAmbienceForTests();
  const user = userEvent.setup();
  Speech.getAvailableVoicesAsync.mockResolvedValue([daniel, alice]);
  await setAmbience('coffee_cart');
  const cart = createAudioPlayer.mock.results.at(-1).value;
  await panel([message('npc-1', 'Gerald counts the beans.')]);
  await user.press(await screen.findByRole('button', { name: 'Hear the narrator' }));
  expect(cart.volume).toBe(DUCKED_VOLUME);
  await user.press(await within(screen.getByLabelText('Words')).findByRole('button', { name: 'Hear caffè in Italian' }));
  expect(Speech.speak.mock.calls.map(([text]) => text)).toEqual(['Gerald counts the beans.', 'caffè']);
  expect(Speech.stop).toHaveBeenCalledTimes(2);
  Speech.speak.mock.calls[0][1].onStopped(); // the narration's late stop
  expect(cart.volume).toBe(DUCKED_VOLUME);
  Speech.speak.mock.calls[1][1].onDone();
  expect(cart.volume).toBe(AMBIENCE_VOLUME);
  resetAmbienceForTests();
});
