// Round 163 (issue #13): the chart of the Odyssey the narrator shows beside its remark on a long journey.
// Round 165: the chart has a real map under it (Natural Earth's coast), and the line between stops goes by sea.
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import OdysseyChart, { ODYSSEY, ODYSSEY_MAP, chartPoint, placesOf } from '../OdysseyChart.jsx';
import { clipRing, nearestSea, seaGrid, seaWay, thin } from '../../../scripts/make-odyssey-map.mjs';

afterEach(cleanup);

// The coast as the chart holds it: rings of [lon, lat], with each ring's box.
const RINGS = ODYSSEY_MAP.rings.map((flat) => {
  const points = placesOf(flat).map(({ lon, lat }) => [lon, lat]);
  const [lons, lats] = [points.map((p) => p[0]), points.map((p) => p[1])];
  return { points, across: Math.max(Math.max(...lons) - Math.min(...lons), Math.max(...lats) - Math.min(...lats)) };
});
const inside = ([x, y], ring) => {
  let within = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [a, b] = [ring[i], ring[j]];
    if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) within = !within;
  }
  return within;
};
const toEdge = ([x, y], ring) => ring.reduce((least, a, i) => {
  const b = ring[(i + 1) % ring.length];
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = dx || dy ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.min(least, Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy)));
}, Infinity);
/** How far a point is from land, in degrees: 0 on land. `depth` is how far inside the land it is. */
const land = (point) => {
  const on = RINGS.find((ring) => inside(point, ring.points));
  return on ? { away: 0, depth: toEdge(point, on.points), ring: on } : RINGS.reduce((best, ring) => {
    const away = toEdge(point, ring.points);
    return away < best.away ? { away, depth: 0, ring } : best;
  }, { away: Infinity, depth: 0, ring: null });
};
const at = (stop) => [stop.lon, stop.lat];
const stop = (name) => ODYSSEY.stops.find((other) => other.name === name);

test('the voyage is the poem\'s: from Troy to Ithaca through its stops in order, each with the place tradition gives it', () => {
  expect(ODYSSEY.stops.map((stop) => stop.name)).toEqual([
    'Troy', 'The Cicones', 'The Lotus-eaters', 'The Cyclopes', 'Aeolus', 'The Laestrygonians', 'Circe', 'The Underworld', 'Circe again',
    'The Sirens', 'Scylla and Charybdis', 'Thrinacia', 'Calypso', 'The Phaeacians', 'Ithaca',
  ]);
  const place = (name) => stop(name).place;
  expect([place('The Lotus-eaters'), place('Circe'), place('Calypso'), place('The Phaeacians')]).toEqual(['Djerba', 'Monte Circeo', 'Gozo', 'Corfu']);
  // Every stop is inside the frame, and most are marked as disputed: the chart claims no more than tradition does.
  const { frame } = ODYSSEY;
  for (const stop of ODYSSEY.stops) expect(stop.lon > frame.west && stop.lon < frame.east && stop.lat > frame.south && stop.lat < frame.north).toBe(true);
  expect(ODYSSEY.stops.filter((stop) => stop.disputed || stop.unplaced).length).toBeGreaterThan(ODYSSEY.stops.length / 2);
});

test('east is to the right and north is up, and a degree of longitude is as short as it is on the ground', () => {
  const [troy, djerba] = [chartPoint(ODYSSEY.stops[0]), chartPoint(ODYSSEY.stops[2])];
  expect(troy[0]).toBeGreaterThan(djerba[0]);
  expect(troy[1]).toBeLessThan(djerba[1]);
  const { frame } = ODYSSEY;
  const [origin, east, north] = [{ lon: 15, lat: 38 }, { lon: 16, lat: 38 }, { lon: 15, lat: 39 }].map((place) => chartPoint(place));
  const middle = (frame.north + frame.south) / 2;
  expect((east[0] - origin[0]) / (origin[1] - north[1])).toBeCloseTo(Math.cos((middle * Math.PI) / 180), 6);
});

test('the map under the chart is the real coast: Natural Earth\'s, with the lands of the frame on it', () => {
  expect(ODYSSEY_MAP.source).toMatch(/Natural Earth land boundaries, 1:10m.*Public domain/);
  expect(RINGS.length).toBeGreaterThan(50);
  // Places anyone can check: Rome, Athens and Tunis are on land, and so are the middles of Sicily, Sardinia and Crete.
  for (const place of [[12.5, 41.9], [23.73, 38.0], [10.17, 36.8], [14.1, 37.6], [9.0, 40.0], [24.9, 35.2]]) expect(land(place).away).toBe(0);
  // And these are sea: the Tyrrhenian, the Ionian, the Adriatic, the Aegean north of Crete.
  for (const place of [[12.0, 39.5], [18.5, 37.0], [16.5, 42.5], [25.0, 35.9]]) expect(land(place).away).toBeGreaterThan(0.3);
  // The Strait of Messina is open water, a few kilometres wide.
  const strait = land(at(stop('Scylla and Charybdis')));
  expect(strait.away).toBeGreaterThan(0);
  expect(strait.away).toBeLessThan(0.1);
});

