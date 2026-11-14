import { BoxGeometry, ConeGeometry, CylinderGeometry, LatheGeometry, Matrix4, Vector2 } from 'three';
import { M, chain, gable } from './geometry.js';
import { LAYOUT } from './layout.js';

// Angkor Wat, simplified to PS1 polygon counts: three stepped tiers with galleries, a
// quincunx of five lotus-bud towers (prangs), the entrance gopura in the enclosure wall,
// the naga causeway over the moat, the libraries and the terrace.

export const STONE = { uvScale: 0.25, jitter: 0.045, grime: 0.55, grimeHeight: 3.5, moss: 0.3 };
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const I = new Matrix4();
const DOOR = [0.16, 0.13, 0.11];

/** A box with its base at y0. */
export function box(b, key, parent, x, y0, z, w, h, d, opts = {}, ry = 0) {
  b.add(key, UNIT_BOX, { ...STONE, ...opts, matrix: chain(parent, M(x, y0 + h / 2, z, ry, w, h, d)) });
}

/** Lotus-bud tower profile, lathed with 8 sides. `truncate` < 1 gives a collapsed top. */
export function prangGeometry(height, radius, tiers = 6, truncate = 1) {
  const pts = [];
  const P = (r, y) => pts.push(new Vector2(Math.max(r, 0.001), y));
  P(radius * 1.05, 0);
  P(radius, height * 0.04);
  P(radius, height * 0.26);
  P(radius * 1.14, height * 0.27);
  P(radius * 1.14, height * 0.31);
  let y = height * 0.31;
  const tierH = (height * 0.56) / tiers;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = radius * (1.02 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.8))) * Math.pow(1 - t, 0.75);
    P(r * 0.84, y);
    P(r * 0.84, y + tierH * 0.25);
    P(r, y + tierH * 0.45);
    P(r * 0.95, y + tierH * 0.9);
    y += tierH;
  }
  P(radius * 0.16, y);
  P(radius * 0.2, y + height * 0.03);
  P(0.001, height);
  let profile = pts;
  if (truncate < 1) {
    const cut = height * truncate;
    profile = pts.filter((p) => p.y <= cut);
    const last = profile[profile.length - 1];
    profile.push(new Vector2(last.x * 0.7, last.y + 0.05), new Vector2(0.001, last.y + 0.1));
  }
  return new LatheGeometry(profile, 8, Math.PI / 8);
}

/** A prang on its plinth, with a porch and pediment on each side. Returns the top height. */
export function prang(b, x, y0, z, height, radius, opts = {}) {
  const base = radius * 2.3;
  const style = opts.style ?? {};
  const plinthKey = opts.plinth ?? 'relief';
  box(b, 'laterite', I, x, y0, z, base * 1.1, 0.5, base * 1.1, style);
  box(b, plinthKey, I, x, y0 + 0.5, z, base, height * 0.12, base, style);
  box(b, 'stone', I, x, y0 + 0.5 + height * 0.12, z, base * 1.08, 0.35, base * 1.08, style);
  const ty = y0 + 0.85 + height * 0.12;
  b.add('stone', prangGeometry(height, radius, 6, opts.truncate ?? 1), {
    ...STONE,
    moss: 0.18,
    grime: 0.25,
    ...style,
    matrix: M(x, ty, z, 0, 1, 1, 1, opts.tiltX ?? 0, opts.tiltZ ?? 0),
  });
  if (opts.porches !== false) {
    for (let k = 0; k < 4; k++) {
      const F = M(x, ty, z, (k * Math.PI) / 2);
      const pz = radius * 0.95;
      box(b, 'stone', F, 0, 0, pz, radius * 0.95, height * 0.2, radius * 0.7, style);
      b.add(plinthKey, gable(radius * 0.7, radius * 1.15, radius * 0.75), {
        ...STONE,
        ...style,
        matrix: chain(F, M(0, height * 0.2, pz, Math.PI / 2)),
      });
      box(b, 'stone', F, 0, 0, pz + radius * 0.36, radius * 0.45, height * 0.14, 0.05, { color: DOOR, moss: 0, grime: 0 });
    }
  }
  return ty + height;
}

