// Round 150: writes the icons of the web app (client/public/) and of the iPhone app (mobile/assets/icon.png). The
// icon is a snapshot of the road's map (src/roadMap.js: the landscape seen from above at an angle) with a walk
// along the graph of sites drawn on it. The landscape, the graph and the walk are pure functions of SEED, so a run
// writes the same files every time. Pure Node (zlib), no image library.
// Round 164: the picture is the whole journey as the map's "Show Journey so far" paints it (round 161): a walk of
// 120 on rails, seen from as far off as it takes to hold all of it, in the map's gold line with a pale mark where
// it began and the post where the walker stands. The owner picked it from round 163's picture of exactly this walk.
// Run: node client/scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { loadGameContent } from '../../server/src/content-loader.js';
import { createGraph } from '../../server/src/road/graph.js';
import { ROAD, freshRoad, offersFor } from '../../server/src/road/service.js';
import { createTerrain } from '../../server/src/road/terrain.js';
import { ROAD_MAP, createMapView, renderMap } from '../src/roadMap.js';

const PUBLIC = new URL('../public/', import.meta.url);
const MOBILE = new URL('../../mobile/assets/', import.meta.url);

export const ICON = Object.freeze({
  seed: 4242, // the landscape of the picture (the owner's pick: round 163's picture of the whole walk)
  hops: 120, // the walks of the journey, each the rails' own choice
  frame: 100, // the picture's side in the map's units
  columns: 200, // the landscape's pixels across; drawn small and shown large, as the map is
  margin: Object.freeze({ side: 7, top: 9, bottom: 7 }), // room around the walk
  // A maskable icon may be cut to a circle of 80 % of the side: it shows more land around the same walk, so that
  // the walk keeps inside the circle.
  maskable: Object.freeze({ side: 21, top: 22, bottom: 20 }),
  way: 0.62, // half the width of the walked line, in the map's units
  edge: 0.42, // the dark line around every mark
});

// The map's own colours for a journey (client/src/index.css: --gold, and the journey's pale start).
const COLOURS = { way: [228, 184, 71], edge: [11, 12, 11], start: [244, 239, 224], here: [255, 255, 255] };

/**
 * The journey of `hops` walks on the road of `seed`, as a learner on rails who walks on without talking makes it:
 * at every site the rails' own choice (server/src/road/service.js, `offersFor`). The ids of the sites, the start first.
 */
export function iconWalk(seed = ICON.seed, hops = ICON.hops) {
  const { curriculum } = loadGameContent({ language: 'it' });
  const graph = createGraph(createTerrain(seed));
  let road = freshRoad(seed, curriculum);
  const walk = [road.at];
  for (let n = 0; n < hops; n += 1) {
    const { frontier, rails } = offersFor(graph, road, curriculum);
    const next = rails ?? frontier[0]?.id;
    if (!next) break;
    road = { ...road, at: next, trail: [...road.trail.filter((id) => id !== next), next].slice(-ROAD.trail) };
    walk.push(next);
  }
  return walk;
}

/** The icon's scene: the landscape's pixels and the marks of the journey, in the map's units. */
export function iconScene({ seed = ICON.seed, hops = ICON.hops, margin = ICON.margin } = {}) {
  const terrain = createTerrain(seed);
  const graph = createGraph(terrain);
  const walk = iconWalk(seed, hops);
  const nodes = walk.map((id) => graph.node(id));
  const frame = ICON.frame;
  const view = createMapView(nodes, { width: frame, height: frame, margin, farthest: ROAD_MAP.journey });
  // The journey is one line through the sites in order, each at its own height, as the map paints it.
  const line = nodes.map((node) => view.project(node.x, node.z, node.y));
  return { walk, view, frame, picture: renderMap(terrain, view, { columns: ICON.columns }), line, sites: line };
}

// Distances in the map's units; below zero is inside.
const toSegment = (x, y, [ax, ay], [bx, by]) => {
  const [dx, dy] = [bx - ax, by - ay];
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
};
// A square lying on the ground as the map shows it: twice as wide as it is deep.
const toTile = (x, y, [cx, cy], half) => ((Math.abs(x - cx) / half + Math.abs(y - cy) / (half * 0.58)) - 1) * half * 0.5;
const toBox = (x, y, left, top, right, bottom) => Math.max(left - x, x - right, top - y, y - bottom);

/** The icon as the RGB bytes of `size` × `size` pixels. */
export function iconPixels(scene, size) {
  const { picture, line, frame } = scene;
  const unit = frame / size; // the map's units per pixel
  const start = line[0];
  const here = line[line.length - 1];
  const out = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const [x, y] = [(px + 0.5) * unit, (py + 0.5) * unit];
      const from = (Math.min(picture.height - 1, Math.floor((y / frame) * picture.height)) * picture.width + Math.floor((x / frame) * picture.width)) * 4;
      const colour = [picture.data[from], picture.data[from + 1], picture.data[from + 2]];
      // Each mark is painted over what is there by how much of the pixel it covers.
      const paint = (distance, rgb) => {
        const cover = Math.min(1, Math.max(0, 0.5 - distance / unit));
        if (cover > 0) for (let k = 0; k < 3; k += 1) colour[k] += (rgb[k] - colour[k]) * cover;
      };
      const mark = (distance, rgb) => { paint(distance - ICON.edge, COLOURS.edge); paint(distance, rgb); };
      let way = Infinity;
      for (let n = 1; n < line.length; n += 1) way = Math.min(way, toSegment(x, y, line[n - 1], line[n]));
      mark(way - ICON.way, COLOURS.way);
      // Where the journey began: a pale dot. Where the walker stands: a white tile with a post and a flag, as on the map.
      mark(Math.hypot(x - start[0], y - start[1]) - 1.5, COLOURS.start);
      mark(toTile(x, y, here, 2.6), COLOURS.here);
      mark(Math.min(toBox(x, y, here[0] - 0.4, here[1] - 5.2, here[0] + 0.4, here[1]), toBox(x, y, here[0] - 1.2, here[1] - 7.6, here[0] + 1.2, here[1] - 5.2)), COLOURS.here);
      out.set(colour.map(Math.round), (py * size + px) * 3);
    }
  }
  return out;
}

export function png(size, rgb) {
  const rows = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y += 1) rgb.copy(rows, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3);
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB, no transparency: iOS refuses an app icon that has any
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// The files: the browser tab's icon, the manifest's three, the iPhone home screen's, and the Expo app's.
export const ICON_FILES = Object.freeze([
  [PUBLIC, 'parallang-icon-64.png', 64],
  [PUBLIC, 'parallang-icon-192.png', 192],
  [PUBLIC, 'parallang-icon-512.png', 512],
  [PUBLIC, 'parallang-icon-maskable-512.png', 512, ICON.maskable],
  [PUBLIC, 'parallang-icon-apple-touch.png', 180],
  [MOBILE, 'icon.png', 1024],
]);

if (import.meta.url === `file://${process.argv[1]}`) {
  const scenes = new Map();
  const sceneOf = (margin) => scenes.get(margin) ?? scenes.set(margin, iconScene({ margin })).get(margin);
  for (const [folder, name, size, margin = ICON.margin] of ICON_FILES) writeFileSync(new URL(name, folder), png(size, iconPixels(sceneOf(margin), size)));
  console.log(`wrote ${ICON_FILES.length} icons: a journey of ${ICON.hops} walks on the landscape of seed ${ICON.seed}`);
}
