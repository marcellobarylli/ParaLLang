// @vitest-environment node
// Round 192: no tree or plant grows within the clearance of a way, and the undergrowth is of all three kinds.
import { expect, test } from 'vitest';
import { createTerrain } from '../../../../server/src/road/terrain.js';
import { createGraph } from '../../../../server/src/road/graph.js';
import { clearOfWays, clearance, waySegments } from '../wayClearance.js';

const terrain = createTerrain(4242);
const graph = createGraph(terrain);
const CHUNK = 48;
const cleared = clearOfWays(terrain, graph, CHUNK);
const distanceToSegment = (x, z, [[ax, az], [bx, bz]]) => {
  const [dx, dz] = [bx - ax, bz - az];
  const u = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (ax + dx * u), z - (az + dz * u));
};

test('the trees and plants of the chunks round the start keep 1.6 m off every way, and some were moved off them', () => {
  const start = graph.node(graph.start);
  const [ci, cj] = [Math.floor(start.x / CHUNK), Math.floor(start.z / CHUNK)];
  let removed = 0;
  const kinds = new Set();
  for (let cx = ci - 3; cx <= ci + 3; cx += 1) {
    for (let cz = cj - 3; cz <= cj + 3; cz += 1) {
      const segments = waySegments(graph, cx * CHUNK, cz * CHUNK, (cx + 1) * CHUNK, (cz + 1) * CHUNK);
      const kept = [...cleared.treesIn(cx, cz), ...cleared.undergrowthIn(cx, cz)];
      for (const thing of kept) {
        kinds.add(thing.kind);
        for (const segment of segments) expect(distanceToSegment(thing.x, thing.z, segment)).toBeGreaterThanOrEqual(clearance());
      }
      removed += terrain.treesIn(cx, cz).length + terrain.undergrowthIn(cx, cz).length - kept.length;
    }
  }
  expect(removed).toBeGreaterThan(0);
  for (const kind of ['fern', 'flower', 'bush']) expect(kinds.has(kind)).toBe(true);
  expect(clearance()).toBeCloseTo(1.6, 5);
});
