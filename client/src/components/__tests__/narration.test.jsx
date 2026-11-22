// Round 156 (issue #6): the narrator's written passages on the screen.
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Narration from '../Narration.jsx';
import { HubCard, RoadCaption, RoadResolved } from '../Road.jsx';

afterEach(cleanup);

test('a passage is one italic paragraph; a segment with a kind is set apart by its class', () => {
  const { container, rerender } = render(<Narration narration={{ id: 'path_snow', segments: [{ text: 'Snow lies on everything but the road.' }] }} />);
  const paragraph = container.querySelector('p.narrative.narration');
  expect(paragraph.textContent).toBe('Snow lies on everything but the road.');
  expect(paragraph.dataset.passage).toBe('path_snow');
  expect(paragraph.querySelector('span')).toBeNull();
  rerender(<Narration narration={{ id: 'x', segments: [{ text: 'Cut into the wood: ' }, { text: 'Torna indietro!', kind: 'truth', lang: 'it-IT' }] }} />);
  const span = container.querySelector('span.narration-truth');
  expect(span.textContent).toBe('Torna indietro!');
  expect(span.lang).toBe('it-IT');
  expect(container.querySelector('p').textContent).toBe('Cut into the wood: Torna indietro!');
});

test('nothing is drawn for no passage', () => {
  const { container } = render(<><Narration narration={null} /><Narration narration={{ id: 'x', segments: [] }} /></>);
  expect(container.innerHTML).toBe('');
});

const road = (extra = {}) => ({
  id: 'the_long_way', name: 'The Journey 2', seed: 7, step: 0, at: '0,0', here: { id: '0,0', name: 'The Patient Meadow', biome: 'meadow', at: [0, 0] },
  current: null, trail: ['0,0'], cleared: [], frontier: [], rails: null, log: [], narration: null, ...extra,
});
const state = (extra = {}) => ({ road: road(), curriculum: null, display: {}, openRoadPanel() {}, leaveRoad() {}, setRails() {}, ...extra });

test('the road\'s card tells the arrival, and an empty site is told in the narrator\'s voice', () => {
  render(<HubCard state={state({ road: road({ narration: { id: 'road_first_step', segments: [{ text: 'You step onto the road.' }] } }) })} />);
  expect(screen.getByText('You step onto the road.').className).toContain('narration');
  expect(screen.getByText(/Nobody waits here now\. Somebody has left a cairn/).className).toContain('narrative');
});

test('the travel caption tells the way taken until the camera is there', () => {
  const told = road({ narration: { id: 'ford_thread', segments: [{ text: 'You wade the ford.' }] } });
  const { rerender } = render(<RoadCaption state={state({ road: told, roadArrived: false })} />);
  expect(screen.getByText('You wade the ford.')).toBeTruthy();
  expect(screen.getByText(/On the way to The Patient Meadow/)).toBeTruthy();
  rerender(<RoadCaption state={state({ road: told, roadArrived: true, encounterLoading: true })} />);
  expect(screen.queryByText('You wade the ford.')).toBeNull();
});

test('a conversation\'s last word is the narrator\'s', () => {
  render(<RoadResolved state={state({ roadResult: null })} encounter={{ resolvedMessage: 'Barnaby stamps something, possibly you, and waves you on.', character: { name: 'Barnaby Thrupp' } }} />);
  expect(screen.getByText(/Barnaby stamps something/).className).toBe('narrative');
});
