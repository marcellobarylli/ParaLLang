import { BoxGeometry, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Matrix4, PlaneGeometry, Quaternion, Shape, Vector3 } from 'three';
import { M, MeshBuilder, chain, taperedTube } from './geometry.js';
import { STONE, box, prang } from './temple.js';
import { mushrooms, root } from './ruins.js';
import { bush, canopy, jungleTree, tuft } from './vegetation.js';
import { buildGround } from './terrain.js';
import { assembleWorld, createWorldKit } from './world.js';
import { PRESETS } from './presets.js';
import { createRandom, smoothstep, valueNoise2 } from '../util/random.js';
import { createPS1Material } from '../ps1/material.js';

// Ta Prohm, the second level: a flat monastery temple, facing east (+z here, as at Angkor Wat
// the visitor approaches from +z), with galleried enclosures around a central sanctuary and
// Bayon-style face towers on the gopuras. It was left to the jungle: giant thitpok trees
// (Tetrameles) stand on the galleries and pour their roots over walls and doorways; strangler
// figs grip towers; collapsed galleries lie in heaps of fallen blocks.
//
// In the lore it is the dead branch where the strings have won: every root glows with corruption.

export const TA_PROHM = {
  outer: 56,
  rings: [
    { hx: 34, hz: 30, windows: true, collapse: 0.24, tower: 4.5 },
    { hx: 20, hz: 18, windows: false, collapse: 0.16, tower: 5 },
    { hx: 9, hz: 9, windows: false, collapse: 0.05, tower: 6.5 },
  ],
  gallery: { depth: 2.6, height: 2.8, wall: 0.5, bay: 3.2 },
  grid: { fine: 4, fineHalf: 64, fineFront: 128, avenueHalf: 32, coarse: 32, coarseHalf: 480 },
};

const G = TA_PROHM.gallery;
const ROOF_TOP = G.height + 1.6;
const I = new Matrix4();
const UNIT_BOX = new BoxGeometry(1, 1, 1);
const UP = new Vector3(0, 1, 0);
const DOOR = [0.14, 0.13, 0.11];

// Ta Prohm's sandstone reads greyer and greener than Angkor Wat's.
const JUNGLE_STONE = { ...STONE, color: [0.84, 0.91, 0.84], moss: 0.55, grime: 0.6 };
// The stone of the theme being built (buildLevel sets it; the builders below are synchronous).
let TP = JUNGLE_STONE;
const tbox = (b, key, F, x, y0, z, w, h, d, opts = {}, ry = 0) => box(b, key, F, x, y0, z, w, h, d, { ...TP, ...opts }, ry);

/** The giant trees, placed first so the canopy shade and the collapse logic know about them. */
const GIANTS = [
  { kind: 'gate', x: 0.6, z: 28.4 }, // on the east gate of the third enclosure
  { kind: 'wall', x: -32.7, z: 6, out: [-1, 0], tangent: [0, 1] }, // astride the south gallery
  { kind: 'wall', x: 8, z: 16.7, out: [0, 1], tangent: [1, 0] }, // on the second gallery
  { kind: 'free', x: 22, z: 44 },
  { kind: 'free', x: -28, z: 42 },
  { kind: 'free', x: 45, z: -10 },
  { kind: 'free', x: -44, z: -30 },
  { kind: 'free', x: 12, z: -42 },
];
const FIG_TOWER = { x: 20 - G.depth / 2, z: 18 - G.depth / 2 };

const nearGiant = (x, z, r) => GIANTS.some((g) => (g.x - x) ** 2 + (g.z - z) ** 2 < r * r);

/** Canopy shade: dappled darkening under the giants' crowns, fading out with height. */
function canopyShade(x, y, z) {
  let shade = 0;
  for (const g of GIANTS) {
    const d = Math.hypot(g.x - x, g.z - z);
    shade = Math.max(shade, 1 - smoothstep(4, 16, d));
  }
  const dapple = valueNoise2(x * 0.3, z * 0.3, 0, 21);
  const s = 1 - shade * (0.42 - 0.3 * smoothstep(0.62, 0.78, dapple));
  return s + (1 - s) * smoothstep(12, 30, y);
}

function rubblePile(b, rng, x, z, r, count) {
  for (let i = 0; i < count; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = r * Math.sqrt(rng.next());
    const s = rng.range(0.5, 1.1);
    const h = (1 - d / r) * r * 0.5;
    b.add(rng.pick(['stone', 'stone', 'devata', 'laterite']), UNIT_BOX, {
      ...TP,
      moss: 0.75,
      matrix: M(x + Math.cos(a) * d, h + s * 0.3, z + Math.sin(a) * d, rng.range(0, 3), s * rng.range(1, 1.7), s * 0.7, s, rng.range(-0.4, 0.4), rng.range(-0.4, 0.4)),
    });
  }
}

const toWorld = (F, x, y, z) => new Vector3(x, y, z).applyMatrix4(F);

