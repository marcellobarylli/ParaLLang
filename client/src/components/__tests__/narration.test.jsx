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
  id: 'the_long_way', name: 'The Journey 2', seed: 7, step: 0, at: '0,0', here: { id: '0,0', name: 'The Patient Meadow', cover: 'meadow', at: [0, 0] },
  current: null, trail: ['0,0'], cleared: [], frontier: [], rails: null, log: [], narration: null, ...extra,
});
const state = (extra = {}) => ({ road: road(), curriculum: null, display: {}, openRoadPanel() {}, leaveRoad() {}, setRails() {}, ...extra });

test('the road\'s card tells the arrival, and an empty site is told in the narrator\'s voice', () => {
  render(<HubCard state={state({ road: road({ narration: { id: 'road_first_step', segments: [{ text: 'You step onto the road.' }] } }) })} />);
  expect(screen.getByText('You step onto the road.').className).toContain('narration');
  expect(screen.getByText(/Nobody waits here now\. Somebody has left a cairn/).className).toContain('narrative');
});

// Round 216 (the owner): nothing is written while the camera walks; the breathing is played over the walk instead.
test('the travel caption says nothing, whatever the passage and whether or not the character is ready', () => {
  const told = road({ current: { character: { name: 'Erasmus Quill' } }, narration: { id: 'ford_thread', segments: [{ text: 'You wade the ford.' }] } });
  const { container, rerender } = render(<RoadCaption state={state({ road: told, roadArrived: false })} />);
  expect(container.textContent).toBe('');
  rerender(<RoadCaption state={state({ road: told, roadArrived: true, encounterLoading: true })} />);
  expect(container.textContent).toBe('');
  expect(screen.queryByRole('status')).toBeNull();
  rerender(<RoadCaption state={state({ road: told, roadError: 'The way is shut.' })} />);
  expect(screen.getByRole('alert').textContent).toBe('The way is shut.'); // a problem is still told
});

test('a conversation\'s last word is the narrator\'s', () => {
  render(<RoadResolved state={state({ roadResult: null })} encounter={{ resolvedMessage: 'Barnaby stamps something, possibly you, and waves you on.', character: { name: 'Barnaby Thrupp' } }} />);
  expect(screen.getByText(/Barnaby stamps something/).className).toBe('narrative');
});

// Round 160 (issue #8): biomes, and the legacy dungeons as nodes of the road.
test('a place has its biome under its name, with how far the unit\'s gate is and the dungeon it stands in', () => {
  const here = { id: '0,0', name: 'The Patient Meadow', cover: 'meadow', biome: 'jungle', biomeName: 'Jungle', at: [0, 0], dungeon: null };
  const { rerender } = render(<HubCard state={state({ road: road({ here, gate: { unitTitle: 'Hello and goodbye', hops: 3, dungeon: { id: 'ta_prohm', name: 'Ta Prohm' } } }) })} />);
  expect(screen.getByText('Jungle · Ta Prohm in 3 conversations or more')).toBeTruthy();
  rerender(<HubCard state={state({ road: road({ here, gate: { unitTitle: 'Hello and goodbye', hops: 0, dungeon: { id: 'ta_prohm', name: 'Ta Prohm' } } }) })} />);
  expect(screen.getByText('Jungle · Ta Prohm is near')).toBeTruthy();
  // Standing in the dungeon: the place is the dungeon's first site.
  rerender(<HubCard state={state({ road: road({ here: { ...here, dungeon: { id: 'ta_prohm', name: 'Ta Prohm', siteName: 'The Face Gate' } } }) })} />);
  expect(screen.getByRole('heading', { name: 'Ta Prohm: The Face Gate' })).toBeTruthy();
  expect(screen.queryByText(/Jungle/)).toBeNull();
});

test('the way on to a legacy dungeon\'s node says so: "Enter Ta Prohm"', () => {
  const offer = (extra = {}) => ({ kind: 'checkpoint', title: 'The gate: Hello and goodbye', unitId: 'greetings', unitTitle: 'Hello and goodbye', cefr: 'A1', why: null, dungeon: null, character: { name: 'Osbert Hinge', role: 'Gatekeeper of the Next Bit', description: 'A tall, folded person.', hue: 0.2 }, ...extra });
  const site = (extra) => ({ id: '1,0', name: 'The Lower Ford', cover: 'meadow', biome: 'jungle', at: [88, 0], from: '0,0', way: 'path', recommended: true, offer: offer(extra) });
  const withGate = road({ frontier: [site({ dungeon: { id: 'ta_prohm', name: 'Ta Prohm', siteName: 'The Face Gate' } })], rails: '1,0' });
  const { rerender } = render(<HubCard state={state({ road: withGate, roadContinue() {} })} />);
  expect(screen.getByRole('button', { name: 'Enter Ta Prohm' })).toBeTruthy();
  expect(screen.getByText(/in Ta Prohm, beyond The Lower Ford\./)).toBeTruthy();
  rerender(<HubCard state={state({ road: road({ frontier: [site()], rails: '1,0' }), roadContinue() {} })} />);
  expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
});

// Round 185: streamlined mode's gate is three conversations; each says how far in the player is.
test('a conversation of a streamlined gate says which of three it was', () => {
  const encounter = { resolvedMessage: 'The keeper nods.', character: { name: 'Keeper' } };
  const { rerender } = render(<RoadResolved state={state({ roadResult: { kind: 'gate', score: 0.5, part: 1, of: 3 } })} encounter={encounter} />);
  expect(screen.getByText(/The gate, 1 of 3: 50 % said cleanly\. Further in, someone else is waiting\./)).toBeTruthy();
  rerender(<RoadResolved state={state({ roadResult: { kind: 'gate', score: 1, part: 3, of: 3, opened: { unitTitle: 'Numbers' } } })} encounter={encounter} />);
  expect(screen.getByText(/Through the gate: all 3 conversations.*A new unit begins: Numbers\./)).toBeTruthy();
});
