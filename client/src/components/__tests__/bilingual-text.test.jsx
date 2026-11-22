// Round 149: a character's line and its translation stand together. The word buttons come after the translation
// (or after "Translate sentence" while the translation is still a hint), never between the two.
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import BilingualText from '../BilingualText.jsx';

afterEach(cleanup);

const words = [
  { vocabularyId: 'c_buongiorno', canonicalTarget: 'buongiorno', target: 'Buongiorno', partOfSpeech: 'interjection', meaning: 'good morning' },
  { vocabularyId: 'c_piacere', canonicalTarget: 'piacere', target: 'Piacere', partOfSpeech: 'interjection' },
];
const message = (translation) => ({
  id: 'm1', protected: true,
  dialogue: { speaker: 'Fergus Pocket', native: 'Buongiorno! Piacere, mi chiamo Fergus Pocket.', translation, words },
});
const language = { code: 'it', name: 'Italian', tag: 'it-IT' };

test('the translation is directly under the line and the words come after it', () => {
  const { container } = render(<BilingualText message={message('Good morning! Pleased to meet you, my name is Fergus Pocket.')} language={language} onHelp={vi.fn()} />);
  const kinds = [...container.querySelector('.bilingual-text').children].map((child) => child.className);
  expect(kinds.slice(0, 3)).toEqual(['native-line', 'translation', 'word-actions']);
  expect(container.querySelector('.native-line').nextElementSibling).toBe(container.querySelector('.translation'));
  // The two texts are still coloured sentence by sentence, and the word helps are all there.
  expect(container.querySelectorAll('.native-line [class*="sentence"]').length).toBe(container.querySelectorAll('.translation [class*="sentence"]').length);
  expect(screen.getByRole('button', { name: 'Translate word: piacere' })).toBeTruthy();
  expect(screen.getByText(/good morning/)).toBeTruthy();
});

test('while the translation is a hint, its button is directly under the line and the words come after it', () => {
  const { container } = render(<BilingualText message={message(undefined)} language={language} onHelp={vi.fn()} />);
  const line = container.querySelector('.native-line');
  expect(line.nextElementSibling.textContent).toBe('Translate sentence');
  expect(line.nextElementSibling.nextElementSibling.className).toBe('word-actions');
});
