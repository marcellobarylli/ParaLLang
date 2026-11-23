// @vitest-environment node
// Round 176: the camera's line between two sites follows the shortest walk along the ways, rounded off: its ends
// stay at the sites, it has no sharp corner, and it never strays far from the ways.
import { expect, test } from 'vitest';
import { ROAD_PATH, resample, smoothPath, travelLine } from '../roadPath.js';
import { createTerrain } from '../../../../server/src/road/terrain.js';
import { createGraph } from '../../../../server/src/road/graph.js';

const graph = createGraph(createTerrain(4242));
const turn = (a, b, c) => {
  const [u, v] = [[b[0] - a[0], b[1] - a[1]], [c[0] - b[0], c[1] - b[1]]];
  return Math.abs(Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]));
};
const nearest = (point, line) => Math.min(...line.map((q) => Math.hypot(q[0] - point[0], q[1] - point[1])));

test('a square corner is rounded, the ends stay, and the points are evenly spaced', () => {
  const corner = [[0, 0], [60, 0], [60, 60]];
  const line = smoothPath(corner);
  expect(line[0]).toEqual([0, 0]);
  expect(line.at(-1)).toEqual([60, 60]);
  for (let n = 1; n < line.length - 1; n += 1) expect(turn(line[n - 1], line[n], line[n + 1])).toBeLessThan(0.25); // the 90° turn spread out
  expect(Math.hypot(line[Math.round(line.length / 2)][0] - 60, line[Math.round(line.length / 2)][1])).toBeGreaterThan(3); // the corner is cut, not kept
  const even = resample(corner, 5);
  for (let n = 1; n < even.length; n += 1) expect(Math.hypot(even[n][0] - even[n - 1][0], even[n][1] - even[n - 1][1])).toBeCloseTo(120 / 24, 5);
});

test('between two sites the line goes the shortest walk along the ways, smooth and close to them', () => {
  const start = graph.start;
  // A site that is not next to the start: the walk to it goes through others.
  const here = graph.node(start);
  const far = graph.nodesNear(here.x, here.z, 3).map((node) => node.id).find((id) => (graph.route(id === start ? null : start, id)?.length ?? 0) >= 4);
  const found = travelLine(graph, start, far);
  expect(found.sites[0]).toBe(start);
  expect(found.sites.at(-1)).toBe(far);
  expect(found.sites.length).toBeGreaterThan(2); // not one straight leap
  const [a, b] = [graph.node(start), graph.node(far)];
  expect(found.points[0][0]).toBeCloseTo(a.x, 6);
  expect(found.points[0][1]).toBeCloseTo(a.z, 6);
  expect(found.points.at(-1)[0]).toBeCloseTo(b.x, 6);
  expect(found.points.at(-1)[1]).toBeCloseTo(b.z, 6);
  const ways = found.sites.slice(1).flatMap((id, n) => graph.pathPoints(found.sites[n], id));
  for (const point of found.points) expect(nearest(point, ways)).toBeLessThan(ROAD_PATH.smooth); // near the ways
  let sharpest = 0;
  for (let n = 1; n < found.points.length - 1; n += 1) sharpest = Math.max(sharpest, turn(found.points[n - 1], found.points[n], found.points[n + 1]));
  expect(sharpest).toBeLessThan(0.2); // radians per 3 m: no hard edge
  expect(travelLine(graph, start, start)).toBe(null);
});
