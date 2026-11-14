// Round 041 (backlog C4b): one quiet ambience loop per location, behind the Sounds switch.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AMBIENCE_IDS, AMBIENCE_VOLUME, DUCKED_VOLUME, duckAmbience, resetAmbienceForTests, setAmbience } from '../ambience.js';
import { speak } from '../speech.js';
import { resetSoundsForTests } from '../sounds.js';
import { createGameStore } from '../stores/gameStore.js';

const generator = require('../../scripts/gen-ambient.js');
const root = join(__dirname, '..', '..');
const asset = (id) => readFileSync(join(root, 'assets', 'ambience', `${id}.wav`));
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let appStateListeners;
beforeEach(() => {
  resetAmbienceForTests(); resetSoundsForTests(); jest.clearAllMocks();
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
    appStateListeners.push(fn);
    return { remove: () => { appStateListeners = appStateListeners.filter((each) => each !== fn); } };
  });
});

test('every map location has a loop, and the app lists exactly those (ids read from the YAML)', () => {
  const dir = join(root, '..', 'content', 'world', 'locations');
  const ids = readdirSync(dir).map((file) => readFileSync(join(dir, file), 'utf8').match(/^id:\s*(\S+)/m)[1]).sort();
  expect(ids).toHaveLength(7);
  expect([...AMBIENCE_IDS].sort()).toEqual(ids);
  expect([...generator.AMBIENCE_IDS].sort()).toEqual(ids);
});

test('the committed loops are the generator\'s output: 16-bit mono 16 kHz, 6 s, quiet by average level', () => {
  for (const id of AMBIENCE_IDS) {
    const bytes = asset(id);
    expect(Buffer.compare(bytes, generator.ambienceBytes(id))).toBe(0);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect([bytes.readUInt16LE(20), bytes.readUInt16LE(22), bytes.readUInt32LE(24), bytes.readUInt16LE(34)]).toEqual([1, 1, 16000, 16]);
    const samples = [];
    for (let i = 44; i < bytes.length; i += 2) samples.push(bytes.readInt16LE(i) / 32767);
    expect(samples.length / 16000).toBeCloseTo(6, 5);
    const peak = 20 * Math.log10(Math.max(...samples.map(Math.abs)));
    const rms = 20 * Math.log10(Math.sqrt(samples.reduce((sum, v) => sum + v * v, 0) / samples.length));
    expect(peak).toBeLessThanOrEqual(-11.95);
    expect(rms).toBeGreaterThan(-40);
    expect(rms).toBeLessThan(-29.5);
  }
});

test('the loop seam: the rendered tail is blended into the head with equal-power gains', () => {
  const { LENGTH, FADE, loop } = generator;
  const bed = Float64Array.from({ length: LENGTH + FADE }, (_, i) => Math.sin(i * 0.37) + (i % 7) / 7);
  const out = loop(bed);
  expect(out).toHaveLength(LENGTH);
  expect(out[0]).toBeCloseTo(bed[LENGTH], 12); // the head starts as the tail's continuation
  const half = FADE / 2;
  expect(out[half]).toBeCloseTo(bed[half] * Math.SQRT1_2 + bed[LENGTH + half] * Math.SQRT1_2, 12);
  expect(out[FADE]).toBe(bed[FADE]);
  expect(out[LENGTH - 1]).toBe(bed[LENGTH - 1]);
});

test('setAmbience: one looping player per location, a change pauses the old one, null and unknown ids are silent', async () => {
  await setAmbience('coffee_cart');
  const cart = createAudioPlayer.mock.results[0].value;
  expect(cart.loop).toBe(true);
  expect(cart.volume).toBe(AMBIENCE_VOLUME);
  expect(cart.play).toHaveBeenCalledTimes(1);
  expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  await setAmbience('coffee_cart'); // same place: nothing restarts
  expect(cart.play).toHaveBeenCalledTimes(1);
  await setAmbience('the_rift');
  const rift = createAudioPlayer.mock.results[1].value;
  expect(cart.pause).toHaveBeenCalled();
  expect(rift.play).toHaveBeenCalledTimes(1);
  await setAmbience(null);
  expect(rift.pause).toHaveBeenCalled();
  await setAmbience('nowhere');
  await setAmbience('coffee_cart'); // back: the same player again
  expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  expect(cart.play).toHaveBeenCalledTimes(2);
});

test('setAmbience: returning to the foreground reconciles (expo-audio pauses in the background itself)', async () => {
  await setAmbience('old_bookshop');
  const shop = createAudioPlayer.mock.results[0].value;
  expect(appStateListeners).toHaveLength(1);
  appStateListeners[0]('inactive'); // Control Center, Face ID: nothing changes
  appStateListeners[0]('background');
  await flush();
  expect(shop.pause).not.toHaveBeenCalled();
  expect(shop.play).toHaveBeenCalledTimes(1);
  appStateListeners[0]('active');
  await flush();
  expect(shop.play).toHaveBeenCalledTimes(2);
  resetAmbienceForTests();
  createAudioPlayer.mockImplementationOnce(() => { throw new Error('no audio'); });
  await expect(setAmbience('the_rift')).resolves.toBeUndefined();
});

