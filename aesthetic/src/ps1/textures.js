import { DataTexture, NearestFilter, RGBAFormat, RepeatWrapping, UnsignedByteType } from 'three';
import { PALETTE, hexToBytes } from '../palette.js';
import { createRandom, valueNoise2 } from '../util/random.js';

// Procedural, tileable, low-resolution textures. They are generated in code so no image
// decoding is needed on any platform, and so a future port can regenerate them from the seed.
// All are power-of-two, at most 64 px, nearest filtered, without mipmaps (PS1 VRAM style).

const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
const wrap = (v, p) => ((v % p) + p) % p;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale = (c, f) => [c[0] * f, c[1] * f, c[2] * f];
const add = (c, v) => [c[0] + v, c[1] + v, c[2] + v];

function canvas(w, h) {
  const data = new Uint8Array(w * h * 4);
  return {
    w,
    h,
    data,
    set(x, y, c, a = 255) {
      const i = (wrap(y, h) * w + wrap(x, w)) * 4;
      data[i] = clampByte(c[0]);
      data[i + 1] = clampByte(c[1]);
      data[i + 2] = clampByte(c[2]);
      data[i + 3] = clampByte(a);
    },
    get(x, y) {
      const i = (wrap(y, h) * w + wrap(x, w)) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]];
    },
  };
}

export function toTexture(c, name) {
  const t = new DataTexture(c.data, c.w, c.h, RGBAFormat, UnsignedByteType);
  t.name = name;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.needsUpdate = true;
  return t;
}

const C = Object.fromEntries(Object.entries(PALETTE).map(([k, v]) => [k, hexToBytes(v)]));

// Coursed sandstone blocks, bevelled, with grain, pits and lichen.
function sandstone(seed) {
  const W = 64;
  const H = 64;
  const c = canvas(W, H);
  const r = createRandom(seed);
  const offsets = [0, 8, 4, 12, 2, 10, 6, 14];
  const tints = Array.from({ length: 8 * 4 }, () => [r.range(0.9, 1.1), r.range(-0.06, 0.06)]);
  for (let y = 0; y < H; y++) {
    const row = Math.floor(y / 8);
    const ly = y % 8;
    for (let x = 0; x < W; x++) {
      const o = offsets[row];
      const lx = (x + o) % 16;
      const block = Math.floor(wrap(x + o, 64) / 16);
      const [bright, warm] = tints[row * 4 + block];
      let col = scale(mix(C.sandstone, warm > 0 ? C.laterite : C.sandstoneLight, Math.abs(warm)), bright);
      const n = valueNoise2(x / 4, y / 4, 16, seed) - 0.5;
      col = add(col, n * 28);
      if (ly === 1) col = add(col, 14);
      if (ly === 7) col = add(col, -18);
      if (lx === 1) col = add(col, 6);
      if (lx === 15) col = add(col, -10);
      const lichen = valueNoise2(x / 8, y / 8, 8, seed + 1);
      if (lichen > 0.7) col = mix(col, C.lichen, 0.45);
      if (r.chance(0.035)) col = scale(col, 0.72);
      if (lx === 0 || ly === 0) col = C.mortar;
      c.set(x, y, col);
    }
  }
  return c;
}

// Rosette diaper relief, the carved pattern that covers Angkor's walls. Embossed by height.
function relief(seed) {
  const W = 64;
  const c = canvas(W, W);
  const height = (x, y) => {
    x = wrap(x, W);
    y = wrap(y, W);
    if (x % 16 === 0 || y % 16 === 0) return 0.7;
    const lx = (x % 16) - 8;
    const ly = (y % 16) - 8;
    const rr = Math.hypot(lx, ly);
    const th = Math.atan2(ly, lx);
    if (rr < 1.6) return 1.5;
    if (rr < 4.6 + 1.6 * Math.cos(4 * th)) return 1;
    if (rr > 6.2 && rr < 6.9) return 0;
    return 0.35;
  };
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const h = height(x, y);
      const slope = height(x - 1, y - 1) - height(x + 1, y + 1);
      let col = scale(C.sandstone, 0.82 + 0.14 * h);
      col = add(col, slope * 26 + (valueNoise2(x / 4, y / 4, 16, seed) - 0.5) * 22);
      if (valueNoise2(x / 8, y / 8, 8, seed + 3) > 0.74) col = mix(col, C.lichen, 0.35);
      c.set(x, y, col);
    }
  }
  return c;
}

