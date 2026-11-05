// Round 056 (backlog C6): word chips by class (the owner's note: "R/G/B for noun/verb/adjective").
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { StyleSheet } from 'react-native';
import { render, screen, within } from '@testing-library/react-native';
import DialoguePanel from '../components/DialoguePanel.js';
import { colors } from '../components/ui.js';
import { segmentLine, wordClass } from '../wordClass.js';

const language = { code: 'it', name: 'Italian', tag: 'it-IT' };

test('every part of speech in both packs has a class or none, by name', () => {
  // By regex over the YAMLs, as ambience.test.js does (critique 1.8f).
  const root = join(__dirname, '..', '..', '..', 'content', 'languages');
  const values = new Set(['it', 'es'].flatMap((code) => readdirSync(join(root, code, 'vocabulary'))
    .flatMap((file) => [...readFileSync(join(root, code, 'vocabulary', file), 'utf8').matchAll(/^\s+part_of_speech:\s*(\S+)/gm)].map(([, value]) => value))));
  const classes = Object.fromEntries([...values].sort().map((value) => [value, wordClass(value)]));
  expect(classes).toEqual({
    adjective: 'adjective', adverb: null, adverbial_phrase: null, interjection: null, noun: 'noun', noun_phrase: 'noun',
    numeral: null, phrase: null, prepositional_phrase: null, pronoun: null, question: null, verb: 'verb', verb_phrase: 'verb',
  });
  expect(wordClass(undefined)).toBeNull();
  expect(wordClass('unknown')).toBeNull();
});

const word = (vocabularyId, canonicalTarget, partOfSpeech, meaning) => ({ vocabularyId, target: canonicalTarget, canonicalTarget, partOfSpeech, meaning, meaningAvailable: true });
const encounter = (words, isProtected = true) => ({
  id: 'session-1', encounterId: 'butchers_stall_charcutier', state: 'ongoing', character: { name: 'Mortimer', saveable: true },
  hints: { remaining: 2, limit: 2 }, hints_available: true, difficulty: 0.3,
  currentObjective: { id: 'name_meat', prompt: 'Name a meat that is not ham, in Italian.' },
  transcript: [{
    id: 'npc-1', role: 'npc', narrative: 'Mortimer sharpens a knife.', protected: isProtected,
    dialogue: { speaker: 'Mortimer', native: 'Salame? Tagliare, buono, molto.', translation: undefined, translationAvailable: true, words },
  }],
});
const chipStyle = (name) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('on the active, protected line: nouns, verbs and adjectives carry a label, a name and a colour; an adverb none (decision 1)', async () => {
  await render(<DialoguePanel language={language} isLoading={false} onHelp={() => {}} encounter={encounter([
    word('salame', 'salame', 'noun'), word('tagliare', 'tagliare', 'verb'), word('buono', 'buono', 'adjective'), word('molto', 'molto', 'adverb'),
  ])} />);
  const words = screen.getByLabelText('Words');
  expect(within(words).getByRole('button', { name: 'Translate word: salame, noun' })).toBeEnabled();
  expect(within(words).getByRole('button', { name: 'Translate word: tagliare, verb' })).toBeEnabled();
  expect(within(words).getByRole('button', { name: 'Translate word: buono, adjective' })).toBeEnabled();
  expect(within(words).getByRole('button', { name: 'Translate word: molto' })).toBeEnabled();
  expect(within(words).getByText(' noun')).toBeOnTheScreen();
  expect(within(words).getByText(' verb')).toBeOnTheScreen();
  expect(within(words).getByText(' adj.')).toBeOnTheScreen();
  expect(StyleSheet.flatten(within(words).getByText(' adj.').props.style).color).toBe(colors.wordAdjective);
  expect(chipStyle('Translate word: salame, noun')).toMatchObject({ borderWidth: 2, borderColor: colors.wordNoun, borderStyle: 'solid' });
  expect(chipStyle('Translate word: tagliare, verb')).toMatchObject({ borderWidth: 2, borderColor: colors.wordVerb, borderStyle: 'dashed' });
  expect(chipStyle('Translate word: buono, adjective')).toMatchObject({ borderWidth: 2, borderColor: colors.wordAdjective, borderStyle: 'solid' });
  // Uncoloured chips keep today's border colour, at the same width (critique 1.7).
  expect(chipStyle('Translate word: molto')).toMatchObject({ borderWidth: 2, borderColor: colors.border });
});