test('every placed stop stands where its name says: on or beside the land, the island stops on islands', () => {
  for (const stop of ODYSSEY.stops.filter((stop) => !stop.unplaced)) expect(land(at(stop)).away, stop.name).toBeLessThan(0.12);
  // Djerba and Corfu are islands a stop stands on; Lipari, Gozo and Ithaca are small ones a stop is on or just off.
  for (const name of ['The Lotus-eaters', 'The Phaeacians']) {
    const found = land(at(stop(name)));
    expect(found.away, name).toBe(0);
    expect(found.ring.across, name).toBeLessThan(0.6);
  }
  for (const name of ['Aeolus', 'Calypso', 'Ithaca']) {
    const found = land(at(stop(name)));
    expect(found.away, name).toBeLessThan(0.03);
    expect(found.ring.across, name).toBeLessThan(0.25);
  }
  // The Underworld is on no map: it is drawn in open sea, at the western edge.
  const under = stop('The Underworld');
  expect(land(at(under)).away).toBeGreaterThan(0.8);
  expect(under.lon - ODYSSEY.frame.west).toBeLessThan(2);
});

test('the line between two stops goes by sea: it meets both stops and never crosses the land', () => {
  const { stops } = ODYSSEY;
  expect(ODYSSEY_MAP.route).toHaveLength(stops.length - 1);
  ODYSSEY_MAP.route.forEach((flat, n) => {
    const leg = placesOf(flat).map(({ lon, lat }) => [lon, lat]);
    // The file holds hundredths of a degree, so a leg's ends are its stops to that grain.
    expect(Math.hypot(leg[0][0] - stops[n].lon, leg[0][1] - stops[n].lat), `leg ${n + 1} starts at ${stops[n].name}`).toBeLessThan(0.011);
    expect(Math.hypot(leg.at(-1)[0] - stops[n + 1].lon, leg.at(-1)[1] - stops[n + 1].lat), `leg ${n + 1} ends at ${stops[n + 1].name}`).toBeLessThan(0.011);
    // Walk the leg in steps of about two kilometres. Near its ends it may be ashore (a stop can stand inland);
    // between them it is never more than a coast's thinning deep in the land.
    for (let i = 0; i + 1 < leg.length; i += 1) {
      const [a, b] = [leg[i], leg[i + 1]];
      const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.02));
      for (let s = 0; s <= steps; s += 1) {
        const point = [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps];
        if (Math.min(Math.hypot(point[0] - leg[0][0], point[1] - leg[0][1]), Math.hypot(point[0] - leg.at(-1)[0], point[1] - leg.at(-1)[1])) < 0.2) continue;
        expect(land(point).depth, `leg ${n + 1} at ${point.map((v) => v.toFixed(2))}`).toBeLessThan(0.05);
      }
    }
  });
  // The way to the Underworld and the way back are one line, sailed twice.
  expect(ODYSSEY_MAP.route[7]).toEqual(placesOf(ODYSSEY_MAP.route[6]).reverse().flatMap(({ lon, lat }) => [Math.round(lon * 100), Math.round(lat * 100)]));
  // The straight line from the Cicones to the Lotus-eaters would cross Greece; the route rounds the Peloponnese, south of Cape Malea.
  const south = placesOf(ODYSSEY_MAP.route[1]).filter(({ lon }) => lon > 22.5 && lon < 23.6);
  expect(south.length).toBeGreaterThan(0);
  expect(Math.min(...south.map(({ lat }) => lat))).toBeLessThan(36.45);
});

test('the names on the map are where they say: lands on land, seas on the sea, the compass rose in open water', () => {
  const { labels, rose } = ODYSSEY;
  expect(labels.map((label) => label.text)).toEqual(expect.arrayContaining(['Italy', 'Greece', 'Africa', 'Sicily', 'Tyrrhenian Sea', 'Ionian Sea', 'Aegean Sea', 'the stream of Ocean']));
  for (const label of labels) {
    const found = land([label.lon, label.lat]);
    if (label.kind === 'land' || label.kind === 'isle') expect(found.away, label.text).toBe(0);
    else expect(found.away, label.text).toBeGreaterThan(0.25);
  }
  expect(land([14.1, 37.2]).ring).toBe(land([15.1, 37.6]).ring); // "Sicily" is written on the island the Cyclopes stand on
  expect(land([rose.lon, rose.lat]).away).toBeGreaterThan(1);
});