// Rows of carved pseudo-glyphs: the "original language inscribed in stone" of the lore.
// Not a real script. The grooves are written with alpha 0, which the inscription material
// uses as its glow mask.
function inscription(seed) {
  const W = 64;
  const c = canvas(W, W);
  const r = createRandom(seed);
  // Rounded letter bodies with a "hair" stroke on top: Brahmic-flavoured, but invented.
  const span = (g, y, x0, x1) => {
    for (let x = x0; x <= x1; x++) g[y][x] = 1;
  };
  const col = (g, x, y0, y1) => {
    for (let y = y0; y <= y1; y++) g[y][x] = 1;
  };
  const bodies = [
    (g) => (col(g, 0, 2, 5), col(g, 4, 2, 5), span(g, 6, 1, 3)), // u
    (g) => (span(g, 2, 1, 3), col(g, 0, 3, 5), col(g, 4, 3, 5), span(g, 6, 1, 3)), // o
    (g) => (span(g, 2, 1, 3), col(g, 0, 3, 6), col(g, 4, 3, 6)), // n
    (g) => (col(g, 0, 2, 5), col(g, 4, 2, 5), col(g, 2, 3, 5), span(g, 6, 1, 1), span(g, 6, 3, 3)), // double loop
    (g) => (span(g, 2, 1, 3), col(g, 0, 3, 5), col(g, 4, 3, 5), span(g, 6, 1, 3), (g[4][2] = 1)), // o with dot
    (g) => (span(g, 2, 0, 3), col(g, 4, 3, 4), span(g, 5, 1, 3), (g[6][0] = 1)), // hook
  ];
  const hairs = [
    (g, c) => ((g[0][c] = 1), (g[1][c] = 1)),
    (g, c) => ((g[0][c] = 1), (g[0][Math.min(4, c + 1)] = 1), (g[1][c] = 1)),
    (g, c) => ((g[1][c] = 1), (g[0][Math.max(0, c - 1)] = 1)),
  ];
  const glyphs = Array.from({ length: 16 }, () => {
    const g = Array.from({ length: 7 }, () => new Array(5).fill(0));
    r.pick(bodies)(g);
    r.pick(hairs)(g, r.pick([0, 2, 4]));
    return g;
  });
  const groove = new Uint8Array(W * W);
  for (let row = 0; row < 6; row++) {
    const y0 = 2 + row * 10;
    for (let col = 0; col < 9; col++) {
      if (r.chance(0.08)) continue;
      const g = r.pick(glyphs);
      const x0 = 1 + col * 7;
      for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) if (g[gy][gx]) groove[(y0 + gy) * W + x0 + gx] = 1;
    }
  }
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let col = scale(C.sandstoneLight, 0.92);
      col = add(col, (valueNoise2(x / 4, y / 4, 16, seed) - 0.5) * 16);
      const g = groove[y * W + x];
      const lit = !g && groove[wrap(y - 1, W) * W + wrap(x - 1, W)];
      if (lit) col = scale(col, 1.16);
      if (g) col = scale(col, 0.5);
      c.set(x, y, col, g ? 0 : 255);
    }
  }
  return c;
}

function laterite(seed) {
  const W = 32;
  const c = canvas(W, W);
  const r = createRandom(seed);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let col = add(C.laterite, (valueNoise2(x / 2, y / 2, 16, seed) - 0.5) * 30);
      col = add(col, (valueNoise2(x / 4, y / 4, 8, seed + 2) - 0.5) * 30);
      if (y % 16 === 0 || (x + (Math.floor(y / 16) % 2) * 8) % 16 === 0) col = scale(col, 0.7);
      c.set(x, y, col);
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = r.int(0, W - 1);
    const y = r.int(0, W - 1);
    c.set(x, y, C.lateriteDark);
    if (r.chance(0.5)) c.set(x + 1, y, C.lateriteDark);
  }
  return c;
}

function roofTiles(seed) {
  const W = 32;
  const c = canvas(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const ly = y % 4;
      let col = add(C.roof, (valueNoise2(x / 4, y / 4, 8, seed) - 0.5) * 24);
      if (ly === 0) col = scale(col, 0.62);
      if (ly === 1) col = scale(col, 1.12);
      if ((x + (Math.floor(y / 4) % 2) * 2) % 4 === 0) col = scale(col, 0.85);
      if (valueNoise2(x / 8, y / 8, 4, seed + 5) > 0.68) col = mix(col, C.moss, 0.35);
      c.set(x, y, col);
    }
  }
  return c;
}

