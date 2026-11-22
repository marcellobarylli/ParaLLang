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
 *   biomeAt(x, z)    'water' | 'shore' | 'meadow' | 'forest' | 'highland' | 'snow'
 *   treesIn(cx, cz)  the trees of chunk (cx, cz): [{ x, z, y, height, kind: 'fir' | 'round', tint }]
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

  function biomeAt(x, z, h = heightAt(x, z)) {
    if (h < TERRAIN.waterY) return 'water';
    if (h < 1.6) return 'shore';
    if (h > 58) return 'snow';
    if (h > 36) return 'highland';
    return moistureAt(x, z) > 0.5 ? 'forest' : 'meadow';
  }

  // How likely a tree candidate is to stand, by biome.
  const DENSITY = { water: 0, shore: 0.03, meadow: 0.1, forest: 0.62, highland: 0.16, snow: 0 };

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
        const biome = biomeAt(x, z, y);
        if (hash2(gx, gz, s + 303) >= DENSITY[biome]) continue;
        if (slopeAt(x, z) > 0.7) continue;
        const cold = y > 30 || hash2(gx, gz, s + 304) < 0.3;
        trees.push({
          x, z, y,
          height: 5 + 6 * hash2(gx, gz, s + 305),
          kind: cold ? 'fir' : 'round',
          tint: hash2(gx, gz, s + 306),
        });
      }
    }
    return trees;
  }

  return Object.freeze({ seed: s, waterY: TERRAIN.waterY, heightAt, slopeAt, biomeAt, moistureAt, treesIn });
}
