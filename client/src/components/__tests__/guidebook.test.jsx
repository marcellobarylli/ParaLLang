// @vitest-environment jsdom
// Round 157 (issue #5): the guidebook on the screen and in the store, against the real server logic.
import React from 'react';
import { afterAll, afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Guidebook, { GuideNote } from '../Guidebook.jsx';
import { createGameStore } from '../../stores/gameStore.js';
import { DUNGEON } from '../../dungeon.js';
import { ATLAS } from '../../atlas.js';
import { cleanUp, createRoadServer } from '../../__tests__/roadServer.js';

vi.setConfig({ testTimeout: 30_000 });
afterEach(cleanup);
afterAll(cleanUp);

const entry = (id, title, text, unread = false) => ({ id, title, segments: [{ text }], at: '2026-01-15T12:00:00.000Z', unread });

test('the panel lists the entries with their titles, marks the new ones, and says how many there are to find', () => {
  const guidebook = { total: 4, entries: [entry('the_road', 'The road', 'No road ends.'), entry('the_gate', 'Gates', 'No hint is given at a gate.', true)] };
  render(<Guidebook guidebook={guidebook} onReturn={() => {}} returnLabel="Back to the road" />);
  expect(screen.getByRole('main', { name: 'Guidebook' })).toBeTruthy();
  expect(screen.getByText('2 of 4 entries')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'The road' })).toBeTruthy();
  expect(screen.getByText('No road ends.').className).toContain('narration');
  expect(screen.getByRole('heading', { name: /Gates/ }).textContent).toContain('New');
  expect(screen.getByRole('heading', { name: 'The road' }).textContent).not.toContain('New');
  expect(screen.getByRole('button', { name: 'Back to the road' })).toBeTruthy();
});

// Round 158 (issue #4): the passages with an untranslatable text that the player has met.
test('the panel keeps the turmeric texts found, as text with nothing to tap', () => {
  const fragment = { id: 'truth_ford', at: '2026-01-15T12:00:00.000Z', segments: [{ text: 'Three words are scratched: ' }, { text: 'Qui passa un filo.', kind: 'truth', lang: 'it-IT' }] };
  render(<Guidebook guidebook={{ total: 5, entries: [], fragments: [fragment] }} onReturn={() => {}} />);
  const section = screen.getByRole('region', { name: 'Turmeric text you have found' });
  const span = section.querySelector('.narration-truth');
  expect(span.textContent).toBe('Qui passa un filo.');
  expect(span.lang).toBe('it-IT');
  expect(span.getAttribute('translate')).toBe('no');
  expect(section.querySelectorAll('button')).toHaveLength(0);
  expect(screen.getByText(/Nothing translates these\./)).toBeTruthy();
});

test('an empty guidebook says how entries come, and one still being read says so', () => {
  const { rerender } = render(<Guidebook guidebook={{ total: 4, entries: [] }} onReturn={() => {}} />);
  expect(screen.getByText('Nothing is entered yet')).toBeTruthy();
  rerender(<Guidebook guidebook={null} onReturn={() => {}} />);
  expect(screen.getByText('Opening…')).toBeTruthy();
  expect(screen.queryByText('Nothing is entered yet')).toBeNull();
});

test('a new entry is told on the card of the place, with a way into the guidebook; nothing is drawn when none is new', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  const { container, rerender } = render(<GuideNote note={{ count: 1, unread: [entry('the_road', 'The road', 'No road ends.', true)] }} onOpen={onOpen} />);
  expect(screen.getByRole('complementary', { name: 'Entered in your guidebook' }).textContent).toContain('No road ends.');
  await user.click(screen.getByRole('button', { name: 'Open it' }));
  expect(onOpen).toHaveBeenCalledOnce();
  rerender(<GuideNote note={{ count: 1, unread: [] }} onOpen={onOpen} />);
  expect(container.innerHTML).toBe('');
});

// Round 158: a player who never opens the guidebook is told the newest entries only; the rest are counted.
test('only the entries entered last are told in place; older unread ones are counted', () => {
  const old = { ...entry('the_road', 'The road', 'No road ends.', true), at: '2026-01-15T12:00:00.000Z' };
  const first = { ...entry('turmeric_text', 'Turmeric text', 'It cannot be translated.', true), at: '2026-01-16T12:00:00.000Z' };
  const second = { ...entry('second_tellings', 'Old words', 'Said twice.', true), at: '2026-01-16T12:00:00.000Z' };
  render(<GuideNote note={{ count: 3, unread: [old, first, second] }} onOpen={() => {}} />);
  const note = screen.getByRole('complementary', { name: 'Entered in your guidebook' });
  expect(note.textContent).toContain('It cannot be translated.');
  expect(note.textContent).toContain('Said twice.');
  expect(note.textContent).not.toContain('No road ends.');
  expect(note.textContent).toContain('where 1 more entry waits unread');
});

test('the store: the first step on the road brings an unread entry; opening the guidebook reads it', async () => {
  const server = createRoadServer();
  const storage = { getItem: () => null, setItem: () => {} };
  const store = createGameStore({ api: server.api, storage, dungeon: DUNGEON, atlas: ATLAS });
  const s = () => store.getState();
  await s().initialize();
  // Reading the dungeon's map on the way in enters nothing.
  expect(s().guideNote).toEqual({ count: 0, unread: [] });
  s().enter();
  await s().enterRoad();
  expect(s().guideNote.unread.map((item) => item.id)).toEqual(['the_road']);
  expect(s().guideNote.count).toBe(1);
  s().openGuidebook();
  expect(s().view).toBe('guidebook');
  await vi.waitFor(() => expect(s().guideNote.unread).toEqual([]));
  // The panel keeps its "New" marks for this visit.
  expect(s().guidebook.entries.map((item) => [item.id, item.unread])).toEqual([['the_road', true]]);
  expect(s().guidebook.total).toBe(5);
  expect(s().guidebook.fragments).toEqual([]);
  s().returnToDialogue();
  expect(s().view).toBe('dialogue');
  // The server has them as read: the next view of the road brings none.
  await s().refreshRoad();
  expect(s().guideNote).toEqual({ count: 1, unread: [] });
});