/** One side of a gallery in frame F (local x along the side, +z outwards, outer face at c). */
function gallerySide(b, rng, F, a, c, { windows, collapse }) {
  const n = Math.max(1, Math.round((2 * a) / G.bay));
  const step = (2 * a) / n;
  for (let i = 0; i < n; i++) {
    const x = -a + (i + 0.5) * step;
    if (Math.abs(x) < 3.2) continue; // the gate pavilion stands here
    const mid = toWorld(F, x, 0, c - G.depth / 2);
    const collapsed = !nearGiant(mid.x, mid.z, 7) && rng.chance(collapse);
    const hIn = collapsed ? rng.range(0.6, 2) : G.height;
    tbox(b, 'devata', F, x, 0, c - G.depth + G.wall / 2, step, hIn, G.wall, { uvScale: 0.32 });
    if (windows && !collapsed) {
      // A window with turned stone balusters in every bay.
      const pier = step * 0.45;
      const win = step - pier;
      const wx = x + pier / 2;
      tbox(b, 'stone', F, x - win / 2, 0, c - G.wall / 2, pier, G.height, G.wall);
      tbox(b, 'stone', F, wx, 0, c - G.wall / 2, win, 0.9, G.wall);
      tbox(b, 'stone', F, wx, 2.1, c - G.wall / 2, win, G.height - 2.1, G.wall);
      for (let k = 0; k < 2; k++) {
        b.add('stone', new CylinderGeometry(0.13, 0.13, 1.2, 5, 1, true), {
          ...TP,
          moss: 0.2,
          matrix: chain(F, M(wx - win / 2 + ((k + 0.5) * win) / 2, 1.5, c - G.wall / 2)),
        });
      }
    } else {
      tbox(b, 'stone', F, x, 0, c - G.wall / 2, step, collapsed ? rng.range(0.4, 1.8) : G.height, G.wall);
    }
    if (collapsed) {
      rubblePile(b, rng, mid.x, mid.z, rng.range(1.8, 2.8), rng.int(6, 11));
      continue;
    }
    // Corbelled vault: courses stepping in towards the ridge.
    const zc = c - G.depth / 2;
    tbox(b, 'stone', F, x, G.height, zc, step + 0.02, 0.4, G.depth + 0.5, { moss: 0.7 });
    tbox(b, 'stone', F, x, G.height + 0.4, zc, step + 0.02, 0.45, G.depth - 0.3, { moss: 0.75 });
    tbox(b, 'stone', F, x, G.height + 0.85, zc, step + 0.02, 0.75, G.depth - 1.3, { moss: 0.8 });
  }
}

/** A gate pavilion with a passage; optionally crowned by a tower. Returns its roof height. */
function gate(b, rng, F, c, { tower = 5, faces = false } = {}) {
  const zc = c - G.depth / 2;
  const depth = G.depth + 1.6;
  const H = 3.6;
  for (const s of [-1, 1]) tbox(b, 'stone', F, s * 2.15, 0, zc, 2.1, H, depth);
  tbox(b, 'stone', F, 0, 2.6, zc, 2.4, H - 2.6, depth);
  for (const s of [-1, 1]) tbox(b, 'devata', F, s * 1.35, 0, zc + depth / 2 + 0.1, 0.5, 2.6, 0.2, { uvScale: 0.5, moss: 0.3 });
  tbox(b, 'stone', F, 0, H, zc, 6.7, 0.45, depth + 0.3, { moss: 0.7 });
  tbox(b, 'stone', F, 0, H + 0.45, zc, 5.4, 0.45, depth - 0.5, { moss: 0.75 });
  const top = H + 0.9;
  if (tower) {
    const p = toWorld(F, 0, 0, zc);
    if (faces) faceTower(b, p.x, top, p.z, F);
    else prang(b, p.x, top, p.z, tower, 1.25, { porches: false, style: TP, plinth: 'devata', truncate: rng.chance(0.35) ? rng.range(0.55, 0.8) : 1 });
  }
  return top;
}

/** A Bayon-style face tower: a carved face on each of its four sides, under a broken spire. */
function faceTower(b, x, y, z, F) {
  tbox(b, 'stone', I, x, y, z, 4.8, 0.5, 4.8);
  b.add('face', new BoxGeometry(4.2, 4.2, 4.2), { uv: 'keep', jitter: 0.02, color: TP.color, moss: 0.25, matrix: chain(M(x, y + 0.5 + 2.1, z), new Matrix4().extractRotation(F)) });
  tbox(b, 'stone', I, x, y + 4.7, z, 4.8, 0.4, 4.8, { moss: 0.7 });
  prang(b, x, y + 5.1, z, 6, 1.7, { porches: false, style: TP, plinth: 'devata', truncate: 0.72 });
}

