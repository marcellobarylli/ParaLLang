// Round 213 (issue #23): the world event of a pull, as data. At a change of level the player is shown, on the map
// and with nothing else on the screen:
//
//   1. the map alone, from further off than the usual map ever stands
//   2. the web: the whole graph, in faint grey, generated as they watch and in the order it is generated in
//      (graph.js): outward from where they stand, in every direction at once; in each cell the points tried for its
//      site show for a moment, the one chosen stays, and its ways grow to the sites already there
//   3. the journey so far, in black, one walk at a time
//   4. the pull: the land sinks at the sites of the journey, the web and the journey sinking with it
//
// Everything of the pull is worked out before anything is shown: the land as it is (`before`), the land as it will
// be (`after`, the same pure function with one more pull: server/src/road/pulls.js), and for every point of the
// picture how far it sinks between the two. The pull is then painted from that, a share of the way down per frame
// (roadMap.js `paintMap`), so what the player watches is the true ground moving from the one to the other. Only the
// web is made while it shows: that is the generation the player is watching.
//
// Pure: no DOM, no canvas, no clock. The component (components/PullEvent.jsx) draws what this says.
import { GRAPH } from '../../server/src/road/graph.js';
import { withPulls } from '../../server/src/road/pulls.js';
import { ROAD_MAP, createMapView, prepareMap } from './roadMap.js';
import { landOf } from './land.js';

export const PULL_EVENT = Object.freeze({
  closest: 0.062, // overlay units per metre across at most: the map shows half as much again as the usual one
  margin: Object.freeze({ side: 14, top: 0.2, bottom: 0.18 }), // top and bottom as shares of the picture's height
  columns: Object.freeze({ least: 240, most: 400, pixels: 3 }), // the picture's pixels across: one to `pixels` of the screen's
  dark: 0.7, // seconds: nothing
  fade: 2.2, // the map comes up
  still: 1.3, // the map alone
  web: Object.freeze({
    seconds: 9, // the wave's way out, when the browser keeps up
    cells: 5200, // cells generated at most, the nearest first
    budget: 7, // milliseconds of generating in a frame
    tried: 0.045, // seconds between two points tried in a cell
    chosen: 0.5, // the site stays this long after its cell is reached
    fadeOut: 0.6, // a point not chosen is gone after this
    way: 0.5, // a way waits this long after its second site
    grow: 0.8, // and takes this long to grow
    every: 2, // every n-th point of a way is kept
  }),
  rest: 1.1, // the web whole
  journey: Object.freeze({ hop: 0.36, most: 15, least: 2.2 }), // seconds a walk; the whole journey takes no longer than `most`
  breath: 1.8, // the journey whole, before the land moves
  buckle: 7.5, // the land sinking
  after: 2.6, // the pulled land, before the way on is offered
  // The web: faint, and grey rather than white. A thread of mid grey on a wider, darker and fainter one, so that it
  // shows on the dark forest and on the pale sand alike.
  grey: 'rgb(150 153 158 / 0.6)',
  under: 'rgb(34 36 40 / 0.26)',
  black: '#050505', // the journey
});

const smooth = (value) => { const u = Math.min(1, Math.max(0, value)); return u * u * (3 - 2 * u); };
/** How far down its dip the land is, `seconds` into the pull: slow to start, slow to settle. */
export const buckleShare = (seconds) => smooth(smooth(seconds / PULL_EVENT.buckle));

/** How long one walk of a journey of `hops` walks takes to draw, seconds. */
export function hopSeconds(hops) {
  const { hop, most, least } = PULL_EVENT.journey;
  return hops <= 0 ? 0 : Math.max(least, Math.min(most, hops * hop)) / hops;
}