test('setAmbience: changes in the same tick end in the last one (A then B then null: silence)', async () => {
  await setAmbience('coffee_cart');
  const cart = createAudioPlayer.mock.results[0].value;
  await Promise.all([setAmbience('the_rift'), setAmbience('coffee_cart'), setAmbience(null)]);
  expect(cart.play).toHaveBeenCalledTimes(1);
  expect(createAudioPlayer).toHaveBeenCalledTimes(1); // the Rift never got as far as a player
  await Promise.all([setAmbience('the_rift'), setAmbience('coffee_cart')]);
  expect(cart.play).toHaveBeenCalledTimes(2);
  expect(createAudioPlayer).toHaveBeenCalledTimes(1);
});

test('the ambience is lowered while the pronunciation voice speaks, and restored when it ends', async () => {
  await setAmbience('market_entrance');
  const gate = createAudioPlayer.mock.results[0].value;
  await speak('ciao', { tag: 'it-IT', voice: { identifier: 'v' } });
  expect(gate.volume).toBe(DUCKED_VOLUME);
  const options = Speech.speak.mock.calls.at(-1)[1];
  options.onDone();
  expect(gate.volume).toBe(AMBIENCE_VOLUME);
  duckAmbience(true);
  options.onStopped();
  expect(gate.volume).toBe(AMBIENCE_VOLUME);
  duckAmbience(true);
  await setAmbience('the_rift'); // a new place while ducked starts ducked
  expect(createAudioPlayer.mock.results[1].value.volume).toBe(DUCKED_VOLUME);
  options.onError();
  expect(createAudioPlayer.mock.results[1].value.volume).toBe(AMBIENCE_VOLUME);
});

// The store follows the current location, the switch and the statement screen.
const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const A = '11111111-1111-4111-8111-111111111111';
const world = (currentLocationId) => ({ world: { currentLocationId, locations: [], paths: [] } });
function storeWith({ stored = {}, onboarding = null, slowSoundsRead = false } = {}) {
  const values = new Map([['parallang.onboardingSeen', onboarding ? null : '1'], ...Object.entries(stored)].filter(([, v]) => v !== null));
  const storage = { getItem: jest.fn(async (key) => { if (slowSoundsRead && key === 'parallang.soundsOn') await new Promise((r) => setTimeout(r, 20)); return values.get(key) ?? null; }), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
  const api = {
    createLearner: jest.fn(async () => ({ learnerId: A, recovered: false, language })),
    getWorld: jest.fn(async () => world('market_entrance')),
    moveTo: jest.fn(async (_id, to) => world(to)),
    getSpellbook: jest.fn(async () => ({ cards: [], dueCount: 0 })),
    getParty: jest.fn(async () => ({ party: [] })),
    currentEncounter: jest.fn(async () => ({ encounter: null, spellbook: { cards: [], dueCount: 0 } })),
    getOnboarding: jest.fn(async () => (onboarding ? { onboarding } : null)),
  };
  const ambience = jest.fn();
  const store = createGameStore({ api, storage, cue: jest.fn(), ambience });
  return { store, ambience };
}

test('the store plays the current location after startup and after a move; nothing before', async () => {
  const { store, ambience } = storeWith();
  expect(ambience).not.toHaveBeenCalled();
  await store.getState().initialize();
  await flush();
  expect(ambience.mock.calls).toEqual([['market_entrance']]);
  await store.getState().moveTo('coffee_cart');
  expect(ambience.mock.calls.at(-1)).toEqual(['coffee_cart']);
  store.getState().openSpellbook(); // another screen, same place: no new call
  expect(ambience).toHaveBeenCalledTimes(2);
});

test('the Sounds switch silences the ambience and brings it back; a stored off starts silent', async () => {
  const { store, ambience } = storeWith();
  await store.getState().initialize();
  await flush();
  store.getState().setSoundsOn(false);
  expect(ambience.mock.calls.at(-1)).toEqual([null]);
  store.getState().setSoundsOn(true);
  expect(ambience.mock.calls.at(-1)).toEqual(['market_entrance']);

  // A stored off is waited for: the world arriving first plays nothing (critique 1.9).
  const off = storeWith({ stored: { 'parallang.soundsOn': 'off' }, slowSoundsRead: true });
  await off.store.getState().initialize();
  expect(off.store.getState().world.currentLocationId).toBe('market_entrance');
  expect(off.store.getState().soundsKnown).toBe(false);
  await new Promise((r) => setTimeout(r, 40));
  expect(off.store.getState().soundsKnown).toBe(true);
  expect(off.ambience.mock.calls.flat().filter(Boolean)).toEqual([]);
});

test('the statement screen is silent; entering the market starts the loop', async () => {
  const { store, ambience } = storeWith({ onboarding: { title: 'T', paragraphs: ['p'], begin: 'Enter' } });
  await store.getState().initialize();
  await flush();
  expect(store.getState().view).toBe('onboarding');
  expect(ambience.mock.calls.flat().filter(Boolean)).toEqual([]);
  await store.getState().finishOnboarding();
  expect(ambience.mock.calls.at(-1)).toEqual(['market_entrance']);
});
