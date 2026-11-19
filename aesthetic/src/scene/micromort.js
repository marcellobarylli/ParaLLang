import { BoxGeometry, BufferGeometry, CatmullRomCurve3, ConeGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Vector3 } from 'three';
import { M, MeshBuilder, gable, taperedTube } from './geometry.js';
import { assembleWorld, createWorldKit } from './world.js';
import { box } from './temple.js';
import { smoothstep, valueNoise2 } from '../util/random.js';

// Micromort Mountain (round 133), the third level: a trail up a snowy peak. The visitor climbs from the valley at +z
// towards the summit at -z. The dungeon starts halfway up, on a ledge where Eduardo has sprained his ankle (site
// `ankle_ledge`, at SITE). Above the snowline the mountain ends in a plateau, and on the plateau a wine festival:
// marquees, long tables, barrels, a bonfire, strings of bunting and a crowd of people who have read the risk table.
//
// In the lore the strings between the worlds run through everything; here the bunting is one, and glows a little.

export const MICROMORT = {
  half: 256, // the fine ground reaches this far on every side of the origin
  site: [3, 22], // Eduardo's ledge
  festival: [0, -176], // the middle of the festival, on the summit plateau
  summitY: 110,
  grid: { fine: 8, coarse: 64, coarseHalf: 512 },
};

const SNOW_KEY = 66; // ground above this altitude is snow
const ROCK_KEY = 36; // and above this, bare rock
const WOOD = [0.62, 0.44, 0.26];
const WOOD_DARK = [0.38, 0.26, 0.16];
const CLOTH = [[0.82, 0.16, 0.14], [0.96, 0.92, 0.82], [0.2, 0.42, 0.7], [0.9, 0.68, 0.18], [0.3, 0.6, 0.34]];
const WINE = [0.55, 0.06, 0.16];
const FLAME = [2.6, 1.5, 0.5];

// The trail winds up the middle of the mountain. It is the one place without noise or drop: the ground is what a
// walker would call a path.
const trailX = (z) => 3 + 14 * Math.sin((z - MICROMORT.site[1]) * 0.045);
const trailMask = (x, z) => 1 - smoothstep(2.5, 7, Math.abs(x - trailX(z)));

function baseHeight(x, z) {
  const t = Math.min(1, Math.max(0, (200 - z) / 350)); // 0 in the valley, 1 at the foot of the plateau
  const profile = MICROMORT.summitY * t * t * (3 - 2 * t) - 70 * smoothstep(-215, -290, z);
  const plateau = smoothstep(-110, -160, z); // the summit is wide and flat
  const mask = trailMask(x, z);
  const off = Math.abs(x - trailX(z)) * (1 - plateau) + Math.max(0, Math.abs(x) - 55) * plateau; // the distance from the ridge's crest
  const drop = smoothstep(26, 140, off) * 60 * (0.2 + 0.8 * t);
  const bumps = (valueNoise2(x * 0.05, z * 0.05, 0, 41) - 0.5) * 14 * (1 - mask) * (1 - plateau * 0.9);
  return profile - drop + bumps;
}

let ledgeY = null;

/** Ground height. The ledge at Eduardo's site is flat, whatever the slope. Exported for the game's camera. */
export function micromortHeightAt(x, z) {
  ledgeY ??= baseHeight(...MICROMORT.site);
  const ledge = 1 - smoothstep(18, 62, Math.hypot(x - MICROMORT.site[0], z - MICROMORT.site[1]));
  const h = baseHeight(x, z);
  return h + (ledgeY - h) * ledge;
}

const h = micromortHeightAt;
const onTrail = (x, z, width = 6) => Math.abs(x - trailX(z)) < width;
const onLedge = (x, z, r = 14) => Math.hypot(x - MICROMORT.site[0], z - MICROMORT.site[1]) < r;

