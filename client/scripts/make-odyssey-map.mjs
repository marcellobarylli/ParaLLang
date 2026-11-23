// Round 165: makes the map under the chart of the Odyssey (client/src/components/OdysseyChart.jsx) from Natural
// Earth's land boundaries at 1:10m, the most detailed scale it has. Two things come out of it, in one file:
//
//   - the coast: the land cut to the chart's frame, thinned to what a chart a few hundred pixels wide can show;
//   - the route: for each leg of the voyage in content/world/odyssey.yaml, the shortest way by sea between its two
//     stops, found on the unthinned coast, so the line sails round the land instead of across it.
//
//   node client/scripts/make-odyssey-map.mjs <path to world-atlas/land-10m.json> [out.json]
//
// Run it again whenever a stop or the frame in odyssey.yaml changes; a test fails if the route no longer meets the
// stops. The source, its licence and its checksum are in client/public/models/ASSETS.md. The tools are not
// dependencies of the repo; like Playwright they are taken from wherever Node finds them:
//   npm install --no-save world-atlas topojson-client
//
// What the coast keeps: every piece of land at least MAP.keep degrees across, and every smaller one a stop stands on
// or beside (Lipari and Gozo are small). What it loses: bends of the coast smaller than MAP.tolerance degrees
// (about 1.3 km) and the smallest islets. The route is found before anything is lost.
//
// What the route is not: the poem's. The poem names the stops and almost nothing between them, so the line between
// two stops is only the shortest way a ship could go, kept a little off the shore.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const require = createRequire(import.meta.url);

export const MAP = {
  margin: 0.6,       // degrees of land kept outside the frame, so no cut edge shows inside it
  tolerance: 0.012,  // Douglas-Peucker tolerance for the coast, in degrees
  keep: 0.11,        // the least width or height, in degrees, of a piece of land that is kept for its own sake
  near: 0.12,        // a smaller piece is kept when a stop is this near it, in degrees
  scale: 100,        // the file holds hundredths of a degree
  cell: 0.02,        // the route is found on a grid of cells this many degrees across (about 2 km)
  offing: 7,         // cells from the shore within which sailing costs more, so the line keeps off the coast
  shy: 4,            // how many times more it costs right at the shore
  routeTolerance: 0.035, // Douglas-Peucker tolerance for the route, in degrees
};

