// @vitest-environment node
// Round 129: the practice after a corrected answer is checked in the app.
import { expect, test } from 'vitest';
import { differingWords, foldSentence, sameSentence } from '../practice.js';

const WANTED = 'Buongiorno! Mi chiamo Luigione. Come ti chiami?';

test('a sentence is compared without case, accents or punctuation', () => {
  expect(foldSentence('  Perché,   NO?! ')).toBe('perche no');
  expect(sameSentence('buongiorno mi chiamo luigione come ti chiami', WANTED)).toBe(true);
  expect(sameSentence('BUONGIORNO!  Mi chiamo Luigione; come ti chiami', WANTED)).toBe(true);
  expect(sameSentence('Un caffe, per favore', 'Un caffè, per favore.')).toBe(true); // what a recogniser or a phone keyboard gives
  expect(sameSentence('Bungiorno! Me chiamo Luigione. Come te chiame?', WANTED)).toBe(false);
  expect(sameSentence('', WANTED)).toBe(false);
  expect(sameSentence('?!', '?!')).toBe(false);
  expect(sameSentence(null, undefined)).toBe(false);
});

test('the words to look at are the wanted ones the attempt does not have in place', () => {
  expect(differingWords('Bungiorno! Me chiamo Luigione. Come te chiame?', WANTED)).toEqual(['Buongiorno!', 'Mi', 'ti', 'chiami?']);
  expect(differingWords('Buongiorno! Mi chiamo', WANTED)).toEqual(['Luigione.', 'Come', 'ti', 'chiami?']);
  expect(differingWords(WANTED, WANTED)).toEqual([]);
});
