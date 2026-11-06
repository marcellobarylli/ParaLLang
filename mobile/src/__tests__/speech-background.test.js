// Round 064 (backlog C10d): leaving the app stops the voice; coming back never leaves the ambience lowered for nothing.
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';
import { createAudioPlayer } from 'expo-audio';
import { speak } from '../speech.js';
import { AMBIENCE_VOLUME, DUCKED_VOLUME, duckAmbience, resetAmbienceForTests, setAmbience } from '../ambience.js';

const alice = { identifier: 'com.apple.voice.compact.it-IT.Alice', language: 'it-IT', name: 'Alice', quality: 'Default' };
const flush = () => new Promise((done) => setTimeout(done, 0));
let listeners;

beforeEach(() => {
  jest.clearAllMocks();
  resetAmbienceForTests();
  listeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    listeners.push(fn);
    return { remove: jest.fn() };
  });
});
afterEach(() => { jest.restoreAllMocks(); resetAmbienceForTests(); });

// speech.js subscribes on its first speak; the ambience has its own listener (setAmbience).
const speechListener = () => listeners.at(-1);

test('background stops the voice and restores the ambience; the late onDone is harmless; inactive does not stop', async () => {
  await setAmbience('coffee_cart');
  const player = createAudioPlayer.mock.results.at(-1).value;
  await speak('caffè', { tag: 'it-IT', voice: alice });
  await speak('cornetto', { tag: 'it-IT', voice: alice });
  expect(listeners).toHaveLength(2); // one for the ambience, one for speech, for any number of words
  expect(player.volume).toBe(DUCKED_VOLUME);
  const stops = Speech.stop.mock.calls.length;
  speechListener()('inactive');
  expect(Speech.stop.mock.calls.length).toBe(stops);
  expect(player.volume).toBe(DUCKED_VOLUME);
  speechListener()('background');
  await flush();
  expect(Speech.stop.mock.calls.length).toBe(stops + 1);
  expect(player.volume).toBe(AMBIENCE_VOLUME);
  duckAmbience(true); // something else ducks; the old word's late onDone must not undo it
  Speech.speak.mock.calls.at(-1)[1].onDone();
  expect(player.volume).toBe(DUCKED_VOLUME);
});

test('background during speak\'s wait: the word is never spoken (critique 1.5)', async () => {
  let release;
  Speech.stop.mockImplementationOnce(() => new Promise((done) => { release = done; }));
  const pending = speak('caffè', { tag: 'it-IT', voice: alice });
  speechListener()('background');
  release();
  await pending;
  expect(Speech.speak).not.toHaveBeenCalled();
});

test('back to active: undocked when nothing speaks, kept while the voice still speaks (critique 1.3)', async () => {
  await setAmbience('coffee_cart');
  const player = createAudioPlayer.mock.results.at(-1).value;
  await speak('caffè', { tag: 'it-IT', voice: alice });
  Speech.isSpeakingAsync.mockResolvedValueOnce(true);
  speechListener()('active');
  await flush();
  expect(player.volume).toBe(DUCKED_VOLUME);
  speechListener()('active'); // interrupted with no callback: nothing speaks now
  await flush();
  expect(player.volume).toBe(AMBIENCE_VOLUME);
  duckAmbience(true);
  Speech.isSpeakingAsync.mockRejectedValueOnce(new Error('no native module'));
  speechListener()('active');
  await flush();
  expect(player.volume).toBe(AMBIENCE_VOLUME);
});

test('a throwing addEventListener does not stop speak', async () => {
  AppState.addEventListener.mockImplementation(() => { throw new Error('no AppState'); });
  await speak('caffè', { tag: 'it-IT', voice: alice });
  expect(Speech.speak).toHaveBeenCalledWith('caffè', expect.anything());
});

test('a word started while the return query is pending keeps its duck (round 065 Amendment 1)', async () => {
  await setAmbience('coffee_cart');
  const player = createAudioPlayer.mock.results.at(-1).value;
  await speak('caffè', { tag: 'it-IT', voice: alice });
  let answer;
  Speech.isSpeakingAsync.mockImplementationOnce(() => new Promise((done) => { answer = done; }));
  speechListener()('active');
  await flush();
  await speak('cornetto', { tag: 'it-IT', voice: alice });
  answer(false); // the stale "not speaking" lands after the new word ducked
  await flush();
  expect(player.volume).toBe(DUCKED_VOLUME);
});