function cornerTower(b, rng, x, z, height) {
  const size = G.depth + 0.8;
  tbox(b, 'stone', I, x, 0, z, size, G.height + 0.6, size);
  tbox(b, 'stone', I, x, G.height + 0.6, z, size + 0.4, 0.4, size + 0.4, { moss: 0.7 });
  prang(b, x, G.height + 1, z, height, 0.95, { porches: false, style: TP, plinth: 'devata', truncate: rng.chance(0.3) ? rng.range(0.5, 0.75) : 1 });
}

function sides(hx, hz) {
  return [
    { F: M(0, 0, 0, 0), a: hx, c: hz, name: 'east' },
    { F: M(0, 0, 0, Math.PI), a: hx, c: hz, name: 'west' },
    { F: M(0, 0, 0, Math.PI / 2), a: hz, c: hx, name: 'north' },
    { F: M(0, 0, 0, -Math.PI / 2), a: hz, c: hx, name: 'south' },
  ];
}

function buildRing(b, rng, ring, index) {
  for (const side of sides(ring.hx, ring.hz)) {
    gallerySide(b, rng, side.F, side.a - G.depth, side.c, ring);
    // The gate tree has taken the east gate of the third enclosure; its tower is long gone.
    const treeGate = index === 0 && side.name === 'east';
    gate(b, rng, side.F, side.c, { tower: treeGate ? 0 : ring.tower });
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cornerTower(b, rng, sx * (ring.hx - G.depth / 2), sz * (ring.hz - G.depth / 2), index === 2 ? 7.5 : ring.tower - 0.5);
    }
  }
}

function buildSanctuary(b) {
  tbox(b, 'laterite', I, 0, 0, 0, 7.4, 1.2, 7.4, { moss: 0.6 });
  tbox(b, 'stone', I, 0, 1.2, 0, 6.8, 0.3, 6.8);
  prang(b, 0, 1.5, 0, 12, 2, { style: TP, plinth: 'devata' });
}

function buildLibrary(b) {
  const x = -26;
  const z = 22;
  tbox(b, 'laterite', I, x, 0, z, 7, 0.8, 5, { moss: 0.6 });
  tbox(b, 'devata', I, x, 0.8, z, 5.4, 3, 3.6, { uvScale: 0.32 });
  tbox(b, 'stone', I, x, 3.8, z, 5.8, 0.45, 4, { moss: 0.7 });
  tbox(b, 'stone', I, x, 4.25, z, 4.8, 0.45, 3, { moss: 0.75 });
  tbox(b, 'stone', I, x, 4.7, z, 3.6, 0.4, 1.6, { moss: 0.8 });
  tbox(b, 'stone', I, x, 0.8, z + 1.82, 1.2, 2.1, 0.06, { color: DOOR, moss: 0, grime: 0 });
}

/** The outer laterite enclosure, broken in places, with the face-tower gopura on the east. */
function buildOuterEnclosure(b, rng) {
  const W = TA_PROHM.outer;
  const segment = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.round(len / 8);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const along = len / n;
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const broken = rng.chance(0.22);
      const h = broken ? rng.range(0.5, 1.6) : 3.4;
      tbox(b, 'laterite', I, x, 0, z, alongX ? along : 1.2, h, alongX ? 1.2 : along, { moss: 0.7 });
      if (broken) rubblePile(b, rng, x, z, 2.2, rng.int(4, 8));
      else tbox(b, 'stone', I, x, h, z, alongX ? along + 0.1 : 1.6, 0.35, alongX ? 1.6 : along + 0.1, { moss: 0.8 });
    }
  };
  segment(-W, -W, W, -W);
  segment(-W, -W, -W, W);
  segment(W, -W, W, W);
  segment(-W, W, -10, W);
  segment(10, W, W, W);

  // East gopura: wings, a passage and the face tower.
  const F = M(0, 0, W + G.depth / 2, 0);
  for (const s of [-1, 1]) {
    tbox(b, 'devata', F, s * 6.6, 0, 0, 6.8, 3.2, 4, { uvScale: 0.32 });
    tbox(b, 'stone', F, s * 6.6, 3.2, 0, 7, 0.45, 4.6, { moss: 0.7 });
    tbox(b, 'stone', F, s * 6.6, 3.65, 0, 7, 0.45, 3.4, { moss: 0.75 });
  }
  gate(b, rng, F, G.depth / 2, { tower: 6, faces: true });
}