/** A ring cut to a box (Sutherland-Hodgman). The cut edges run along the box, which is outside the chart. */
export function clipRing(ring, { west, east, south, north }) {
  const sides = [
    [(p) => p[0] >= west, (a, b) => [west, a[1] + ((b[1] - a[1]) * (west - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= east, (a, b) => [east, a[1] + ((b[1] - a[1]) * (east - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= south, (a, b) => [a[0] + ((b[0] - a[0]) * (south - a[1])) / (b[1] - a[1]), south]],
    [(p) => p[1] <= north, (a, b) => [a[0] + ((b[0] - a[0]) * (north - a[1])) / (b[1] - a[1]), north]],
  ];
  let points = ring;
  for (const [inside, cross] of sides) {
    const out = [];
    for (let i = 0; i < points.length; i += 1) {
      const [a, b] = [points[i], points[(i + 1) % points.length]];
      if (inside(a)) out.push(a);
      if (inside(a) !== inside(b)) out.push(cross(a, b));
    }
    points = out;
    if (!points.length) break;
  }
  return points;
}

const distanceToSegment = (p, a, b) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
};

/** Douglas-Peucker on an open line. */
export function thin(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let [worst, at] = [0, -1];
    for (let i = first + 1; i < last; i += 1) {
      const d = distanceToSegment(points[i], points[first], points[last]);
      if (d > worst) [worst, at] = [d, i];
    }
    if (worst > tolerance) { keep[at] = 1; stack.push([first, at], [at, last]); }
  }
  return points.filter((_, i) => keep[i]);
}

/** A closed ring thinned: cut at its two far ends, each half thinned as a line. */
export function thinRing(ring, tolerance) {
  if (ring.length < 5) return ring;
  let far = 0;
  for (let i = 1; i < ring.length; i += 1) if (Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]) > Math.hypot(ring[far][0] - ring[0][0], ring[far][1] - ring[0][1])) far = i;
  const [one, two] = [thin(ring.slice(0, far + 1), tolerance), thin([...ring.slice(far), ring[0]], tolerance)];
  return [...one.slice(0, -1), ...two.slice(0, -1)];
}

const box = (ring) => ring.reduce(([w, e, s, n], [x, y]) => [Math.min(w, x), Math.max(e, x), Math.min(s, y), Math.max(n, y)], [Infinity, -Infinity, Infinity, -Infinity]);

/** How far a point is from a ring's edge, in degrees. */
export const distanceToRing = (point, ring) => ring.reduce((least, a, i) => Math.min(least, distanceToSegment(point, a, ring[(i + 1) % ring.length])), Infinity);

/** The land inside the chart's frame and a margin round it, at the source's full detail: a list of rings. */
export function landIn(topology, frame, options = MAP) {
  const { feature } = require('topojson-client');
  const cut = { west: frame.west - options.margin, east: frame.east + options.margin, south: frame.south - options.margin, north: frame.north + options.margin };
  const land = feature(topology, topology.objects.land);
  const polygons = land.features.flatMap(({ geometry }) => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates));
  const rings = [];
  for (const polygon of polygons) {
    // Only the outer ring: inside this frame the land layer has no inland water that a chart this size would show.
    const outer = polygon[0].slice(0, -1); // GeoJSON repeats the first point at the end
    const [w, e, s, n] = box(outer);
    if (e < cut.west || w > cut.east || n < cut.south || s > cut.north) continue;
    const clipped = clipRing(outer, cut);
    if (clipped.length >= 3) rings.push(clipped);
  }
  return { cut, rings };
}

/** The coast the chart draws: the land thinned, and the smallest pieces dropped unless a stop is on them. */
export function coastFrom(rings, stops, options = MAP) {
  const placed = stops.filter((stop) => !stop.unplaced).map((stop) => [stop.lon, stop.lat]);
  const out = [];
  for (const ring of rings) {
    const [w, e, s, n] = box(ring);
    const large = Math.max(e - w, n - s) >= options.keep;
    if (!large && !placed.some((point) => distanceToRing(point, ring) <= options.near)) continue;
    const thinned = thinRing(ring, large ? options.tolerance : options.tolerance / 3);
    if (thinned.length >= 3) out.push(thinned.flatMap(([x, y]) => [Math.round(x * options.scale), Math.round(y * options.scale)]));
  }
  // The largest land first, so the file reads from the mainland down to the islets.
  return out.sort((a, b) => b.length - a.length);
}

/** The sea as a grid: a cell is land when its middle is inside a ring. `shore` is each cell's distance from land, in cells. */
export function seaGrid(rings, cut, options = MAP) {
  const { cell } = options;
  const [cols, rows] = [Math.round((cut.east - cut.west) / cell), Math.round((cut.north - cut.south) / cell)];
  const land = new Uint8Array(cols * rows);
  for (const ring of rings) {
    const [, , s, n] = box(ring);
    const [j0, j1] = [Math.max(0, Math.floor((s - cut.south) / cell)), Math.min(rows - 1, Math.ceil((n - cut.south) / cell))];
    for (let j = j0; j <= j1; j += 1) {
      const lat = cut.south + (j + 0.5) * cell;
      const crossings = [];
      for (let i = 0; i < ring.length; i += 1) {
        const [a, b] = [ring[i], ring[(i + 1) % ring.length]];
        if ((a[1] > lat) !== (b[1] > lat)) crossings.push(a[0] + ((b[0] - a[0]) * (lat - a[1])) / (b[1] - a[1]));
      }
      crossings.sort((x, y) => x - y);
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const [i0, i1] = [Math.max(0, Math.ceil((crossings[k] - cut.west) / cell - 0.5)), Math.min(cols - 1, Math.floor((crossings[k + 1] - cut.west) / cell - 0.5))];
        for (let i = i0; i <= i1; i += 1) land[j * cols + i] = 1;
      }
    }
  }
  // How far each cell of sea is from the land, counted in cells, up to the offing.
  const shore = new Uint8Array(cols * rows).fill(255);
  let edge = [];
  for (let n = 0; n < land.length; n += 1) if (land[n]) { shore[n] = 0; edge.push(n); }
  for (let d = 1; d <= options.offing && edge.length; d += 1) {
    const next = [];
    for (const n of edge) {
      const [i, j] = [n % cols, Math.floor(n / cols)];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const [x, y] = [i + di, j + dj];
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const m = y * cols + x;
        if (shore[m] === 255) { shore[m] = d; next.push(m); }
      }
    }
    edge = next;
  }
  const cellOf = ([lon, lat]) => [Math.min(cols - 1, Math.max(0, Math.floor((lon - cut.west) / cell))), Math.min(rows - 1, Math.max(0, Math.floor((lat - cut.south) / cell)))];
  const pointOf = (n) => [cut.west + ((n % cols) + 0.5) * cell, cut.south + (Math.floor(n / cols) + 0.5) * cell];
  return { cols, rows, land, shore, cellOf, pointOf, cut, cell };
}

/** The cell of sea nearest a point, looking outward ring by ring. */
export function nearestSea(grid, point, reach = 40) {
  const [ci, cj] = grid.cellOf(point);
  let best = null;
  for (let r = 0; r <= reach && !best; r += 1) {
    let least = Infinity;
    for (let j = cj - r; j <= cj + r; j += 1) {
      for (let i = ci - r; i <= ci + r; i += 1) {
        if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r) continue;
        if (i < 0 || j < 0 || i >= grid.cols || j >= grid.rows || grid.land[j * grid.cols + i]) continue;
        const [x, y] = grid.pointOf(j * grid.cols + i);
        const d = Math.hypot(x - point[0], y - point[1]);
        if (d < least) { least = d; best = j * grid.cols + i; }
      }
    }
  }
  if (best === null) throw new Error(`no sea near ${point}`);
  return best;
}

