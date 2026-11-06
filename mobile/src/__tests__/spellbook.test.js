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

// Round 090 (review R1.2 of rounds 029–039): a readable card does not answer a due one through its example or form.
describe('answers in other cards', () => {
  const cento = card('cento', 'cento', 'a hundred', { partOfSpeech: 'numeral', example: { target: 'Cento grammi di prosciutto.', english: 'A hundred grams of ham.' }, note: null, exampleCardIds: ['prosciutto'], formCardIds: [] });
  const nero = card('caffe_nero', 'caffè nero', 'black coffee', { kind: 'phrase', example: { target: 'Prendo il caffè nero.', english: 'I take black coffee.' }, note: 'nero is black.', exampleCardIds: ['caffe'], formCardIds: ['caffe'] });
  const prosciutto = (due) => card('prosciutto', 'prosciutto', 'ham', due ? { due: true, nextReviewAt: '2026-01-15T11:00:00Z' } : {});
  const caffe = (extra) => card('caffe', 'caffè', 'coffee', extra);
  const show = (cards) => render(<Spellbook spellbook={{ inEncounter: false, dueCount: 0, cards }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);

  test('an example holding a due card keeps its English back; the meaning shows', async () => {
    await show([cento, prosciutto(true)]);
    expect(screen.getByText('a hundred')).toBeOnTheScreen();
    expect(screen.getByText(/Cento grammi di prosciutto\./)).toBeOnTheScreen();
    expect(screen.queryByText(/A hundred grams of ham/)).not.toBeOnTheScreen();
  });

  test('a phrase holding a due word keeps meaning, note and example English back, with no Review of its own', async () => {
    await show([nero, caffe({ due: true, nextReviewAt: '2026-01-15T11:00:00Z' })]);
    expect(screen.getByText('Meaning hidden until you review its words.')).toBeOnTheScreen();
    for (const hidden of ['black coffee', 'nero is black.']) expect(screen.queryByText(hidden)).not.toBeOnTheScreen();
    expect(screen.queryByText(/I take black coffee/)).not.toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: 'Review' })).toHaveLength(1);
  });

  test('due by the clock in a stale snapshot hides too', async () => {
    await show([nero, caffe({ due: false, nextReviewAt: '2026-01-15T11:59:00Z' })]);
    expect(screen.queryByText('black coffee')).not.toBeOnTheScreen();
  });

  test('nothing due shows everything', async () => {
    await show([cento, prosciutto(false)]);
    expect(screen.getByText(/A hundred grams of ham/)).toBeOnTheScreen();
  });

  test('an older server sends no lists: nothing more waits', async () => {
    const { exampleCardIds, formCardIds, ...old } = nero;
    await show([old, caffe({ due: true, nextReviewAt: '2026-01-15T11:00:00Z' })]);
    expect(screen.getByText('black coffee')).toBeOnTheScreen();
    expect(screen.getByText(/I take black coffee/)).toBeOnTheScreen();
  });
});

// Round 106: the server sends null meanings, note and example English when it withholds them. Today the app hides
// every such card by its own rules; one it would not (a future server rule) says it waits instead of a blank.
test('a withheld card from the server renders without meanings, note or example English', async () => {
  const withheld = card('d', 'sale', 'salt', { meanings: null, note: null, example: { target: 'Il sale.', english: null }, withheld: { meaning: true, example: true } });
  await render(<Spellbook spellbook={{ inEncounter: false, dueCount: 0, cards: [withheld] }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);
  expect(screen.getByText('sale')).toBeOnTheScreen();
  expect(screen.getByText('Il sale.')).toBeOnTheScreen();
  expect(screen.getByText('Meaning hidden until you review its words.')).toBeOnTheScreen();
  expect(screen.queryByText(/salt/)).not.toBeOnTheScreen();
  expect(screen.queryByText(/null/)).not.toBeOnTheScreen();
});
