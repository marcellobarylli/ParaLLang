// Round 030 (backlog A9): fragments of The Journey in the Spellbook and the note on the resolved encounter.
import * as Speech from 'expo-speech';
import { render, screen, userEvent } from '@testing-library/react-native';
import Spellbook, { fragmentSource } from '../components/Spellbook.js';
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

// Round 032: Gerald's fragment is noted on the coffee break that unlocked it (the third), not on later ones.
test('a conversation fragment is noted on its unlocking break only, from the member', () => {
  const coffeeBreak = { ...resolved('gerald_coffee_break'), partyConversation: true, character: { name: 'Gerald', saveable: true } };
  const dead = (conversations) => fragment({ id: 'journey_dead_branch', title: 'The word for it', encounterId: 'gerald_coffee_break', unlockedAt: 3, conversations });
  expect(fragmentNote([dead(3)], coffeeBreak)).toBe(' A fragment of The Journey from Gerald is in your Spellbook: The word for it.');
  expect(fragmentNote([dead(4)], coffeeBreak)).toBe('');
  expect(fragmentNote([fragment()], resolved('cracked_fountain_letharger'))).toMatch(/from here/);
});

// Round 033: Marginalia has a completion fragment (the Bookshop) and a conversation one; each note keeps to its own.
test('a member with both a completion and a conversation fragment gets the right note in each place', () => {
  const stitch = fragment({ id: 'journey_first_stitch', title: 'The first stitch', encounterId: 'old_bookshop_bookworm' });
  const dog = fragment({ id: 'journey_old_dog', title: 'The old dog', encounterId: 'marginalia_fragment', unlockedAt: 3, conversations: 3 });
  const reading = { ...resolved('marginalia_fragment'), partyConversation: true, character: { name: 'Marginalia', saveable: true } };
  expect(fragmentNote([stitch, dog], reading)).toBe(' A fragment of The Journey from Marginalia is in your Spellbook: The old dog.');
  expect(fragmentNote([stitch, dog], resolved('old_bookshop_bookworm'))).toBe(' A fragment of The Journey from here is in your Spellbook: The first stitch.');
  expect(fragmentNote([stitch, { ...dog, conversations: 4 }], reading)).toBe('');
  expect(fragmentNote([stitch], reading)).toBe('');
  // Flick's lotus and the Sirens the same way.
  const lotus = fragment({ id: 'journey_lotus', title: 'The lotus', encounterId: 'flick_slow_walk', unlockedAt: 3, conversations: 3 });
  const walk = { ...resolved('flick_slow_walk'), partyConversation: true, character: { name: 'Flick', saveable: true } };
  expect(fragmentNote([fragment(), lotus], walk)).toBe(' A fragment of The Journey from Flick is in your Spellbook: The lotus.');
  expect(fragmentNote([fragment(), lotus], resolved('cracked_fountain_letharger'))).toBe(' A fragment of The Journey from here is in your Spellbook: The Sirens.');
});

// Round 036: each fragment says where it came from, on screen and in its accessible label.
test('a fragment names the member who told it or the place it was found', async () => {
  const dog = fragment({ id: 'journey_old_dog', title: 'The old dog', encounterId: 'marginalia_fragment', locationName: 'The Old Bookshop', toldBy: 'Marginalia', unlockedAt: 3, conversations: 3 });
  await show(book([fragment(), dog]));
  expect(screen.getByText('Found at The Cracked Fountain')).toBeOnTheScreen();
  expect(screen.getByText('Told by Marginalia')).toBeOnTheScreen();
  expect(screen.getByLabelText('Fragment: The Sirens, found at The Cracked Fountain')).toBeOnTheScreen();
  expect(screen.getByLabelText('Fragment: The old dog, told by Marginalia')).toBeOnTheScreen();
  const { locationName, ...old } = fragment();
  expect(fragmentSource(old)).toBeNull();
  expect(fragmentSource({ ...dog, toldBy: undefined })).toBeNull(); // an older server's conversation fragment
});
