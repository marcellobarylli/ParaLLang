// Round 144: the graph of sites over the endless landscape (terrain.js). Pure and deterministic: the same seed gives
// the same sites and the same ways between them, on the server (which rules on moves) and in the web client (which
// draws them). Nothing is stored; any part of the graph can be asked for at any time.
//
// The landscape comes first and the graph is read off it:
//
//   site   The plane is cut into square cells. In each cell a handful of hashed points are tried, and the site is
//          the flattest one on dry ground. A cell with no dry point (open water) has no site.
//   way    Two sites in touching cells are joined when the ground between them is easy: little water, no steep
//          climb. Each way is the best of three gently bowed lines. At most one diagonal crosses a square of four
//          cells, so ways never cross.
//   forced Every site also keeps the cheaper of its two ways to the next site north and the next site east, however
//          hard: a ford through water, a pass over a ridge, or a ferry across the cells that have no site. So every
//          site has a way on, and a walk can never be boxed in.

import { TERRAIN, hash } from './terrain.js';

export const GRAPH = Object.freeze({
  cell: 88, // metres: the side of a cell, and so about the distance between sites
  inset: 0.18, // a site keeps this share of a cell away from the cell's edge
  candidates: 10, // points tried per cell
  dry: 1.2, // a site stands at least this far above the water
  step: 8, // metres between the samples along a way
  easy: 0.12, // a natural way costs at most this much more than its length in cells (about half of all ways do)
  reach: 40, // how many cells a forced way may cross to find the next site
  cache: 6000, // entries kept per cache before it is emptied
});