/** A giant thitpok: pale trunk, buttress fins, high limbs and a crown far overhead. */
function thitpok(b, rng, x, y, z, { height = 30, radius = 1.6, fins: finScale = 1 } = {}) {
  const lean = new Vector3(rng.range(-1, 1), 0, rng.range(-1, 1)).multiplyScalar(rng.range(0.5, 2));
  const top = new Vector3(x + lean.x, y + height, z + lean.z);
  const trunk = new CatmullRomCurve3([
    new Vector3(x, y - 0.4, z),
    new Vector3(x + lean.x * 0.3, y + height * 0.45, z + lean.z * 0.3),
    top,
  ]);
  b.add('thitpok', taperedTube(trunk, 8, 8, radius, radius * 0.45, height / 5), { uv: 'keep', jitter: 0.03, moss: 0.15, grime: 0.3 });

  if (finScale > 0) {
    const fins = rng.int(5, 7);
    for (let i = 0; i < fins; i++) {
      const a = (i / fins) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const L = rng.range(2.5, 4.5) * finScale;
      const H = rng.range(3.5, 6) * finScale;
      const s = new Shape();
      s.moveTo(0, 0);
      s.lineTo(L, 0);
      s.quadraticCurveTo(L * 0.18, H * 0.12, 0, H);
      s.closePath();
      const g = new ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false, curveSegments: 4 });
      g.translate(0, 0, -0.225);
      b.add('thitpok', g, { uvScale: 0.25, jitter: 0.04, matrix: M(x + Math.cos(a) * radius * 0.55, y - 0.05, z + Math.sin(a) * radius * 0.55, -a) });
    }
  }

  const limbs = rng.int(3, 4);
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const from = trunk.getPointAt(rng.range(0.72, 0.9));
    const reach = rng.range(5, 8);
    const end = new Vector3(from.x + Math.cos(a) * reach, from.y + rng.range(3, 6), from.z + Math.sin(a) * reach);
    const mid = from.clone().lerp(end, 0.5).add(new Vector3(0, -0.8, 0));
    b.add('thitpok', taperedTube(new CatmullRomCurve3([from, mid, end]), 3, 5, radius * 0.38, radius * 0.15, 2), { uv: 'keep', moss: 0.2 });
    canopy(b, rng, end.x, end.y + 1, end.z, rng.range(5, 7.5), 2, 0.48);
  }
  canopy(b, rng, top.x, top.y + 1.5, top.z, rng.range(6.5, 8.5), 2, 0.45);
}

/**
 * Roots from a trunk base on a roof, poured over the crest and down the face like wax, then
 * across the ground. `face(t)` gives the surface at lateral offset t: { half, top }, where half
 * is the distance from the trunk to the face along `out`. Roots hug it at their own radius,
 * meander sideways, and sometimes fork.
 */
function cascade(b, rng, { base, out, tangent, face, top, count, spread, gap = 0, r = [0.4, 0.75], reach = [2, 6], key = 'thitpok' }) {
  const at = (o, tt, y) => new Vector3(base.x + out.x * o + tangent.x * tt, y, base.z + out.z * o + tangent.z * tt);
  for (let i = 0; i < count; i++) {
    let t;
    do t = rng.range(-spread, spread);
    while (Math.abs(t) < gap);
    const surface = typeof face === 'function' ? face(t) : { half: face, top };
    const { half } = surface;
    const ty = surface.top;
    const r0 = rng.range(...r);
    const r1 = 0.1;
    let drift = 0;
    const spec = [
      [0, top + 1, 0.15],
      [half * 0.5, top, 0.5],
      [half - 0.1, ty, 0.8],
      [half, ty - 0.5, 0.88],
      [half, ty * 0.55, 0.95],
      [half, 0.7, 1],
      [half + 1.4, 0, 1.06],
      [half + rng.range(...reach), 0, 1.2],
    ];
    const n = spec.length - 1;
    const pts = spec.map(([o, y, k], j) => {
      const rr = r0 + (r1 - r0) * (j / n);
      if (j > 2) drift += rng.range(-0.35, 0.35);
      const onFace = j >= 3 && j <= 5;
      return at(o + (onFace ? rr * 0.9 : 0), t * k + drift, y + (onFace ? 0 : rr * 0.85));
    });
    // tie the crest point snug over the edge
    pts[2].addScaledVector(out, r0 * 0.4);
    root(b, pts, r0, r1, 11, key, r0 > 0.5 ? 6 : 5);
    if (rng.chance(0.4)) {
      const from = pts[4];
      const side = rng.sign() * rng.range(0.8, 1.6);
      const fork = [from, from.clone().addScaledVector(tangent, side * 0.5).setY(from.y * 0.5), at(half + 0.25, t + drift + side, 0.15), at(half + rng.range(1.5, 3), t + drift + side * 1.5, 0.02)];
      root(b, fork, 0.2, 0.06, 6, key, 4);
    }
    if (rng.chance(0.3)) mushrooms(b, rng, pts[6].x, pts[6].z, rng.int(1, 3));
  }
}