function groundColor(x, y, z) {
  const mask = trailMask(x, z);
  const shade = 0.92 + 0.14 * valueNoise2(x * 0.11, z * 0.11, 0, 44);
  const high = smoothstep(ROCK_KEY, SNOW_KEY, y);
  const worn = [0.74, 0.64, 0.54];
  const tint = [shade, shade, shade];
  // Packed snow and dirt along the trail: darker than its surroundings.
  return tint.map((v, i) => v * (1 - mask * (1 - worn[i]) * (1 - high * 0.55)));
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

/** The mountain's ground: one fine grid, a coarse ring beyond it, and grass, rock or snow by altitude. */
function buildMountainGround(surface) {
  const { fine, coarse, coarseHalf } = MICROMORT.grid;
  const half = MICROMORT.half;
  const buckets = { ground: [], rock: [], snow: [] };
  const v = (x, z) => [x, h(x, z), z];
  const place = (x, z, step) => {
    const corners = [v(x, z), v(x, z + step), v(x + step, z + step), v(x + step, z)];
    const altitude = corners.reduce((sum, c) => sum + c[1], 0) / 4 + (valueNoise2((x + step / 2) * 0.08, (z + step / 2) * 0.08, 0, 43) - 0.5) * 14;
    pushQuad(buckets[altitude > SNOW_KEY ? 'snow' : altitude > ROCK_KEY ? 'rock' : 'ground'], ...corners);
  };
  for (let x = -half; x < half; x += fine) for (let z = -half; z < half; z += fine) place(x, z, fine);
  for (let x = -coarseHalf; x < coarseHalf; x += coarse) {
    for (let z = -coarseHalf; z < coarseHalf; z += coarse) if (x < -half || x >= half || z < -half || z >= half) place(x, z, coarse);
  }
  for (const [key, positions] of Object.entries(buckets)) {
    if (positions.length) surface.add(key, geometryFrom(positions), { uvScale: key === 'snow' ? 1 / 6 : 1 / 8, jitter: 0.03, color: groundColor });
  }
}

const plain = (b, geometry, matrix, color, opts = {}) => b.add('plain', geometry, { matrix, color, jitter: 0.05, ...opts });
const UNIT = new BoxGeometry(1, 1, 1);

/** A fir: a trunk and three stacked cones, dusted with snow from the middle of the mountain up. */
function fir(b, rng, x, z, { height = rng.range(7, 12), snowy = false } = {}) {
  const y = h(x, z);
  b.add('bark', new CylinderGeometry(0.22, 0.34, height * 0.35, 5, 1, true), { uv: 'keep', matrix: M(x, y + height * 0.175, z), color: [0.7, 0.62, 0.55] });
  const tint = [rng.range(0.55, 0.75), rng.range(0.8, 1), rng.range(0.6, 0.8)];
  for (let i = 0; i < 3; i++) {
    const r = height * (0.34 - i * 0.07);
    const turn = rng.range(0, 6);
    b.add('leaves', new ConeGeometry(r, height * 0.4, 7, 1, true), { uvScale: 0.25, flat: true, jitter: 0.1, color: tint, matrix: M(x, y + height * (0.3 + i * 0.2), z, turn) });
    // The snow lies on the upper half of each tier.
    if (snowy) b.add('snow', new ConeGeometry(r * 0.62, height * 0.22, 7, 1, true), { uvScale: 0.25, flat: true, jitter: 0.04, matrix: M(x, y + height * (0.3 + i * 0.2) + height * 0.1, z, turn) });
  }
}

/** A boulder: a flattened, lumpy icosahedron. */
function boulder(b, rng, x, z, radius) {
  const g = new IcosahedronGeometry(radius, 0);
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const s = 0.78 + 0.4 * valueNoise2(pos.getX(k) * 1.3 + x, pos.getZ(k) * 1.3 + z, 0, 45);
    pos.setXYZ(k, pos.getX(k) * s, pos.getY(k) * s * 0.72, pos.getZ(k) * s);
  }
  b.add('rock', g, { uvScale: 0.3, flat: true, jitter: 0.1, color: [rng.range(0.85, 1.05), rng.range(0.85, 1.02), rng.range(0.85, 1.05)], matrix: M(x, h(x, z) + radius * 0.25, z, rng.range(0, 6)) });
}

/** A cairn: three stacked stones. They mark the trail the way a walker would. */
function cairn(b, rng, x, z) {
  const y = h(x, z);
  for (const [i, r] of [0.55, 0.38, 0.24].entries()) {
    b.add('rock', new IcosahedronGeometry(r, 0), { uvScale: 0.4, flat: true, jitter: 0.08, matrix: M(x + rng.range(-0.05, 0.05), y + 0.3 + i * 0.5, z + rng.range(-0.05, 0.05), rng.range(0, 6), 1, 0.8, 1) });
  }
}