function grass(seed) {
  const W = 64;
  const c = canvas(W, W);
  const r = createRandom(seed);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const n1 = valueNoise2(x / 8, y / 8, 8, seed);
      const n2 = valueNoise2(x / 2, y / 2, 32, seed + 1);
      let col = mix(C.grass, C.grassDry, n1 * 0.55);
      col = add(col, (n2 - 0.5) * 30);
      if (r.chance(0.06)) col = scale(C.leafLight, 1.05);
      if (r.chance(0.05)) col = scale(C.leafDark, 1.1);
      if (r.chance(0.015)) col = C.dirt;
      c.set(x, y, col);
    }
  }
  return c;
}

function water(seed) {
  const W = 32;
  const c = canvas(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const n = valueNoise2(x / 4, y / 4, 8, seed);
      const wave = Math.sin(((x + n * 6) / W) * Math.PI * 4 + (y / W) * Math.PI * 2);
      let col = add(C.water, (n - 0.5) * 18);
      if (wave > 0.82) col = mix(col, C.waterLight, 0.6);
      c.set(x, y, col);
    }
  }
  return c;
}

// Palm trunk: ring scars and a diamond pattern.
function bark(seed) {
  const W = 32;
  const c = canvas(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const ly = y % 4;
      let col = add(C.palmTrunk, (valueNoise2(x / 4, y / 4, 8, seed) - 0.5) * 22);
      if (ly === 0) col = C.palmTrunkDark;
      if (ly === 1) col = add(col, 16);
      if ((x + (Math.floor(y / 4) % 2) * 4) % 8 === 0 && ly > 1) col = scale(col, 0.75);
      c.set(x, y, col);
    }
  }
  return c;
}

// Strangler-fig root: long fibres.
function rootBark(seed) {
  const W = 32;
  const c = canvas(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const streak = valueNoise2(x / 2, y / 8, 16, seed);
      let col = mix(C.rootDark, C.root, streak);
      col = add(col, (valueNoise2(x / 4, y / 4, 8, seed + 1) - 0.5) * 20);
      c.set(x, y, col);
    }
  }
  return c;
}

// Canopy leaf clusters.
function leaves(seed) {
  const W = 32;
  const c = canvas(W, W);
  const r = createRandom(seed);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) c.set(x, y, add(C.leafDark, (valueNoise2(x / 4, y / 4, 8, seed) - 0.5) * 16));
  for (let i = 0; i < 46; i++) {
    const cx = r.int(0, W - 1);
    const cy = r.int(0, W - 1);
    const col = mix(C.leaf, C.leafLight, r.next() * 0.7);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const d = (dx * dx) / 9 + (dy * dy) / 4;
        if (d > 1) continue;
        c.set(cx + dx, cy + dy, scale(col, d > 0.6 ? 0.78 : 1 + (dy < 0 ? 0.08 : 0)));
      }
    }
  }
  return c;
}

// Palm frond: midrib up the centre (u = 0.5), leaflets angled towards the tip (v = 1).
function frond(seed) {
  const W = 32;
  const H = 64;
  const c = canvas(W, H);
  const r = createRandom(seed);
  for (let i = 0; i < W * H; i++) c.data[i * 4 + 3] = 0;
  for (let y0 = 2; y0 < H - 2; y0 += 3) {
    const t = y0 / H;
    const len = 15 * Math.pow(Math.sin(Math.PI * (0.06 + 0.9 * t)), 0.6);
    for (const side of [-1, 1]) {
      const tone = r.range(0, 0.6);
      const steps = Math.ceil(len * 2);
      for (let s = 0; s <= steps; s++) {
        const k = s / steps;
        const x = Math.round(15.5 + side * (1 + k * len));
        const y = Math.round(y0 + k * len * 0.45);
        if (y >= H) continue;
        const col = scale(mix(C.leaf, C.leafLight, tone + k * 0.3), r.range(0.9, 1.05));
        c.set(x, y, col);
        if (k < 0.65) c.set(x, y + 1, scale(col, 0.85));
      }
    }
  }
  for (let y = 0; y < H - 2; y++) {
    c.set(15, y, C.rachis);
    c.set(16, y, scale(C.rachis, 0.85));
  }
  return c;
}

