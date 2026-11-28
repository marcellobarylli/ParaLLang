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
//
// Round 213 (issue #23): the land can be pulled down (server/src/road/pulls.js), and the picture is made in two steps
// so that a pull can be watched: `prepareMap` reads the landscape once (the slow part), as it is and, given `sunk`,
// as it will be; `paintMap(prepared, t)` paints it with the ground a share `t` of the way from the one to the other,
// quickly enough to do every frame. Round 215: ground that goes under the sea's level on the way is water from there
// on. `renderMap` is the two together.

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
 * of the water plane drawn at an overlay position). Round 213: `closest` is the scale it never exceeds.
 */
export function createMapView(points, { width = ROAD_MAP.width, height = ROAD_MAP.height, relief = ROAD_MAP.relief, margin = ROAD_MAP.margin, farthest = ROAD_MAP.farthest, closest = ROAD_MAP.closest } = {}) {
  // Per unit of scale: how far across each point is, and how far down the picture, its height taken off.
  const across = points.map((point) => point.x - point.z);
  const down = points.map((point) => (point.x + point.z) * TAN30 - Math.max(0, point.y ?? 0) * RISE * relief);
  const [minP, maxP, minD, maxD] = [Math.min(...across), Math.max(...across), Math.min(...down), Math.max(...down)];
  const room = { x: width - 2 * margin.side, y: height - margin.top - margin.bottom };
  const fit = Math.min(room.x / Math.max(1, maxP - minP), room.y / Math.max(1, maxD - minD));
  // Round 161: the whole journey is shown from as far off as it takes (`farthest` is then ROAD_MAP.journey).
  const scale = Math.max(farthest, Math.min(closest, fit));
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

// The colour of a kind of ground `h` metres up, before the light.
const toneOf = (cover, biome, h) => {
  const [low, high] = biome?.[cover] ?? LAND[cover];
  const climb = clamp((h - BAND[cover][0]) / (BAND[cover][1] - BAND[cover][0]), 0, 1);
  return low.map((value, i) => value + (high[i] - value) * climb);
};
// The ground's kind, its biome's colours and its colour before the light, at a point `h` metres up.
function landAt(terrain, x, z, h) {
  const cover = terrain.coverAt(x, z, h);
  // Round 160: meadow and forest take the colours of the biome they lie in.
  const biome = terrain.biomes?.[terrain.biomeAt?.(x, z)]?.map ?? null;
  return { cover, biome, base: toneOf(cover, biome, h) };
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

// What the map shows of a point of land `h` metres up: its colour before the light, and whether a tree stands there.
function landOf(terrain, x, z, h) {
  const { cover, biome, base } = landAt(terrain, x, z, h);
  const wood = cover === 'forest' ? (biome?.wood ?? 0.2) : cover === 'meadow' ? 0.03 : cover === 'highland' ? 0.04 : 0;
  return { base, tree: wood > 0 && hash(Math.floor(x / 6), Math.floor(z / 6), terrain.seed + 147) < wood };
}

/**
 * Round 213: the landscape of `terrain` in `view`, read once for painting (`paintMap`). `sunk`, if given, is the
 * same land after a pull (a terrain: pulls.js `withPulls`); the picture can then be painted anywhere between the two.
 */
export function prepareMap(terrain, view, { columns = ROAD_MAP.columns, sunk = null } = {}) {
  const unit = view.width / columns; // overlay units per pixel
  const height = Math.round(view.height / unit);
  const liftPx = view.lift / unit;
  const rows = height + Math.ceil(ROAD_MAP.tallest * liftPx); // ground in front of the picture can stand up into it
  const pad = 2; // samples beyond each side and behind, for the light
  const wide = columns + 2 * pad;
  const count = wide * (rows + pad);
  const ground = new Float64Array(count); // the ground's height, under water too
  const after = sunk ? new Float64Array(count) : null; // and once it has sunk
  const tone = new Float64Array(count * 3); // the land's colour before the light (where it is land)
  const toneAfter = sunk ? new Float64Array(count * 3) : null;
  const trees = new Uint8Array(count); // 1: a tree stands here; 2: one stands here once the ground has sunk
  for (let r = -pad; r < rows; r += 1) {
    for (let c = 0; c < wide; c += 1) {
      const at = view.ground((c - pad + 0.5) * unit, (r + 0.5) * unit);
      const index = (r + pad) * wide + c;
      const h = terrain.heightAt(at.x, at.z);
      ground[index] = h;
      const later = sunk ? sunk.heightAt(at.x, at.z) : h;
      if (after) after[index] = later;
      if (c < pad || c >= columns + pad || r < 0) continue; // these are only for the light of their neighbours
      if (h > terrain.waterY) {
        const land = landOf(terrain, at.x, at.z, Math.fround(h));
        tone.set(land.base, index * 3);
        if (land.tree) trees[index] |= 1;
      }
      if (sunk && later > sunk.waterY) {
        const land = later === h ? null : landOf(sunk, at.x, at.z, Math.fround(later));
        toneAfter.set(land ? land.base : tone.subarray(index * 3, index * 3 + 3), index * 3);
        if (land ? land.tree : trees[index] & 1) trees[index] |= 2;
      }
    }
  }
  // Metres on the ground between the two samples the light compares, across and into the picture.
  const acrossMetres = (2 * pad * unit) / view.scale / Math.SQRT2;
  const intoMetres = (pad * unit) / (view.scale * TAN30) / Math.SQRT2;
  return { width: columns, height, rows, pad, wide, liftPx, waterY: terrain.waterY, ground, after, tone, toneAfter, trees, acrossMetres, intoMetres };
}

/**
 * Round 213: the picture of a prepared landscape with its ground a share `t` (0 to 1) of the way down to where it
 * sinks: { width, height, data } with `data` the pixels as RGBA bytes, row by row, as a canvas takes them. Every
 * pixel is painted. `into` is a picture to paint over (one of the same size, from an earlier call).
 */
export function paintMap(prepared, t = 0, into = null) {
  const { width: columns, height, rows, pad, wide, liftPx, waterY, ground, after, tone, toneAfter, trees, acrossMetres, intoMetres } = prepared;
  const share = after ? clamp(t, 0, 1) : 0;
  const data = into?.data ?? new Uint8ClampedArray(columns * height * 4);
  const [hazeR, hazeG, hazeB] = COLOURS.haze;
  const [crownR, crownG, crownB] = COLOURS.crown;
  const [footR, footG, footB] = COLOURS.tree;
  const { shallow, deep } = COLOURS;
  // The ground's height now, and the surface the light falls on: the ground, or the water over it.
  const heightOf = share >= 1 ? (index) => after[index] : share > 0 ? (index) => ground[index] + share * (after[index] - ground[index]) : (index) => ground[index];
  const surface = (index) => Math.fround(Math.max(waterY, heightOf(index)));
  for (let c = 0; c < columns; c += 1) {
    let open = height; // the pixels above this one are not painted yet
    let nearer = null; // the height of the sample in front of this one
    for (let r = rows - 1; r >= 0 && open > 0; r -= 1) {
      const index = (r + pad) * wide + c + pad;
      const below = heightOf(index);
      const h = Math.fround(Math.max(waterY, below));
      let red;
      let green;
      let blue;
      let light = 1;
      let tree = false;
      if (below <= waterY) {
        const depth = clamp((waterY - below) / 9, 0, 1);
        red = shallow[0] + (deep[0] - shallow[0]) * depth;
        green = shallow[1] + (deep[1] - shallow[1]) * depth;
        blue = shallow[2] + (deep[2] - shallow[2]) * depth;
      } else {
        // The land's colour: as it was, as it will be, or between; land that is on its way under keeps its own.
        const [was, will] = [ground[index] > waterY, Boolean(after) && after[index] > waterY];
        const k = index * 3;
        if (share >= 1 || !was) { red = toneAfter[k]; green = toneAfter[k + 1]; blue = toneAfter[k + 2]; }
        else if (share <= 0 || !will) { red = tone[k]; green = tone[k + 1]; blue = tone[k + 2]; }
        else { red = tone[k] + (toneAfter[k] - tone[k]) * share; green = tone[k + 1] + (toneAfter[k + 1] - tone[k + 1]) * share; blue = tone[k + 2] + (toneAfter[k + 2] - tone[k + 2]) * share; }
        tree = share >= 1 ? (trees[index] & 2) !== 0 : (trees[index] & 1) !== 0;
        // The light comes from the left and a little from behind: a slope that faces it is bright, one that faces
        // away is in shade, and the slopes that face the viewer are a shade darker than the land beyond them.
        const leftward = (surface(index + pad) - surface(index - pad)) / acrossMetres;
        const toViewer = (surface(index - pad * wide) - h) / intoMetres;
        light = clamp(1 + leftward * 1.5 - toViewer * 0.5, 0.5, 1.38);
        // A height line wherever the ground crosses a round height between this sample and the one in front.
        const line = nearer !== null && Math.floor(h / ROAD_MAP.contour) !== Math.floor(nearer / ROAD_MAP.contour) ? 0.86 : 1;
        red = red * light * line;
        green = green * light * line;
        blue = blue * light * line;
      }
      nearer = h;
      const y = Math.max(0, Math.floor(r + 0.5 - h * liftPx));
      if (y >= open) continue;
      // A little of the sky's colour over the far ground, so the picture has depth.
      const far = r < height ? 0.26 * (1 - r / height) ** 2 : 0;
      red += (hazeR - red) * far;
      green += (hazeG - green) * far;
      blue += (hazeB - blue) * far;
      for (let row = y; row < open; row += 1) {
        const pixel = (row * columns + c) * 4;
        data[pixel] = red; data[pixel + 1] = green; data[pixel + 2] = blue; data[pixel + 3] = 255;
      }
      open = y;
      // A tree is two pixels over its ground: a lit crown on a dark foot.
      if (tree) {
        for (let n = 0; n < ROAD_MAP.treePixels && open > 0; n += 1) {
          open -= 1;
          const lit = n === ROAD_MAP.treePixels - 1;
          const [tr, tg, tb] = lit ? [crownR * light, crownG * light, crownB * light] : [footR * light, footG * light, footB * light];
          const pixel = (open * columns + c) * 4;
          data[pixel] = tr + (hazeR - tr) * far; data[pixel + 1] = tg + (hazeG - tg) * far; data[pixel + 2] = tb + (hazeB - tb) * far; data[pixel + 3] = 255;
        }
      }
    }
  }
  return into ?? { width: columns, height, data };
}

/**
 * The picture of `terrain` in `view`: { width, height, data } with `data` the pixels as RGBA bytes, row by row,
 * as a canvas takes them. Every pixel is painted.
 */
export function renderMap(terrain, view, options = {}) {
  return paintMap(prepareMap(terrain, view, options));
}
