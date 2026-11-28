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
// Round 213 (issue #23): the land can be pulled down (server/src/road/pulls.js), so a height may be under nothing,
// and the picture is made in two steps so that a pull can be watched: `prepareMap` reads the landscape once (the slow
// part), and `paintMap(prepared, t)` paints it with the ground a share `t` of the way down its dip, quickly enough to
// do every frame. `renderMap` is the two together.

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
 * `project(x, z, h)` (the overlay position of a point `h` metres above the water; a point under the water is drawn
 * on it), `place(x, z, h)` (round 213: the same with no water in the way, for pulled land, whose surface may be under
 * nothing) and `ground(sx, sy)` (the point of the water plane drawn at an overlay position).
 */
export function createMapView(points, { width = ROAD_MAP.width, height = ROAD_MAP.height, relief = ROAD_MAP.relief, margin = ROAD_MAP.margin, farthest = ROAD_MAP.farthest, closest = ROAD_MAP.closest } = {}) {
  // Per unit of scale: how far across each point is, and how far down the picture, its height taken off.
  const across = points.map((point) => point.x - point.z);
  const down = points.map((point) => (point.x + point.z) * TAN30 - (point.y ?? 0) * RISE * relief);
  const [minP, maxP, minD, maxD] = [Math.min(...across), Math.max(...across), Math.min(...down), Math.max(...down)];
  const room = { x: width - 2 * margin.side, y: height - margin.top - margin.bottom };
  const fit = Math.min(room.x / Math.max(1, maxP - minP), room.y / Math.max(1, maxD - minD));
  // Round 161: the whole journey is shown from as far off as it takes (`farthest` is then ROAD_MAP.journey).
  const scale = Math.max(farthest, Math.min(closest, fit));
  const [cx, cy] = [width / 2 - ((minP + maxP) / 2) * scale, margin.top + room.y / 2 - ((minD + maxD) / 2) * scale];
  const lift = scale * RISE * relief; // overlay units per metre of height
  const place = (x, z, h = 0) => [cx + (x - z) * scale, cy + (x + z) * scale * TAN30 - h * lift];
  return Object.freeze({
    width, height, scale, lift,
    project: (x, z, h = 0) => place(x, z, Math.max(0, h)),
    place,
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
// Round 213: the water's surface at a point (pulled land takes its water down with it).
const waterOf = (terrain) => terrain.waterAt ?? (() => terrain.waterY);

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
  const water = waterOf(terrain)(x, z);
  if (h <= water) {
    const deep = clamp((water - h) / 9, 0, 1);
    return COLOURS.shallow.map((value, i) => (value + (COLOURS.deep[i] - value) * deep) / 255);
  }
  return landAt(terrain, x, z, h).base.map((value) => value / 255);
}

/**
 * Round 213: the landscape of `terrain` in `view`, read once for painting (`paintMap`). `dipAt(x, z)`, if given, is
 * how far the ground at a point is to sink beyond where `terrain` has it (0 or less: a pull about to happen), and
 * `sink` the most any ground of the picture is, or will be, under where the unpulled land has it (metres).
 */
export function prepareMap(terrain, view, { columns = ROAD_MAP.columns, dipAt = null, sink = terrain.deepest ?? 0 } = {}) {
  const unit = view.width / columns; // overlay units per pixel
  const height = Math.round(view.height / unit);
  const liftPx = view.lift / unit;
  const rows = height + Math.ceil(ROAD_MAP.tallest * liftPx); // ground in front of the picture can stand up into it
  const back = sink > 0 ? Math.ceil(sink * liftPx) + 1 : 0; // and sunk ground beyond its top is drawn down into it
  const pad = 2; // samples beyond each side and behind, for the light
  const wide = columns + 2 * pad;
  const top = back + pad;
  const count = wide * (rows + top);
  const level = new Float32Array(count); // the surface: the ground, or the water over it
  const dip = dipAt ? new Float32Array(count) : null;
  const kind = new Uint8Array(count); // 0 water, 1 land, 3 land with a tree
  const tone = new Float64Array(count * 3); // the colour before the light
  const sunk = dipAt ? new Float64Array(count * 3) : null; // and once the ground has sunk its dip
  const waterAt = waterOf(terrain);
  for (let r = -top; r < rows; r += 1) {
    for (let c = 0; c < wide; c += 1) {
      const at = view.ground((c - pad + 0.5) * unit, (r + 0.5) * unit);
      const index = (r + top) * wide + c;
      const ground = terrain.heightAt(at.x, at.z);
      const water = waterAt(at.x, at.z);
      level[index] = Math.max(water, ground);
      const down = dipAt ? dipAt(at.x, at.z) : 0;
      if (dip) dip[index] = down;
      if (c < pad || c >= columns + pad || r < -back) continue; // these are only for the light of their neighbours
      let colour;
      let after = null;
      if (ground <= water) {
        const deep = clamp((water - ground) / 9, 0, 1);
        colour = COLOURS.shallow.map((value, i) => value + (COLOURS.deep[i] - value) * deep);
      } else {
        const h = level[index];
        const { cover, biome, base } = landAt(terrain, at.x, at.z, h);
        const wood = cover === 'forest' ? (biome?.wood ?? 0.2) : cover === 'meadow' ? 0.03 : cover === 'highland' ? 0.04 : 0;
        const tree = wood > 0 && hash(Math.floor(at.x / 6), Math.floor(at.z / 6), terrain.seed + 147) < wood;
        kind[index] = tree ? 3 : 1;
        colour = base;
        if (down !== 0) after = toneOf(cover, biome, h + down);
      }
      tone.set(colour, index * 3);
      if (sunk) sunk.set(after ?? colour, index * 3);
    }
  }
  // Metres on the ground between the two samples the light compares, across and into the picture.
  const acrossMetres = (2 * pad * unit) / view.scale / Math.SQRT2;
  const intoMetres = (pad * unit) / (view.scale * TAN30) / Math.SQRT2;
  return { width: columns, height, rows, back, pad, wide, top, liftPx, level, dip, kind, tone, sunk, acrossMetres, intoMetres };
}

/**
 * Round 213: the picture of a prepared landscape with its ground a share `t` (0 to 1) of the way down its dip:
 * { width, height, data } with `data` the pixels as RGBA bytes, row by row, as a canvas takes them. Every pixel is
 * painted. `into` is a picture to paint over (one of the same size, from an earlier call).
 */
export function paintMap(prepared, t = 0, into = null) {
  const { width: columns, height, rows, back, pad, wide, top, liftPx, level, dip, kind, tone, sunk, acrossMetres, intoMetres } = prepared;
  const share = dip ? clamp(t, 0, 1) : 0;
  const data = into?.data ?? new Uint8ClampedArray(columns * height * 4);
  const [hazeR, hazeG, hazeB] = COLOURS.haze;
  const [crownR, crownG, crownB] = COLOURS.crown;
  const [footR, footG, footB] = COLOURS.tree;
  const at = share > 0 ? (index) => level[index] + share * dip[index] : (index) => level[index];
  for (let c = 0; c < columns; c += 1) {
    let open = height; // the pixels above this one are not painted yet
    let nearer = null; // the height of the sample in front of this one
    let far = 0;
    for (let r = rows - 1; r >= -back && open > 0; r -= 1) {
      const index = (r + top) * wide + c + pad;
      const h = at(index);
      let [red, green, blue] = [tone[index * 3], tone[index * 3 + 1], tone[index * 3 + 2]];
      let light = 1;
      const land = kind[index] !== 0;
      if (land) {
        if (share > 0) {
          red += (sunk[index * 3] - red) * share;
          green += (sunk[index * 3 + 1] - green) * share;
          blue += (sunk[index * 3 + 2] - blue) * share;
        }
        // The light comes from the left and a little from behind: a slope that faces it is bright, one that faces
        // away is in shade, and the slopes that face the viewer are a shade darker than the land beyond them.
        const leftward = (at(index + pad) - at(index - pad)) / acrossMetres;
        const toViewer = (at(index - pad * wide) - h) / intoMetres;
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
      far = r < height ? 0.26 * (1 - Math.max(0, r) / height) ** 2 : 0;
      red += (hazeR - red) * far;
      green += (hazeG - green) * far;
      blue += (hazeB - blue) * far;
      for (let row = y; row < open; row += 1) {
        const pixel = (row * columns + c) * 4;
        data[pixel] = red; data[pixel + 1] = green; data[pixel + 2] = blue; data[pixel + 3] = 255;
      }
      open = y;
      // A tree is two pixels over its ground: a lit crown on a dark foot.
      if (kind[index] === 3) {
        for (let n = 0; n < ROAD_MAP.treePixels && open > 0; n += 1) {
          open -= 1;
          const lit = n === ROAD_MAP.treePixels - 1;
          const [tr, tg, tb] = lit ? [crownR * light, crownG * light, crownB * light] : [footR * light, footG * light, footB * light];
          const pixel = (open * columns + c) * 4;
          data[pixel] = tr + (hazeR - tr) * far; data[pixel + 1] = tg + (hazeG - tg) * far; data[pixel + 2] = tb + (hazeB - tb) * far; data[pixel + 3] = 255;
        }
      }
    }
    // Sunk ground at the very top of the picture can leave a pixel over it: the haze of the far land.
    for (let row = 0; row < open; row += 1) {
      const pixel = (row * columns + c) * 4;
      data[pixel] = hazeR; data[pixel + 1] = hazeG; data[pixel + 2] = hazeB; data[pixel + 3] = 255;
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