// Grass tuft blades for crossed-quad billboards.
function tuft(seed) {
  const W = 32;
  const c = canvas(W, W);
  const r = createRandom(seed);
  for (let i = 0; i < W * W; i++) c.data[i * 4 + 3] = 0;
  for (let b = 0; b < 16; b++) {
    const x0 = r.range(4, 28);
    const lean = r.range(-8, 8);
    const h = r.range(14, 30);
    const tone = r.next();
    for (let y = 0; y < h; y++) {
      const k = y / h;
      const x = Math.round(x0 + lean * k * k);
      const col = mix(scale(C.leafDark, 1.1), mix(C.leaf, C.grassDry, tone * 0.6), k);
      c.set(x, y, col);
      if (k < 0.4) c.set(x + 1, y, scale(col, 0.85));
    }
  }
  return c;
}


// Thitpok (Tetrameles) bark: pale, smooth, faint vertical streaks and lichen patches.
function thitpok(seed) {
  const W = 32;
  const c = canvas(W, W);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      let col = add(C.thitpok, (valueNoise2(x / 2, y / 8, 16, seed) - 0.5) * 26);
      col = add(col, (valueNoise2(x / 4, y / 4, 8, seed + 1) - 0.5) * 12);
      const lichen = valueNoise2(x / 8, y / 8, 4, seed + 2);
      if (lichen > 0.68) col = mix(col, C.thitpokLichen, 0.7);
      if (lichen < 0.2) col = scale(col, 0.86);
      c.set(x, y, col);
    }
  }
  return c;
}

/** Embossed relief from a height function h(x, y) with y running top-down; writes upright. */
function emboss(W, H, h, seed, base, { grain = 18, groove = 0.25, moss = 0.4, mossAt = 0.72 } = {}) {
  const c = canvas(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = h(x, y);
      const slope = h(x - 1, y - 1) - h(x + 1, y + 1);
      let col = scale(base, 0.62 + 0.32 * Math.min(v, 1.4));
      col = add(col, slope * 52 + (valueNoise2(x / 4, y / 4, W / 4, seed) - 0.5) * grain);
      if (v < groove) col = scale(col, 0.82);
      if (valueNoise2(x / 8, y / 8, W / 8, seed + 3) > mossAt) col = mix(col, C.moss, moss);
      c.set(x, H - 1 - y, col);
    }
  }
  return c;
}

// Two niches, each with a standing devata: tiara, head, torso, flared skirt, on a plinth.
function devata(seed) {
  const W = 64;
  const h = (x, y) => {
    x = wrap(x, W);
    y = wrap(y, W);
    const lx = x % 32;
    const cx = 15.5;
    if (y >= 58 || lx === 0 || lx === 31) return 0.75; // frame and base course
    if (y >= 54) return Math.abs(((lx + 2) % 6) - 3) < 1.5 ? 1 : 0.6; // plinth rosettes
    const arch = Math.hypot(lx - cx, Math.max(0, 14 - y) * 1.2);
    if (arch > 12.5 || lx < 3 || lx > 28) return 0.8; // the niche's raised border
    let v = 0.2; // recess
    const dx = Math.abs(lx - cx);
    if (y >= 6 && y <= 10 && dx <= 3 && (dx + y) % 2 === 0) v = 1.1; // tiara points
    if (Math.hypot(lx - cx, y - 13) <= 3) v = 1.2; // head
    if (y >= 16 && y <= 29 && dx <= 3.5 - (y - 16) * 0.08) v = 1; // torso
    if (y >= 17 && y <= 23 && lx >= cx + 3 && lx <= cx + 5 - (y - 17) * 0.2) v = 0.95; // raised arm
    if (y >= 12 && y <= 17 && Math.abs(lx - (cx + 5)) <= 1) v = 1.05; // flower held up
    if (y >= 29 && y <= 50 && dx <= 3 + (y - 29) * 0.28) v = 0.9 + ((y - 29) % 4 === 0 ? -0.25 : 0); // pleated skirt
    if (y > 50 && y < 54 && dx <= 4) v = 0.85; // feet
    return v;
  };
  return emboss(W, W, h, seed, C.stoneGrey);
}