export const nodeId = (i, j) => `${i},${j}`;
export function parseNodeId(id) {
  const match = /^(-?\d{1,7}),(-?\d{1,7})$/.exec(String(id ?? ''));
  return match ? [Number(match[1]), Number(match[2])] : null;
}

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function createGraph(terrain) {
  const { seed, heightAt, slopeAt, coverAt, biomeAt } = terrain;
  const nodes = new Map();
  const edges = new Map();
  const forced = new Map();
  const remember = (cache, key, value) => { if (cache.size >= GRAPH.cache) cache.clear(); cache.set(key, value); return value; };

  /** The site of cell (i, j), or null when the cell has no dry ground. */
  function nodeAt(i, j) {
    const id = nodeId(i, j);
    if (nodes.has(id)) return nodes.get(id);
    let best = null;
    for (let k = 0; k < GRAPH.candidates; k += 1) {
      const x = (i + GRAPH.inset + (1 - 2 * GRAPH.inset) * hash(i * 31 + k, j, seed + 401)) * GRAPH.cell;
      const z = (j + GRAPH.inset + (1 - 2 * GRAPH.inset) * hash(i, j * 31 + k, seed + 402)) * GRAPH.cell;
      const y = heightAt(x, z);
      if (y < GRAPH.dry) continue;
      const score = slopeAt(x, z) * 10 + (y < 3 ? 0.6 : 0) + (y > 60 ? 1.5 : 0) + 0.2 * hash(i + k, j - k, seed + 403);
      if (!best || score < best.score) best = { score, x, z, y };
    }
    const node = best ? Object.freeze({ id, i, j, x: best.x, z: best.z, y: best.y, cover: coverAt(best.x, best.z, best.y), biome: biomeAt ? biomeAt(best.x, best.z) : null }) : null; // `biome`: round 160
    return remember(nodes, id, node);
  }

  const node = (id) => { const at = parseNodeId(id); return at ? nodeAt(at[0], at[1]) : null; };

  // One line from a to b, bowed sideways by `bow` metres at its middle: its points and what the ground does to it.
  function line(a, b, bow) {
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    const count = Math.max(2, Math.ceil(length / GRAPH.step));
    const [nx, nz] = [-(b.z - a.z) / length, (b.x - a.x) / length];
    const points = [];
    let wet = 0;
    let steepest = 0;
    let climb = 0;
    let previous = null;
    for (let n = 0; n <= count; n += 1) {
      const t = n / count;
      const side = Math.sin(Math.PI * t) * bow;
      const x = a.x + (b.x - a.x) * t + nx * side;
      const z = a.z + (b.z - a.z) * t + nz * side;
      const y = heightAt(x, z);
      if (y < TERRAIN.waterY + 0.3) wet += 1;
      if (previous !== null) {
        const rise = Math.abs(y - previous) / (length / count);
        steepest = Math.max(steepest, rise);
        climb += Math.abs(y - previous);
      }
      previous = y;
      points.push([x, z]);
    }
    const wetShare = wet / (count + 1);
    const extra = 5 * wetShare + 3 * Math.max(0, steepest - 0.45) + climb / 60;
    return { points, length, wetShare, steepest, extra, cost: length / GRAPH.cell + extra };
  }

  /** The way between two sites as the ground allows it (whether or not the graph keeps it), or null. */
  function way(a, b) {
    if (!a || !b || a.id === b.id) return null;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (edges.has(key)) return edges.get(key);
    const [from, to] = a.id < b.id ? [a, b] : [b, a];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const bend = (hash(from.i * 7 + to.i, from.j * 7 + to.j, seed + 411) - 0.5) * 0.3 * length;
    const best = [bend, 0, -bend].map((bow) => line(from, to, bow)).reduce((x, y) => (y.cost < x.cost ? y : x));
    const adjacent = Math.abs(a.i - b.i) <= 1 && Math.abs(a.j - b.j) <= 1;
    const kind = !adjacent ? (best.wetShare > 0.2 ? 'ferry' : 'pass')
      : best.wetShare > 0.12 ? 'ford' : best.steepest > 0.6 ? 'pass' : 'path';
    return remember(edges, key, Object.freeze({
      between: [from.id, to.id], kind, cost: best.cost, length: best.length,
      natural: adjacent && kind === 'path' && best.extra <= GRAPH.easy,
      points: Object.freeze(best.points.map((point) => Object.freeze(point))),
    }));
  }

  function firstSite(i, j, di, dj) {
    for (let k = 1; k <= GRAPH.reach; k += 1) {
      const found = nodeAt(i + di * k, j + dj * k);
      if (found) return found;
    }
    return null;
  }

  // The forced way of a site: the cheaper of the ways to the next site north and the next site east.
  function forcedOf(a) {
    if (forced.has(a.id)) return forced.get(a.id);
    const options = [firstSite(a.i, a.j, 0, 1), firstSite(a.i, a.j, 1, 0)].filter(Boolean);
    const best = options.map((b) => ({ b, cost: way(a, b).cost })).reduce((x, y) => (!x || y.cost < x.cost ? y : x), null);
    return remember(forced, a.id, best ? best.b.id : null);
  }

  // Which diagonal the square of cells with its low corner at (i, j) may hold: 0 for (i,j)-(i+1,j+1), 1 for the other.
  const diagonalOf = (i, j) => (hash(i, j, seed + 421) < 0.5 ? 0 : 1);

  /** The ids of the sites joined to `id` by a way, each once, in a fixed order. */
  function neighbours(id) {
    const a = node(id);
    if (!a) return [];
    const out = [];
    const add = (b) => { if (b && b.id !== a.id && !out.includes(b.id)) out.push(b.id); };
    for (const [di, dj] of ORTHOGONAL) {
      const b = nodeAt(a.i + di, a.j + dj);
      if (b && way(a, b).natural) add(b);
    }
    // The four squares that touch this cell, and the corner of each that lies across it.
    for (const [qi, qj, di, dj] of [[a.i, a.j, 1, 1], [a.i - 1, a.j - 1, -1, -1], [a.i - 1, a.j, -1, 1], [a.i, a.j - 1, 1, -1]]) {
      const kind = di === dj ? 0 : 1;
      if (diagonalOf(qi, qj) !== kind) continue;
      const b = nodeAt(a.i + di, a.j + dj);
      if (b && way(a, b).natural) add(b);
    }
    const mine = forcedOf(a);
    if (mine) add(node(mine));
    for (const [di, dj] of [[0, -1], [-1, 0]]) {
      const b = firstSite(a.i, a.j, di, dj);
      if (b && forcedOf(b) === a.id) add(b);
    }
    return out;
  }

  /** The way between two joined sites ({ between, kind, cost, length, points }), or null when they are not joined. */
  function edge(idA, idB) {
    if (!neighbours(idA).includes(idB)) return null;
    return way(node(idA), node(idB));
  }

  /** The points of the way from `idA` to `idB`, in walking order. */
  function pathPoints(idA, idB) {
    const found = edge(idA, idB);
    if (!found) return null;
    return found.between[0] === idA ? found.points : [...found.points].reverse();
  }

  /** Every site whose cell lies within `cells` cells of (x, z). */
  function nodesNear(x, z, cells = 4) {
    const [ci, cj] = [Math.floor(x / GRAPH.cell), Math.floor(z / GRAPH.cell)];
    const out = [];
    for (let i = ci - cells; i <= ci + cells; i += 1) {
      for (let j = cj - cells; j <= cj + cells; j += 1) {
        const found = nodeAt(i, j);
        if (found) out.push(found);
      }
    }
    return out;
  }

  // The start: the site of the origin's cell (dry by terrain.js's home rise), or the nearest one found.
  function start() {
    for (let ring = 0; ring <= 6; ring += 1) {
      for (let i = -ring; i <= ring; i += 1) {
        for (let j = -ring; j <= ring; j += 1) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
          const found = nodeAt(i, j);
          if (found) return found.id;
        }
      }
    }
    throw new Error(`The landscape of seed ${seed} has no dry ground near its origin.`);
  }

  const lengthOf = (points) => points.reduce((sum, point, n) => (n ? sum + Math.hypot(point[0] - points[n - 1][0], point[1] - points[n - 1][1]) : 0), 0);
  /**
   * Round 176: the shortest walk along the ways from `fromId` to `toId`, by the length of the ways walked (A*, the
   * straight distance as the estimate): the ids of the sites in walking order, both ends included. Null when either
   * site does not exist or no walk is found within `limit` sites looked at.
   */
  function route(fromId, toId, { limit = 4000 } = {}) {
    const [a, b] = [node(fromId), node(toId)];
    if (!a || !b) return null;
    if (a.id === b.id) return [a.id];
    const guess = (n) => Math.hypot(n.x - b.x, n.z - b.z);
    const walked = new Map([[a.id, 0]]);
    const came = new Map();
    const open = [{ id: a.id, f: guess(a) }];
    const done = new Set();
    while (open.length && done.size < limit) {
      let best = 0;
      for (let k = 1; k < open.length; k += 1) if (open[k].f < open[best].f) best = k;
      const { id } = open.splice(best, 1)[0];
      if (done.has(id)) continue;
      if (id === b.id) {
        const path = [id];
        while (came.has(path[0])) path.unshift(came.get(path[0]));
        return path;
      }
      done.add(id);
      for (const next of neighbours(id)) {
        if (done.has(next)) continue;
        const cost = walked.get(id) + lengthOf(pathPoints(id, next));
        if (cost >= (walked.get(next) ?? Infinity)) continue;
        walked.set(next, cost);
        came.set(next, id);
        open.push({ id: next, f: cost + guess(node(next)) });
      }
    }
    return null;
  }

  return Object.freeze({ seed, terrain, nodeAt, node, neighbours, edge, pathPoints, nodesNear, route, start: start() });
}

// A few graphs are kept by seed: each learner's road has its own, and a request needs only a handful of sites.
const graphs = new Map();
export function graphFor(seed, createTerrainFor) {
  const key = Number(seed) | 0;
  if (!graphs.has(key)) {
    if (graphs.size >= 40) graphs.delete(graphs.keys().next().value);
    graphs.set(key, createGraph(createTerrainFor(key)));
  }
  return graphs.get(key);
}
