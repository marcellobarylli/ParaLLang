// Round 144: the endless landscape of The Journey 2. Pure and deterministic: no three.js, no DOM, no state. The
// server computes the graph of sites from it (graph.js) and the web client builds its meshes from the same functions
// (client/src/scene/roadView.js imports this file), so both always agree on where the ground is.
//
// The ground is a sum of fractal noises (fractional Brownian motion: octaves of value noise, each at twice the
// frequency and half the height of the one before):
//
//   continent  very low frequency: where the land lies and where the water (sea level is y = 0)
//   hills      fBm read at domain-warped coordinates (the coordinates are pushed about by another fBm), which bends
//              ridgelines and valleys the way erosion does
//   mountains  ridged fBm (1 - |2n - 1|, squared), switched on by a second very low mask
//   detail     a little roughness at close range
//
// Any point can be asked for at any time, so nothing is stored: the world is as large as the numbers go, and only
// the chunks around the player are ever turned into meshes.

export const TERRAIN = Object.freeze({
  waterY: 0, // sea level, metres
  chunk: 48, // the side of a ground chunk, metres
  cells: 8, // a chunk is cells x cells quads (6 m each)
  treeGrid: 8, // one candidate tree per treeGrid x treeGrid metres
  home: 260, // around the origin the land is lifted clear of the water, so a new player starts on dry ground
});

// Round 160 (issue #8): biomes. A biome is a kind of country, hundreds of metres across: it says how wet the ground
// has to be before trees close over it, how thickly each kind of ground is wooded, which trees grow, and what colour
// the grass is. Within a biome a point still has its `cover` (water, shore, meadow, forest, highland, snow), which
// comes from its height and its moisture as before. The road starts in the jungle: around the origin the biome is
// always the first of BIOME.order, out to BIOME.home metres, and beyond that a very low noise chooses.
//
//   name      what the player is shown
//   wet       the moisture above which the ground is forest
//   density   the chance that a tree candidate stands, by cover
//   trees     [share, kind] pairs: a hashed draw below `share` takes the kind (the last pair takes the rest)
//   tall      [least, spread]: a tree's height in metres, by kind
//   tint      the ground's tint over the grass texture, for meadow and forest (the level's builder reads it)
//   map       the map's colours, low and high, for meadow and forest (the map's painter reads it)
export const BIOMES = Object.freeze({
  jungle: Object.freeze({
    name: 'Jungle', wet: 0.38,
    density: Object.freeze({ water: 0, shore: 0.14, meadow: 0.26, forest: 0.84, highland: 0.3, snow: 0 }),
    trees: Object.freeze([[0.4, 'palm'], [1, 'broad']]),
    tint: Object.freeze({ meadow: [0.8, 1.0, 0.62], forest: [0.6, 0.88, 0.54] }),
    map: Object.freeze({ meadow: [[78, 146, 66], [148, 184, 92]], forest: [[28, 94, 50], [70, 130, 62]], wood: 0.32 }),
  }),
  woodland: Object.freeze({
    name: 'Woodland', wet: 0.5,
    density: Object.freeze({ water: 0, shore: 0.03, meadow: 0.1, forest: 0.62, highland: 0.16, snow: 0 }),
    trees: Object.freeze([[0.3, 'fir'], [1, 'round']]),
    tint: Object.freeze({ meadow: [1.06, 1.04, 0.86], forest: [0.82, 0.92, 0.74] }),
    map: Object.freeze({ meadow: [[104, 150, 72], [186, 190, 104]], forest: [[52, 108, 58], [112, 142, 72]], wood: 0.2 }),
  }),
  steppe: Object.freeze({
    name: 'Steppe', wet: 0.7,
    density: Object.freeze({ water: 0, shore: 0.01, meadow: 0.035, forest: 0.3, highland: 0.06, snow: 0 }),
    trees: Object.freeze([[0.65, 'shrub'], [1, 'round']]),
    tint: Object.freeze({ meadow: [1.3, 1.14, 0.72], forest: [1.02, 1.0, 0.7] }),
    map: Object.freeze({ meadow: [[176, 168, 98], [208, 198, 132]], forest: [[112, 132, 74], [152, 152, 92]], wood: 0.08 }),
  }),
});
export const BIOME = Object.freeze({
  order: Object.freeze(['jungle', 'woodland', 'steppe']), // the first is the starting biome
  home: 620, // metres round the origin that are always the starting biome
  edge: 380, // and the width of the margin over which the noise takes over
  scale: 2400, // metres: the size of the noise that chooses a biome
  cuts: Object.freeze([0.56, 0.44]), // the noise above the first is the first biome, above the second the second
});
// Round 192: the undergrowth: ferns, flowers and little bushes, for the look of the land alone (the server does not
// read it). One candidate a `grid` metres square; the chance that one grows is by cover and kind, times the biome's
// own share of that kind. A flower clump's `hue` picks its colour from the client's palette.
export const UNDERGROWTH = Object.freeze({
  grid: 3.2,
  chance: Object.freeze({
    fern: Object.freeze({ shore: 0, meadow: 0.03, forest: 0.16, highland: 0.04 }),
    flower: Object.freeze({ shore: 0.05, meadow: 0.3, forest: 0.12, highland: 0.14 }),
    bush: Object.freeze({ shore: 0.03, meadow: 0.06, forest: 0.1, highland: 0.07 }),
  }),
  biome: Object.freeze({
    jungle: Object.freeze({ fern: 1.5, flower: 0.8, bush: 1.1 }),
    woodland: Object.freeze({ fern: 1, flower: 1, bush: 1 }),
    steppe: Object.freeze({ fern: 0.2, flower: 1.2, bush: 1.3 }),
  }),
  size: Object.freeze({ fern: [0.55, 0.5], flower: [0.32, 0.22], bush: [0.6, 0.6] }), // [least, spread] radius, metres
});
const TREE_HEIGHT = Object.freeze({ fir: [5, 6], round: [5, 6], palm: [7, 6], broad: [6, 7], shrub: [1.4, 1.6] });

