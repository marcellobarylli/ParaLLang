// @vitest-environment node
// Round 213 (issue #23): the world event of a pull, as data (pullEvent.js), and the map's picture of land that
// sinks (roadMap.js prepareMap and paintMap). No canvas: what is drawn is checked in a browser (scripts/pull-check.mjs).
import { describe, expect, test } from 'vitest';
import { GRAPH } from '../../../server/src/road/graph.js';
import { PULL } from '../../../server/src/road/pulls.js';
import { landKey, landOf } from '../land.js';
import { PULL_EVENT, buckleShare, createPullEvent, createWebWave, hopSeconds } from '../pullEvent.js';
import { ROAD_MAP, createMapView, paintMap, prepareMap, renderMap } from '../roadMap.js';

const SEED = 4242;
// A walk of `count` sites along the ways from the start, by a fixed draw.
function walkOf(graph, count) {
  let state = 7;
  const draw = () => { state = (state * 1103515245 + 12345) & 0x7fffffff; return state / 0x7fffffff; };
  const out = [graph.start];
  const seen = new Set(out);
  let at = graph.start;
  for (let tries = 0; out.length < count && tries < count * 30; tries += 1) {
    const next = graph.neighbours(at).filter((id) => !seen.has(id));
    if (!next.length) { at = out[Math.floor(draw() * out.length)]; continue; }
    at = next[Math.floor(draw() * next.length)];
    out.push(at);
    seen.add(at);
  }
  return out;
}
const same = (a, b) => Buffer.compare(Buffer.from(a.data.buffer, a.data.byteOffset, a.data.byteLength), Buffer.from(b.data.buffer, b.data.byteOffset, b.data.byteLength)) === 0;

describe('the land of a road', () => {
  test('is the plain land with no pulls, the pulled land with them, and kept by seed and pulls', () => {
    const plain = landOf(SEED, []);
    expect(plain.terrain).toBe(plain.plain.terrain);
    expect(landOf(SEED)).toBe(plain);
    const pulled = [{ step: 4, depth: PULL.depth, sites: walkOf(plain.graph, 8) }];
    const land = landOf(SEED, pulled);
    expect(land).toBe(landOf(SEED, pulled));
    expect(land.plain).toBe(plain.plain);
    expect(land.key).toBe(landKey(SEED, pulled));
    expect(land.key).not.toBe(plain.key);
    const start = plain.graph.node(plain.graph.start);
    expect(land.graph.node(plain.graph.start).y).toBeCloseTo(start.y - PULL.depth, 3);
    expect(land.terrain.heightAt(start.x, start.z)).toBeCloseTo(start.y - PULL.depth, 3);
  });
});