function buildGiants(b, rng) {
  for (const g of GIANTS) {
    if (g.kind === 'free') {
      thitpok(b, rng, g.x, 0, g.z, { height: rng.range(26, 34), radius: rng.range(1.5, 2) });
      // surface roots snaking away from the buttresses
      for (let i = 0; i < 6; i++) {
        const a = rng.range(0, Math.PI * 2);
        const d = rng.range(6, 10);
        root(b, [new Vector3(g.x, 0.6, g.z), new Vector3(g.x + Math.cos(a) * 3, 0.25, g.z + Math.sin(a) * 3), new Vector3(g.x + Math.cos(a + 0.3) * d, 0.02, g.z + Math.sin(a + 0.3) * d)], 0.35, 0.08, 8, 'thitpok', 5);
      }
      continue;
    }
    if (g.kind === 'gate') {
      // The gate tree: roots pour over the pavilion, frame its doorway, spill onto the galleries.
      const top = 4.5;
      thitpok(b, rng, g.x, top, g.z, { height: 30, radius: 1.5, fins: 0.55 });
      const base = new Vector3(g.x, 0, g.z);
      const front = (t) => (Math.abs(t + g.x) <= 3.1 ? { half: 2.4, top } : { half: 1.6, top: ROOF_TOP });
      const back = (t) => (Math.abs(t + g.x) <= 3.1 ? { half: 1.8, top } : { half: 1, top: ROOF_TOP });
      const X = new Vector3(1, 0, 0);
      cascade(b, rng, { base, out: new Vector3(0, 0, 1), tangent: X, face: front, top, count: 13, spread: 6, gap: 1.35, r: [0.35, 0.85] });
      cascade(b, rng, { base, out: new Vector3(0, 0, -1), tangent: X, face: back, top, count: 7, spread: 5.5, gap: 1.35 });
      // aerial roots hanging in front of the doorway
      for (const dx of [-0.8, 0.5]) {
        root(b, [new Vector3(g.x + dx, top + 0.6, g.z + 1.5), new Vector3(g.x + dx, top - 0.3, g.z + 2.6), new Vector3(g.x + dx * 1.2, 2.2, g.z + 2.75)], 0.16, 0.05, 6, 'thitpok', 4);
      }
      continue;
    }
    // A tree astride a gallery, roots down both faces.
    const out = new Vector3(g.out[0], 0, g.out[1]);
    const tangent = new Vector3(g.tangent[0], 0, g.tangent[1]);
    const base = new Vector3(g.x, 0, g.z);
    thitpok(b, rng, g.x, ROOF_TOP, g.z, { height: 26, radius: 1.4, fins: 0.5 });
    const half = G.depth / 2;
    cascade(b, rng, { base, out, tangent, face: half, top: ROOF_TOP, count: 9, spread: 5, r: [0.35, 0.8] });
    cascade(b, rng, { base, out: out.clone().negate(), tangent, face: half, top: ROOF_TOP, count: 6, spread: 4.5, reach: [1.5, 3.5] });
  }

  // A strangler fig gripping the north-east corner tower of the second enclosure.
  const { x, z } = FIG_TOWER;
  const towerTop = G.height + 1 + 3;
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2;
    const pts = [];
    for (let j = 0; j <= 6; j++) {
      const y = towerTop * (1 - j / 6) + 0.1;
      const rad = y > G.height + 1 ? 1.25 : 2.45;
      const a = a0 + j * 0.65;
      pts.push(new Vector3(x + Math.cos(a) * rad, y, z + Math.sin(a) * rad));
    }
    const last = pts[pts.length - 1];
    const dir = new Vector3(last.x - x, 0, last.z - z).normalize();
    pts.push(last.clone().addScaledVector(dir, rng.range(2, 4)).setY(0.02));
    root(b, pts, 0.3, 0.1, 16, 'root', 5);
  }
  const figTop = new Vector3(x + 0.4, towerTop + 6, z - 0.3);
  b.add('root', taperedTube(new CatmullRomCurve3([new Vector3(x, towerTop - 0.5, z), new Vector3(x + 0.3, towerTop + 3, z), figTop]), 4, 6, 0.75, 0.35, 3), { uv: 'keep', moss: 0.3 });
  canopy(b, rng, figTop.x, figTop.y + 1.2, figTop.z, 5, 3);
}

/**
 * Translucent light shafts through gaps in the canopy, as PS1 games did them. With `smoke` they
 * are columns of lit smoke instead: upright, widening as they rise, brightest at the ground.
 */
function buildShafts(b, { smoke = false } = {}) {
  const sun = new Vector3(...PRESETS.jungle.sunDir).normalize();
  const q = new Quaternion().setFromUnitVectors(UP, sun);
  const spots = [
    [4, 40],
    [-14, 24],
    [-26, -4],
    [27, 8],
    [10, -24],
    [-6, 50],
    [38, 34],
  ];
  const shade = smoke ? (y) => 1 - 0.75 * Math.min(1, y / 26) : (y) => 0.5 + 0.5 * Math.min(1, y / 30);
  for (const [x, z] of spots) {
    const g = smoke ? new CylinderGeometry(3.4, 0.9, 36, 4, 1, true) : new CylinderGeometry(1.4, 2.8, 36, 4, 1, true);
    g.translate(0, 18, 0);
    if (!smoke) g.applyQuaternion(q);
    g.translate(x, 0, z);
    b.add('shaft', g, { uv: 'keep', jitter: 0, unshaded: true, color: (_x, y) => [shade(y), shade(y), shade(y)] });
  }
}

