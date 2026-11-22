// Round 150: writes the icons of the web app (client/public/) and of the iPhone app (mobile/assets/icon.png). The
// icon is a snapshot of the road's map (src/roadMap.js: the landscape seen from above at an angle) with a walk
// along the graph of sites drawn on it, as the map draws the trail. The landscape, the graph and the walk are pure
// functions of SEED, so a run writes the same files every time. Pure Node (zlib), no image library.
// Run: node client/scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createGraph } from '../../server/src/road/graph.js';
import { createTerrain, hash } from '../../server/src/road/terrain.js';
import { createMapView, renderMap } from '../src/roadMap.js';

const PUBLIC = new URL('../public/', import.meta.url);
const MOBILE = new URL('../../mobile/assets/', import.meta.url);

export const ICON = Object.freeze({
  seed: 42, // the landscape of the picture: a lake's shore, a meadow and a wood
  hops: 9, // the ways walked
  frame: 42, // the picture's side in the map's units: the smaller, the closer (the map shows 1 m as 0.095 at most)
  columns: 72, // the landscape's pixels across; drawn small and shown large, as the map is
  // Room around the walk. A maskable icon may be cut to a circle of 80 % of the side, so the walk keeps inside it.
  margin: Object.freeze({ side: 8, top: 12, bottom: 7 }),
  way: 0.8, // half the width of the walked line, in the map's units
  edge: 0.45, // the dark line around every mark
});

const COLOURS = { way: [255, 243, 207], edge: [16, 18, 16], site: [169, 211, 155], here: [255, 255, 255] };

/** A walk of `hops` ways from the graph's start: a hashed pick among the sites next door, new ones first. */
export function iconWalk(graph, hops = ICON.hops) {
  const walk = [graph.start];
  for (let step = 0; step < hops; step += 1) {
    const at = walk[walk.length - 1];
    const next = graph.neighbours(at);
    const fresh = next.filter((id) => !walk.includes(id));
    const order = (id) => { const [i, j] = id.split(',').map(Number); return hash(i * 7 + step, j * 11 - step, graph.seed + 777); };
    const pick = (fresh.length ? fresh : next).sort((a, b) => order(a) - order(b))[0];
    if (!pick) break;
    walk.push(pick);
  }
  return walk;
}

/** The icon's scene: the landscape's pixels and the marks of the walk, in the map's units. */
export function iconScene({ seed = ICON.seed, hops = ICON.hops } = {}) {
  const terrain = createTerrain(seed);
  const graph = createGraph(terrain);
  const walk = iconWalk(graph, hops);
  const nodes = walk.map((id) => graph.node(id));
  const view = createMapView(nodes, { width: ICON.frame, height: ICON.frame, margin: ICON.margin });
  const place = (x, z) => view.project(x, z, terrain.heightAt(x, z));
  // A way lies on the ground: every point of it is drawn at its own height.
  const line = walk.slice(1).flatMap((id, index) => graph.pathPoints(walk[index], id).map(([x, z]) => place(x, z)));
  return { walk, view, picture: renderMap(terrain, view, { columns: ICON.columns }), line, sites: nodes.map((node) => place(node.x, node.z)) };
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
  const { picture, line, sites } = scene;
  const unit = ICON.frame / size; // the map's units per pixel
  const here = sites[sites.length - 1];
  const before = sites.slice(0, -1);
  const out = Buffer.alloc(size * size * 3);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const [x, y] = [(px + 0.5) * unit, (py + 0.5) * unit];
      const from = (Math.min(picture.height - 1, Math.floor((y / ICON.frame) * picture.height)) * picture.width + Math.floor((x / ICON.frame) * picture.width)) * 4;
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
      mark(Math.min(...before.map((site) => toTile(x, y, site, 2.2))), COLOURS.site);
      // Where the walker stands: a white tile with a post and a flag, as on the map.
      mark(toTile(x, y, here, 3.2), COLOURS.here);
      mark(Math.min(toBox(x, y, here[0] - 0.45, here[1] - 8, here[0] + 0.45, here[1]), toBox(x, y, here[0] - 1.9, here[1] - 11.4, here[0] + 1.9, here[1] - 7.6)), COLOURS.here);
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
  [PUBLIC, 'parallang-icon-maskable-512.png', 512],
  [PUBLIC, 'parallang-icon-apple-touch.png', 180],
  [MOBILE, 'icon.png', 1024],
]);

if (import.meta.url === `file://${process.argv[1]}`) {
  const scene = iconScene({ seed: Number(process.env.ICON_SEED ?? ICON.seed) });
  const out = process.env.ICON_OUT ? new URL(`file://${process.env.ICON_OUT.replace(/\/?$/, '/')}`) : null;
  for (const [folder, name, size] of ICON_FILES) writeFileSync(new URL(name, out ?? folder), png(size, iconPixels(scene, size)));
  console.log(`wrote ${ICON_FILES.length} icons: a walk of ${scene.walk.length - 1} ways on the landscape of seed ${process.env.ICON_SEED ?? ICON.seed}`);
}
