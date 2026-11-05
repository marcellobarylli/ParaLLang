// Round 037 (backlog C4a): two UI cues made here, played on progress only, behind a per-device switch.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, userEvent } from '@testing-library/react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { CUE_NAMES, playCue, resetSoundsForTests } from '../sounds.js';
import { SOUNDS_KEY, createGameStore } from '../stores/gameStore.js';
import SavesPanel from '../components/SavesPanel.js';

const generator = require('../../scripts/gen-ui-sounds.js');
const asset = (name) => readFileSync(join(__dirname, '..', '..', 'assets', 'sounds', `${name}.wav`));

beforeEach(() => { resetSoundsForTests(); jest.clearAllMocks(); });

test('the committed cues are the generator\'s output: 16-bit mono PCM, short, peak near -12 dBFS', () => {
  expect(CUE_NAMES).toEqual(['pass', 'resolve']);
  for (const name of CUE_NAMES) {
    const bytes = asset(name);
    expect(Buffer.compare(bytes, generator.cueBytes(name))).toBe(0);
    expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(bytes.toString('ascii', 8, 12)).toBe('WAVE');
    expect([bytes.readUInt16LE(20), bytes.readUInt16LE(22), bytes.readUInt32LE(24), bytes.readUInt16LE(34)]).toEqual([1, 1, 22050, 16]);
    const samples = (bytes.length - 44) / 2;
    expect(samples / 22050).toBeGreaterThan(0.2);
    expect(samples / 22050).toBeLessThan(1);
    let peak = 0;
    for (let i = 44; i < bytes.length; i += 2) peak = Math.max(peak, Math.abs(bytes.readInt16LE(i)));
    const dbfs = 20 * Math.log10(peak / 32767);
    expect(dbfs).toBeGreaterThan(-13);
    expect(dbfs).toBeLessThan(-11);
  }
});

test('playCue sets the audio mode once, makes one player per cue, rewinds and replays; failures are swallowed', async () => {
  await playCue('pass');
  await playCue('pass');
  await playCue('resolve');
  await playCue('nothing');
  expect(setAudioModeAsync).toHaveBeenCalledTimes(1);
  expect(setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  const pass = createAudioPlayer.mock.results[0].value;
  expect(pass.seekTo).toHaveBeenCalledWith(0);
  expect(pass.play).toHaveBeenCalledTimes(2);
  resetSoundsForTests();
  createAudioPlayer.mockImplementationOnce(() => { throw new Error('no audio'); });
  await expect(playCue('pass')).resolves.toBeUndefined();
});

// A store with one ongoing encounter and scripted dialogue replies.
const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const encounter = (objectiveId, state = 'ongoing', version = 1) => ({
  id: 'enc-1', encounterId: 'imp_coffee_greeting', version, state, transcript: [], hints: { remaining: 2, limit: 2 }, difficulty: 0.25,
  currentObjective: objectiveId ? { id: objectiveId, prompt: objectiveId } : null,
});
const reply = (next, passed, extra = {}) => ({
  encounter: next, spellbook: { cards: [], dueCount: 0 }, replayed: false,
  assessment: { overallFeedback: 'ok', objectiveResults: passed.map(([objectiveId, ok]) => ({ objectiveId, passed: ok, feedback: '' })) }, ...extra,
});
function storeWith(replies, { stored = {}, fresh = [A, B] } = {}) {
  const values = new Map([['parallang.onboardingSeen', '1'], ...Object.entries(stored)]);
  const storage = { values, getItem: jest.fn(async (key) => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }) };
  const queue = [...replies];
  const ids = [...fresh];
  const api = {
    createLearner: jest.fn(async (id) => ({ learnerId: id ?? ids.shift(), recovered: Boolean(id), language })),
    getWorld: jest.fn(async () => ({ world: { currentLocationId: 'coffee_cart', locations: [], paths: [] } })),
    getSpellbook: jest.fn(async () => ({ cards: [], dueCount: 0 })),
    getParty: jest.fn(async () => ({ party: [] })),
    currentEncounter: jest.fn(async (id) => ({ encounter: id === A ? encounter('order', 'ongoing', 1) : null, spellbook: { cards: [], dueCount: 0 } })),
    getOnboarding: jest.fn(async () => null),
    sendDialogue: jest.fn(() => queue.shift()()),
    submitReview: jest.fn(async (_id, { action }) => ({ result: { correct: action === 'answer', effectiveQuality: action === 'answer' ? 5 : 0 }, spellbook: { cards: [], dueCount: 0 } })),
  };
  const cue = jest.fn();
  const store = createGameStore({ api, storage, cue });
  return { store, cue, storage, api };
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a cue plays only for progress: the current objective met, or the encounter resolved', async () => {
  const { store, cue } = storeWith([
    async () => reply(encounter('order', 'ongoing', 2), [['order', false], ['thank', true]]), // a later objective alone: no progress
    async () => reply(encounter('thank', 'ongoing', 3), [['order', true], ['thank', false]]), // progress
    async () => reply(encounter(null, 'resolved', 4), [['thank', true]]), // resolved
  ]);
  await store.getState().initialize();
  store.setState({ encounter: encounter('order', 'ongoing', 1) });
  for (const text of ['Grazie.', 'Un caffè.', 'Grazie!']) { await store.getState().sendMessage(text); await flush(); }
  expect(cue.mock.calls).toEqual([['pass'], ['resolve']]);
});

