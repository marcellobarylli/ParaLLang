// Round 059 (backlog C8): the word class on Spellbook cards and on the review prompt, as on the chips (round 056).
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import Spellbook from '../components/Spellbook.js';
import ReviewPanel from '../components/ReviewPanel.js';
import DialoguePanel from '../components/DialoguePanel.js';
import { colors } from '../components/ui.js';
import { wordClassText } from '../wordClass.js';
import { reviewPartOfSpeech } from '../../App.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };
const now = Date.parse('2026-01-15T12:00:00Z');
const style = (element) => StyleSheet.flatten(element.props.style);

test('wordClassText: class names for coloured classes, spaced parts of speech otherwise, null when unknown', () => {
  expect(wordClassText('noun_phrase')).toEqual({ cls: 'noun', text: 'noun' });
  expect(wordClassText('verb_phrase')).toEqual({ cls: 'verb', text: 'verb' });
  expect(wordClassText('adjective')).toEqual({ cls: 'adjective', text: 'adjective' });
  expect(wordClassText('prepositional_phrase')).toEqual({ cls: null, text: 'prepositional phrase' });
  expect(wordClassText(undefined)).toBeNull();
  expect(wordClassText('')).toBeNull();
});

const card = (id, target, meaning, partOfSpeech, extra) => ({
  vocabularyId: id, kind: 'word', target, meanings: [meaning], partOfSpeech, mastery: 'discovered', lastOutcome: null, repetitions: 0,
  example: { target: `Ecco ${target}.`, english: `Here is ${meaning}.` }, note: `${target} means ${meaning}.`, due: false, nextReviewAt: '2026-01-16T12:00:00Z', ...extra,
});
const cards = [
  card('salame', 'salame', 'salami', 'noun'),
  card('tagliare', 'tagliare', 'to cut', 'verb', { due: true, nextReviewAt: '2026-01-15T11:00:00Z' }),
  card('molto', 'molto', 'very', 'adverb'),
  card('old', 'vecchio', 'old', undefined),
];

for (const inEncounter of [false, true]) {
  test(`Spellbook cards ${inEncounter ? 'during an encounter' : 'between encounters'}: the class word in its colour, neutral frames, meanings still hidden where they were`, async () => {
    await render(<Spellbook spellbook={{ inEncounter, dueCount: 1, cards }} language={language} isLoading={false} onReview={() => {}} onReturn={() => {}} now={now} />);
    expect(style(screen.getByText('noun'))).toMatchObject({ color: colors.wordNoun, fontWeight: '600' });
    expect(style(screen.getByText('verb'))).toMatchObject({ color: colors.wordVerb, fontWeight: '600' });
    // An uncoloured class keeps the line's muted text; a card without a class shows only its mastery.
    expect(screen.getByText(/^adverb · Mastery/)).toBeOnTheScreen();
    expect(screen.getAllByText(/Mastery/)).toHaveLength(4);
    for (const target of ['salame', 'tagliare', 'molto', 'vecchio']) {
      expect(style(screen.getByLabelText(`Card ${target}`))).toMatchObject({ borderWidth: 1, borderColor: colors.border }); // decision 2
    }
    // Round 017 unchanged: the due verb hides its meaning, and an encounter hides every meaning, note and example.
    expect(screen.queryByText('to cut')).not.toBeOnTheScreen();
    expect(screen.queryByText('tagliare means to cut.')).not.toBeOnTheScreen();
    if (inEncounter) for (const hidden of ['salami', 'very', 'salame means salami.', /Here is/]) expect(screen.queryByText(hidden)).not.toBeOnTheScreen();
    else expect(screen.getByText('salami')).toBeOnTheScreen();
  });
}

const challenge = (extra) => ({ id: 'c1', vocabularyId: 'tagliare', target: 'tagliare', kind: 'word', practice: false, ...extra });
const review = (props) => render(<ReviewPanel language={language} isLoading={false} onSubmit={() => {}} onReveal={() => {}} onContinue={() => {}} onReturn={() => {}} {...props} />);

test('the review prompt shows the class in its colour, outside the target-language heading (decision 1, critique 1.5)', async () => {
  await review({ challenge: challenge(), partOfSpeech: 'verb' });
  const tag = screen.getByText('verb');
  expect(style(tag)).toMatchObject({ color: colors.wordVerb, fontWeight: '600' });
  expect(tag.props.accessibilityLanguage).toBeUndefined();
  expect(screen.getByRole('heading', { name: 'tagliare' })).toHaveTextContent('tagliare', { exact: true });
});

test('practice reviews show the class; an uncoloured class is muted; unknown shows none', async () => {
  const practice = await review({ challenge: challenge({ practice: true }), partOfSpeech: 'noun_phrase' });
  expect(screen.getByText('Optional practice (schedule will not change)')).toBeOnTheScreen();
  expect(style(screen.getByText('noun')).color).toBe(colors.wordNoun);
  await practice.unmount();
  const adverb = await review({ challenge: challenge(), partOfSpeech: 'adverb' });
  expect(style(screen.getByText('adverb')).color).toBe(colors.muted);
  await adverb.unmount();
  await review({ challenge: challenge() });
  for (const name of ['noun', 'verb', 'adjective', 'adverb']) expect(screen.queryByText(name)).not.toBeOnTheScreen();
});

test('reviewPartOfSpeech: from the Spellbook card of the challenge, null without one (critique 1.1)', () => {
  const spellbook = { cards };
  expect(reviewPartOfSpeech({ reviewChallenge: challenge(), spellbook })).toBe('verb');
  expect(reviewPartOfSpeech({ reviewChallenge: challenge({ vocabularyId: 'missing' }), spellbook })).toBeNull();
  expect(reviewPartOfSpeech({ reviewChallenge: null, spellbook })).toBeNull();
  expect(reviewPartOfSpeech({ reviewChallenge: challenge(), spellbook: null })).toBeNull();
});

test('a revealed chip without a part of speech renders its meaning and no note (critique 1.7)', async () => {
  await render(<DialoguePanel language={language} isLoading={false} onHelp={() => {}} encounter={{
    id: 's', encounterId: 'e', state: 'ongoing', character: { name: 'Mortimer' }, hints: { remaining: 2, limit: 2 }, hints_available: true, difficulty: 0.3,
    currentObjective: { id: 'o', prompt: 'Say something.' },
    transcript: [{ id: 'npc-1', role: 'npc', narrative: '', protected: false, dialogue: { speaker: 'Mortimer', native: 'Ciao.', translationAvailable: true, words: [
      { vocabularyId: 'ciao', target: 'ciao', canonicalTarget: 'ciao', meaning: 'hello', meaningAvailable: true },
    ] } }],
  }} />);
  expect(screen.getByText('hello')).toBeOnTheScreen();
  expect(screen.queryByText(/\(/)).not.toBeOnTheScreen();
});