const imul = Math.imul;
function hash2(x, y, seed) {
  let h = imul(x | 0, 374761393) ^ imul(y | 0, 668265263) ^ imul(seed | 0, 1442695041);
  h = imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** A hash of two integers and a seed, in [0, 1). The graph and the trees draw every random choice from it. */
export const hash = hash2;

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10); // quintic: no creases along the lattice
const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function valueNoise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  return lerp(
    lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), fx),
    lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), fx),
    fy,
  );
}

/** Fractional Brownian motion in [0, 1]: `octaves` of value noise, lacunarity 2, gain 0.5, each octave rotated. */
export function fbm(x, y, seed, octaves = 5) {
  let sum = 0;
  let amplitude = 0.5;
  let total = 0;
  let px = x;
  let py = y;
  for (let o = 0; o < octaves; o += 1) {
    sum += amplitude * valueNoise(px, py, seed + o * 101);
    total += amplitude;
    amplitude *= 0.5;
    // Twice the frequency, turned by about 37 degrees so the octaves' lattices do not line up.
    [px, py] = [(px * 0.8 - py * 0.6) * 2 + 17.3, (px * 0.6 + py * 0.8) * 2 - 9.1];
  }
  return sum / total;
}

/** Ridged fBm in [0, 1]: sharp crests where the noise crosses its middle. */
export function ridged(x, y, seed, octaves = 4) {
  let sum = 0;
  let amplitude = 0.5;
  let total = 0;
  let px = x;
  let py = y;
  for (let o = 0; o < octaves; o += 1) {
    const n = 1 - Math.abs(2 * valueNoise(px, py, seed + o * 131) - 1);
    sum += amplitude * n * n;
    total += amplitude;
    amplitude *= 0.5;
    [px, py] = [(px * 0.8 - py * 0.6) * 2 + 5.7, (px * 0.6 + py * 0.8) * 2 + 3.3];
  }
  return sum / total;
}

/**
 * The landscape of a seed.
 *
 *   heightAt(x, z)   ground height in metres (below TERRAIN.waterY the ground is under water)
 *   slopeAt(x, z)    rise over run, from heights 3 m apart
 *   coverAt(x, z)    'water' | 'shore' | 'meadow' | 'forest' | 'highland' | 'snow'
 *   biomeAt(x, z)    the biome the point lies in: a key of BIOMES (round 160)
 *   treesIn(cx, cz)  the trees of chunk (cx, cz): [{ x, z, y, height, kind: 'fir' | 'round' | 'palm' | 'broad' | 'shrub', tint }]
 */