/** Stairs climbing from z = back + run (bottom) to z = back (top), in frame F. */
export function stairs(b, F, x, y0, back, width, rise, run, steps) {
  const depth = run / steps;
  for (let i = 0; i < steps; i++) {
    box(b, 'stone', F, x, y0, back + (i + 0.5) * depth, width, (rise * (steps - i)) / steps, depth, { moss: 0.15 });
  }
  for (const s of [-1, 1]) {
    const cx = x + s * (width / 2 + 0.35);
    box(b, 'stone', F, cx, y0, back + run * 0.25, 0.7, rise + 0.3, run * 0.5);
    box(b, 'stone', F, cx, y0, back + run * 0.75, 0.7, rise * 0.5 + 0.3, run * 0.5);
  }
}

function platform(b, y0, hx, hz, h) {
  box(b, 'laterite', I, 0, y0, 0, hx * 2 + 1.2, h * 0.18, hz * 2 + 1.2);
  box(b, 'stone', I, 0, y0 + h * 0.18, 0, hx * 2 + 0.6, h * 0.1, hz * 2 + 0.6);
  box(b, 'relief', I, 0, y0 + h * 0.28, 0, hx * 2, h * 0.57, hz * 2);
  box(b, 'stone', I, 0, y0 + h * 0.85, 0, hx * 2 + 0.7, h * 0.15, hz * 2 + 0.7);
}

/** Each side of a rectangle as a frame: local x runs along the side, local +z points out. */
function sides(hx, hz) {
  return [
    { F: M(0, 0, 0, 0), a: hx, c: hz },
    { F: M(0, 0, 0, Math.PI), a: hx, c: hz },
    { F: M(0, 0, 0, Math.PI / 2), a: hz, c: hx },
    { F: M(0, 0, 0, -Math.PI / 2), a: hz, c: hx },
  ];
}

function entrancePavilion(b, F, c, y, depth, height, width) {
  const zc = c - depth / 2;
  box(b, 'stone', F, 0, y, zc, width, height + 0.8, depth + 1.2);
  b.add('roof', gable(depth + 2.4, width + 0.6, 2.6), { ...STONE, moss: 0.35, matrix: chain(F, M(0, y + height + 0.8, zc, Math.PI / 2)) });
  b.add('relief', gable(0.4, width * 0.86, 2.3), { ...STONE, matrix: chain(F, M(0, y + height + 0.8, c + 0.8, Math.PI / 2)) });
  b.add('relief', gable(0.4, width * 0.6, 1.8), { ...STONE, matrix: chain(F, M(0, y + height + 1.8, c + 0.62, Math.PI / 2)) });
  box(b, 'stone', F, 0, y, c + 0.62, width * 0.34, height * 0.85, 0.06, { color: DOOR, moss: 0, grime: 0 });
  for (const s of [-1, 1]) {
    box(b, 'inscription', F, s * width * 0.24, y, c + 0.68, 0.4, height * 0.92, 0.3, { uvScale: 0.4, moss: 0.05 });
  }
}

function cornerPavilion(b, x, y, z, size, height) {
  box(b, 'stone', I, x, y, z, size, height + 0.6, size);
  box(b, 'stone', I, x, y + height + 0.6, z, size + 0.4, 0.35, size + 0.4);
  b.add('roof', new ConeGeometry(size * 0.78, 2.6, 4, 1), {
    ...STONE,
    moss: 0.3,
    flat: true,
    matrix: M(x, y + height + 0.95 + 1.3, z, Math.PI / 4),
  });
}

/** A rectangular gallery: inner relief wall, outer colonnade, roof, corner and entrance pavilions. */
function galleryRing(b, hx, hz, y, { depth = 3, height = 3, corners = true, pavilionWidth = 6 } = {}) {
  for (const { F, a: full, c } of sides(hx, hz)) {
    const a = full - depth;
    const zIn = c - depth;
    const gap = pavilionWidth / 2;
    const seg = a - gap;
    for (const s of [-1, 1]) box(b, 'relief', F, s * (gap + seg / 2), y, zIn + 0.35, seg, height, 0.7);
    for (let x = -a + 1.4; x <= a - 1.4 + 1e-6; x += 2.4) {
      if (Math.abs(x) < gap + 0.6) continue;
      box(b, 'stone', F, x, y, c - 0.45, 0.6, height, 0.6, { moss: 0.2 });
      box(b, 'stone', F, x, y + height - 0.3, c - 0.45, 0.85, 0.3, 0.85, { moss: 0.1 });
    }
    box(b, 'stone', F, 0, y + height, c - depth / 2, 2 * a, 0.45, depth + 0.5);
    b.add('roof', gable(2 * a, depth + 0.9, 1.5), { ...STONE, moss: 0.35, matrix: chain(F, M(0, y + height + 0.45, c - depth / 2)) });
    entrancePavilion(b, F, c, y, depth, height, pavilionWidth);
  }
  if (corners) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cornerPavilion(b, sx * (hx - depth / 2), y, sz * (hz - depth / 2), depth + 0.8, height);
  }
}

