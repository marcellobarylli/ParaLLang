import { CatmullRomCurve3, CircleGeometry, ConeGeometry, IcosahedronGeometry, OctahedronGeometry, PlaneGeometry, Vector3 } from 'three';
import { M, faceUp, stripGeometry, taperedTube } from './geometry.js';
import { LAYOUT, heightAt, isBlocked, isWater } from './layout.js';
import { PALETTE, hexToRgb } from '../palette.js';
import { valueNoise3 } from '../util/random.js';

const BROWN = [0.95, 0.68, 0.42];

/** A palm frond: a V-folded strip that arcs out and droops, alpha-cut by the frond texture. */
function frondGeometry(origin, yaw, length, rise, droop, width) {
  const dir = new Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  const side = new Vector3(-dir.z, 0, dir.x);
  const rows = [];
  const segs = 4;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const spine = origin
      .clone()
      .addScaledVector(dir, length * t)
      .add(new Vector3(0, length * (rise * t - droop * t * t), 0));
    const w = (width / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.7);
    const fold = new Vector3(0, -w * 0.28, 0);
    rows.push([
      spine.clone().addScaledVector(side, -w).add(fold),
      spine.clone().add(new Vector3(0, w * 0.05, 0)),
      spine.clone().addScaledVector(side, w).add(fold),
    ]);
  }
  const g = stripGeometry(rows, [0, 0.5, 1]);
  faceUp(g);
  return g;
}

export function palm(b, rng, x, z, opts = {}) {
  const y = (opts.ground ?? heightAt)(x, z);
  const height = opts.height ?? rng.range(7, 11);
  const lean = opts.lean ?? rng.range(0.04, 0.22);
  const yaw = opts.yaw ?? rng.range(0, Math.PI * 2);
  const ldx = Math.cos(yaw);
  const ldz = Math.sin(yaw);
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    const off = lean * height * Math.pow(t, 1.6);
    pts.push(new Vector3(x + ldx * off, y + height * t, z + ldz * off));
  }
  const curve = new CatmullRomCurve3(pts);
  b.add('bark', taperedTube(curve, 6, 5, 0.38, 0.2, height / 1.4), { uv: 'keep', jitter: 0.04, grime: 0.4, grimeHeight: 2 });
  const top = pts[pts.length - 1];
  b.add('bark', new OctahedronGeometry(0.42, 0), { uv: 'keep', color: [0.75, 0.7, 0.5], matrix: M(top.x, top.y, top.z, 0, 1, 0.8, 1) });

  const fronds = opts.fronds ?? rng.int(7, 9);
  const tint = [rng.range(0.85, 1.08), rng.range(0.92, 1.08), rng.range(0.85, 1)];
  for (let k = 0; k < fronds; k++) {
    const a = (k / fronds) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const rise = rng.range(0.15, 0.6);
    const g = frondGeometry(top, a, rng.range(3.2, 4.4), rise, 0.55 + 0.45 * (1 - rise), rng.range(1.5, 1.9));
    b.add('frond', g, { uv: 'keep', jitter: 0.05, color: tint });
  }
  for (let k = 0; k < 2; k++) {
    const g = frondGeometry(top.clone().add(new Vector3(0, -0.3, 0)), rng.range(0, 6.28), rng.range(2.6, 3.2), -0.6, 0.5, 1.2);
    b.add('frond', g, { uv: 'keep', color: BROWN });
  }
  for (let k = 0; k < rng.int(2, 4); k++) {
    const a = rng.range(0, 6.28);
    b.add('plain', new OctahedronGeometry(0.2, 0), {
      uv: 'keep',
      color: [0.42, 0.45, 0.2],
      matrix: M(top.x + Math.cos(a) * 0.4, top.y - 0.45, top.z + Math.sin(a) * 0.4),
    });
  }
}