test('the chart draws the coast, the route by sea through every stop, numbers each stop once, lists them and says what it is', () => {
  const { container } = render(<OdysseyChart />);
  expect(screen.getByRole('img', { name: /The Odyssey, as tradition maps it: a line through 14 stops, from Troy to Ithaca/ })).toBeTruthy();
  // The land is one shape, drawn once and used again for the lines along the shore.
  const shape = container.querySelector('defs path');
  expect(shape.getAttribute('d').split('Z').length - 1).toBe(ODYSSEY_MAP.rings.length);
  expect(container.querySelector('use.land').getAttribute('href')).toBe(`#${shape.id}`);
  expect(container.querySelectorAll('.shore use').length).toBe(6);
  // Fourteen legs; the two to and from the Underworld are drawn as a way that is on no map.
  const legs = [...container.querySelectorAll('path.route')];
  expect(legs).toHaveLength(14);
  expect(legs.filter((leg) => leg.classList.contains('off')).map((leg) => leg.dataset.leg)).toEqual(['7', '8']);
  const [x, y] = chartPoint(ODYSSEY.stops[0]).map((n) => Math.round(n * 100) / 100);
  expect(legs[0].getAttribute('d').startsWith(`M${x} ${y}`)).toBe(true);
  expect(container.querySelectorAll('g.stop')).toHaveLength(14);
  expect(container.querySelectorAll('g.stop.end')).toHaveLength(2);
  expect(container.querySelectorAll('g.stop.unplaced')).toHaveLength(1);
  // A crowded stop's number is moved off its place and joined to it by a line.
  expect(container.querySelectorAll('g.stop line.lead').length).toBe(ODYSSEY.stops.filter((stop) => stop.label).length);
  // The furniture of an old chart: names, a compass rose with its winds, the title, and a border of whole degrees.
  expect(container.querySelectorAll('text.name')).toHaveLength(ODYSSEY.labels.length);
  expect(container.querySelector('.rose .rose-north').textContent).toBe('N');
  expect(container.querySelectorAll('.winds line')).toHaveLength(16);
  expect([...container.querySelectorAll('.cartouche text')].map((line) => line.textContent)).toEqual(['The Wanderings', 'of Odysseus']);
  const { frame } = ODYSSEY;
  const even = (from, to) => Array.from({ length: Math.ceil(to) - Math.floor(from) }, (_, n) => Math.floor(from) + n).filter((d) => d % 2 === 0).length;
  expect(container.querySelectorAll('rect.bar')).toHaveLength(2 * even(frame.west, frame.east) + 2 * even(frame.south, frame.north));
  const items = [...container.querySelectorAll('.odyssey-stops li')].map((item) => item.textContent);
  expect(items).toHaveLength(14);
  expect(items[0]).toBe('Troy Hisarlik, in the Troad');
  expect(items[2]).toBe('The Lotus-eaters Djerba (disputed)');
  expect(items[7]).toBe('The Underworld beyond the stream of Ocean (on no map)');
  const caption = container.querySelector('figcaption').textContent;
  expect(caption).toMatch(/The voyage home of Odysseus on the real coast.*Nearly every place on it is disputed, and the line between two stops is only the shortest way by sea\./);
  expect(caption).toMatch(/Coast: Natural Earth, public domain\.$/);
});

test('two charts on one page do not share their shapes', () => {
  const { container } = render(<><OdysseyChart /><OdysseyChart /></>);
  const ids = [...container.querySelectorAll('defs path')].map((path) => path.id);
  expect(new Set(ids).size).toBe(2);
});

// The script that makes the map (client/scripts/make-odyssey-map.mjs), on a sea small enough to read.
test('the map script: a ring is cut to a box, a line is thinned, and the way by sea goes round an island', () => {
  expect(clipRing([[0, 0], [4, 0], [4, 4], [0, 4]], { west: 1, east: 3, south: 1, north: 3 }).map(String).sort()).toEqual(['1,1', '1,3', '3,1', '3,3']);
  expect(thin([[0, 0], [1, 0.001], [2, 0], [3, 1], [4, 0]], 0.01)).toEqual([[0, 0], [2, 0], [3, 1], [4, 0]]);
  // A sea ten degrees by ten in cells of one degree, with a wall of land across its middle that stops short of the east side.
  const cut = { west: 0, east: 10, south: 0, north: 10 };
  const options = { cell: 1, offing: 0, shy: 1 };
  const grid = seaGrid([[[0, 4], [8, 4], [8, 6], [0, 6]]], cut, options);
  expect(grid.land[4 * 10 + 3]).toBe(1);
  expect(grid.land[4 * 10 + 9]).toBe(0);
  const [from, to] = [nearestSea(grid, [2.5, 1.5]), nearestSea(grid, [2.5, 8.5])];
  const way = seaWay(grid, from, to, options).map((n) => grid.pointOf(n));
  expect(way[0]).toEqual([2.5, 1.5]);
  expect(way.at(-1)).toEqual([2.5, 8.5]);
  expect(way.every(([x, y]) => !grid.land[Math.floor(y) * 10 + Math.floor(x)])).toBe(true);
  expect(Math.max(...way.map(([x]) => x))).toBeGreaterThan(8); // it had to go round the wall's east end
  // A point on land is given the nearest cell of sea.
  expect(grid.pointOf(nearestSea(grid, [3.5, 4.4]))).toEqual([3.5, 3.5]);
});
