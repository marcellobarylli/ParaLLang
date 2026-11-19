import { expect, test } from 'vitest';
import { render } from '@testing-library/react';
import { SENTENCE_COLOURS, pairSentences, splitSentences } from '../../sentences.js';
import BilingualText from '../BilingualText.jsx';

const NATIVE = "Molto bene! Home, and Nobody: the Cyclops asked for a name. Il libro è tuo. Dimmi, com'è il tuo giorno?";
const TRANSLATION = 'Very good! Home, and Nobody: the Cyclops asked for a name. The book is yours. Tell me, how is your day?';

test('sentences split at . ! ? and keep closing marks', () => {
  expect(splitSentences('Bene. *Piacere!* ¿Come stai? «Sì.» Ok')).toEqual(['Bene.', '*Piacere!*', '¿Come stai?', '«Sì.»', 'Ok']);
});

test('lines with different sentence counts are not matched', () => {
  expect(pairSentences('Uno. Due.', 'One.')).toBeNull();
  expect(pairSentences('Uno.', null)).toBeNull();
  expect(pairSentences('Uno. Due.', 'One. Two.')).toEqual({ native: ['Uno.', 'Due.'], translation: ['One.', 'Two.'] });
});

test('matching sentences carry the same colour index, cycling through the palette', () => {
  const many = Array.from({ length: SENTENCE_COLOURS.length + 2 }, (_, i) => `S${i}.`).join(' ');
  const message = { id: 'm', dialogue: { speaker: 'X', native: many, translation: many, words: [] } };
  const { container } = render(<BilingualText message={message} language={{ tag: 'it' }} onHelp={() => {}} />);
  const native = [...container.querySelectorAll('.native-line .sentence')].map((el) => el.dataset.sentence);
  const translation = [...container.querySelectorAll('.translation .sentence')].map((el) => el.dataset.sentence);
  expect(native).toEqual(translation);
  expect(native.at(-1)).toBe('1'); // the palette wrapped
  expect(container.querySelector('.native-line').textContent).toBe(many);
});

test('the sample line and its translation pair up four to four', () => {
  const message = { id: 'm', dialogue: { speaker: 'X', native: NATIVE, translation: TRANSLATION, words: [] } };
  const { container } = render(<BilingualText message={message} language={{ tag: 'it' }} onHelp={() => {}} />);
  expect(container.querySelectorAll('.native-line .sentence')).toHaveLength(4);
  expect(container.querySelectorAll('.translation .sentence')).toHaveLength(4);
});

test('an untranslated line stays plain', () => {
  const message = { id: 'm', dialogue: { speaker: 'X', native: NATIVE, words: [] } };
  const { container } = render(<BilingualText message={message} language={{ tag: 'it' }} onHelp={() => {}} />);
  expect(container.querySelectorAll('.sentence')).toHaveLength(0);
});
