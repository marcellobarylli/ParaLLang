import { BoxGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Matrix4, Vector3 } from 'three';
import { M, chain, gable, taperedTube } from './geometry.js';
import { STONE, box, prangGeometry } from './temple.js';
import { canopy } from './vegetation.js';
import { PALETTE, hexToRgb } from '../palette.js';

// The dead branch of the lore: the roots are the strings that pulled two worlds together and
// now strangle the temple. Every root carries a strand that glows with the corruption level.
// Mushrooms grow where the roots meet the ground, recycling the dead reality.

const I = new Matrix4();
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UP = new Vector3(0, 1, 0);
const STEM = hexToRgb(PALETTE.mushroomStem);
const CAP = hexToRgb(PALETTE.mushroomCap);

/** One root along `points`, with its glowing string. */
export function root(b, points, r0, r1, segments = 16, key = 'root', radial = 5) {
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  b.add(key, taperedTube(curve, segments, radial, r0, r1, 3), { uv: 'keep', jitter: 0.06, moss: 0.25, grime: 0.2 });
  const n = points.length;
  const strand = points.map((p, i) => {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const tangent = new Vector3().subVectors(next, prev).normalize();
    const side = new Vector3().crossVectors(tangent, UP);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    const out = new Vector3().crossVectors(side.normalize(), tangent).normalize();
    if (out.y < 0) out.negate();
    const r = r0 + (r1 - r0) * (i / (n - 1));
    return p.clone().addScaledVector(out, r * 0.85);
  });
  b.add('rootGlow', taperedTube(new CatmullRomCurve3(strand, false, 'centripetal'), segments, 3, r0 * 0.2, r1 * 0.3, 2), {
    uv: 'keep',
    jitter: 0,
  });
  return curve;
}

export function mushrooms(b, rng, x, z, count) {
  for (let i = 0; i < count; i++) {
    const px = x + rng.range(-0.7, 0.7);
    const pz = z + rng.range(-0.7, 0.7);
    const h = rng.range(0.18, 0.45);
    const r = h * rng.range(0.6, 1.1);
    b.add('plain', new CylinderGeometry(r * 0.25, r * 0.3, h, 5, 1), { uv: 'keep', color: STEM, matrix: M(px, h / 2, pz) });
    b.add('plain', new ConeGeometry(r, r * 0.6, 6, 1), { uv: 'keep', color: CAP, flat: true, matrix: M(px, h + r * 0.25, pz, rng.range(0, 6)) });
  }
}

function fallenBlocks(b, rng, x, z, rMin, rMax, count) {
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(rMin, rMax);
    const s = rng.range(0.6, 1.4);
    b.add(rng.chance(0.3) ? 'relief' : 'stone', UNIT_BOX, {
      ...STONE,
      moss: 0.6,
      matrix: M(x + Math.cos(a) * d, s * 0.32, z + Math.sin(a) * d, rng.range(0, 3), s * rng.range(1, 1.6), s * 0.75, s, rng.range(-0.3, 0.3), rng.range(-0.3, 0.3)),
    });
  }
}

/** Distance from the centre to the edge of a square of half-size h, along direction (dx, dz). */
const squareEdge = (h, dx, dz) => h / Math.max(Math.abs(dx), Math.abs(dz));

/** A Ta Prohm-style shrine: collapsed tower, a fig growing out of it, roots over every wall. */
export function buildShrine(b, rng, { x, z }) {
  box(b, 'laterite', I, x, 0, z, 9, 1.2, 9, { moss: 0.5 });
  box(b, 'stone', I, x, 1.2, z, 8.4, 0.3, 8.4, { moss: 0.5 });
  box(b, 'relief', I, x, 1.5, z, 5, 4.2, 5, { moss: 0.45 });
  box(b, 'stone', I, x, 5.7, z, 5.6, 0.4, 5.6, { moss: 0.5 });
  b.add('stone', prangGeometry(8, 2, 6, 0.55), { ...STONE, moss: 0.5, matrix: M(x, 6.1, z, 0.3, 1, 1, 1, 0.05, -0.08) });
  for (let k = 0; k < 3; k++) {
    const F = M(x, 1.5, z, (k * Math.PI) / 2);
    box(b, 'stone', F, 0, 0, 2.9, 2.2, 3.2, 1.2, { moss: 0.4 });
    b.add('relief', gable(1.2, 2.6, 1.3), { ...STONE, moss: 0.4, matrix: chain(F, M(0, 3.2, 2.9, Math.PI / 2)) });
    box(b, 'stone', F, 0, 0, 3.52, 1.1, 2.2, 0.05, { color: [0.16, 0.13, 0.11], moss: 0, grime: 0 });
  }
  // A fallen inscription slab leaning against the platform
  box(b, 'inscription', I, x + 5.2, 0, z - 1.5, 1.4, 2.4, 0.35, { uvScale: 0.32, moss: 0.25 }, 0.9);
  fallenBlocks(b, rng, x, z, 4.8, 9, 16);

  // The fig, growing out of the broken tower
  const trunkBase = new Vector3(x + 0.3, 9.2, z - 0.2);
  const crown = new Vector3(x + 1.6, 16, z + 0.8);
  b.add('root', taperedTube(new CatmullRomCurve3([trunkBase, new Vector3(x + 0.6, 12.5, z), crown]), 6, 6, 1.0, 0.45, 3), {
    uv: 'keep',
    moss: 0.2,
  });
  canopy(b, rng, crown.x, crown.y + 1.5, crown.z, 5.5, 3);

  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    const at = (dist, y) => new Vector3(x + dx * dist, y, z + dz * dist);
    const cornice = squareEdge(2.85, dx, dz);
    const cella = squareEdge(2.5, dx, dz);
    const plat = squareEdge(4.5, dx, dz);
    const far = plat + rng.range(1.6, 3.2);
    const pts = [
      at(0.5, 9.4),
      at(1.8, 8.4),
      at(cornice + 0.1, 6.35),
      at(cella + 0.4, 3.6),
      at(plat + 0.25, 1.55),
      at(plat + 1.0, 0.2),
      new Vector3(x + dx * far - dz * rng.range(-1.5, 1.5), 0.05, z + dz * far + dx * rng.range(-1.5, 1.5)),
    ];
    root(b, pts, rng.range(0.3, 0.45), 0.1, 13);
    if (rng.chance(0.7)) mushrooms(b, rng, x + dx * (plat + 1.2), z + dz * (plat + 1.2), rng.int(2, 4));
  }
}