export function taProhmHeightAt(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  if (d <= 64) return 0;
  const avenue = z > 0 ? smoothstep(32, 48, Math.abs(x)) : 1;
  return smoothstep(64, 110, d) * avenue * (valueNoise2(x * 0.035, z * 0.035, 0, 31) * 5 - 1.2);
}

function groundColor(x, _y, z) {
  const ax = Math.abs(x);
  let path = ax < 3.5 && z > -12 ? 1 - smoothstep(1.5, 3.5, ax) : 0;
  path *= 1 - smoothstep(110, 128, z);
  const mossy = smoothstep(0.5, 0.8, valueNoise2(x * 0.08, z * 0.08, 0, 33));
  const base = [1 - 0.12 * mossy, 1 + 0.08 * mossy, 1 - 0.1 * mossy];
  const p = [1.28, 1.12, 0.98];
  return [base[0] + (p[0] - base[0]) * path, base[1] + (p[1] - base[1]) * path, base[2] + (p[2] - base[2]) * path];
}

/** Inside the outer wall, clear of galleries, towers and the giants. Exported for the game's dungeon (round 115). */
export function isClear(x, z) {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  for (const ring of TA_PROHM.rings) {
    const inX = ax < ring.hx + 1;
    const inZ = az < ring.hz + 1;
    if (inX && inZ && (ax > ring.hx - G.depth - 1.2 || az > ring.hz - G.depth - 1.2)) return false;
  }
  if (ax < 5 && az < 5) return false;
  if (ax < 2.5 && z > 0) return false; // keep the axis open
  if (Math.abs(x + 26) < 5 && Math.abs(z - 22) < 4) return false; // library
  if (nearGiant(x, z, 4)) return false;
  return true;
}

function buildPlanting(b, surface, rng) {
  const W = TA_PROHM.outer;
  const scatter = (count, sample, test) => {
    const out = [];
    for (let tries = 0; out.length < count && tries < count * 60; tries++) {
      const [x, z] = sample();
      if (test(x, z)) out.push([x, z]);
    }
    return out;
  };
  const ring = (min, max) => () => {
    for (;;) {
      const x = rng.range(-max, max);
      const z = rng.range(-max, max);
      const d = Math.max(Math.abs(x), Math.abs(z));
      if (d >= min && d <= max) return [x, z];
    }
  };
  const outside = (x, z) => !(Math.abs(x) < 12 + Math.max(0, z - 60) * 0.15 && z > 50);
  const ground = taProhmHeightAt;
  for (const [x, z] of scatter(52, ring(W + 4, 150), outside)) jungleTree(b, rng, x, z, { ground, height: [16, 28] });
  for (const [x, z] of scatter(14, ring(36, W - 3), isClear)) jungleTree(b, rng, x, z, { ground, height: [10, 16] });
  for (const [x, z] of scatter(5, ring(22, 31), isClear)) jungleTree(b, rng, x, z, { ground, height: [8, 12] });
  for (const [x, z] of scatter(40, ring(10, 90), (x, z) => isClear(x, z) && outside(x, z) && Math.abs(x) > 3)) bush(b, rng, x, z, ground);
  for (const [x, z] of scatter(200, ring(4, 70), (x, z) => isClear(x, z) || Math.max(Math.abs(x), Math.abs(z)) > W + 2)) tuft(surface, rng, x, z, ground);

  // Fallen blocks heaped in the courtyards
  for (const [x, z] of scatter(9, ring(12, 50), (x, z) => isClear(x, z) && Math.abs(x) > 5)) rubblePile(b, rng, x, z, rng.range(1.5, 3), rng.int(5, 10));
}

// ---------------------------------------------------------------------------------------------
// The Kiln (round 133): Ta Prohm's plan again, burnt. The same builders, the same textures and the
// same random sequence, so every wall, collapsed bay and root stands where it does in Ta Prohm.
// What differs is the theme: soot for moss, bare branches for leaves, flames for grass, smoke for
// light shafts, a floor of glowing rock, a moat of lava, and materials that glow in their dark parts.

const SOOT = [0.06, 0.05, 0.05];
const KILN_STONE = { ...STONE, color: [0.56, 0.47, 0.43], moss: 0.55, grime: 0 };
const KILN = { lavaY: -0.4, moat: [57, 64], causewayHalf: 14 };

/** The lava moat: between the outer wall and the edge of the fine ground, open at the avenue. */
function isLava(x, z) {
  const d = Math.max(Math.abs(x), Math.abs(z));
  return d > KILN.moat[0] && d < KILN.moat[1] && !(z > 0 && Math.abs(x) < KILN.causewayHalf);
}