describe('the map of land that sinks', () => {
  const { graph, terrain } = landOf(SEED, []);
  const walk = walkOf(graph, 16);
  const event = createPullEvent({ seed: SEED, pulled: [], pull: { step: 16, depth: PULL.depth, sites: walk }, walk, at: walk.at(-1), aspect: 1.2, columns: 120 });

  test('a place under the water is drawn on it by `project`, and where it is by `place`', () => {
    const view = createMapView([{ x: 0, z: 0, y: 0 }, { x: 300, z: 300, y: 0 }]);
    expect(view.project(50, 80, -12)).toEqual(view.project(50, 80, 0));
    expect(view.place(50, 80, -12)[1]).toBeCloseTo(view.project(50, 80, 0)[1] + 12 * view.lift, 9);
    expect(view.place(50, 80, 7)).toEqual(view.project(50, 80, 7));
  });

  test('before the pull the picture is the land\'s own map; at its end it is the pulled land\'s own map, to the pixel', () => {
    const { view, prepared } = event;
    expect(same(paintMap(prepared, 0), renderMap(terrain, view, { columns: 120, sink: event.after.deepest }))).toBe(true);
    expect(same(paintMap(prepared, 1), renderMap(event.after, view, { columns: 120 }))).toBe(true);
    expect(same(paintMap(prepared, 0), paintMap(prepared, 1))).toBe(false);
  });

  test('half way down every pixel is painted, and a picture can be painted over', () => {
    const picture = paintMap(event.prepared, 0.5);
    expect([picture.width, picture.height]).toEqual([120, Math.round(120 * 1.2)]);
    for (let n = 3; n < picture.data.length; n += 4) expect(picture.data[n]).toBe(255);
    expect(same(picture, paintMap(event.prepared, 0))).toBe(false);
    const again = paintMap(event.prepared, 1, picture);
    expect(again).toBe(picture);
    expect(same(picture, paintMap(event.prepared, 1))).toBe(true);
    // A landscape prepared without a dip paints the same at any share.
    const still = prepareMap(terrain, event.view, { columns: 120 });
    expect(same(paintMap(still, 0.7), paintMap(still, 0))).toBe(true);
  });

  test('the frame stands further back than the usual map, and holds the journey before and after it sinks', () => {
    const { view } = event;
    expect(view.scale).toBeLessThanOrEqual(PULL_EVENT.closest);
    expect(PULL_EVENT.closest).toBeLessThan(ROAD_MAP.closest);
    expect(view.height).toBeCloseTo(ROAD_MAP.width * 1.2, 9);
    for (const [x, z, level, dip] of event.sites) {
      for (const h of [level, level + dip]) {
        const [sx, sy] = view.place(x, z, h);
        expect(sx).toBeGreaterThan(0);
        expect(sx).toBeLessThan(view.width);
        expect(sy).toBeGreaterThan(0);
        expect(sy).toBeLessThan(view.height);
      }
    }
  });

  test('the journey is the walk, one walk at a time along its way, and every site of it sinks a pull', () => {
    expect(event.journey).toHaveLength(walk.length - 1);
    event.journey.forEach((hop, n) => {
      expect([hop.from, hop.to]).toEqual([walk[n], walk[n + 1]]);
      const [a, b] = [graph.node(walk[n]), graph.node(walk[n + 1])];
      // A way's line ends at its sites to within the arithmetic of its bow.
      expect(Math.hypot(hop.points[0][0] - a.x, hop.points[0][1] - a.z)).toBeLessThan(1e-6);
      expect(Math.hypot(hop.points.at(-1)[0] - b.x, hop.points.at(-1)[1] - b.z)).toBeLessThan(1e-6);
      expect(hop.points.length).toBeGreaterThan(2);
    });
    expect(event.sites).toHaveLength(walk.length);
    for (const [x, z, level, dip] of event.sites) {
      expect(level).toBeCloseTo(terrain.surfaceAt(x, z), 9);
      expect(dip).toBeCloseTo(-PULL.depth, 3);
    }
    expect(event.here.slice(0, 2)).toEqual([graph.node(walk.at(-1)).x, graph.node(walk.at(-1)).z]);
    expect(event.pulls).toEqual({ sites: walk.length, depth: PULL.depth });
  });

  test('a second pull starts from the land the first left, and sinks its sites again', () => {
    const first = [{ step: 16, depth: PULL.depth, sites: walk.slice(0, 10) }];
    const second = createPullEvent({ seed: SEED, pulled: first, pull: { step: 30, depth: PULL.depth, sites: walk.slice(10) }, walk, at: walk.at(-1), aspect: 1, columns: 80 });
    const [x, z, level, dip] = second.sites[0];
    expect(level).toBeCloseTo(terrain.surfaceAt(x, z) - PULL.depth, 3);
    expect(dip).toBeCloseTo(-PULL.depth, 3);
    expect(same(paintMap(second.prepared, 0), renderMap(landOf(SEED, first).terrain, second.view, { columns: 80, sink: second.after.deepest }))).toBe(true);
    expect(same(paintMap(second.prepared, 1), renderMap(second.after, second.view, { columns: 80 }))).toBe(true);
  });

  test('a journey of one site, or of sites the land does not have, still makes an event', () => {
    const one = createPullEvent({ seed: SEED, pulled: [], pull: { step: 1, depth: PULL.depth, sites: [graph.start] }, walk: ['nowhere', graph.start], at: graph.start, aspect: 2, columns: 60 });
    expect(one.journey).toEqual([]);
    expect(one.sites).toHaveLength(1);
    expect(one.wave.total).toBeGreaterThan(50);
    expect(one.view.scale).toBe(PULL_EVENT.closest);
  });
});

