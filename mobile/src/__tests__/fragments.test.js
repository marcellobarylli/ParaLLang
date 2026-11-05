// Round 030 (backlog A9): fragments of The Journey in the Spellbook and the note on the resolved encounter.
import * as Speech from 'expo-speech';
import { render, screen, userEvent } from '@testing-library/react-native';
import Spellbook from '../components/Spellbook.js';
import DialoguePanel, { fragmentNote } from '../components/DialoguePanel.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const fragment = (extra) => ({
  id: 'journey_sirens', title: 'The Sirens', found: 'Scratched into the rim of the fountain.', encounterId: 'cracked_fountain_letharger',
  locationName: 'The Cracked Fountain', text: 'Le sirene cantavano ai margini della vista.', hidden: false,
  translation: 'The Sirens sang at the edges of sight.', glossary: [{ word: 'margini', meaning: 'edges' }, { word: 'sirene', meaning: 'sirens' }], ...extra,
});
const book = (fragments, inEncounter = false) => ({ inEncounter, dueCount: 0, cards: [], containmentFiles: [], journeyFragments: fragments });
const show = (spellbook) => render(<Spellbook spellbook={spellbook} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} />);

beforeEach(() => { jest.clearAllMocks(); });

test('a fragment shows its text with no cards; the glossary and translation open and close behind a toggle', async () => {
  const user = userEvent.setup();
  await show(book([fragment()]));
  expect(screen.getByText('No vocabulary yet')).toBeOnTheScreen();
  expect(screen.getByRole('heading', { name: 'Fragments of The Journey' })).toBeOnTheScreen();
  expect(screen.getByText('Le sirene cantavano ai margini della vista.')).toBeOnTheScreen();
  expect(screen.getByText('Scratched into the rim of the fountain.')).toBeOnTheScreen();
  expect(screen.queryByText('The Sirens sang at the edges of sight.')).not.toBeOnTheScreen();
  expect(screen.queryByText(/edges/)).not.toBeOnTheScreen();

  const toggle = screen.getByRole('button', { name: 'Show translation', expanded: false });
  expect(screen.queryByRole('button', { name: 'Show translation', expanded: true })).not.toBeOnTheScreen();
  await user.press(toggle);
  expect(screen.getByText('The Sirens sang at the edges of sight.')).toBeOnTheScreen();
  expect(screen.getByText(/: edges/)).toBeOnTheScreen();
  const hide = screen.getByRole('button', { name: 'Hide translation', expanded: true });
  await user.press(hide);
  expect(screen.queryByText('The Sirens sang at the edges of sight.')).not.toBeOnTheScreen();
});

test('while the server withholds the translation, the card says so and has no toggle', async () => {
  await show(book([fragment({ hidden: true, translation: null, glossary: null })], true));
  expect(screen.getByText('Le sirene cantavano ai margini della vista.')).toBeOnTheScreen();
  expect(screen.getByText('The translation waits until the encounter is over.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Show translation' })).not.toBeOnTheScreen();
});

test('no fragments, no section', async () => {
  await show(book([]));
  expect(screen.queryByText('Fragments of The Journey')).not.toBeOnTheScreen();
});

test('the fragment\'s pronounce button is named, not read out in full', async () => {
  Speech.getAvailableVoicesAsync.mockResolvedValue([{ identifier: 'alice', language: 'it-IT', name: 'Alice', quality: 'Default' }]);
  await show(book([fragment()]));
  expect(await screen.findByRole('button', { name: 'Hear the fragment in Italian' })).toBeOnTheScreen();
});

const resolved = (encounterId) => ({
  encounterId, state: 'resolved', resolvedMessage: 'Flick holds still.', character: { name: 'Flick', saveable: false },
  transcript: [], hints: { remaining: 0, limit: 2 }, difficulty: 0.4, currentObjective: null,
});

test('the resolved encounter mentions its own fragment only', async () => {
  expect(fragmentNote([fragment()], resolved('cracked_fountain_letharger'))).toBe(' A fragment of The Journey from here is in your Spellbook: The Sirens.');
  expect(fragmentNote([fragment()], resolved('imp_coffee_greeting'))).toBe('');
  expect(fragmentNote(undefined, resolved('cracked_fountain_letharger'))).toBe('');
  await render(<DialoguePanel encounter={resolved('cracked_fountain_letharger')} language={language} isLoading={false} fragments={[fragment()]} />);
  expect(screen.getByText('Flick holds still. A fragment of The Journey from here is in your Spellbook: The Sirens.')).toBeOnTheScreen();
});