/** A fig inside the enclosure wall whose roots spill over the wall's top and down its face. */
export function buildWallFig(b, rng, { x, z }) {
  const base = new Vector3(x, 0, z);
  const crown = new Vector3(x + rng.range(-1, 1), 13, z - 1.5);
  b.add('root', taperedTube(new CatmullRomCurve3([base, new Vector3(x, 6, z - 0.4), crown]), 6, 6, 1.1, 0.5, 4), { uv: 'keep', moss: 0.3 });
  canopy(b, rng, crown.x, crown.y + 1.5, crown.z, 5, 3);
  for (let i = 0; i < 7; i++) {
    const off = rng.range(-2.6, 2.6);
    const spread = rng.range(1.1, 1.8);
    const pts = [
      new Vector3(x + off * 0.2, 4.8, z + 0.2),
      new Vector3(x + off * 0.7, 4.3, 49.2),
      new Vector3(x + off, 4.25, 50.8),
      new Vector3(x + off * 1.1, 2.5, 51.15),
      new Vector3(x + off * spread, 0.25, 52.1),
      new Vector3(x + off * spread * 1.3, 0.05, 54.2),
    ];
    root(b, pts, rng.range(0.22, 0.34), 0.08, 10);
    if (rng.chance(0.5)) mushrooms(b, rng, x + off * spread, 52.4, rng.int(1, 3));
  }
  for (let i = 0; i < 4; i++) {
    const a = rng.range(Math.PI * 0.9, Math.PI * 2.1);
    const pts = [
      new Vector3(x, 2.2, z),
      new Vector3(x + Math.cos(a) * 1.2, 0.8, z + Math.sin(a) * 1.2),
      new Vector3(x + Math.cos(a) * 3, 0.05, z + Math.sin(a) * 3),
    ];
    root(b, pts, 0.4, 0.12, 6);
  }
}

/** An inscribed stele beside the approach: the original language, in stone. */
export function buildStele(b, x, z, ry) {
  box(b, 'laterite', I, x, 0, z, 2.2, 0.5, 1.2, { moss: 0.4 }, ry);
  box(b, 'inscription', I, x, 0.5, z, 1.6, 2.8, 0.45, { uvScale: 0.3, moss: 0.15 }, ry);
  b.add('stone', gable(0.5, 1.8, 0.6), { ...STONE, matrix: M(x, 3.3, z, ry + Math.PI / 2) });
}

/** A guardian lion on its pedestal, in a handful of boxes. */
export function buildLion(b, x, z, ry) {
  const F = M(x, 0, z, ry);
  box(b, 'laterite', F, 0, 0, 0, 1.4, 0.6, 2, { moss: 0.4 });
  box(b, 'stone', F, 0, 0.6, -0.25, 1, 0.9, 1.3, { moss: 0.3 });
  box(b, 'stone', F, 0, 0.6, 0.45, 0.9, 1.6, 0.7, { moss: 0.3 });
  box(b, 'stone', F, 0, 1.9, 0.75, 0.75, 0.7, 0.7, { moss: 0.2 });
  box(b, 'stone', F, 0, 1.95, 1.15, 0.45, 0.35, 0.2, { moss: 0.1 });
}

export function buildRubble(b, rng) {
  // Scattered blocks along the enclosure and the approach
  const spots = [
    [-44, 47],
    [42, 46],
    [-50, -20],
    [50, 18],
    [-14, 54],
    [16, 53.5],
    [30, -50],
  ];
  for (const [x, z] of spots) fallenBlocks(b, rng, x, z, 0.5, 3.5, rng.int(3, 6));
}
