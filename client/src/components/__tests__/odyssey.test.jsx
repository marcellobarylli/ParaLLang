// Round 163 (issue #13): the chart of the Odyssey the narrator shows beside its remark on a long journey.
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OdysseyChart, { ODYSSEY, chartPoint } from '../OdysseyChart.jsx';

afterEach(cleanup);

test('the voyage is the poem\'s: from Troy to Ithaca through its stops in order, each with the place tradition gives it', () => {
  expect(ODYSSEY.stops.map((stop) => stop.name)).toEqual([
    'Troy', 'The Cicones', 'The Lotus-eaters', 'The Cyclopes', 'Aeolus', 'The Laestrygonians', 'Circe', 'The Underworld', 'Circe again',
    'The Sirens', 'Scylla and Charybdis', 'Thrinacia', 'Calypso', 'The Phaeacians', 'Ithaca',
  ]);
  const place = (name) => ODYSSEY.stops.find((stop) => stop.name === name).place;
  expect([place('The Lotus-eaters'), place('Circe'), place('Calypso'), place('The Phaeacians')]).toEqual(['Djerba', 'Monte Circeo', 'Gozo', 'Corfu']);
  // Every stop is inside the frame, and most are marked as disputed: the chart claims no more than tradition does.
  const { frame } = ODYSSEY;
  for (const stop of ODYSSEY.stops) expect(stop.lon > frame.west && stop.lon < frame.east && stop.lat > frame.south && stop.lat < frame.north).toBe(true);
  expect(ODYSSEY.stops.filter((stop) => stop.disputed || stop.unplaced).length).toBeGreaterThan(ODYSSEY.stops.length / 2);
});

test('east is to the right and north is up', () => {
  const [troy, djerba] = [chartPoint(ODYSSEY.stops[0]), chartPoint(ODYSSEY.stops[2])];
  expect(troy[0]).toBeGreaterThan(djerba[0]);
  expect(troy[1]).toBeLessThan(djerba[1]);
});

test('the chart draws one line through every stop, numbers each stop once, lists them and says what it is', () => {
  const { container } = render(<OdysseyChart />);
  expect(screen.getByRole('img', { name: /The Odyssey, as tradition maps it: a line through 14 stops, from Troy to Ithaca/ })).toBeTruthy();
  const route = container.querySelector('polyline.route').getAttribute('points').trim().split(' ');
  expect(route).toHaveLength(15);
  expect(route[6]).toBe(route[8]); // to Circe, to the Underworld and back to Circe
  expect(container.querySelectorAll('g.stop')).toHaveLength(14);
  expect(container.querySelectorAll('g.stop.end')).toHaveLength(2);
  expect(container.querySelectorAll('g.stop.unplaced')).toHaveLength(1);
  const items = [...container.querySelectorAll('.odyssey-stops li')].map((item) => item.textContent);
  expect(items).toHaveLength(14);
  expect(items[0]).toBe('Troy Hisarlik, in the Troad');
  expect(items[2]).toBe('The Lotus-eaters Djerba (disputed)');
  expect(items[7]).toBe('The Underworld beyond the stream of Ocean (on no map)');
  expect(container.querySelector('figcaption').textContent).toMatch(/A sketch of the voyage home of Odysseus.*Nearly every place on it is disputed\./);
});