/**
 * The wave that generates the web: the cells of `graph` whose middle `inside(x, z)` holds, the nearest to `centre`
 * first. `advance(radius, { until, most })` generates the cells within `radius` metres that are not made yet (while
 * `until()` is false, and at most `most` of them) and returns what each added:
 *
 *   { cell, distance, tried: [[x, z], ...], chosen, site: { id, x, z } | null, ways: [{ from, to, points }] }
 *
 * `tried` are the points tried for the cell's site in order and `chosen` the index of the one taken (-1: no dry
 * ground, no site). A way is given once, with the second of its two sites, from the site that was there first; a way
 * to a site beyond the cells is given with its near site. `lift(x, z)` adds to every point what the caller keeps of
 * the ground there.
 */
export function createWebWave(graph, centre, { inside, bounds, limit = PULL_EVENT.web.cells, every = PULL_EVENT.web.every, lift = () => [] }) {
  const cells = [];
  for (let i = bounds.i0; i <= bounds.i1; i += 1) {
    for (let j = bounds.j0; j <= bounds.j1; j += 1) {
      const [x, z] = [(i + 0.5) * GRAPH.cell, (j + 0.5) * GRAPH.cell];
      if (inside(x, z)) cells.push({ i, j, distance: Math.hypot(x - centre.x, z - centre.z) });
    }
  }
  cells.sort((a, b) => a.distance - b.distance || a.i - b.i || a.j - b.j);
  cells.length = Math.min(cells.length, limit);
  const within = new Set(cells.map((cell) => `${cell.i},${cell.j}`));
  const made = new Set(); // the sites generated
  const drawn = new Set(); // the ways given
  const point = (x, z) => [x, z, ...lift(x, z)];
  const wayPoints = (from, to) => {
    const points = graph.pathPoints(from, to) ?? [];
    return points.filter((unused, n) => n % every === 0 || n === points.length - 1).map(([x, z]) => point(x, z));
  };
  let next = 0;

  function generate(cell) {
    const tried = graph.candidates(cell.i, cell.j);
    const node = graph.nodeAt(cell.i, cell.j);
    const item = { cell: [cell.i, cell.j], distance: cell.distance, tried: tried.map(([x, z]) => point(x, z)), chosen: -1, site: null, ways: [] };
    if (!node) return item;
    item.chosen = tried.findIndex(([x, z]) => x === node.x && z === node.z);
    item.site = { id: node.id, point: point(node.x, node.z) };
    made.add(node.id);
    for (const other of graph.neighbours(node.id)) {
      const pair = node.id < other ? `${node.id}|${other}` : `${other}|${node.id}`;
      if (drawn.has(pair)) continue;
      // The way grows from the site that was there first; one to a site the wave will never reach grows from here.
      if (made.has(other)) { drawn.add(pair); item.ways.push({ from: other, to: node.id, points: wayPoints(other, node.id) }); }
      else if (!within.has(other)) { drawn.add(pair); item.ways.push({ from: node.id, to: other, points: wayPoints(node.id, other) }); }
    }
    return item;
  }

  return {
    total: cells.length,
    reach: cells.length ? cells.at(-1).distance : 0,
    get made() { return next; },
    get done() { return next >= cells.length; },
    advance(radius, { until = () => false, most = Infinity } = {}) {
      const items = [];
      while (next < cells.length && cells[next].distance <= radius && items.length < most && !until()) {
        items.push(generate(cells[next]));
        next += 1;
      }
      return items;
    },
  };
}

/**
 * Everything the event of `pull` shows, worked out at once (this is the wait before the screen shows anything):
 *
 *   view       the map's frame (roadMap.js), holding the whole journey, `aspect` (height over width) as the screen is
 *   prepared   the landscape read for painting, with each point's dip (roadMap.js `paintMap(prepared, share)`)
 *   lift       (x, z) -> [level, dip]: the surface at a point before the pull, and how far it sinks
 *   journey    the walks, in order: [{ from, to, points: [[x, z, level, dip], ...] }]
 *   sites      the sites of the journey, each once, in order: [[x, z, level, dip], ...] (the start first)
 *   here       where the player stands: [x, z, level, dip]
 *   wave       the web's wave (createWebWave), not yet begun
 *   pulls      how many sites the pull lowers, and how far (`depth`)
 *
 * `pulled` are the pulls the land already has, `pull` the new one ({ depth, sites }), `walk` the ids of the journey.
 */