/** The trail sign by the climb's first bend: a post and a board. The board carries the risk table, which is unreadable from here. */
function signpost(b, x, z, ry) {
  const y = h(x, z);
  box(b, 'bark', M(), x, y, z, 0.22, 2.4, 0.22, { color: WOOD_DARK, moss: 0 });
  box(b, 'bark', M(), x, y + 1.5, z, 1.5, 0.8, 0.1, { color: WOOD, moss: 0 }, ry);
  for (let i = 0; i < 3; i++) box(b, 'plain', M(), x, y + 1.62 + i * 0.2, z, 1.1, 0.04, 0.14, { color: [0.2, 0.14, 0.1], moss: 0 }, ry);
}

/** Eduardo's things, left on the ledge: a broken walking pole, a rucksack and a flask. */
function ledgeProps(b) {
  const [sx, sz] = MICROMORT.site;
  const y = h(sx, sz);
  plain(b, UNIT, M(sx + 1.5, y + 0.02, sz + 0.6, 0.5, 1.4, 0.04, 0.05, 0, 0.0), [0.62, 0.56, 0.5]); // the pole's long half
  plain(b, UNIT, M(sx + 2.3, y + 0.02, sz + 1.1, -0.4, 0.5, 0.04, 0.05), [0.62, 0.56, 0.5]); // and its short one
  plain(b, UNIT, M(sx - 1.4, y + 0.3, sz - 0.4, 0.3, 0.55, 0.6, 0.35), [0.78, 0.2, 0.12]); // the rucksack
  plain(b, UNIT, M(sx - 1.4, y + 0.64, sz - 0.4, 0.3, 0.45, 0.14, 0.3), [0.6, 0.15, 0.1]);
  plain(b, new CylinderGeometry(0.06, 0.06, 0.2, 6), M(sx - 0.6, y + 0.1, sz + 0.7), [0.8, 0.84, 0.9]); // the flask (very empty)
}

/** A marquee: cream walls and a striped gabled roof, open at the front under an awning. */
function marquee(b, rng, cx, cz, { width = 8, depth = 6, facing = 0, colors = [CLOTH[0], CLOTH[1]] } = {}) {
  const y = h(cx, cz);
  const wall = 2.3;
  const F = M(cx, y, cz, facing);
  const put = (w, hgt, d, x, y0, z, color) => plain(b, UNIT, (() => { const m = M(x, y0 + hgt / 2, z, 0, w, hgt, d); return F.clone().multiply(m); })(), color);
  put(width, wall, 0.2, 0, 0, -depth / 2, [0.9, 0.86, 0.76]); // back
  put(0.2, wall, depth, -width / 2, 0, 0, [0.9, 0.86, 0.76]);
  put(0.2, wall, depth, width / 2, 0, 0, [0.9, 0.86, 0.76]);
  put(width * 0.3, wall, 0.2, -width * 0.35, 0, depth / 2, [0.9, 0.86, 0.76]); // the front, with a wide opening
  put(width * 0.3, wall, 0.2, width * 0.35, 0, depth / 2, [0.9, 0.86, 0.76]);
  const stripes = 6;
  for (let i = 0; i < stripes; i++) {
    const g = gable(width / stripes + 0.02, depth + 1.2, 2.2);
    g.rotateY(Math.PI / 2);
    plain(b, g, F.clone().multiply(M(-width / 2 + (i + 0.5) * (width / stripes), wall, 0)), colors[i % colors.length]);
  }
  plain(b, new ConeGeometry(0.28, 1.4, 4), F.clone().multiply(M(0, wall + 2.2 + 0.5, 0)), [0.95, 0.8, 0.2]); // a pennant
}

