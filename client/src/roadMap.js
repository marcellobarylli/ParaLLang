// Round 147: the road's map as a picture. The landscape is seen from far off and from above at an angle (an
// isometric view: the two ground axes run down the picture to the left and to the right, and height goes straight
// up), so its hills, valleys and lakes show as relief, which a view from straight above cannot do.
//
// Two pure parts, so the map's overlay and its picture cannot disagree and both can be tested without a browser:
//
//   createMapView(points)   the frame that holds `points` (the sites to show), and `project(x, z, h)`: where a
//                           point of the world is in the picture
//   renderMap(terrain, view)  the picture itself, as pixels: every column is walked from the front of the land to
//                           the back, and each point of ground paints the pixels it stands above that nothing
//                           nearer has painted (so near hills hide what is behind them)

import { hash } from '../../server/src/road/terrain.js';

export const ROAD_MAP = Object.freeze({
  width: 100, // the picture in the overlay's units
  height: 82,
  columns: 240, // pixels across; the picture is drawn small and shown large, as the rest of the game is
  relief: 3, // heights are drawn this much taller than they are, as a relief map does: from so far off a hill is low
  closest: 0.095, // overlay units per metre across at most: the picture never shows less than about 1050 m
  farthest: 0.05, // and never more than 2 km: beyond that a site could not be picked
  margin: Object.freeze({ side: 10, top: 14, bottom: 9 }), // room for the sites' marks
  tallest: 118, // metres: no ground stands higher
  treePixels: 2, // how many pixels a tree stands over its ground
  contour: 10, // metres between the height lines
  recent: 12, // the sites of the trail the frame always holds
  journey: 0.003, // round 161: overlay units per metre at least when the whole journey is shown: up to about 30 km across
});

const TAN30 = Math.tan(Math.PI / 6);
const RISE = 1 / Math.cos(Math.PI / 6);

/**
 * The frame that holds `points` ([{ x, z, y }], `y` the height of each): `scale` (overlay units per metre across),
 * `project(x, z, h)` (the overlay position of a point `h` metres above the water) and `ground(sx, sy)` (the point
 * of the water plane drawn at an overlay position).
 */
export function createMapView(points, { width = ROAD_MAP.width, height = ROAD_MAP.height, relief = ROAD_MAP.relief, margin = ROAD_MAP.margin, farthest = ROAD_MAP.farthest } = {}) {
  // Per unit of scale: how far across each point is, and how far down the picture, its height taken off.
  const across = points.map((point) => point.x - point.z);
  const down = points.map((point) => (point.x + point.z) * TAN30 - Math.max(0, point.y ?? 0) * RISE * relief);
  const [minP, maxP, minD, maxD] = [Math.min(...across), Math.max(...across), Math.min(...down), Math.max(...down)];
  const room = { x: width - 2 * margin.side, y: height - margin.top - margin.bottom };
  const fit = Math.min(room.x / Math.max(1, maxP - minP), room.y / Math.max(1, maxD - minD));
  // Round 161: the whole journey is shown from as far off as it takes (`farthest` is then ROAD_MAP.journey).
  const scale = Math.max(farthest, Math.min(ROAD_MAP.closest, fit));
  const [cx, cy] = [width / 2 - ((minP + maxP) / 2) * scale, margin.top + room.y / 2 - ((minD + maxD) / 2) * scale];
  const lift = scale * RISE * relief; // overlay units per metre of height
  return Object.freeze({
    width, height, scale, lift,
    project: (x, z, h = 0) => [cx + (x - z) * scale, cy + (x + z) * scale * TAN30 - Math.max(0, h) * lift],
    ground(sx, sy) {
      const [p, q] = [(sx - cx) / scale, (sy - cy) / (scale * TAN30)];
      return { x: (q + p) / 2, z: (q - p) / 2 };
    },
  });
}

// The land's colours, low and high: within a kind of ground the colour climbs with the height.
const LAND = {
  shore: [[214, 196, 142], [214, 196, 142]],
  meadow: [[104, 150, 72], [186, 190, 104]],
  forest: [[52, 108, 58], [112, 142, 72]],
  highland: [[150, 138, 112], [128, 126, 128]],
  snow: [[226, 232, 240], [255, 255, 255]],
};
const BAND = { shore: [0, 2], meadow: [1, 36], forest: [1, 36], highland: [36, 58], snow: [58, 100] };
const COLOURS = { crown: [58, 112, 60], tree: [26, 62, 42], shallow: [78, 146, 150], deep: [28, 58, 96], haze: [182, 200, 220] };
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The ground's kind, its biome's colours and its colour before the light, at a point `h` metres up.
function landAt(terrain, x, z, h) {
  const cover = terrain.coverAt(x, z, h);
  // Round 160: meadow and forest take the colours of the biome they lie in.
  const biome = terrain.biomes?.[terrain.biomeAt?.(x, z)]?.map ?? null;
  const [low, high] = biome?.[cover] ?? LAND[cover];
  const climb = clamp((h - BAND[cover][0]) / (BAND[cover][1] - BAND[cover][0]), 0, 1);
  return { cover, biome, base: low.map((value, i) => value + (high[i] - value) * climb) };
}