export function createPullEvent({ seed, pulled = [], pull, walk = [], at, aspect = ROAD_MAP.height / ROAD_MAP.width, columns = ROAD_MAP.columns }) {
  const before = landOf(seed, pulled);
  const { plain } = before;
  const after = withPulls(plain.terrain, plain.graph, [...pulled, pull]);
  const pullBefore = before.terrain.pullAt ?? (() => 0);
  const pullAfter = after.terrain.pullAt ?? (() => 0);
  const dipAt = (x, z) => pullAfter(x, z) - pullBefore(x, z);
  const lift = (x, z) => [before.terrain.surfaceAt(x, z), dipAt(x, z)];
  const point = (x, z) => [x, z, ...lift(x, z)];
  const graph = plain.graph;
  const ids = walk.filter((id) => graph.node(id));
  const hereNode = graph.node(at) ?? graph.node(ids.at(-1)) ?? graph.node(graph.start);
  if (!ids.length) ids.push(hereNode.id);
  // The frame holds every site of the journey, as it stands now and as it will once sunk.
  const framed = ids.map((id) => { const node = graph.node(id); const [level, dip] = lift(node.x, node.z); return [{ x: node.x, z: node.z, y: level }, { x: node.x, z: node.z, y: level + dip }]; }).flat();
  const height = ROAD_MAP.width * aspect;
  const view = createMapView([...framed, { x: hereNode.x, z: hereNode.z, y: lift(hereNode.x, hereNode.z)[0] }], {
    width: ROAD_MAP.width, height, farthest: ROAD_MAP.journey, closest: PULL_EVENT.closest,
    margin: { side: PULL_EVENT.margin.side, top: height * PULL_EVENT.margin.top, bottom: height * PULL_EVENT.margin.bottom },
  });
  const prepared = prepareMap(before.terrain, view, { columns, dipAt, sink: after.terrain.deepest ?? 0 });
  const journey = [];
  for (let n = 1; n < ids.length; n += 1) {
    const [from, to] = [ids[n - 1], ids[n]];
    const [a, b] = [graph.node(from), graph.node(to)];
    // A walk follows its way; a walk the graph no longer joins (an old save) is a straight line.
    const line = graph.pathPoints(from, to) ?? [[a.x, a.z], [b.x, b.z]];
    journey.push({ from, to, points: line.map(([x, z]) => point(x, z)) });
  }
  const seen = new Set();
  const sites = ids.filter((id) => !seen.has(id) && seen.add(id)).map((id) => { const node = graph.node(id); return point(node.x, node.z); });
  // The cells of the web: every cell whose middle shows in the picture, a cell's width beyond its edges too.
  const edge = GRAPH.cell * view.scale;
  const tall = ROAD_MAP.tallest * view.lift;
  const inside = (x, z) => {
    const [sx, sy] = view.place(x, z, 0);
    return sx > -edge && sx < view.width + edge && sy > -edge && sy < height + edge + tall;
  };
  const corners = [[-edge, -edge], [view.width + edge, -edge], [-edge, height + edge + tall], [view.width + edge, height + edge + tall]].map(([sx, sy]) => view.ground(sx, sy));
  const cellOf = (value) => Math.floor(value / GRAPH.cell);
  const bounds = {
    i0: cellOf(Math.min(...corners.map((corner) => corner.x))), i1: cellOf(Math.max(...corners.map((corner) => corner.x))),
    j0: cellOf(Math.min(...corners.map((corner) => corner.z))), j1: cellOf(Math.max(...corners.map((corner) => corner.z))),
  };
  const wave = createWebWave(graph, hereNode, { inside, bounds, lift });
  return {
    seed, view, prepared, lift, journey, sites, here: point(hereNode.x, hereNode.z), wave,
    before: before.terrain, after: after.terrain,
    pulls: { sites: pull.sites.length, depth: pull.depth },
  };
}