export function buildTemple(b) {
  // Tier 1: the gallery of bas-reliefs
  platform(b, 0, 27, 24, 2.4);
  galleryRing(b, 27, 24, 2.4, { depth: 3, height: 3 });
  for (const { F, c } of sides(27, 24)) stairs(b, F, 0, 0, c, 7, 2.4, 3.5, 7);

  // Tier 2
  platform(b, 2.4, 18, 16, 4);
  galleryRing(b, 18, 16, 6.4, { depth: 2.5, height: 2.8 });
  for (const { F, c } of sides(18, 16)) stairs(b, F, 0, 2.4, c, 6, 4, 4, 9);

  // Tier 3: the Bakan, with its steep stairs
  platform(b, 6.4, 9, 9, 6.5);
  const top = 12.9;
  for (const { F, c } of sides(9, 9)) stairs(b, F, 0, 6.4, c, 4, 6.5, 3.5, 12);
  galleryRing(b, 9, 9, top, { depth: 2, height: 2.4, corners: false, pavilionWidth: 4.4 });
  for (const { F } of sides(9, 9)) {
    box(b, 'relief', F, 0, top, 4.8, 2.8, 2.4, 4.4);
    b.add('roof', gable(4.6, 3.4, 1.4), { ...STONE, moss: 0.3, matrix: chain(F, M(0, top + 2.4, 4.8, Math.PI / 2)) });
  }

  // The quincunx of towers
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) prang(b, sx * 7.2, top, sz * 7.2, 11, 1.45);
  box(b, 'laterite', I, 0, top, 0, 6.6, 0.6, 6.6);
  box(b, 'relief', I, 0, top + 0.6, 0, 5.8, 0.6, 5.8);
  prang(b, 0, top + 1.2, 0, 16.5, 2.3);
}

function wallSegment(b, x, z, lx, lz) {
  const h = 3.6;
  box(b, 'laterite', I, x, 0, z, lx, h, lz, { moss: 0.4, uvScale: 0.25 });
  box(b, 'stone', I, x, h, z, lx + 0.4, 0.4, lz + 0.4, { moss: 0.45 });
}

export function buildEnclosure(b) {
  const W = LAYOUT.wall;
  const T = 1.4;
  wallSegment(b, 0, -W, 2 * W + T, T);
  wallSegment(b, -W, 0, T, 2 * W - T);
  wallSegment(b, W, 0, T, 2 * W - T);
  wallSegment(b, -(W + 22) / 2, W, W - 22, T);
  wallSegment(b, (W + 22) / 2, W, W - 22, T);

  // The west gopura: wings, a passage under a collapsed central tower, two side towers
  for (const s of [-1, 1]) {
    const cx = s * 11.5;
    box(b, 'relief', I, cx, 0, W, 17, 4.6, 4);
    for (let x = 3.6; x <= 19.4; x += 2.2) {
      for (const dz of [-2.6, 2.6]) box(b, 'stone', I, s * x, 0, W + dz, 0.6, 4.6, 0.6, { moss: 0.25 });
    }
    box(b, 'stone', I, cx, 4.6, W, 17, 0.4, 6.4);
    b.add('roof', gable(17, 7, 2), { ...STONE, moss: 0.4, matrix: M(cx, 5, W) });
    prang(b, cx, 5.4, W, 5.5, 1.0, { porches: false });
    cornerPavilion(b, s * 21, 0, W, 4, 4.4);
    box(b, 'stone', I, s * 2.4, 0, W, 1.6, 5.4, 6.4);
  }
  box(b, 'stone', I, 0, 4, W, 6.4, 1.4, 6.4);
  box(b, 'inscription', I, 0, 4.1, W + 3.25, 3.2, 1.0, 0.1, { uvScale: 0.35, moss: 0 });
  for (const dz of [-3.4, 3.4]) b.add('relief', gable(0.4, 6, 2.6), { ...STONE, matrix: M(0, 5.4, W + dz, Math.PI / 2) });
  prang(b, 0, 5.4, W, 9, 1.6, { truncate: 0.6, tiltZ: 0.035 });
}

