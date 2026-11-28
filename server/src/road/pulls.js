// Round 213 (issue #23): the pulls. At each change of level in the curriculum the land is pulled down at every site
// of the walk so far, for good (docs/lore-book.md, "The pulls"). Pure and deterministic, as the landscape is: the
// save holds which sites were pulled and how far (`road.pulled`), and the ground is still a function of the seed and
// of that list, so the web client stands on the same ground wherever it reads it.
//
// The geometry. The graph is read off the landscape, so a site is a point of it: (x, z) and a height. A pull says
// "this site is now `depth` metres lower", for every site of the walk: a set of constraints on the ground. The
// ground that meets them is the old ground plus a displacement field D(x, z):
//
//   D(site k) = -depth k exactly, for every pulled site
//   D is smooth, and nothing beyond PULL.radius cells of the walk
//   between the sites D is rough the way the land is (fractal noise), so the hollow is country, not a bowl
//
// D is a sum of one compactly supported bump per site (Wendland's (1 - r)^4 (4r + 1), which is positive definite
// in the plane), D = -sum(w k * bump(distance to site k / radius)). Bumps of neighbouring sites overlap (that is what
// joins the hollows of a line of sites into a valley), so the weights are not the depths: they are the solution of
// the linear system "the sum at site j is depth j", solved by conjugate gradients on the sparse matrix of the bumps.
// The noise is multiplied by a gate that is nothing at every site, so the constraints still hold to the millimetre.
//
// Round 215: what sinks is the ground, and the sea does not: its surface stays where it was (the owner: "drowning the
// sites makes sense. It should be realistic"). Ground pulled under the sea's level is under water from then on, so a
// pull along a low coast floods it, and a walk that began by the water becomes a channel. What kind of ground a point
// is follows its new height (shore by the new water, water under it); the trees that stood on drowned ground are
// gone, the others stand lower. The graph does not move: sites and ways are read from the unpulled land, so every id,
// way and saved walk stays valid. A site whose ground is drowned is still a site, at the water's surface (`drowned`).

import { TALLEST_TREE, fbm } from './terrain.js';
import { GRAPH } from './graph.js';

export const PULL = Object.freeze({
  depth: 2 * TALLEST_TREE, // metres one pull lowers a site: two of the tallest trees (the owner's measure)
  limit: 6 * TALLEST_TREE, // a site sinks no further than this, however many pulls it has been in
  radius: 2.4, // cells of the graph: how far round a site its hollow reaches
  rough: 0.3, // how far the fractal noise moves the hollow between the sites, as a share of its depth there
  grain: 70, // metres: the size of that noise
  still: 0.4, // the share of the radius round a site over which the noise comes in
  sites: 4000, // pulled sites kept at most (the oldest of a very long walk are let go)
  solve: Object.freeze({ tolerance: 1e-7, iterations: 400 }),
});

const bump = (r) => (r >= 1 ? 0 : (1 - r) ** 4 * (4 * r + 1));

/**
 * How far each site has sunk: Map(node id -> metres). `pulled` is the save's list, oldest first:
 * [{ step, depth, sites: [node ids] }]. An entry names the sites walked since the pull before it; every pull draws
 * the sites of the earlier entries down again, so a site's depth is the sum of its own pull and all later ones.
 */
export function siteDepths(pulled = []) {
  const depths = new Map();
  let later = 0;
  for (let n = pulled.length - 1; n >= 0; n -= 1) {
    later += Number(pulled[n].depth) || 0;
    for (const id of pulled[n].sites ?? []) if (!depths.has(id)) depths.set(id, Math.min(PULL.limit, later));
  }
  return depths;
}

/** The pulled sites of `graph` as points: [{ id, x, z, depth }], the last PULL.sites of them. */
export function pullPoints(graph, pulled = []) {
  const points = [];
  for (const [id, depth] of siteDepths(pulled)) {
    const node = graph.node(id);
    if (node && depth > 0) points.push({ id, x: node.x, z: node.z, depth });
  }
  return points.slice(0, PULL.sites);
}

/** What identifies a list of pulls: the same key, the same ground. */
export const pullKey = (pulled = []) => pulled.map((entry) => `${entry.step}:${entry.depth}:${(entry.sites ?? []).length}:${entry.sites?.[0] ?? ''}`).join('|');

/**
 * The displacement field of `points` ([{ x, z, depth }]): { pullAt(x, z), points, weights }. `pullAt` is metres,
 * never above nothing, and exactly -depth at each point.
 */
