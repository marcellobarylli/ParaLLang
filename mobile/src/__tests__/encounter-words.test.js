// Round 055 (backlog C5): each word chip under an NPC line can be heard, free of hints, outside the chip.
import * as Speech from 'expo-speech';
import { render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import DialoguePanel from '../components/DialoguePanel.js';
import PronounceButton from '../components/PronounceButton.js';
import { speak, stopSpeech, voiceFor } from '../speech.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const alice = { identifier: 'com.apple.voice.compact.it-IT.Alice', language: 'it-IT', name: 'Alice', quality: 'Default' };

const word = (vocabularyId, canonicalTarget, meaning) => ({ vocabularyId, target: canonicalTarget, canonicalTarget, partOfSpeech: 'noun', meaning, meaningAvailable: true });
const line = ({ words, isProtected = true }) => ({
  id: 'npc-1', role: 'npc', narrative: 'Gerald polishes a cup.', protected: isProtected,
  dialogue: { speaker: 'Gerald', native: 'Un caffè? Or a cornetto?', translation: undefined, translationAvailable: true, words },
});
const encounter = ({ words, hints = 2, isProtected = true }) => ({
  id: 'session-1', encounterId: 'imp_coffee_greeting', state: 'ongoing', character: { name: 'Gerald', saveable: true },
  transcript: [line({ words, isProtected })], hints: { remaining: hints, limit: 2 }, hints_available: hints > 0, difficulty: 0.25,
  currentObjective: { id: 'order', prompt: 'Order a coffee, in Italian.' },
});
const twoWords = [word('caffe', 'caffè'), word('cornetto', 'cornetto')];

beforeEach(() => {
  jest.clearAllMocks();
  Speech.getAvailableVoicesAsync.mockResolvedValue([alice]);
});

const panel = (props) => <DialoguePanel language={language} isLoading={false} onHelp={() => {}} {...props} />;

test('every chip has its own speaker; pressing one says the chip\'s word with the Italian voice and asks for no hint', async () => {
  const user = userEvent.setup();
  const onHelp = jest.fn();
  await render(panel({ encounter: encounter({ words: twoWords }), onHelp }));
  const words = screen.getByLabelText('Words');
  await user.press(await within(words).findByRole('button', { name: 'Hear cornetto in Italian' }));
  expect(within(words).getByRole('button', { name: 'Hear caffè in Italian' })).toBeEnabled();
  expect(Speech.speak).toHaveBeenCalledWith('cornetto', expect.objectContaining({ language: 'it-IT', voice: alice.identifier }));
  expect(onHelp).not.toHaveBeenCalled();
  // One voice lookup for both buttons, mounted in the same render (critique 1.2).
  expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
});

test('the speaker stays enabled while its chip is disabled: loading, meaning shown, no hints left (critique 1.9)', async () => {
  const cases = [
    { name: 'loading', props: { encounter: encounter({ words: twoWords }), isLoading: true }, chip: 'caffè' },
    { name: 'meaning shown', props: { encounter: encounter({ words: [word('caffe', 'caffè', 'coffee')] }) }, chip: 'caffè' },
    { name: 'no hints', props: { encounter: encounter({ words: twoWords, hints: 0 }) }, chip: 'caffè' },
  ];
  for (const { props, chip } of cases) {
    const view = await render(panel(props));
    expect(screen.getByRole('button', { name: `Translate word: ${chip}, noun` })).toBeDisabled();
    expect(await screen.findByRole('button', { name: `Hear ${chip} in Italian` })).toBeEnabled();
    await view.unmount();
  }
});

test('without an Italian voice the chip rows have no speaker and the chips still translate', async () => {
  const user = userEvent.setup();
  Speech.getAvailableVoicesAsync.mockResolvedValue([]);
  const onHelp = jest.fn();
  await render(panel({ encounter: encounter({ words: twoWords }), onHelp }));
  await waitFor(() => expect(Speech.getAvailableVoicesAsync).toHaveBeenCalled());
  expect(screen.queryByRole('button', { name: /^Hear / })).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Italian pronunciation unavailable' })).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Translate word: caffè, noun' }));
  expect(onHelp).toHaveBeenCalledWith({ kind: 'word', messageId: 'npc-1', vocabularyId: 'caffe' });
});

test('a found voice is shared; a miss is looked up again on the next mount', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValueOnce([]).mockResolvedValue([alice]);
  expect(await voiceFor('it-IT')).toBeNull();
  expect(await voiceFor('it-IT')).toBe(alice);
  expect(await voiceFor('it-IT')).toBe(alice);
  expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(2);
  expect(await voiceFor(null)).toBeNull();
});

test('the Spellbook-style button keeps its disabled 🔇 without a voice', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([]);
  await render(<PronounceButton text="caffè" language={language} />);
  expect(await screen.findByRole('button', { name: 'Italian pronunciation unavailable' })).toBeDisabled();
});

test('a late onStopped from the previous word leaves the ambience ducked; the latest word restores it (critique 1.7)', async () => {
  const duck = jest.fn();
  await speak('caffè', { tag: 'it-IT', voice: alice }, Speech, duck);
  const first = Speech.speak.mock.calls[0][1];
  await speak('cornetto', { tag: 'it-IT', voice: alice }, Speech, duck);
  const second = Speech.speak.mock.calls[1][1];
  first.onStopped();
  expect(duck.mock.calls.map(([on]) => on)).toEqual([true, true]);
  second.onDone();
  expect(duck.mock.calls.at(-1)).toEqual([false]);
});

test('stopSpeech stops the voice, restores the ambience, and silences a pending word\'s late callback', async () => {
  const duck = jest.fn();
  await speak('caffè', { tag: 'it-IT', voice: alice }, Speech, duck);
  const pending = Speech.speak.mock.calls[0][1];
  await stopSpeech(Speech, duck);
  expect(Speech.stop).toHaveBeenCalledTimes(2);
  expect(duck.mock.calls.at(-1)).toEqual([false]);
  duck.mockClear();
  pending.onDone();
  expect(duck).not.toHaveBeenCalled();
});

test('leaving the encounter screen stops the voice (critique 1.8)', async () => {
  const view = await render(panel({ encounter: encounter({ words: twoWords }) }));
  await screen.findByRole('button', { name: 'Hear caffè in Italian' });
  expect(Speech.stop).not.toHaveBeenCalled();
  await view.unmount();
  expect(Speech.stop).toHaveBeenCalledTimes(1);
});