export function buildCauseways(b) {
  const W = LAYOUT.wall;
  const top = 0.7;
  // Outer causeway across the moat, on an embankment
  box(b, 'laterite', I, 0, -1.2, 66, 8, top + 1.2, 32, { moss: 0.5 });
  box(b, 'stone', I, 0, top, 66, 7.6, 0.12, 32, { moss: 0.2, grime: 0.2 });
  const rail = new CylinderGeometry(0.22, 0.22, 25, 5, 1);
  for (const s of [-1, 1]) {
    const x = s * 3.55;
    b.add('stone', rail, { ...STONE, matrix: M(x, top + 0.9, 68, 0, 1, 1, 1, Math.PI / 2) });
    for (let z = 56; z <= 80; z += 2) box(b, 'stone', I, x, top, z, 0.32, 0.9, 0.32, { moss: 0.2 });
    // seven-headed naga hood at the outer end
    b.add('stone', new CylinderGeometry(1.3, 1.3, 0.35, 7, 1, false, -Math.PI / 2, Math.PI), {
      ...STONE,
      flat: true,
      matrix: M(x, top + 0.5, 81, 0, 1, 1, 1, -Math.PI / 2),
    });
    box(b, 'stone', I, x, top, 80.6, 0.5, 1.2, 0.8);
  }
  // Landing terrace and steps down to the approach
  box(b, 'laterite', I, 0, -0.2, 85, 16, 0.9, 6, { moss: 0.4 });
  box(b, 'stone', I, 0, top, 85, 15.6, 0.12, 5.6, { moss: 0.2 });
  stairs(b, I, 0, 0, 88, 8, top, 1.5, 3);

  // Inner causeway to the temple, with low balustrades
  box(b, 'laterite', I, 0, 0, 39, 7, 0.6, 22, { moss: 0.3 });
  box(b, 'stone', I, 0, 0.6, 39, 6.6, 0.1, 22, { moss: 0.2 });
  for (const s of [-1, 1]) box(b, 'stone', I, s * 3.2, 0.6, 39, 0.35, 0.55, 22, { moss: 0.3 });
  box(b, 'stone', I, 0, 0, W - 1.6, 7, 0.6, 2.2);

  // Cruciform terrace of honour in front of the first gallery
  box(b, 'laterite', I, 0, 0, 30.5, 16, 0.9, 5, { moss: 0.3 });
  box(b, 'laterite', I, 0, 0, 30.5, 7, 0.9, 7, { moss: 0.3 });
  box(b, 'stone', I, 0, 0.9, 30.5, 15.6, 0.1, 4.6);
  for (const s of [-1, 1]) {
    b.add('stone', new CylinderGeometry(0.18, 0.18, 4.6, 5, 1), { ...STONE, matrix: M(s * 7.8, 1.5, 30.5, 0, 1, 1, 1, Math.PI / 2) });
    for (const z of [28.4, 30.5, 32.6]) box(b, 'stone', I, s * 7.8, 0.9, z, 0.28, 0.6, 0.28);
  }
}

export function buildLibraries(b) {
  for (const s of [-1, 1]) {
    const x = s * 24;
    const z = 45;
    box(b, 'laterite', I, x, 0, z, 8, 1, 6, { moss: 0.4 });
    box(b, 'relief', I, x, 1, z, 6.4, 3.6, 4.4);
    box(b, 'stone', I, x, 4.6, z, 6.8, 0.3, 4.8);
    b.add('roof', gable(6.8, 5.2, 2.4), { ...STONE, moss: 0.45, matrix: M(x, 4.9, z) });
    // porch facing the causeway
    const px = x - s * 4.1;
    box(b, 'stone', I, px, 1, z, 1.8, 3, 2.6);
    b.add('relief', gable(1.8, 2.8, 1.4), { ...STONE, matrix: M(px, 4, z) });
    box(b, 'stone', I, px - s * 0.92, 1, z, 0.06, 2.1, 1.1, { color: DOOR, moss: 0, grime: 0 });
    for (let i = 0; i < 3; i++) box(b, 'stone', I, px - s * (1.2 + i * 0.4), 0, z, 0.4, 1 - i * 0.33, 2.2);
  }
}