// A serene carved face (Bayon style) for one side of a face tower: diadem, lowered eyelids,
// broad nose, smiling lips, long earlobes.
function face(seed) {
  const W = 64;
  const h = (x, y) => {
    x = Math.min(63, Math.max(0, x));
    y = Math.min(63, Math.max(0, y));
    const fx = (x - 31.5) / 19;
    const fy = (y - 33) / 25;
    const inFace = fx * fx + fy * fy <= 1;
    if (y < 5) return Math.abs((x % 8) - 4) < 2 - y * 0.3 ? 1.1 : 0.3; // crown points
    if (y >= 5 && y <= 10) return (x % 6 < 3 ? 1.05 : 0.85) * (Math.abs(x - 31.5) < 26 ? 1 : 0.6); // diadem beads
    if (!inFace) {
      const ear = Math.abs(Math.abs(x - 31.5) - 24) <= 2.2 && y >= 22 && y <= 50;
      return ear ? 0.9 : 0.35;
    }
    let v = 0.75 + 0.2 * (1 - fx * fx - fy * fy);
    const ex = Math.abs(x - 31.5);
    if (y >= 20 && y <= 21 && ex >= 5 && ex <= 15) v = 1.05; // brows
    if (y >= 25 && y <= 27 && ex >= 6 && ex <= 14) v = y === 27 ? 0.2 : 1; // lowered lids, slit below
    if (y >= 22 && y <= 39 && ex <= 1.6 + (y - 22) * 0.12) v = 1.35; // nose ridge
    else if (y >= 28 && y <= 39 && x > 31.5 && ex <= 3 + (y - 22) * 0.14) v = 0.45; // shadow beside the nose
    if (y >= 38 && y <= 40 && ex <= 5) v = y === 40 ? 0.3 : 1.1; // nostrils
    const smile = 46 - (ex * ex) / 18;
    if (ex <= 9 && Math.abs(y - smile) <= 0.6) v = 0.2; // lip line, corners up
    if (ex <= 7.5 && y > smile && y <= smile + 2.5) v = 1.05; // lower lip
    if (ex <= 7.5 && y < smile && y >= smile - 1.8) v = 0.95; // upper lip
    return v;
  };
  return emboss(W, W, h, seed, C.stoneGrey, { grain: 12, moss: 0.3, mossAt: 0.8 });
}

// Forest floor: leaf litter, moss and bare earth.
function litter(seed) {
  const W = 64;
  const c = canvas(W, W);
  const r = createRandom(seed);
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const n = valueNoise2(x / 8, y / 8, 8, seed);
      let col = mix(C.litter, C.moss, smoothstepT(0.55, 0.8, n) * 0.7);
      col = add(col, (valueNoise2(x / 2, y / 2, 32, seed + 1) - 0.5) * 26);
      c.set(x, y, col);
    }
  }
  for (let i = 0; i < 160; i++) {
    const x = r.int(0, W - 1);
    const y = r.int(0, W - 1);
    const col = scale(mix(C.litterLight, C.dirt, r.next()), r.range(0.85, 1.15));
    c.set(x, y, col);
    c.set(x + 1, y, scale(col, 0.9));
    if (r.chance(0.5)) c.set(x, y + 1, scale(col, 0.8));
  }
  return c;
}

const smoothstepT = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createTextures(seed = 7) {
  return {
    sandstone: toTexture(sandstone(seed + 1), 'sandstone'),
    relief: toTexture(relief(seed + 2), 'relief'),
    inscription: toTexture(inscription(seed + 3), 'inscription'),
    laterite: toTexture(laterite(seed + 4), 'laterite'),
    roof: toTexture(roofTiles(seed + 5), 'roof'),
    grass: toTexture(grass(seed + 6), 'grass'),
    water: toTexture(water(seed + 7), 'water'),
    bark: toTexture(bark(seed + 8), 'bark'),
    root: toTexture(rootBark(seed + 9), 'root'),
    leaves: toTexture(leaves(seed + 10), 'leaves'),
    frond: toTexture(frond(seed + 11), 'frond'),
    tuft: toTexture(tuft(seed + 12), 'tuft'),
    thitpok: toTexture(thitpok(seed + 13), 'thitpok'),
    devata: toTexture(devata(seed + 14), 'devata'),
    face: toTexture(face(seed + 15), 'face'),
    litter: toTexture(litter(seed + 16), 'litter'),
  };
}