/** A lumpy low-poly canopy made of a few flattened, displaced icosahedra. */
export function canopy(b, rng, x, y, z, radius, blobs = 3, squash = 0.62) {
  const tint = [rng.range(0.8, 1.05), rng.range(0.85, 1.1), rng.range(0.8, 1)];
  for (let i = 0; i < blobs; i++) {
    const g = new IcosahedronGeometry(radius * rng.range(0.6, 0.9), 0);
    const pos = g.attributes.position;
    const seed = rng.int(0, 9999);
    for (let k = 0; k < pos.count; k++) {
      const vx = pos.getX(k);
      const vy = pos.getY(k);
      const vz = pos.getZ(k);
      const s = 0.8 + 0.45 * valueNoise3(vx * 0.9 + 5, vy * 0.9, vz * 0.9, seed);
      pos.setXYZ(k, vx * s, vy * s * squash, vz * s);
    }
    const ox = rng.range(-0.6, 0.6) * radius;
    const oz = rng.range(-0.6, 0.6) * radius;
    const oy = rng.range(-0.25, 0.25) * radius;
    b.add('leaves', g, { uvScale: 0.25, flat: true, jitter: 0.12, color: tint, matrix: M(x + ox, y + oy, z + oz, rng.range(0, 6)) });
  }
}

export function jungleTree(b, rng, x, z, opts = {}) {
  const y = (opts.ground ?? heightAt)(x, z);
  const h = rng.range(...(opts.height ?? [9, 17]));
  const bend = new Vector3(rng.range(-1, 1), 0, rng.range(-1, 1));
  const curve = new CatmullRomCurve3([
    new Vector3(x, y - 0.3, z),
    new Vector3(x + bend.x * 0.5, y + h * 0.5, z + bend.z * 0.5),
    new Vector3(x + bend.x, y + h, z + bend.z),
  ]);
  b.add('root', taperedTube(curve, 4, 5, rng.range(0.5, 0.8), 0.25, h / 3), { uv: 'keep', grime: 0.3, color: [0.85, 0.82, 0.78] });
  canopy(b, rng, x + bend.x, y + h + 1, z + bend.z, rng.range(3.5, 5.5), rng.int(2, 3));
  if (rng.chance(0.5)) canopy(b, rng, x + bend.x * 0.5, y + h * 0.62, z + bend.z * 0.5, rng.range(2.2, 3), 1);
}

export function bush(b, rng, x, z, ground = heightAt) {
  canopy(b, rng, x, ground(x, z) + 0.6, z, rng.range(1, 1.8), rng.int(1, 2));
}

export function tuft(b, rng, x, z, ground = heightAt) {
  const y = ground(x, z);
  const s = rng.range(0.7, 1.3);
  const a = rng.range(0, Math.PI);
  for (const r of [0, Math.PI / 2]) {
    const g = new PlaneGeometry(1.3 * s, 0.9 * s);
    g.translate(0, 0.45 * s, 0);
    b.add('tuft', g, { uv: 'keep', jitter: 0.08, matrix: M(x, y, z, a + r) });
  }
}

/** Lily pads and a few lotus flowers on the moat. Not mirrored: they float on the surface. */
export function lilies(b, rng, count) {
  const pad = hexToRgb(PALETTE.lily);
  const lotus = hexToRgb(PALETTE.lotus);
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 40; tries++) {
    // cluster near the causeway, where the camera passes
    const x = rng.range(-40, 40);
    const z = rng.chance(0.75) ? rng.range(56.5, 71.5) : rng.range(-71.5, 71.5);
    if (!isWater(x, z) || isWater(x, z) !== isWater(x + 0.8, z)) continue;
    if (Math.abs(x) < LAYOUT.causewayHalf + 1) continue;
    const r = rng.range(0.35, 0.8);
    b.add('plain', new CircleGeometry(r, 7, 0.4, Math.PI * 1.85), {
      uv: 'keep',
      color: pad.map((c) => c * rng.range(0.8, 1.15)),
      matrix: M(x, LAYOUT.waterY + 0.03, z, rng.range(0, 6), 1, 1, 1, -Math.PI / 2),
    });
    if (rng.chance(0.15)) {
      b.add('plain', new ConeGeometry(0.22, 0.4, 5, 1), { uv: 'keep', color: lotus, flat: true, matrix: M(x, LAYOUT.waterY + 0.25, z, 0, 1, 1, 1, Math.PI) });
    }
    placed++;
  }
}

