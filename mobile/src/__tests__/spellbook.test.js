// Round 017: Spellbook cards never show the answer the game is asking for.
import { render, screen, userEvent } from '@testing-library/react-native';
import Spellbook, { cardState } from '../components/Spellbook.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const now = Date.parse('2026-01-15T12:00:00Z');
const card = (id, target, meaning, extra) => ({
  vocabularyId: id, kind: 'word', target, meanings: [meaning], partOfSpeech: 'noun', mastery: 'discovered', lastOutcome: null, repetitions: 0,
  example: { target: `Il ${target}.`, english: `The ${meaning}.` }, note: `${target} is ${meaning}.`, due: false, nextReviewAt: '2026-01-16T12:00:00Z', ...extra,
});
const book = (inEncounter) => ({ inEncounter, dueCount: 1, cards: [
  card('a', 'latte', 'milk', { due: true, nextReviewAt: '2026-01-15T11:00:00Z' }),
  card('b', 'zucchero', 'sugar'),
  card('c', 'pane', 'bread', { due: false, nextReviewAt: '2026-01-15T11:59:00Z' }),
] });

test('card state: an encounter under way hides everything; due follows the clock', () => {
  expect(cardState({ due: true }, { inEncounter: true, now })).toBe('inEncounter');
  expect(cardState({ due: false, nextReviewAt: '2026-01-16T12:00:00Z' }, { inEncounter: true, now })).toBe('inEncounter');
  expect(cardState({ due: true, nextReviewAt: '2026-01-15T11:00:00Z' }, { now })).toBe('due');
  expect(cardState({ due: false, nextReviewAt: '2026-01-15T11:59:00Z' }, { now })).toBe('due');
  expect(cardState({ due: false, nextReviewAt: '2026-01-16T12:00:00Z' }, { now })).toBe('reference');
});

test('between encounters: due cards hide their meaning, others are reference cards with notes', async () => {
  const onReview = jest.fn();
  const user = userEvent.setup();
  await render(<Spellbook spellbook={book(false)} language={language} isLoading={false} onReview={onReview} onReturn={() => {}} now={now} />);
  expect(screen.getAllByText('Meaning hidden until you review it.')).toHaveLength(2);
  for (const hidden of ['milk', 'latte is milk.', 'bread', 'pane is bread.']) expect(screen.queryByText(hidden)).not.toBeOnTheScreen();
  expect(screen.queryByText(/The milk\./)).not.toBeOnTheScreen();
  expect(screen.getByText(/Il latte\./)).toBeOnTheScreen();
  expect(screen.getByText('sugar')).toBeOnTheScreen();
  expect(screen.getByText('zucchero is sugar.')).toBeOnTheScreen();
  expect(screen.getByText(/The sugar\./)).toBeOnTheScreen();
  const reviews = screen.getAllByRole('button', { name: 'Review' });
  expect(reviews).toHaveLength(2);
  await user.press(reviews[0]);
  expect(onReview).toHaveBeenCalledWith('a');
});

test('during an encounter: no meanings, notes, examples or Review on any card', async () => {
  await render(<Spellbook spellbook={book(true)} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);
  expect(screen.getByText(/reviews wait while an encounter is under way/)).toBeOnTheScreen();
  for (const hidden of ['milk', 'sugar', 'bread', 'zucchero is sugar.']) expect(screen.queryByText(hidden)).not.toBeOnTheScreen();
  expect(screen.queryByText(/The sugar\./)).not.toBeOnTheScreen();
  expect(screen.queryByText(/Il zucchero\./)).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Review' })).not.toBeOnTheScreen();
  expect(screen.getByText('zucchero')).toBeOnTheScreen();
});
