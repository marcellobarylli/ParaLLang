import { BufferGeometry, Float32BufferAttribute } from 'three';
import { LAYOUT, heightAt, isWater } from './layout.js';
import { smoothstep, valueNoise2 } from '../util/random.js';

// Ground as a grid of cells: fine near the temple (so per-vertex fog and lighting stay smooth
// and affine warping is visible but not wild), coarse out to the horizon. Water cells are left
// open: the mirrored world below shows through them, under a translucent water surface.

const DIRT = [1.3, 0.8, 1.02];

function groundColor(x, _y, z) {
  const ax = Math.abs(x);
  const d = Math.max(ax, Math.abs(z));
  let dirt = smoothstep(0.62, 0.82, valueNoise2(x * 0.06, z * 0.06, 0, 3)) * 0.6;
  if (ax < 10 && z > 24) dirt = Math.max(dirt, (0.8 - smoothstep(4, 10, ax) * 0.7) * (1 - smoothstep(130, 160, z)));
  if (ax < 31 && Math.abs(z) < 28) dirt = Math.max(dirt, 0.5);
  const shade = 0.88 + 0.24 * valueNoise2(x * 0.15, z * 0.15, 0, 4);
  const jungle = smoothstep(74, 92, d);
  const base = [1 - 0.3 * jungle, 1 - 0.22 * jungle, 1 - 0.36 * jungle];
  return [
    (base[0] + (DIRT[0] - base[0]) * dirt) * shade,
    (base[1] + (DIRT[1] - base[1]) * dirt) * shade,
    (base[2] + (DIRT[2] - base[2]) * dirt) * shade,
  ];
}

function pushQuad(out, a, b, c, d) {
  out.push(...a, ...b, ...c, ...a, ...c, ...d);
}

function geometryFrom(positions) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Ground, water and banks for any level. cfg: { grid, heightAt, isWater, color, key, waterY, waterKey, bank }.
 * grid: { fine, fineHalf, fineFront, avenueHalf, coarse, coarseHalf }. Fine cells cover the
 * square of fineHalf plus an avenue of avenueHalf out to fineFront along +z. Heights must be
 * zero on the fine region's edge so the coarse cells meet it without cracks.
 */
export function buildGround(surface, props, cfg) {
  const { fine, fineHalf, fineFront, avenueHalf, coarse, coarseHalf } = cfg.grid;
  const { heightAt: h, isWater: wet = () => false, color, key = 'ground', waterY: W = 0, waterKey = 'water', bank = { moss: 0.6, color: [0.9, 0.85, 0.8] } } = cfg;
  const ground = [];
  const water = [];
  const banks = [];
  const v = (x, z) => [x, h(x, z), z];

  const isFine = (x, z) =>
    x >= -fineHalf && x < fineHalf && z >= -fineHalf && (z < fineHalf || (z < fineFront && Math.abs(x + fine / 2) < avenueHalf));
  for (let x = -fineHalf; x < fineHalf; x += fine) {
    for (let z = -fineHalf; z < fineFront; z += fine) {
      if (!isFine(x, z)) continue;
      const cx = x + fine / 2;
      const cz = z + fine / 2;
      if (!wet(cx, cz)) {
        pushQuad(ground, v(x, z), v(x, z + fine), v(x + fine, z + fine), v(x + fine, z));
        continue;
      }
      pushQuad(water, [x, W, z], [x, W, z + fine], [x + fine, W, z + fine], [x + fine, W, z]);
      // A laterite bank on every edge that meets land, facing into the water.
      const edges = [
        [-1, 0, [x, z + fine], [x, z]],
        [1, 0, [x + fine, z], [x + fine, z + fine]],
        [0, -1, [x, z], [x + fine, z]],
        [0, 1, [x + fine, z + fine], [x, z + fine]],
      ];
      for (const [dx, dz, p, q] of edges) {
        if (wet(cx + dx * fine, cz + dz * fine)) continue;
        pushQuad(banks, [q[0], W - 0.05, q[1]], [q[0], 0, q[1]], [p[0], 0, p[1]], [p[0], W - 0.05, p[1]]);
      }
    }
  }
  for (let x = -coarseHalf; x < coarseHalf; x += coarse) {
    for (let z = -coarseHalf; z < coarseHalf; z += coarse) {
      if (isFine(x, z)) continue;
      pushQuad(ground, v(x, z), v(x, z + coarse), v(x + coarse, z + coarse), v(x + coarse, z));
    }
  }

  surface.add(key, geometryFrom(ground), { uvScale: 1 / 8, jitter: 0.03, color });
  if (water.length) surface.add(waterKey, geometryFrom(water), { uvScale: 1 / 8, jitter: 0, unshaded: true });
  if (banks.length) props.add('laterite', geometryFrom(banks), { uvScale: 0.25, jitter: 0.05, ...bank });
}

/** The Angkor Wat site: moat, pools and the avenue. */
export function buildTerrain(surface, props) {
  buildGround(surface, props, { grid: LAYOUT.grid, heightAt, isWater, color: groundColor, waterY: LAYOUT.waterY });
}
