// Round 060 (backlog C9): the lines the player paid to translate, kept in the Spellbook.
import { render, screen, userEvent } from '@testing-library/react-native';
import Spellbook, { lineHiddenBy } from '../components/Spellbook.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const now = Date.parse('2026-01-15T12:00:00Z');
const line = (extra) => ({
  id: 'm1', speaker: 'Gerald', native: 'Vuoi un caffè? Senza latte.', translation: 'Do you want a coffee? Without milk.',
  locationName: 'The Coffee Cart', vocabularyIds: ['caffe', 'senza_latte'], savedAt: '2026-01-15T11:00:00Z', hidden: false, ...extra,
});
const card = (id, extra) => ({
  vocabularyId: id, kind: 'word', target: id, meanings: ['m'], partOfSpeech: 'noun', mastery: 'discovered', lastOutcome: null, repetitions: 1,
  example: null, note: null, due: false, nextReviewAt: '2026-01-16T12:00:00Z', ...extra,
});
const book = (lines, { inEncounter = false, cards = [card('caffe'), card('senza_latte')] } = {}) => ({ inEncounter, dueCount: 0, cards, containmentFiles: [], journeyFragments: [], lines });
const show = (spellbook) => render(<Spellbook spellbook={spellbook} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);

test('between encounters: the line, its speaker and place, a 🔊, and the translation behind a toggle', async () => {
  const user = userEvent.setup();
  await show(book([line()]));
  expect(screen.getByRole('heading', { name: 'Lines you translated' })).toBeOnTheScreen();
  expect(screen.getByText('Gerald, at The Coffee Cart')).toBeOnTheScreen();
  expect(screen.getByText('Vuoi un caffè? Senza latte.').props.accessibilityLanguage).toBe('it-IT');
  expect(screen.queryByText('Do you want a coffee? Without milk.')).not.toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Show translation', expanded: false }));
  expect(screen.getByText('Do you want a coffee? Without milk.')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', { name: 'Hide translation', expanded: true }));
  expect(screen.queryByText('Do you want a coffee? Without milk.')).not.toBeOnTheScreen();
});

test('during an encounter, or while the server withholds it, the translation waits and there is no toggle', async () => {
  const during = await show(book([line({ hidden: true, translation: null })], { inEncounter: true }));
  expect(screen.getByText('Vuoi un caffè? Senza latte.')).toBeOnTheScreen();
  expect(screen.getByText('The translation waits until the encounter is over.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Show translation' })).not.toBeOnTheScreen();
  await during.unmount();
  await show(book([line({ hidden: true, translation: null })]));
  expect(screen.getByText('The translation waits until you review its words.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Show translation' })).not.toBeOnTheScreen();
});

test('a card in the line that has fallen due by the clock hides the translation (stale snapshot, decision 2)', async () => {
  const cards = [card('caffe', { nextReviewAt: '2026-01-15T11:59:00Z' }), card('senza_latte')];
  await show(book([line()], { cards }));
  expect(screen.getByText('The translation waits until you review its words.')).toBeOnTheScreen();
  expect(screen.queryByText(/Without milk/)).not.toBeOnTheScreen();
  expect(lineHiddenBy(line(), book([line()]), now)).toBeNull();
  expect(lineHiddenBy(line({ vocabularyIds: [] }), book([line()], { cards }), now)).toBeNull();
});

// Round 088 (review R1.1): the server sends every card in the line (`cardIds`); the clock check uses them, and an
// older server's chips (`vocabularyIds`) when they are missing.
test('a card due by the clock that is only in cardIds hides the line; without cardIds the chips are checked', () => {
  const cards = [card('caffe'), card('senza_latte'), card('nero', { nextReviewAt: '2026-01-15T11:59:00Z' })];
  expect(lineHiddenBy(line({ cardIds: ['caffe', 'senza_latte', 'nero'] }), book([], { cards }), now)).toBe('review');
  expect(lineHiddenBy(line(), book([], { cards }), now)).toBeNull();
  expect(lineHiddenBy(line({ vocabularyIds: ['nero'] }), book([], { cards }), now)).toBe('review');
});

test('no section for an empty or missing list (older server)', async () => {
  const empty = await show(book([]));
  expect(screen.queryByRole('heading', { name: 'Lines you translated' })).not.toBeOnTheScreen();
  await empty.unmount();
  const { lines, ...older } = book([]);
  await show(older);
  expect(screen.queryByRole('heading', { name: 'Lines you translated' })).not.toBeOnTheScreen();
});