/** A long table with two benches, wine and a few glasses. */
function table(b, rng, cx, cz, length, ry) {
  const y = h(cx, cz);
  const F = M(cx, y, cz, ry);
  const part = (w, hgt, d, x, y0, z, color) => plain(b, UNIT, F.clone().multiply(M(x, y0 + hgt / 2, z, 0, w, hgt, d)), color);
  part(length, 0.12, 1.4, 0, 0.95, 0, WOOD);
  for (const sx of [-1, 1]) part(0.14, 0.95, 1.1, sx * (length / 2 - 0.4), 0, 0, WOOD_DARK);
  for (const sz of [-1, 1]) part(length, 0.1, 0.45, 0, 0.5, sz * 1.05, WOOD);
  const n = Math.floor(length / 1.6);
  for (let i = 0; i < n; i++) {
    const x = -length / 2 + 0.9 + i * 1.6;
    plain(b, new CylinderGeometry(0.07, 0.09, 0.34, 5), F.clone().multiply(M(x, 1.23, rng.range(-0.3, 0.3))), rng.chance(0.5) ? WINE : [0.3, 0.5, 0.25]); // a bottle
    plain(b, new CylinderGeometry(0.08, 0.05, 0.14, 5), F.clone().multiply(M(x + 0.5, 1.08, rng.range(-0.4, 0.4))), [1.2, 1.2, 1.25]); // a glass
  }
}

/** A barrel, standing, with two hoops. */
function barrel(b, x, y, z) {
  b.add('bark', new CylinderGeometry(0.5, 0.5, 1.0, 8), { uv: 'keep', matrix: M(x, y + 0.5, z), color: [0.9, 0.75, 0.6] });
  for (const dy of [0.2, 0.8]) plain(b, new CylinderGeometry(0.52, 0.52, 0.07, 8), M(x, y + dy, z), [0.2, 0.2, 0.22], { jitter: 0 });
}

/** A person at the festival: a coat, a head, a hat. One of them raises a glass. */
function reveller(b, rng, x, z, toast = false) {
  const y = h(x, z);
  const coat = rng.pick(CLOTH);
  plain(b, new CylinderGeometry(0.26, 0.34, 1.0, 6), M(x, y + 0.5, z), coat);
  plain(b, new IcosahedronGeometry(0.2, 0), M(x, y + 1.2, z), [0.95, 0.74, 0.6], { jitter: 0.02 });
  plain(b, new ConeGeometry(0.22, 0.3, 5), M(x, y + 1.46, z), rng.pick(CLOTH));
  if (toast) {
    plain(b, UNIT, M(x + 0.28, y + 1.05, z, 0, 0.1, 0.5, 0.1, 0, -0.3), coat);
    plain(b, new CylinderGeometry(0.06, 0.04, 0.12, 5), M(x + 0.36, y + 1.36, z), [1.3, 1.3, 1.35]);
  }
}