describe('the web\'s wave', () => {
  const { graph } = landOf(SEED, []);
  const centre = graph.node(graph.start);
  const bounds = { i0: -6, i1: 6, j0: -6, j1: 6 };
  const make = (options = {}) => createWebWave(graph, centre, { inside: () => true, bounds, every: 1, ...options });

  test('goes outward from the centre: the nearest cells first, and no further than the radius asked for', () => {
    const wave = make();
    expect(wave.total).toBe(169);
    expect(wave.advance(0)).toEqual([]);
    const first = wave.advance(120);
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((item) => item.distance <= 120)).toBe(true);
    expect(wave.made).toBe(first.length);
    const next = wave.advance(300, { most: 5 });
    expect(next).toHaveLength(5);
    expect(next.every((item) => item.distance > 120 - 1e-9 && item.distance <= 300)).toBe(true);
    let stops = 0;
    expect(wave.advance(Infinity, { until: () => { stops += 1; return stops > 3; } })).toHaveLength(3);
    const rest = wave.advance(Infinity);
    const all = [...first, ...next, ...rest];
    expect(wave.done).toBe(true);
    expect(wave.made).toBe(169 - 0);
    const distances = [...first, ...next].map((item) => item.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(wave.reach).toBeGreaterThanOrEqual(Math.max(...all.map((item) => item.distance)));
    expect(wave.advance(Infinity)).toEqual([]);
  });

  test('shows each cell as it is generated: the points tried, the one chosen, and the site it is', () => {
    for (const item of make().advance(Infinity)) {
      const [i, j] = item.cell;
      expect(item.tried).toHaveLength(GRAPH.candidates);
      expect(item.tried.map((point) => point.slice(0, 2))).toEqual(graph.candidates(i, j));
      const node = graph.nodeAt(i, j);
      if (!node) { expect([item.site, item.chosen]).toEqual([null, -1]); continue; }
      expect(item.site.id).toBe(node.id);
      expect(item.tried[item.chosen].slice(0, 2)).toEqual([node.x, node.z]);
      expect(item.site.point.slice(0, 2)).toEqual([node.x, node.z]);
    }
  });

  test('gives every way of every site once, growing from the site that was there first', () => {
    const made = new Set();
    const ways = new Set();
    const within = new Set();
    for (let i = bounds.i0; i <= bounds.i1; i += 1) for (let j = bounds.j0; j <= bounds.j1; j += 1) within.add(`${i},${j}`);
    for (const item of make().advance(Infinity)) {
      if (item.site) made.add(item.site.id);
      for (const way of item.ways) {
        const pair = [way.from, way.to].sort().join('|');
        expect(ways.has(pair)).toBe(false);
        ways.add(pair);
        // It is given with the second of its sites, or with its near site when the other is beyond the cells.
        expect(made.has(way.from)).toBe(true);
        expect(way.to === item.site.id || (way.from === item.site.id && !within.has(way.to))).toBe(true);
        expect(way.points.map((point) => point.slice(0, 2))).toEqual(graph.pathPoints(way.from, way.to).map(([x, z]) => [x, z]));
      }
    }
    const expected = new Set();
    for (const id of made) for (const other of graph.neighbours(id)) expected.add([id, other].sort().join('|'));
    expect([...ways].sort()).toEqual([...expected].sort());
  });

  test('keeps to the cells inside, the nearest `limit` of them, and adds what the caller keeps of each point', () => {
    const wave = make({ inside: (x, z) => Math.hypot(x - centre.x, z - centre.z) < 300, limit: 20, lift: (x, z) => [x + z, -1], every: 3 });
    expect(wave.total).toBe(20);
    const items = wave.advance(Infinity);
    expect(items.every((item) => item.distance < 300)).toBe(true);
    const site = items.find((item) => item.site && item.ways.length);
    expect(site.site.point).toEqual([site.site.point[0], site.site.point[1], site.site.point[0] + site.site.point[1], -1]);
    const way = site.ways[0];
    const full = graph.pathPoints(way.from, way.to);
    expect(way.points.length).toBeLessThan(full.length);
    expect(way.points.at(-1).slice(0, 2)).toEqual([full.at(-1)[0], full.at(-1)[1]]);
  });
});

describe('the event\'s pace', () => {
  test('the land goes down from nothing to all the way, never back, slowly at both ends', () => {
    expect(buckleShare(0)).toBe(0);
    expect(buckleShare(PULL_EVENT.buckle)).toBe(1);
    expect(buckleShare(PULL_EVENT.buckle * 2)).toBe(1);
    let previous = 0;
    for (let n = 1; n <= 100; n += 1) { const share = buckleShare((PULL_EVENT.buckle * n) / 100); expect(share).toBeGreaterThanOrEqual(previous); previous = share; }
    expect(buckleShare(PULL_EVENT.buckle * 0.1)).toBeLessThan(0.02);
    expect(buckleShare(PULL_EVENT.buckle * 0.5)).toBeCloseTo(0.5, 9);
  });

  test('a short journey is drawn a walk at a time at its own pace, and a long one in no more than its limit', () => {
    expect(hopSeconds(0)).toBe(0);
    expect(hopSeconds(20)).toBeCloseTo(PULL_EVENT.journey.hop, 9);
    expect(hopSeconds(2) * 2).toBeCloseTo(PULL_EVENT.journey.least, 9);
    expect(hopSeconds(400) * 400).toBeCloseTo(PULL_EVENT.journey.most, 9);
  });

  test('the web is grey, and the journey black', () => {
    const [r, g, b] = PULL_EVENT.grey.match(/\d+/g).map(Number);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(12);
    expect(Math.max(r, g, b)).toBeLessThan(200);
    expect(PULL_EVENT.black).toBe('#050505');
  });
});