/** The Kiln's floor: dark rock with hot patches, hotter beyond the moat, ash on the axis path. */
function kilnGroundColor(x, _y, z) {
  const ax = Math.abs(x);
  const d = Math.max(ax, Math.abs(z));
  let path = ax < 3.5 && z > -12 ? 1 - smoothstep(1.5, 3.5, ax) : 0;
  path *= 1 - smoothstep(110, 128, z);
  const n = valueNoise2(x * 0.11, z * 0.11, 0, 41);
  const wide = valueNoise2(x * 0.03, z * 0.03, 0, 43);
  // Hot where the noise crosses its middle: veins and pools between cooler plates.
  let hot = (1 - smoothstep(0.02, 0.13, Math.abs(n - 0.5))) * (0.35 + 0.65 * wide);
  hot = Math.max(hot, smoothstep(64, 120, d) * smoothstep(0.35, 0.7, wide) * 0.9);
  hot *= 1 - path;
  const rock = 0.3 + 0.16 * valueNoise2(x * 0.2, z * 0.2, 0, 44) + 0.14 * path;
  const cold = [rock * 1.08, rock * 0.86, rock * 0.8];
  const lava = [1.9, 0.62, 0.14];
  return [cold[0] + (lava[0] - cold[0]) * hot, cold[1] + (lava[1] - cold[1]) * hot, cold[2] + (lava[2] - cold[2]) * hot];
}

/** Brighter towards the floor: the stone's base stands in the heat. */
const heatShade = (_x, y) => 1 + 0.5 * (1 - smoothstep(0, 3.5, y));

/**
 * The Kiln's builder: what the jungle level adds as leaves, this adds as bare branches. The
 * leaves' share of the random sequence is still consumed, and the branches draw from a sequence of
 * their own, so the rest of the level is built exactly as Ta Prohm is.
 */
class CharBuilder extends MeshBuilder {
  constructor(rng, options, seed) {
    super(rng, options);
    this.twigs = createRandom(seed + 500);
  }

  add(key, source, options = {}) {
    if (key !== 'leaves') return super.add(key, source, options);
    const triangles = (source.index ? source.index.count : source.attributes.position.count) / 3;
    for (let i = 0; i < triangles; i++) this.rng.next();
    source.computeBoundingSphere();
    const radius = source.boundingSphere.radius;
    const e = options.matrix.elements;
    const centre = new Vector3(e[12], e[13], e[14]);
    const main = this.rng;
    const r = this.twigs;
    this.rng = r;
    // Straight spikes of six triangles each: the level stays inside the triangle budget.
    const count = 3;
    const base = centre.clone().add(new Vector3(0, -radius * 0.35, 0));
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r.range(-0.5, 0.5);
      const dir = new Vector3(Math.cos(a), r.range(0.25, 1.1), Math.sin(a)).normalize();
      const end = base.clone().addScaledVector(dir, radius * r.range(0.75, 1.3));
      const thick = Math.min(0.32, Math.max(0.05, radius * 0.055));
      super.add('root', taperedTube(new CatmullRomCurve3([base, end]), 1, 3, thick, 0.02, 2), { uv: 'keep', jitter: 0.08 });
    }
    this.rng = main;
    return source;
  }
}

/** The Kiln's materials: Ta Prohm's textures, tinted to char and glowing in their dark parts. */
function kilnMaterials(uniforms, textures) {
  const m = (options) => createPS1Material(uniforms, options);
  const heat = (name, map, glowDark, extra = {}) => m({ name, map, glow: 0.66, glowDark, glowFade: [6, 0.3], ...extra });
  return {
    stone: heat('stone', textures.sandstone, [0.3, 0.47]),
    devata: heat('devata', textures.devata, [0.27, 0.4]),
    laterite: heat('laterite', textures.laterite, [0.26, 0.35]),
    // The face tower stands high: its glow does not fade, so the carved eyes and mouths burn.
    face: m({ name: 'face', map: textures.face, glow: 0.8, glowDark: [0.34, 0.43] }),
    litter: m({ name: 'kiln-floor', map: textures.laterite, lit: false, glow: 0.78, glowDark: [0.27, 0.36] }),
    lava: m({ name: 'lava', map: textures.water, lit: false, tint: [4.4, 1.3, 0.3], scroll: [0.006, 0.011], ripple: 0.05, glow: 0.3, fog: 0.5 }),
    thitpok: m({ name: 'thitpok', map: textures.thitpok, tint: [0.2, 0.17, 0.16], glow: 0.7, glowDark: [0.57, 0.615], glowFade: [10, 0.12] }),
    root: m({ name: 'root', map: textures.root, tint: [0.34, 0.28, 0.26], glow: 0.8, glowDark: [0.2, 0.25], glowFade: [8, 0.15] }),
    tuft: m({ name: 'flame', map: textures.tuft, alphaTest: 0.5, doubleSided: true, sway: 0.3, lit: false, tint: [2.3, 0.85, 0.2], fog: 0.5 }),
    // The characters' figures (and the mushrooms) are built in `plain`. The light here is orange, so green and blue
    // are lifted: a figure keeps some of its own colours and reads against the dark stone.
    plain: m({ name: 'plain', tint: [1.1, 1.5, 2] }),
    ember: m({ name: 'ember', lit: false, fog: 0.3, doubleSided: true, tint: [1, 0.55, 0.16], rise: [1.1, 16] }),
  };
}