/** Rejection-sample points in a zone that are clear of structures and water. */
function scatter(rng, count, sample, margin = 0, spacing = 0, taken = []) {
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const [x, z] = sample();
    if (isBlocked(x, z, margin)) continue;
    if (spacing > 0 && [...taken, ...out].some(([px, pz]) => (px - x) ** 2 + (pz - z) ** 2 < spacing * spacing)) continue;
    out.push([x, z]);
  }
  taken.push(...out);
  return out;
}

export function buildVegetation(b, surface, rng) {
  const taken = [];
  const ring = (min, max) => () => {
    for (;;) {
      const x = rng.range(-max, max);
      const z = rng.range(-max, max);
      const d = Math.max(Math.abs(x), Math.abs(z));
      if (d >= min && d <= max) return [x, z];
    }
  };

  // Palms: lining the inner causeway, around the pools, on the banks and by the landing
  const palmZones = [
    [10, () => [rng.sign() * rng.range(5.5, 9), rng.range(34, 47)]],
    [6, () => [rng.sign() * rng.range(10, 30), rng.range(41, 47)]],
    [6, () => [rng.sign() * rng.range(29, 34), rng.range(26, 42)]],
    [14, () => [rng.sign() * rng.range(9, 34), rng.range(74, 98)]],
    [12, () => [rng.sign() * rng.range(10, 24), rng.range(98, 150)]],
    [8, ring(51.8, 55)],
    [9, ring(30, 47.5)],
    [8, ring(73.5, 80)],
  ];
  for (const [count, sample] of palmZones) for (const [x, z] of scatter(rng, count, sample, 0.5, 3.2, taken)) palm(b, rng, x, z);

  // The jungle wall beyond the moat, leaving the approach open
  const jungle = scatter(
    rng,
    85,
    () => {
      // keep an avenue open along the approach
      for (;;) {
        const [x, z] = ring(80, 165)();
        if (!(Math.abs(x) < 20 + Math.max(0, z - 100) * 0.25 && z > 70)) return [x, z];
      }
    },
    1,
    7,
    taken,
  );
  for (const [x, z] of jungle) jungleTree(b, rng, x, z);
  for (const [x, z] of scatter(rng, 10, () => [rng.range(-47, 47), rng.range(-47, -28)], 1, 8, taken)) jungleTree(b, rng, x, z);

  for (const [x, z] of scatter(rng, 55, ring(51.6, 110), 0.3, 2.5, taken)) bush(b, rng, x, z);
  for (const [x, z] of scatter(rng, 16, () => [rng.sign() * rng.range(8, 26), rng.range(92, 150)], 0.3, 4, taken)) bush(b, rng, x, z);
  for (const [x, z] of scatter(rng, 20, ring(27, 47), 0.3, 2.5, taken)) bush(b, rng, x, z);

  // Grass tufts on the banks, along the causeway and around the ruins
  const tuftZones = [
    [90, ring(56.2, 59)],
    [70, ring(72.2, 78)],
    [90, () => [rng.sign() * rng.range(4.4, 12), rng.range(28, 150)]],
    [50, () => [rng.range(-48, -28), rng.range(-8, 16)]],
    [60, ring(28, 48)],
  ];
  for (const [count, sample] of tuftZones) for (const [x, z] of scatter(rng, count, sample, 0, 0)) tuft(surface, rng, x, z);

  lilies(surface, rng, 90);
}