/** The cheapest way by sea from one cell to another (A*), as a list of cells. */
export function seaWay(grid, from, to, options = MAP) {
  const { cols, rows, land, shore } = grid;
  const squeeze = (j) => Math.cos(((grid.cut.south + (j + 0.5) * grid.cell) * Math.PI) / 180);
  const least = Math.cos((grid.cut.north * Math.PI) / 180); // the narrowest a degree of longitude gets: keeps the guess below the truth
  const [ti, tj] = [to % cols, Math.floor(to / cols)];
  const guess = (n) => Math.hypot(((n % cols) - ti) * least, Math.floor(n / cols) - tj);
  const weight = (n) => (shore[n] > options.offing ? 1 : 1 + (options.shy - 1) * (1 - (shore[n] - 1) / options.offing));
  const cost = new Float64Array(cols * rows).fill(Infinity);
  const came = new Int32Array(cols * rows).fill(-1);
  const heap = []; // [priority, cell]
  const push = (item) => {
    heap.push(item);
    for (let i = heap.length - 1; i > 0;) {
      const parent = (i - 1) >> 1;
      if (heap[parent][0] <= heap[i][0]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const [l, r] = [2 * i + 1, 2 * i + 2];
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  cost[from] = 0;
  push([guess(from), from]);
  while (heap.length) {
    const [priority, n] = pop();
    if (n === to) break;
    if (priority > cost[n] + guess(n) + 1e-9) continue;
    const [i, j] = [n % cols, Math.floor(n / cols)];
    for (let dj = -1; dj <= 1; dj += 1) {
      for (let di = -1; di <= 1; di += 1) {
        if (!di && !dj) continue;
        const [x, y] = [i + di, j + dj];
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        const m = y * cols + x;
        if (land[m]) continue;
        // Not between two pieces of land that touch at a corner.
        if (di && dj && (land[j * cols + x] || land[y * cols + i])) continue;
        const step = Math.hypot(di * squeeze(j), dj) * (weight(n) + weight(m)) / 2;
        if (cost[n] + step < cost[m]) {
          cost[m] = cost[n] + step;
          came[m] = n;
          push([cost[m] + guess(m), m]);
        }
      }
    }
  }
  if (!Number.isFinite(cost[to])) throw new Error('no way by sea');
  const way = [];
  for (let n = to; n !== -1; n = came[n]) way.push(n);
  return way.reverse();
}

/** The route: for each leg, the points of the way by sea from one stop to the next, the stops themselves at its ends. */
export function routeFrom(rings, cut, stops, options = MAP) {
  const grid = seaGrid(rings, cut, options);
  const ways = new Map(); // a leg sailed both ways (to the Underworld and back) is found once
  return stops.slice(1).map((stop, index) => {
    const [a, b] = [stops[index], stop].map((s) => [s.lon, s.lat]);
    const back = ways.get(`${b}>${a}`);
    const points = back ? [...back].reverse() : (() => {
      const cells = seaWay(grid, nearestSea(grid, a), nearestSea(grid, b), options);
      return [a, ...thin(cells.map((n) => grid.pointOf(n)), options.routeTolerance), b];
    })();
    ways.set(`${a}>${b}`, points);
    return points.flatMap(([x, y]) => [Math.round(x * options.scale), Math.round(y * options.scale)]);
  });
}

function main() {
  const [sourcePath, outPath = resolve(import.meta.dirname, '..', '..', 'content', 'world', 'odyssey-map.json')] = process.argv.slice(2);
  if (!sourcePath) throw new Error('usage: node client/scripts/make-odyssey-map.mjs <world-atlas/land-10m.json> [out.json]');
  const source = readFileSync(sourcePath);
  const chart = yaml.load(readFileSync(resolve(import.meta.dirname, '..', '..', 'content', 'world', 'odyssey.yaml'), 'utf8'));
  const { cut, rings } = landIn(JSON.parse(source), chart.frame);
  const coast = coastFrom(rings, chart.stops);
  const route = routeFrom(rings, cut, chart.stops);
  const text = `${JSON.stringify({
    source: 'Natural Earth land boundaries, 1:10m (version 4.1.0), as redistributed by world-atlas 2.0.2 (land-10m.json). Public domain. Made by client/scripts/make-odyssey-map.mjs; see client/public/models/ASSETS.md.',
    scale: MAP.scale,
    rings: coast,
    route,
  })}\n`;
  writeFileSync(outPath, text);
  const count = (lists) => lists.reduce((sum, list) => sum + list.length / 2, 0);
  console.log(`source sha256 ${createHash('sha256').update(source).digest('hex')}`);
  console.log(`${rings.length} pieces of land in the frame, ${coast.length} kept, ${count(coast)} points of coast`);
  console.log(`${route.length} legs, ${count(route)} points of route; ${text.length} bytes -> ${outPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