export function createTerrain(seed = 1) {
  const s = (Number(seed) | 0) || 1;

  function heightAt(x, z) {
    const continent = fbm(x / 1100, z / 1100, s + 11, 3);
    const land = smoothstep(0.34, 0.5, continent);
    const wx = x + (fbm(x / 340, z / 340, s + 23, 2) - 0.5) * 220;
    const wz = z + (fbm(x / 340 + 31.4, z / 340 - 12.7, s + 29, 2) - 0.5) * 220;
    const hills = (fbm(wx / 300, wz / 300, s + 37, 5) - 0.42) * 46;
    const mask = smoothstep(0.52, 0.72, fbm(x / 1700 + 7.7, z / 1700 - 3.1, s + 41, 2));
    const mountains = mask * ridged(wx / 520, wz / 520, s + 53, 4) * 95;
    const detail = (fbm(x / 34, z / 34, s + 61, 2) - 0.5) * 2.2;
    let h = (continent - 0.42) * 60 + land * (hills + mountains) + detail * (0.3 + 0.7 * land);
    // The start is always on dry land: a low rise around the origin that the noise still shapes.
    const r = Math.hypot(x, z);
    const homeRise = 1 - smoothstep(TERRAIN.home * 0.5, TERRAIN.home, r);
    if (homeRise > 0) h = lerp(h, Math.max(h * 0.45, 2.5) + 2, homeRise);
    return h;
  }

  function slopeAt(x, z) {
    const e = 3;
    return Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  }

  const moistureAt = (x, z) => fbm(x / 420 - 51.2, z / 420 + 18.9, s + 71, 3);

  // Round 160: the biome of a point. Round the origin it is the starting biome; further out a very low noise chooses.
  function biomeAt(x, z) {
    const home = 1 - smoothstep(BIOME.home, BIOME.home + BIOME.edge, Math.hypot(x, z));
    const n = fbm(x / BIOME.scale + 3.3, z / BIOME.scale - 8.1, s + 83, 2) + home;
    return n > BIOME.cuts[0] ? BIOME.order[0] : n > BIOME.cuts[1] ? BIOME.order[1] : BIOME.order[2];
  }

  function coverAt(x, z, h = heightAt(x, z)) {
    if (h < TERRAIN.waterY) return 'water';
    if (h < 1.6) return 'shore';
    if (h > 58) return 'snow';
    if (h > 36) return 'highland';
    return moistureAt(x, z) > BIOMES[biomeAt(x, z)].wet ? 'forest' : 'meadow';
  }

  function treesIn(cx, cz) {
    const trees = [];
    const { chunk, treeGrid } = TERRAIN;
    const per = chunk / treeGrid;
    for (let i = 0; i < per; i += 1) {
      for (let j = 0; j < per; j += 1) {
        const gx = cx * per + i;
        const gz = cz * per + j;
        const x = (gx + 0.15 + 0.7 * hash2(gx, gz, s + 301)) * treeGrid;
        const z = (gz + 0.15 + 0.7 * hash2(gx, gz, s + 302)) * treeGrid;
        const y = heightAt(x, z);
        const cover = coverAt(x, z, y);
        const biome = BIOMES[biomeAt(x, z)];
        if (hash2(gx, gz, s + 303) >= biome.density[cover]) continue;
        if (slopeAt(x, z) > 0.7) continue;
        // High ground is fir country in every biome; lower down the biome's own trees grow, by a hashed draw.
        const draw = hash2(gx, gz, s + 304);
        const kind = y > 30 ? 'fir' : biome.trees.find(([share]) => draw < share)[1];
        const [least, spread] = TREE_HEIGHT[kind];
        trees.push({
          x, z, y,
          height: least + spread * hash2(gx, gz, s + 305),
          kind,
          tint: hash2(gx, gz, s + 306),
        });
      }
    }
    return trees;
  }

  /** Round 192: the undergrowth of chunk (cx, cz): [{ x, z, y, kind: 'fern' | 'flower' | 'bush', size, hue, tint }]. */
  function undergrowthIn(cx, cz) {
    const plants = [];
    const { grid, chance, biome: share, size: sizes } = UNDERGROWTH;
    const per = Math.round(TERRAIN.chunk / grid);
    const step = TERRAIN.chunk / per;
    for (let i = 0; i < per; i += 1) {
      for (let j = 0; j < per; j += 1) {
        const gx = cx * per + i;
        const gz = cz * per + j;
        const x = (gx + 0.1 + 0.8 * hash2(gx, gz, s + 501)) * step;
        const z = (gz + 0.1 + 0.8 * hash2(gx, gz, s + 502)) * step;
        const y = heightAt(x, z);
        const cover = coverAt(x, z, y);
        if (cover === 'water' || cover === 'snow' || slopeAt(x, z) > 0.8) continue;
        const scale = share[biomeAt(x, z)] ?? share.woodland;
        // One draw against the kinds' chances end to end, so a candidate is one kind or none.
        let draw = hash2(gx, gz, s + 503);
        const kind = ['fern', 'flower', 'bush'].find((name) => { draw -= chance[name][cover] * scale[name]; return draw < 0; });
        if (!kind) continue;
        const [least, spread] = sizes[kind];
        plants.push({ x, z, y, kind, size: least + spread * hash2(gx, gz, s + 504), hue: hash2(gx, gz, s + 505), tint: hash2(gx, gz, s + 506) });
      }
    }
    return plants;
  }

  return Object.freeze({ seed: s, waterY: TERRAIN.waterY, heightAt, slopeAt, coverAt, biomeAt, biomes: BIOMES, moistureAt, treesIn, undergrowthIn });
}