function buildFestival(b, rng) {
  const [fx, fz] = MICROMORT.festival;
  const y0 = h(fx, fz);

  // The bonfire in the middle of the square.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add('bark', new CylinderGeometry(0.12, 0.14, 1.9, 5), { uv: 'keep', matrix: M(fx + Math.cos(a) * 0.35, y0 + 0.5, fz + Math.sin(a) * 0.35, a, 1, 1, 1, 0.9, 0), color: [0.7, 0.55, 0.45] });
  }
  plain(b, new ConeGeometry(0.7, 1.9, 5), M(fx, y0 + 1.25, fz), FLAME, { jitter: 0.12 });
  plain(b, new ConeGeometry(0.4, 1.3, 4), M(fx + 0.1, y0 + 1.5, fz - 0.1, 0.5), [3, 2.4, 0.9], { jitter: 0.1 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add('rock', new IcosahedronGeometry(0.34, 0), { uvScale: 0.4, flat: true, matrix: M(fx + Math.cos(a) * 1.6, y0 + 0.2, fz + Math.sin(a) * 1.6, a, 1, 0.7, 1) });
  }

  // Marquees round the square, their open fronts towards the fire.
  const tents = [[-26, -12, Math.PI / 2], [26, -12, -Math.PI / 2], [-28, 18, Math.PI / 2], [28, 18, -Math.PI / 2], [0, -32, 0]];
  tents.forEach(([dx, dz, facing], i) => marquee(b, rng, fx + dx, fz + dz, { facing, colors: [CLOTH[i % CLOTH.length], CLOTH[1]] }));

  // Tables in two rows, and barrels beside the tents.
  for (const [dx, dz, ry] of [[-11, 4, 0], [11, 4, 0], [-11, 13, 0], [11, 13, 0], [0, 20, 0]]) table(b, rng, fx + dx, fz + dz, 9, ry);
  for (const [dx, dz] of [[-21, -2], [-21.8, -1], [-21.4, -1.8], [21, -2], [21.9, -1.2], [21.4, -2], [-3, -27], [-1.9, -27.4], [-2.5, -26]]) barrel(b, fx + dx, h(fx + dx, fz + dz), fz + dz);
  for (const dx of [-22.4, 22.4]) barrel(b, fx + dx, h(fx + dx, fz - 1.5) + 1, fz - 1.5); // the second tier (stands on the first)

  // The cellar: a stone hut at the back of the plateau, with a chimney.
  const [cx, cz] = [fx + 18, fz - 36];
  const cy = h(cx, cz);
  box(b, 'stone', M(), cx, cy, cz, 9, 3.2, 6, { moss: 0.2, color: [0.9, 0.9, 0.95] });
  const roof = gable(9.6, 7.4, 2.2);
  b.add('roof', roof, { uvScale: 0.3, matrix: M(cx, cy + 3.2, cz, Math.PI / 2), color: [1.05, 1.05, 1.1] });
  box(b, 'stone', M(), cx + 3, cy + 3.2, cz + 1, 1, 2.6, 1, { moss: 0.1 });
  box(b, 'plain', M(), cx - 0.6, cy, cz + 3.02, 1.4, 2.2, 0.08, { color: [0.12, 0.09, 0.08], moss: 0, grime: 0 });

  // Bunting between posts round the square. The strings glow: they are what holds the place together.
  const posts = [];
  const around = 10;
  for (let i = 0; i < around; i++) {
    const a = (i / around) * Math.PI * 2 + 0.3;
    const px = fx + Math.cos(a) * 25;
    const pz = fz + Math.sin(a) * 22 - 4;
    posts.push([px, pz]);
    b.add('bark', new CylinderGeometry(0.12, 0.16, 6.4, 5, 1, true), { uv: 'keep', matrix: M(px, h(px, pz) + 3.2, pz), color: [0.7, 0.58, 0.45] });
  }
  posts.forEach(([px, pz], i) => {
    const [qx, qz] = posts[(i + 1) % posts.length];
    const a = new Vector3(px, h(px, pz) + 6, pz);
    const c = new Vector3(qx, h(qx, qz) + 6, qz);
    const sag = new Vector3((a.x + c.x) / 2, Math.min(a.y, c.y) + 3.4 - 1.4, (a.z + c.z) / 2);
    const curve = new CatmullRomCurve3([a, sag, c]);
    b.add('rootGlow', taperedTube(curve, 8, 4, 0.05, 0.05, 6), { uv: 'keep', jitter: 0.02, unshaded: true });
    for (let k = 1; k < 11; k++) {
      const p = curve.getPointAt(k / 11);
      plain(b, new ConeGeometry(0.3, 0.62, 3), M(p.x, p.y - 0.36, p.z, rng.range(0, 6), 1, 1, 1, Math.PI, 0), CLOTH[(i + k) % CLOTH.length], { jitter: 0.04 });
    }
  });

  // The crowd: round the fire, at the tables, in front of the marquees.
  const crowd = [];
  for (let i = 0; i < 12; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(3.4, 7);
    crowd.push([fx + Math.cos(a) * d, fz + Math.sin(a) * d]);
  }
  for (const [dx, dz] of [[-11, 2.4], [-8, 5.6], [-14, 2.4], [11, 2.4], [8, 5.6], [14, 5.6], [-12, 11], [-9, 14.6], [10, 11], [12, 14.6], [-1, 18.6], [3, 21.4]]) crowd.push([fx + dx, fz + dz]);
  crowd.forEach(([x, z], i) => reveller(b, rng, x, z, i % 3 === 0));

  // A banner arch over the trail's way in, where the climbers come up into the square.
  const [ax, az] = [fx + 2, fz + 40];
  for (const s of [-1, 1]) b.add('bark', new CylinderGeometry(0.2, 0.26, 6.6, 6, 1, true), { uv: 'keep', matrix: M(ax + s * 4.2, h(ax + s * 4.2, az) + 3.3, az), color: [0.7, 0.55, 0.44] });
  for (let i = 0; i < 6; i++) plain(b, UNIT, M(ax - 3.5 + i * 1.4, h(ax, az) + 6.2, az, 0, 1.4, 1.4, 0.1), CLOTH[i % 2 === 0 ? 0 : 1]);
}