/**
 * Round 175: the colour of the ground at (x, z) as the map paints it, before its light and its height lines, as
 * [r, g, b] in 0..1: water by its depth, land by its kind and biome. The title screen's far landscape is painted
 * with it, so the two agree.
 */
export function groundColour(terrain, x, z, h = terrain.heightAt(x, z)) {
  if (h <= terrain.waterY) {
    const deep = clamp((terrain.waterY - h) / 9, 0, 1);
    return COLOURS.shallow.map((value, i) => (value + (COLOURS.deep[i] - value) * deep) / 255);
  }
  return landAt(terrain, x, z, h).base.map((value) => value / 255);
}

/**
 * The picture of `terrain` in `view`: { width, height, data } with `data` the pixels as RGBA bytes, row by row,
 * as a canvas takes them. Every pixel is painted.
 */
export function renderMap(terrain, view, { columns = ROAD_MAP.columns } = {}) {
  const unit = view.width / columns; // overlay units per pixel
  const height = Math.round(view.height / unit);
  const liftPx = view.lift / unit;
  const rows = height + Math.ceil(ROAD_MAP.tallest * liftPx); // ground in front of the picture can stand up into it
  const pad = 2; // samples beyond each side and behind, for the light
  const wide = columns + 2 * pad;
  const ground = new Float32Array(wide * (rows + pad));
  for (let r = -pad; r < rows; r += 1) {
    for (let c = 0; c < wide; c += 1) {
      const at = view.ground((c - pad + 0.5) * unit, (r + 0.5) * unit);
      ground[(r + pad) * wide + c] = Math.max(terrain.waterY, terrain.heightAt(at.x, at.z));
    }
  }
  // Metres on the ground between the two samples the light compares, across and into the picture.
  const acrossMetres = (2 * pad * unit) / view.scale / Math.SQRT2;
  const intoMetres = (pad * unit) / (view.scale * TAN30) / Math.SQRT2;
  const data = new Uint8ClampedArray(columns * height * 4);
  for (let c = 0; c < columns; c += 1) {
    let open = height; // the pixels above this one are not painted yet
    let nearer = null; // the height of the sample in front of this one
    for (let r = rows - 1; r >= 0 && open > 0; r -= 1) {
      const index = (r + pad) * wide + c + pad;
      const h = ground[index];
      const at = view.ground((c + 0.5) * unit, (r + 0.5) * unit);
      let colour;
      const lifted = h * liftPx;
      let crown = null; // a tree here: the colours of its two pixels
      if (h <= terrain.waterY) {
        const deep = clamp((terrain.waterY - terrain.heightAt(at.x, at.z)) / 9, 0, 1);
        colour = COLOURS.shallow.map((value, i) => value + (COLOURS.deep[i] - value) * deep);
      } else {
        const { cover, biome, base } = landAt(terrain, at.x, at.z, h);
        // The light comes from the left and a little from behind: a slope that faces it is bright, one that faces
        // away is in shade, and the slopes that face the viewer are a shade darker than the land beyond them.
        const leftward = (ground[index + pad] - ground[index - pad]) / acrossMetres;
        const toViewer = (ground[index - pad * wide] - h) / intoMetres;
        const light = clamp(1 + leftward * 1.5 - toViewer * 0.5, 0.5, 1.38);
        const wood = cover === 'forest' ? (biome?.wood ?? 0.2) : cover === 'meadow' ? 0.03 : cover === 'highland' ? 0.04 : 0;
        const tree = wood > 0 && hash(Math.floor(at.x / 6), Math.floor(at.z / 6), terrain.seed + 147) < wood;
        // A height line wherever the ground crosses a round height between this sample and the one in front.
        const line = nearer !== null && Math.floor(h / ROAD_MAP.contour) !== Math.floor(nearer / ROAD_MAP.contour) ? 0.86 : 1;
        colour = base.map((value) => value * light * line);
        if (tree) crown = [COLOURS.crown.map((value) => value * light), COLOURS.tree.map((value) => value * light)];
      }
      nearer = h;
      const y = Math.max(0, Math.floor(r + 0.5 - lifted));
      if (y >= open) continue;
      // A little of the sky's colour over the far ground, so the picture has depth.
      const far = r < height ? 0.26 * (1 - r / height) ** 2 : 0;
      const hazed = (rgb) => [...rgb.map((value, i) => value + (COLOURS.haze[i] - value) * far), 255];
      const pixel = hazed(colour);
      for (let row = y; row < open; row += 1) data.set(pixel, (row * columns + c) * 4);
      open = y;
      // A tree is two pixels over its ground: a lit crown on a dark foot.
      if (crown) {
        for (let n = 0; n < ROAD_MAP.treePixels && open > 0; n += 1) { open -= 1; data.set(hazed(crown[n === ROAD_MAP.treePixels - 1 ? 0 : 1]), (open * columns + c) * 4); }
      }
    }
  }
  return { width: columns, height, data };
}
