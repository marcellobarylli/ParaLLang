// Round 081 (backlog B5): the narrator's footnote under the narration, marked "*", and read after it.
import * as Speech from 'expo-speech';
import { render, screen, userEvent } from '@testing-library/react-native';
import DialoguePanel from '../components/DialoguePanel.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const daniel = { identifier: 'com.apple.voice.compact.en-GB.Daniel', language: 'en-GB', name: 'Daniel', quality: 'Default' };
const NOTE = 'POV: you are a coffee cart and someone said "decaf".';

const message = (id, narrative, footnote) => ({
  id, role: 'npc', narrative, protected: false, ...(footnote === undefined ? {} : { footnote }),
  dialogue: { speaker: 'Gerald', native: 'Un caffè?', translation: 'A coffee?', translationAvailable: true, words: [] },
});
const encounter = (transcript) => ({
  id: 'session-1', encounterId: 'imp_coffee_greeting', state: 'ongoing', character: { name: 'Gerald', saveable: true },
  transcript, hints: { remaining: 2, limit: 2 }, hints_available: true, difficulty: 0.25,
  currentObjective: { id: 'order', prompt: 'Order a coffee, in Italian.' },
});
const panel = (transcript) => render(<DialoguePanel language={language} isLoading={false} onHelp={() => {}} encounter={encounter(transcript)} />);

beforeEach(() => { jest.clearAllMocks(); Speech.getAvailableVoicesAsync.mockResolvedValue([daniel]); });

test('a footnote shows under the narration, which ends in "*", and the narrator reads both', async () => {
  const user = userEvent.setup();
  await panel([message('npc-1', 'Gerald polishes a cup.', NOTE)]);
  expect(screen.getByText('Gerald polishes a cup.*')).toBeOnTheScreen();
  expect(screen.getByText(`* ${NOTE}`)).toBeOnTheScreen();
  expect(screen.getByLabelText(`Footnote: ${NOTE}`)).toBeOnTheScreen();
  await user.press(await screen.findByRole('button', { name: 'Hear the narrator' }));
  expect(Speech.speak).toHaveBeenCalledWith(`Gerald polishes a cup. ${NOTE}`, expect.objectContaining({ language: 'en-GB' }));
});

test('no footnote, null or blank: the narration as before, no "*"', async () => {
  await panel([message('npc-1', 'Gerald waits.'), message('npc-2', 'Gerald waits longer.', null), message('npc-3', 'Gerald gives up.', '  ')]);
  expect(screen.getByText('Gerald waits.')).toBeOnTheScreen();
  expect(screen.getByText('Gerald waits longer.')).toBeOnTheScreen();
  expect(screen.getByText('Gerald gives up.')).toBeOnTheScreen();
  expect(screen.queryByText(/^\* /)).not.toBeOnTheScreen();
});

test('a footnote without narration is shown alone, with its button', async () => {
  await panel([message('npc-1', '', NOTE)]);
  expect(screen.getByText(`* ${NOTE}`)).toBeOnTheScreen();
  expect(await screen.findByRole('button', { name: 'Hear the narrator' })).toBeOnTheScreen();
});
