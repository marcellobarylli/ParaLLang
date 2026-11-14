import { smoothstep, valueNoise2 } from '../util/random.js';

// The site plan, in world units (about 2 m each). The temple faces +z, the way Angkor Wat faces
// west: the visitor approaches along the causeway from +z, crosses the moat, passes the
// entrance gate (gopura) and walks between the reflecting pools to the five towers.

export const LAYOUT = {
  waterY: -0.7,
  moatOuter: 72,
  moatInner: 56,
  wall: 50,
  causewayHalf: 4,
  pools: [
    { x0: 12, x1: 28, z0: 28, z1: 40 },
    { x0: -28, x1: -12, z0: 28, z1: 40 },
  ],
  shrine: { x: -38, z: 4 },
  wallFigs: [
    { x: 31, z: 47 },
    { x: -33, z: 47 },
  ],
  grid: { fine: 4, fineHalf: 96, fineFront: 160, coarse: 32, coarseHalf: 480 },
};

const inRect = (x, z, r, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

/** Water at a point: the moat ring (minus the causeway embankment) and the two pools. */
export function isWater(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const inMoat =
    ax < LAYOUT.moatOuter && az < LAYOUT.moatOuter && !(ax < LAYOUT.moatInner && az < LAYOUT.moatInner);
  const causeway = ax < LAYOUT.causewayHalf && z > 0;
  if (inMoat && !causeway) return true;
  return LAYOUT.pools.some((p) => inRect(x, z, p));
}

/** Ground height. Flat on the temple grounds, rolling jungle floor beyond. */
export function heightAt(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  if (d <= 100) return 0;
  const avenue = z > 0 ? smoothstep(32, 48, Math.abs(x)) : 1; // flat avenue; zero at the fine-grid edge
  return smoothstep(100, 150, d) * avenue * (valueNoise2(x * 0.03, z * 0.03, 0, 9) * 6 - 1.5);
}

const BLOCKED = [
  { x0: -29, x1: 29, z0: -26, z1: 28 }, // temple and its stairs
  { x0: -9, x1: 9, z0: 27, z1: 34 }, // terrace of honour
  { x0: -5, x1: 5, z0: 27, z1: 92 }, // causeways
  { x0: -9, x1: 9, z0: 81, z1: 91 }, // landing
  { x0: -23, x1: 23, z0: 45, z1: 55 }, // gopura
  { x0: 19, x1: 29, z0: 41, z1: 49 }, // libraries
  { x0: -29, x1: -19, z0: 41, z1: 49 },
  { x0: -44, x1: -32, z0: -2, z1: 10 }, // ruined shrine
  { x0: 7, x1: 12, z0: 83, z1: 89 }, // stele
];

/** True where nothing should be planted. */
export function isBlocked(x, z, margin = 0) {
  if (isWater(x, z)) return true;
  if (BLOCKED.some((r) => inRect(x, z, r, margin))) return true;
  if (LAYOUT.pools.some((p) => inRect(x, z, p, 1 + margin))) return true;
  const ax = Math.abs(x);
  const az = Math.abs(z);
  const w = LAYOUT.wall;
  const nearWall = (ax < w + 1.6 + margin && az < w + 1.6 + margin) && (ax > w - 1.6 - margin || az > w - 1.6 - margin);
  if (nearWall) return true;
  // banks: keep a step back from the water's edge
  for (const [dx, dz] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]]) if (isWater(x + dx, z + dz)) return true;
  return false;
}