/** Embers over the courts and the avenue: small quads that the vertex shader lifts and drifts. */
function buildEmbers(b, seed) {
  const r = createRandom(seed + 900);
  for (let i = 0; i < 240; i++) {
    const avenue = i % 5 === 0;
    const x = avenue ? r.range(-14, 14) : r.range(-58, 58);
    const z = avenue ? r.range(58, 120) : r.range(-58, 58);
    const size = r.range(0.07, 0.16);
    const g = new PlaneGeometry(size, size);
    g.rotateY(r.range(0, Math.PI));
    g.translate(x, 0.2, z);
    // The quad's phase, carried in the direction of its normal (see the vertex shader).
    const phase = r.range(-Math.PI, Math.PI);
    const normal = g.attributes.normal;
    for (let k = 0; k < normal.count; k++) normal.setXYZ(k, Math.cos(phase), 0, Math.sin(phase));
    const c = r.range(0.7, 1.6);
    b.add('ember', g, { uv: 'keep', jitter: 0, unshaded: true, color: [c, c, c] });
  }
}

const THEMES = {
  jungle: {
    name: 'ta-prohm',
    preset: 'jungle',
    stone: JUNGLE_STONE,
    builder: (rng) => new MeshBuilder(rng, { shade: canopyShade }),
    ground: { color: groundColor, key: 'litter' },
  },
  ember: {
    name: 'the-kiln',
    preset: 'ember',
    stone: KILN_STONE,
    builder: (rng, seed) => new CharBuilder(rng, { shade: heatShade, moss: SOOT }, seed),
    materials: kilnMaterials,
    smoke: true,
    ground: { color: kilnGroundColor, key: 'litter', isWater: isLava, waterY: KILN.lavaY, waterKey: 'lava', bank: { color: [0.5, 0.36, 0.3] } },
    embers: true,
  },
};

function buildLevel(options, theme) {
  const { seed = 7, preset = theme.preset } = options;
  const kit = createWorldKit(seed);
  if (theme.materials) Object.assign(kit.materials, theme.materials(kit.uniforms, kit.textures));
  const { rng } = kit;
  const props = theme.builder(rng, seed);
  const surface = theme.builder(rng, seed);

  TP = theme.stone;
  try {
    TA_PROHM.rings.forEach((ring, i) => buildRing(props, rng, ring, i));
    buildSanctuary(props);
    buildLibrary(props);
    buildOuterEnclosure(props, rng);
    buildGiants(props, rng);
    buildShafts(props, { smoke: theme.smoke });
    buildPlanting(props, surface, rng);
    buildGround(surface, props, { grid: TA_PROHM.grid, heightAt: taProhmHeightAt, ...theme.ground });
    if (theme.embers) buildEmbers(props, seed);
  } finally {
    TP = JUNGLE_STONE;
  }

  return assembleWorld(kit, {
    name: theme.name,
    props,
    surface,
    preset,
    reflections: false,
    waterY: 0,
    layout: TA_PROHM,
    tour: TA_PROHM_TOUR,
    orbitTarget: [0, 6, 0],
  });
}

/** Builds the Ta Prohm level. Same interface as createTempleWorld. */
export function createTaProhmWorld(options = {}) {
  return buildLevel(options, THEMES.jungle);
}

/** Builds The Kiln: Ta Prohm's plan under the ember theme. Same interface, same layout, same heights. */
export function createKilnWorld(options = {}) {
  return buildLevel(options, THEMES.ember);
}

export const TA_PROHM_TOUR = [
  { pos: [0, 2.3, 112], look: [0, 7, 56] },
  { pos: [1.2, 2.2, 74], look: [0, 8, 56] },
  { pos: [0, 2.1, 62], look: [0, 4, 30] },
  { pos: [0, 2.1, 50], look: [0, 5, 29] },
  { pos: [-7, 2.6, 39], look: [0.5, 5, 29] },
  { pos: [-20, 8.5, 34], look: [-27, 3, 10] },
  { pos: [-25, 3, 16], look: [-33, 5, 5] },
  { pos: [-26, 3.2, -18], look: [-10, 6, -10] },
  { pos: [-12, 15, -36], look: [0, 8, 0] },
  { pos: [28, 19, -32], look: [0, 8, 0] },
  { pos: [39, 9, 17], look: [19, 4, 17] },
  { pos: [30, 6, 46], look: [0, 5, 29] },
  { pos: [16, 5, 72], look: [0, 6, 40] },
];