/** Snow banked in drifts on the plateau. */
function drifts(b, rng) {
  const [fx, fz] = MICROMORT.festival;
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(32, 62);
    const x = fx + Math.cos(a) * d * 1.3;
    const z = fz + Math.sin(a) * d;
    const g = new IcosahedronGeometry(rng.range(2, 4.5), 0);
    b.add('snow', g, { uvScale: 0.2, flat: true, jitter: 0.05, matrix: M(x, h(x, z) + 0.2, z, rng.range(0, 6), 1.3, 0.34, 1) });
  }
}

function scatter(rng, count, sample, test) {
  const out = [];
  for (let tries = 0; out.length < count && tries < count * 80; tries++) {
    const [x, z] = sample();
    if (test(x, z)) out.push([x, z]);
  }
  return out;
}

function buildPlanting(b, rng) {
  const [fx, fz] = MICROMORT.festival;
  const wide = () => [rng.range(-170, 170), rng.range(-120, 230)];
  const clearOfLedge = (x, z) => !onLedge(x, z, 18);
  // Firs up to the treeline (they thin out and gain snow on the way up).
  for (const [x, z] of scatter(rng, 150, wide, (x, z) => h(x, z) < 54 && !onTrail(x, z, 9) && clearOfLedge(x, z))) fir(b, rng, x, z, { snowy: h(x, z) > 36 });
  // Pines round the festival, heavy with snow.
  for (const [x, z] of scatter(rng, 38, () => [fx + rng.range(-90, 90), fz + rng.range(-70, 70)], (x, z) => Math.hypot((x - fx) / 1.3, z - fz) > 50 && h(x, z) > 80 && Math.abs(x) < 85)) fir(b, rng, x, z, { height: rng.range(6, 10), snowy: true });
  // Boulders on the slopes, small ones at the trail's edge.
  for (const [x, z] of scatter(rng, 90, wide, (x, z) => h(x, z) > 8 && !onTrail(x, z, 4.5) && clearOfLedge(x, z) && Math.hypot(x - fx, z - fz) > 60)) boulder(b, rng, x, z, rng.range(0.7, 3.2));
  // The cairns that mark the way.
  for (const z of [150, 118, 82, 50, 2, -24, -52, -80, -110, -138]) cairn(b, rng, trailX(z) + (z % 2 === 0 ? 3.2 : -3.2), z);
  signpost(b, trailX(96) + 3.4, 96, -0.6);
}

/** Builds the Micromort Mountain level. Same interface as createTaProhmWorld. */
export function createMicromortWorld(options = {}) {
  const { seed = 7, preset = 'alpine' } = options;
  const kit = createWorldKit(seed);
  const { rng } = kit;
  const props = new MeshBuilder(rng);
  const surface = new MeshBuilder(rng);

  buildMountainGround(surface);
  buildPlanting(props, rng);
  ledgeProps(props);
  buildFestival(props, rng);
  drifts(props, rng);

  return assembleWorld(kit, {
    name: 'micromort-mountain',
    props,
    surface,
    preset,
    reflections: false,
    waterY: 0,
    layout: MICROMORT,
    tour: MICROMORT_TOUR,
    orbitTarget: [0, 60, -60],
  });
}

export const MICROMORT_TOUR = [
  { pos: [10, 6, 190], look: [3, 30, 60] },
  { pos: [-30, 58, 22], look: [3, 57, 22] }, // Eduardo's ledge, from the west
  { pos: [-4, 72, -20], look: [0, 80, -100] },
  { pos: [-12, 96, -86], look: [0, 108, -150] },
  { pos: [2, 113, -126], look: [0, 112, -176] }, // up on the plateau, in front of the arch
  { pos: [-10, 114.5, -152], look: [4, 112.5, -178] },
  { pos: [22, 115, -156], look: [-8, 112, -184] },
  { pos: [-24, 118, -196], look: [8, 111, -168] },
  { pos: [0, 150, -120], look: [0, 105, -180] },
  { pos: [60, 80, 40], look: [0, 80, -100] },
];