test('revealed chips are not dimmed and do not repeat their class; an uncoloured class keeps its note (critiques 1.2, 1.6)', async () => {
  await render(<DialoguePanel language={language} isLoading={false} onHelp={() => {}} encounter={encounter([
    word('salame', 'salame', 'noun', 'salami'), word('molto', 'molto', 'adverb', 'very'),
  ], false)} />);
  const salame = screen.getByRole('button', { name: 'Translate word: salame, noun' });
  expect(salame).toBeDisabled();
  expect(StyleSheet.flatten(salame.props.style).opacity).toBeUndefined();
  expect(screen.getByText('salami')).toBeOnTheScreen();
  expect(screen.queryByText(/\(noun\)/)).not.toBeOnTheScreen();
  expect(screen.getByText('very (adverb)')).toBeOnTheScreen();
});

// Round 057 (backlog C7): the chips' words marked in the line, at the server's spans.

describe('segmentLine', () => {
  const noun = { vocabularyId: 'caffe', partOfSpeech: 'noun' };
  test('no spans (lines saved before round 057): one plain segment', () => {
    expect(segmentLine('Un caffè?', [{ vocabularyId: 'caffe' }])).toEqual([{ text: 'Un caffè?', word: null }]);
    expect(segmentLine('', [])).toEqual([{ text: '', word: null }]);
  });
  test('every span is marked, the rest stays plain, and the text is unchanged', () => {
    const word = { ...noun, spans: [[3, 8], [14, 19]] };
    expect(segmentLine('Un caffè? Sì, caffè.', [word])).toEqual([
      { text: 'Un ', word: null }, { text: 'caffè', word }, { text: '? Sì, ', word: null }, { text: 'caffè', word }, { text: '.', word: null },
    ]);
  });
  test('malformed, out-of-range and overlapping spans are dropped', () => {
    const a = { ...noun, spans: [[0, 5], [3, 7], [-1, 2], [2, 2], [4, 99], ['0', 1], null, [1.5, 3]] };
    expect(segmentLine('caffè nero', [a])).toEqual([{ text: 'caffè', word: a }, { text: ' nero', word: null }]);
  });
});

test('the line marks its words: noun in its colour and underlined, verb dashed, adverb in ink; no spans, no marks', async () => {
  const line = 'Salame? Tagliare, molto.';
  const spanned = [
    { ...word('salame', 'salame', 'noun'), target: 'Salame', spans: [[0, 6]] },
    { ...word('tagliare', 'tagliare', 'verb'), target: 'Tagliare', spans: [[8, 16]] },
    { ...word('molto', 'molto', 'adverb'), spans: [[18, 23]] },
  ];
  const panel = (words) => <DialoguePanel language={language} isLoading={false} onHelp={() => {}} encounter={{ ...encounter(words), transcript: [{ ...encounter(words).transcript[0], dialogue: { ...encounter(words).transcript[0].dialogue, native: line } }] }} />;
  const view = await render(panel(spanned));
  const native = screen.getByTestId('npc-line');
  const mark = (text) => StyleSheet.flatten(within(native).getByText(text).props.style);
  expect(mark('Salame')).toMatchObject({ color: colors.wordNoun, textDecorationLine: 'underline', textDecorationColor: colors.wordNoun, textDecorationStyle: 'solid' });
  expect(mark('Tagliare')).toMatchObject({ color: colors.wordVerb, textDecorationStyle: 'dashed' });
  expect(mark('molto')).toMatchObject({ color: colors.ink, textDecorationLine: 'underline' });
  expect(native).toHaveTextContent(line);
  await view.unmount();
  await render(panel(spanned.map(({ spans, ...rest }) => rest)));
  const plain = screen.getByTestId('npc-line');
  expect(plain).toHaveTextContent(line);
  expect(within(plain).queryByText('Salame')).not.toBeOnTheScreen();
});
