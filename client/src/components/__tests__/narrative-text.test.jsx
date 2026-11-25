// Round 130: the narration's target-language words are buttons in the text; a tap shows the meaning.
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NarrativeText, { narrativePieces } from '../NarrativeText.jsx';

afterEach(cleanup);
const italian = { code: 'it', name: 'Italian', tag: 'it-IT' };
const STALL = 'The bancarella leans a little, and the gatto has opinions. Nobody asks the gatto about the mercato coperto.';
const WORDS = [{ word: 'bancarella', meaning: 'market stall' }, { word: 'gatto', meaning: 'cat' }, { word: 'mercato', meaning: 'market' }, { word: 'mercato coperto', meaning: 'covered market' }];

test('the narration is cut at its listed words, whole words only, a phrase before the word inside it', () => {
  expect(narrativePieces(STALL, WORDS)).toEqual([
    'The ', { word: 'bancarella', meaning: 'market stall' }, ' leans a little, and the ', { word: 'gatto', meaning: 'cat' }, ' has opinions. Nobody asks the ',
    { word: 'gatto', meaning: 'cat' }, ' about the ', { word: 'mercato coperto', meaning: 'covered market' }, '.',
  ]);
  expect(narrativePieces('The gattopardo is no gatto.', [{ word: 'gatto', meaning: 'cat' }])).toEqual(['The gattopardo is no ', { word: 'gatto', meaning: 'cat' }, '.']);
  expect(narrativePieces('Il Caffè (caffè!) is hot.', [{ word: 'caffè', meaning: 'coffee' }]).filter((piece) => typeof piece !== 'string').map((piece) => piece.word)).toEqual(['Caffè', 'caffè']);
  expect(narrativePieces('Costs 3.50 (roughly).', [{ word: '3.50', meaning: 'a price' }, { word: '(', meaning: 'x' }])).toContainEqual({ word: '3.50', meaning: 'a price' });
  for (const none of [undefined, null, [], [{ word: '', meaning: 'x' }], [{ word: 'sole' }]]) expect(narrativePieces(STALL, none)).toEqual([STALL]);
});

test('a tap on a word shows its meaning after it, a second tap hides it, and each word keeps its own', async () => {
  const user = userEvent.setup();
  const { container } = render(<NarrativeText narrative={STALL} words={WORDS} language={italian} />);
  expect(container.querySelector('p.narrative').textContent).toBe(STALL);
  const buttons = screen.getAllByRole('button');
  expect(buttons.map((button) => button.textContent)).toEqual(['bancarella', 'gatto', 'gatto', 'mercato coperto']);
  expect(buttons[0].lang).toBe('it-IT');
  expect(buttons[0].getAttribute('aria-label')).toBe('Translate bancarella');
  await user.click(buttons[0]);
  expect(screen.getByText('(market stall)', { exact: false })).toBeTruthy();
  expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
  expect(buttons[0].getAttribute('aria-label')).toBe('bancarella: market stall');
  expect(container.querySelector('p.narrative').textContent).toContain('The bancarella (market stall) leans');
  await user.click(buttons[1]);
  expect(container.querySelector('p.narrative').textContent).toContain('the gatto (cat) has opinions. Nobody asks the gatto about');
  await user.click(buttons[0]);
  expect(container.querySelector('p.narrative').textContent).not.toContain('(market stall)');
  expect(container.querySelector('p.narrative').textContent).toContain('gatto (cat)');
});

test('a narration without listed words is plain text with no buttons', () => {
  const { container } = render(<NarrativeText narrative={STALL} language={italian} />);
  expect(container.querySelector('p.narrative').textContent).toBe(STALL);
  expect(screen.queryAllByRole('button')).toEqual([]);
});

// Round 184: a tap that shows a word's meaning also says the word; the tap that hides it is silent.
test('with onSay, opening a word says it aloud', async () => {
  const user = userEvent.setup();
  const onSay = vi.fn();
  render(<NarrativeText narrative={STALL} words={WORDS} language={italian} onSay={onSay} />);
  const [stall] = screen.getAllByRole('button');
  await user.click(stall);
  expect(onSay).toHaveBeenCalledWith('bancarella');
  await user.click(stall);
  expect(onSay).toHaveBeenCalledTimes(1);
});