test('no cue for a replayed attempt, a miss, a reply after a save switch, or with the switch off', async () => {
  let release;
  const { store, cue } = storeWith([
    async () => reply(encounter('thank', 'ongoing', 2), [['order', true]], { replayed: true }),
    async () => reply(encounter('order', 'ongoing', 2), [['order', false]]),
    () => new Promise((resolve) => { release = () => resolve(reply(encounter(null, 'resolved', 3), [['order', true]])); }),
  ]);
  await store.getState().initialize();
  store.setState({ encounter: encounter('order', 'ongoing', 1) });
  await store.getState().sendMessage('Uno.');
  store.setState({ encounter: encounter('order', 'ongoing', 1) });
  await store.getState().sendMessage('Due.');
  await flush();
  expect(cue).not.toHaveBeenCalled();
  store.setState({ encounter: encounter('order', 'ongoing', 2) });
  const pending = store.getState().sendMessage('Tre.');
  store.setState({ learnerId: B }); // a save switch while the reply is out (newSave itself waits for isLoading)
  release();
  await pending;
  await flush();
  expect(cue).not.toHaveBeenCalled();

  store.setState({ learnerId: A, isLoading: false, reviewChallenge: { id: 'r1' } });
  store.getState().setSoundsOn(false);
  await store.getState().submitReview('coffee'); // correct, but the switch is off
  await flush();
  expect(cue).not.toHaveBeenCalled();
});

test('a correct review plays the pass cue, a reveal plays nothing', async () => {
  const { store, cue } = storeWith([]);
  await store.getState().initialize();
  store.setState({ reviewChallenge: { id: 'r1' } });
  await store.getState().submitReview('coffee');
  store.setState({ reviewChallenge: { id: 'r2' } });
  await store.getState().revealReviewAnswer();
  await flush();
  expect(cue.mock.calls).toEqual([['pass']]);
});

test('the switch persists, is read at startup, and a switch made during startup wins', async () => {
  const off = storeWith([], { stored: { [SOUNDS_KEY]: 'off' } });
  await off.store.getState().initialize();
  await flush();
  expect(off.store.getState().soundsOn).toBe(false);
  off.store.getState().setSoundsOn(true);
  await flush();
  expect(off.storage.values.get(SOUNDS_KEY)).toBe('on');

  const raced = storeWith([], { stored: { [SOUNDS_KEY]: 'off' } });
  const starting = raced.store.getState().initialize();
  raced.store.getState().setSoundsOn(true);
  await starting;
  await flush();
  expect(raced.store.getState().soundsOn).toBe(true);

  const other = storeWith([], { stored: { [SOUNDS_KEY]: A } }); // anything but 'off' is on
  await other.store.getState().initialize();
  await flush();
  expect(other.store.getState().soundsOn).toBe(true);
});

test('the Saves screen shows the switch with a fixed name and its state', async () => {
  const user = userEvent.setup();
  const onToggleSounds = jest.fn();
  const props = { saves: [{ learnerId: A, label: 'Save 1', createdAt: '2026-11-05T12:00:00.000Z' }], activeId: A, isLoading: false, onContinue: jest.fn(), onNew: jest.fn(), onReturn: jest.fn(), onToggleSounds };
  await render(<SavesPanel {...props} soundsOn />);
  const toggle = screen.getByRole('switch', { name: 'Sounds' });
  expect(toggle).toBeChecked();
  await user.press(toggle);
  expect(onToggleSounds).toHaveBeenCalledWith(false);
  await screen.rerender(<SavesPanel {...props} soundsOn={false} />);
  expect(screen.getByRole('switch', { name: 'Sounds' })).not.toBeChecked();
  expect(screen.getByText('Off')).toBeOnTheScreen();
});