export function createPull(points, seed = 1, { radius = PULL.radius * GRAPH.cell } = {}) {
  const count = points.length;
  if (!count) return Object.freeze({ pullAt: () => 0, points: [], weights: [], radius });
  // The points by square of `radius` metres: a point's bump reaches its own square and the eight round it.
  const buckets = new Map();
  const keyOf = (bx, bz) => `${bx},${bz}`;
  points.forEach((point, n) => {
    const key = keyOf(Math.floor(point.x / radius), Math.floor(point.z / radius));
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(n);
  });
  const near = (x, z) => {
    const [bx, bz] = [Math.floor(x / radius), Math.floor(z / radius)];
    const out = [];
    for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) { const found = buckets.get(keyOf(bx + i, bz + j)); if (found) out.push(...found); }
    return out;
  };
  // The matrix of the bumps, row by row, only where it is not nothing.
  const rows = points.map((point, n) => {
    const row = [];
    for (const m of near(point.x, point.z)) {
      const value = bump(Math.hypot(point.x - points[m].x, point.z - points[m].z) / radius);
      if (value > 0 || m === n) row.push([m, m === n ? 1 : value]);
    }
    return row;
  });
  const times = (vector) => rows.map((row) => row.reduce((sum, [m, value]) => sum + value * vector[m], 0));
  const dot = (a, b) => a.reduce((sum, value, n) => sum + value * b[n], 0);
  // Conjugate gradients: the matrix is symmetric and positive definite, so this converges, and fast.
  const wanted = points.map((point) => point.depth);
  const weights = new Array(count).fill(0);
  let residual = [...wanted];
  let direction = [...residual];
  let error = dot(residual, residual);
  const enough = PULL.solve.tolerance ** 2 * Math.max(1e-12, dot(wanted, wanted));
  for (let turn = 0; turn < PULL.solve.iterations && error > enough; turn += 1) {
    const along = times(direction);
    const stride = error / dot(direction, along);
    for (let n = 0; n < count; n += 1) { weights[n] += stride * direction[n]; residual[n] -= stride * along[n]; }
    const next = dot(residual, residual);
    direction = residual.map((value, n) => value + (next / error) * direction[n]);
    error = next;
  }
  const deepest = Math.max(...wanted);
  const quiet = radius * PULL.still;

  function pullAt(x, z) {
    const close = near(x, z);
    if (!close.length) return 0;
    let sum = 0;
    let gate = 1;
    for (const n of close) {
      const distance = Math.hypot(x - points[n].x, z - points[n].z);
      if (distance >= radius) continue;
      sum += weights[n] * bump(distance / radius);
      if (distance < quiet) gate *= 1 - bump(distance / quiet);
    }
    if (sum <= 0) return 0;
    // Rough between the sites, the land's own way, and mostly shallower there, so the sites are the low points (cloth
    // dips at the stitch); exact at each of them, where the gate is shut.
    const noise = gate > 0 ? (2 * fbm(x / PULL.grain, z / PULL.grain, seed + 901, 3) - 1.3) * PULL.rough * gate : 0;
    return -Math.min(deepest * 1.4, sum * (1 + noise));
  }

  return Object.freeze({ pullAt, points, weights, radius });
}

/**
 * The land and its graph with the save's pulls: { terrain, graph, pull }. With no pulls they are the ones given.
 * The pulled terrain answers as the terrain does (server/src/road/terrain.js), on the lowered ground, and besides:
 *
 *   pullAt(x, z)     how far the ground at (x, z) has sunk, as a height: 0 or less
 *   base             the terrain without the pulls
 *   deepest          metres: no ground has sunk further than this
 *
 * The pulled graph is the same graph (ids, ways, routes). A site's `y` is where it stands now: its lowered ground,
 * or the water's surface when that ground is under it (`drowned`); `ground` is the ground itself.
 */
export function withPulls(terrain, graph, pulled = [], { extra = null } = {}) {
  const points = extra ?? pullPoints(graph, pulled);
  if (!points.length) return { terrain, graph, pull: null };
  const pull = createPull(points, terrain.seed);
  const { pullAt } = pull;
  const heightAt = (x, z) => terrain.heightAt(x, z) + pullAt(x, z);
  // What stood on ground that is now under water is gone; the rest stands as much lower as its ground.
  const lower = (items) => items.map((item) => ({ ...item, y: item.y + pullAt(item.x, item.z) })).filter((item) => item.y > terrain.waterY);
  const pulledTerrain = Object.freeze({
    ...terrain,
    base: terrain,
    deepest: Math.max(...points.map((point) => point.depth)) * 1.4,
    pullAt,
    heightAt,
    surfaceAt: (x, z) => Math.max(heightAt(x, z), terrain.waterY),
    slopeAt(x, z) {
      const e = 3;
      return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
    },
    coverAt: (x, z, h = heightAt(x, z)) => terrain.coverAt(x, z, h),
    treesIn: (cx, cz) => lower(terrain.treesIn(cx, cz)),
    undergrowthIn: (cx, cz) => lower(terrain.undergrowthIn(cx, cz)),
  });
  const lowered = new Map();
  const site = (node) => {
    if (!node) return null;
    if (!lowered.has(node.id)) {
      if (lowered.size >= GRAPH.cache) lowered.clear();
      const ground = node.y + pullAt(node.x, node.z);
      lowered.set(node.id, Object.freeze({ ...node, y: Math.max(ground, terrain.waterY), ground, drowned: ground <= terrain.waterY }));
    }
    return lowered.get(node.id);
  };
  const pulledGraph = Object.freeze({
    ...graph,
    terrain: pulledTerrain,
    base: graph,
    nodeAt: (i, j) => site(graph.nodeAt(i, j)),
    node: (id) => site(graph.node(id)),
    nodesNear: (x, z, cells) => graph.nodesNear(x, z, cells).map(site),
  });
  return { terrain: pulledTerrain, graph: pulledGraph, pull };
}
