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

// Round 028 (backlog B4): containment files, filed by the server once their encounter is completed.
const file = {
  encounterId: 'cracked_fountain_letharger', locationName: 'The Cracked Fountain', designation: 'CM-001', name: 'Dopo, dopo, domani!',
  class: 'Brainrot (mild)', notes: ['Recovered at the Cracked Fountain.', 'The author of this file is not immune.'],
  properties: { virulence: 'Very high.', harm: 'Low.', incubation: 'Immediate.', vector: 'Song.', containment: 'Do not hum along.' },
};

test('containment files show their designation, class, five properties and notes, also during an encounter', async () => {
  for (const inEncounter of [false, true]) {
    await render(<Spellbook spellbook={{ ...book(inEncounter), containmentFiles: [file] }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);
    expect(screen.getByRole('heading', { name: 'Containment files' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Containment file CM-001')).toBeOnTheScreen();
    expect(screen.getByText(/Dopo, dopo, domani!/)).toBeOnTheScreen();
    expect(screen.getByText('Class: Brainrot (mild) · Recovered at The Cracked Fountain')).toBeOnTheScreen();
    for (const [label, value] of [['Virulence', 'Very high.'], ['Harm', 'Low.'], ['Incubation', 'Immediate.'], ['Vector', 'Song.'], ['Containment', 'Do not hum along.']]) {
      expect(screen.getByText(`${label}: ${value}`)).toBeOnTheScreen();
    }
    for (const note of file.notes) expect(screen.getByText(note)).toBeOnTheScreen();
  }
});

test('no containment section without files', async () => {
  for (const containmentFiles of [undefined, []]) {
    await render(<Spellbook spellbook={{ ...book(false), containmentFiles }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);
    expect(screen.queryByRole('heading', { name: 'Containment files' })).not.toBeOnTheScreen();
  }
});
