import { AdditiveBlending, BufferGeometry, DodecahedronGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, Points, PointsMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPS1Material } from '../ps1/material.js';
import { hexToRgb } from '../palette.js';
import { MeshBuilder } from './geometry.js';
import { assembleWorld, createWorldKit } from './world.js';

// Round 144: the endless landscape of The Journey 2, in the PS1 look. The ground is not built once: it is cut
// into square chunks, and only the chunks around a point (the camera) exist. `streamTo(x, z)` builds the missing ones
// nearest first, a few per call, and drops those left behind, so the level is as large as the walk and costs the same
// at every step.
//
// The package does not know the landscape: the host passes `terrain` ({ heightAt, coverAt, treesIn, waterY }), the
// pure functions of server/src/road/terrain.js, so the server's graph and this ground always agree. Trees are very
// simple on purpose: a trunk and a cone or two (a fir), or a trunk and a faceted ball (a round tree).

export const ENDLESS = Object.freeze({
  chunk: 48, // metres; must equal the terrain's chunk (the trees are asked for per chunk)
  cells: 8, // quads per side
  radius: 4, // chunks kept on each side of the camera's chunk
  fog: Object.freeze({ near: 46, far: 186 }), // the far edge of the kept chunks is hidden in the fog
});

const SAND = [1.5, 1.22, 0.9]; // a tint over the grass texture, as the Angkor level tints its dirt
const COVER_TINT = { shore: SAND, meadow: [1.06, 1.04, 0.86], forest: [0.82, 0.92, 0.74], highland: [1, 1, 1], snow: [1, 1, 1], water: [0.9, 0.86, 0.72] };
const COVER_KEY = { shore: 'ground', meadow: 'ground', forest: 'ground', water: 'ground', highland: 'rock', snow: 'snow' };

function geometryFrom({ positions, normals, uvs, colors }) {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  return g;
}
const bucket = () => ({ positions: [], normals: [], uvs: [], colors: [] });

// One flat-shaded triangle.
function tri(out, a, b, c, color, uv = [[0, 0], [1, 0], [0.5, 1]]) {
  const [ux, uy, uz] = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const [vx, vy, vz] = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  let [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const length = Math.hypot(nx, ny, nz) || 1;
  [nx, ny, nz] = [nx / length, ny / length, nz / length];
  out.positions.push(...a, ...b, ...c);
  out.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
  out.uvs.push(...uv[0], ...uv[1], ...uv[2]);
  out.colors.push(...color, ...color, ...color);
}

// A cone of `sides` triangles, open at the base, each face a little lighter or darker than the next.
function cone(out, x, y, z, radius, height, sides, color, turn = 0) {
  const apex = [x, y + height, z];
  for (let k = 0; k < sides; k += 1) {
    const a0 = turn + (k / sides) * Math.PI * 2;
    const a1 = turn + ((k + 1) / sides) * Math.PI * 2;
    const shade = 0.86 + 0.28 * ((k * 7) % sides) / sides;
    tri(out, [x + Math.cos(a1) * radius, y, z + Math.sin(a1) * radius], [x + Math.cos(a0) * radius, y, z + Math.sin(a0) * radius], apex, color.map((v) => v * shade));
  }
}

// A trunk: a prism of `sides` quads, narrower at the top.
function trunk(out, x, y, z, radius, height, sides, color) {
  for (let k = 0; k < sides; k += 1) {
    const a0 = (k / sides) * Math.PI * 2;
    const a1 = ((k + 1) / sides) * Math.PI * 2;
    const p = (a, r, h) => [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r];
    const shade = 0.8 + 0.4 * (k % 2);
    const c = color.map((v) => v * shade);
    tri(out, p(a1, radius, 0), p(a0, radius, 0), p(a0, radius * 0.7, height), c, [[1, 0], [0, 0], [0, 1]]);
    tri(out, p(a1, radius, 0), p(a0, radius * 0.7, height), p(a1, radius * 0.7, height), c, [[1, 0], [0, 1], [1, 1]]);
  }
}

// A faceted ball: two pyramids base to base (an octahedron stretched to taste).
function ball(out, x, y, z, radius, height, color, turn = 0) {
  const ring = [0, 1, 2, 3].map((k) => { const a = turn + (k / 4) * Math.PI * 2; return [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius]; });
  const [top, bottom] = [[x, y + height * 0.72, z], [x, y - height * 0.28, z]];
  for (let k = 0; k < 4; k += 1) {
    const [a, b] = [ring[k], ring[(k + 1) % 4]];
    tri(out, b, a, top, color.map((v) => v * (0.9 + 0.1 * k)));
    tri(out, a, b, bottom, color.map((v) => v * (0.62 + 0.06 * k)));
  }
}

// Round 160 (issue #8): the trees of the other biomes, as simple as the first two.
// A palm: a thin leaning trunk and a star of drooping fronds, each one triangle.
function palm(bark, leaves, x, y, z, height, color, turn, detail) {
  const lean = 0.12 * height;
  const [tx, tz] = [x + Math.cos(turn) * lean, z + Math.sin(turn) * lean];
  if (detail) {
    const r = 0.16 + height * 0.006;
    const base = [[x - r, y - 0.2, z], [x + r, y - 0.2, z], [x, y - 0.2, z + r]];
    const top = [tx, y + height, tz];
    for (let k = 0; k < 3; k += 1) tri(bark, base[(k + 1) % 3], base[k], top, [0.66, 0.56, 0.42].map((v) => v * (0.85 + 0.15 * k)), [[1, 0], [0, 0], [0.5, 1]]);
  }
  const fronds = detail ? 6 : 4;
  const reach = height * 0.34;
  for (let k = 0; k < fronds; k += 1) {
    const a = turn + (k / fronds) * Math.PI * 2;
    const [ax, az] = [Math.cos(a), Math.sin(a)];
    const [sx, sz] = [-az * reach * 0.22, ax * reach * 0.22];
    const crown = [tx, y + height, tz];
    const tip = [tx + ax * reach, y + height - reach * 0.42, tz + az * reach];
    const shade = color.map((v) => v * (0.82 + 0.18 * (k % 3) / 2));
    tri(leaves, [tx + sx, y + height + 0.05, tz + sz], tip, [tx - sx, y + height + 0.05, tz - sz], shade);
    tri(leaves, crown, [tx - sx, y + height + 0.05, tz - sz], tip, shade.map((v) => v * 0.8));
  }
}
// A broad-leaved tree of the jungle: a tall trunk and a wide, flat crown.
function broad(leaves, x, y, z, height, color, turn) {
  ball(leaves, x, y + height * 0.78, z, height * 0.5, height * 0.36, color, turn);
}

/** The meshes of one chunk: ground by material, water where the ground dips under it, and the chunk's trees. */
export function buildChunk(terrain, materials, cx, cz, { detail = true } = {}) {
  const { chunk, cells } = ENDLESS;
  const size = chunk / cells;
  const [x0, z0] = [cx * chunk, cz * chunk];
  // Heights one cell beyond the chunk on every side, so normals match the neighbouring chunk's along the seam.
  const heights = [];
  for (let i = -1; i <= cells + 1; i += 1) {
    const row = [];
    for (let j = -1; j <= cells + 1; j += 1) row.push(terrain.heightAt(x0 + i * size, z0 + j * size));
    heights.push(row);
  }
  const h = (i, j) => heights[i + 1][j + 1];
  const normal = (i, j) => {
    const [dx, dz] = [h(i + 1, j) - h(i - 1, j), h(i, j + 1) - h(i, j - 1)];
    const length = Math.hypot(dx, 2 * size, dz);
    return [-dx / length, (2 * size) / length, -dz / length];
  };
  const grounds = { ground: bucket(), rock: bucket(), snow: bucket() };
  const water = bucket();
  let lowest = Infinity;
  for (let i = 0; i < cells; i += 1) {
    for (let j = 0; j < cells; j += 1) {
      const corners = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]];
      const middle = (h(i, j) + h(i + 1, j) + h(i, j + 1) + h(i + 1, j + 1)) / 4;
      lowest = Math.min(lowest, h(i, j), h(i + 1, j), h(i, j + 1), h(i + 1, j + 1));
      const [mx, mz] = [x0 + (i + 0.5) * size, z0 + (j + 0.5) * size];
      const cover = terrain.coverAt(mx, mz, middle);
      const out = grounds[COVER_KEY[cover]];
      // Round 160: the grass takes the tint of the biome it grows in (a terrain without biomes keeps the first look).
      const tint = terrain.biomes?.[terrain.biomeAt(mx, mz)]?.tint?.[cover] ?? COVER_TINT[cover];
      // A chequer of two shades, the faceted look of a PS1 field.
      const shade = (((cx * cells + i) + (cz * cells + j)) & 1 ? 0.94 : 1.03) * (middle < terrain.waterY ? 0.7 : 1);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const [vi, vj] = corners[k];
        out.positions.push(x0 + vi * size, h(vi, vj), z0 + vj * size);
        out.normals.push(...normal(vi, vj));
        out.uvs.push((x0 + vi * size) / 8, (z0 + vj * size) / 8);
        out.colors.push(tint[0] * shade, tint[1] * shade, tint[2] * shade);
      }
    }
  }
  if (lowest < terrain.waterY + 0.2) {
    const y = terrain.waterY;
    const corners = [[x0, y, z0], [x0, y, z0 + chunk], [x0 + chunk, y, z0 + chunk], [x0 + chunk, y, z0]];
    for (const k of [0, 1, 2, 0, 2, 3]) {
      water.positions.push(...corners[k]);
      water.normals.push(0, 1, 0);
      water.uvs.push(corners[k][0] / 8, corners[k][2] / 8);
      water.colors.push(1, 1, 1);
    }
  }
  const bark = bucket();
  const leaves = bucket();
  for (const tree of terrain.treesIn(cx, cz)) {
    const { x, z, y, height } = tree;
    const green = tree.kind === 'fir' ? [0.5 + 0.2 * tree.tint, 0.82 + 0.18 * tree.tint, 0.6 + 0.2 * tree.tint]
      : tree.kind === 'palm' ? [0.66 + 0.2 * tree.tint, 1.08, 0.5 + 0.16 * tree.tint]
        : tree.kind === 'broad' ? [0.56 + 0.22 * tree.tint, 0.96 + 0.1 * tree.tint, 0.5 + 0.18 * tree.tint]
          : tree.kind === 'shrub' ? [1.0 + 0.2 * tree.tint, 1.02, 0.6 + 0.2 * tree.tint]
            : [0.86 + 0.3 * tree.tint, 1.05, 0.62 + 0.3 * tree.tint];
    // Round 160: the jungle's and the steppe's trees.
    if (tree.kind === 'palm') { palm(bark, leaves, x, y, z, height, green, tree.tint * 6, detail); continue; }
    if (tree.kind === 'shrub') { ball(leaves, x, y + height * 0.3, z, height * 0.62, height * 0.9, green, tree.tint * 6); continue; }
    if (tree.kind === 'broad') {
      if (detail) trunk(bark, x, y - 0.2, z, 0.3 + height * 0.014, height * 0.66, 4, [0.62, 0.54, 0.44]);
      broad(leaves, x, y, z, height, green, tree.tint * 6);
      continue;
    }
    if (detail) trunk(bark, x, y - 0.2, z, 0.26 + height * 0.012, height * 0.42, 4, [0.72, 0.62, 0.52]);
    if (tree.kind === 'fir') {
      cone(leaves, x, y + height * 0.22, z, height * 0.3, height * 0.5, 6, green, tree.tint * 6);
      if (detail) cone(leaves, x, y + height * 0.52, z, height * 0.2, height * 0.48, 6, green, tree.tint * 9);
    } else {
      ball(leaves, x, y + height * 0.62, z, height * 0.34, height * 0.62, green, tree.tint * 6);
    }
  }
  const group = new Group();
  group.name = `chunk:${cx},${cz}`;
  const add = (data, material, order) => {
    if (!data.positions.length) return;
    const mesh = new Mesh(geometryFrom(data), material);
    mesh.name = `${group.name}:${material.name}`;
    if (order) mesh.renderOrder = order;
    group.add(mesh);
  };
  for (const [key, data] of Object.entries(grounds)) add(data, materials[key]);
  add(bark, materials.bark);
  add(leaves, materials.leaves);
  add(water, materials.water, 5);
  return group;
}

/**
 * The endless level. Same interface as the other levels' worlds (scene, uniforms, materials, setPreset, update),
 * plus:
 *
 *   streamTo(x, z, budget = 2)  keep the chunks around (x, z): builds up to `budget` missing chunks, nearest first,
 *                               and drops the chunks beyond the radius. Returns how many are still missing.
 *   chunkCount, triangleCount   what exists now
 */
export function createEndlessWorld({ terrain, seed = 7, preset = 'day', radius = ENDLESS.radius } = {}) {
  if (!terrain) throw new Error('createEndlessWorld needs the terrain (server/src/road/terrain.js)');
  const kit = createWorldKit(seed);
  const world = assembleWorld(kit, {
    name: 'the-long-way', props: new MeshBuilder(kit.rng), surface: new MeshBuilder(kit.rng), preset, reflections: false,
    waterY: terrain.waterY, layout: ENDLESS, tour: [], orbitTarget: [0, 10, 0],
  });
  world.uniforms.uFogNear.value = ENDLESS.fog.near;
  world.uniforms.uFogFar.value = ENDLESS.fog.far;
  const ground = new Group();
  ground.name = 'endless-ground';
  world.scene.add(ground);
  const chunks = new Map();
  const drop = (key) => {
    const group = chunks.get(key);
    ground.remove(group);
    group.traverse((object) => object.geometry?.dispose?.());
    chunks.delete(key);
  };

  function streamTo(x, z, budget = 2) {
    const [ccx, ccz] = [Math.floor(x / ENDLESS.chunk), Math.floor(z / ENDLESS.chunk)];
    for (const key of [...chunks.keys()]) {
      const [kx, kz] = key.split(',').map(Number);
      if (Math.max(Math.abs(kx - ccx), Math.abs(kz - ccz)) > radius + 1) drop(key);
    }
    const missing = [];
    for (let i = -radius; i <= radius; i += 1) {
      for (let j = -radius; j <= radius; j += 1) {
        if (!chunks.has(`${ccx + i},${ccz + j}`)) missing.push([i * i + j * j, ccx + i, ccz + j]);
      }
    }
    missing.sort((a, b) => a[0] - b[0]);
    for (const [distance, cx, cz] of missing.slice(0, budget)) {
      // Far chunks carry less: one cone a fir, no trunks. They are in the fog.
      const group = buildChunk(terrain, world.materials, cx, cz, { detail: distance <= 5 });
      chunks.set(`${cx},${cz}`, group);
      ground.add(group);
    }
    return Math.max(0, missing.length - budget);
  }

  const triangles = () => {
    let n = 0;
    ground.traverse((object) => { if (object.isMesh) n += object.geometry.attributes.position.count / 3; });
    return n;
  };
  Object.assign(world, { terrain, streamTo });
  // Live counts (Object.assign would copy a getter's value of the moment).
  Object.defineProperties(world, { chunkCount: { get: () => chunks.size }, triangleCount: { get: triangles } });
  return world;
}

function hueToRgb(hue) {
  const f = (n) => { const k = (n + hue * 12) % 12; return 0.5 - 0.32 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}

/**
 * A stand-in for a character without a model (the owner asked for placeholders): a cloaked figure about 1.8 m tall,
 * its cloak coloured by `hue` (0 to 1), a pale head and a hat. One mesh in the plain material, 34 triangles.
 * Returns { group, focus, height }: `focus` is the height of the face.
 */
export function createStandIn(materials, { hue = 0.1 } = {}) {
  const data = bucket();
  const cloak = hueToRgb(hue);
  cone(data, 0, 0, 0, 0.46, 1.5, 6, cloak, hue * 6);
  ball(data, 0, 1.52, 0, 0.19, 0.42, [0.93, 0.8, 0.66], 0.6);
  cone(data, 0, 1.68, 0, 0.3, 0.34, 6, cloak.map((v) => v * 0.6), 0.3);
  // A ring of ground under it, so the figure reads as standing somewhere.
  for (let k = 0; k < 6; k += 1) {
    const [a0, a1] = [(k / 6) * Math.PI * 2, ((k + 1) / 6) * Math.PI * 2];
    tri(data, [0, 0.04, 0], [Math.cos(a1) * 0.8, 0.04, Math.sin(a1) * 0.8], [Math.cos(a0) * 0.8, 0.04, Math.sin(a0) * 0.8], [0.5, 0.42, 0.3]);
  }
  const group = new Group();
  group.name = 'stand-in';
  group.add(new Mesh(geometryFrom(data), materials.plain));
  return { group, focus: 1.55, height: 2.02, triangles: data.positions.length / 9 };
}

/**
 * Round 160 (issue #8): the mark of a legacy dungeon's node, seen from the road: a ruined gate about 9 m tall, two
 * leaning piers, a lintel and a stepped top, in weathered stone. One mesh in the plain material.
 */
export function createLandmark(materials) {
  const data = bucket();
  const stone = [0.6, 0.6, 0.52];
  trunk(data, -1.9, -0.3, 0, 0.95, 6.4, 4, stone);
  trunk(data, 1.9, -0.3, 0, 0.95, 6.4, 4, stone.map((v) => v * 0.92));
  ball(data, 0, 6.2, 0, 3.3, 1.5, stone.map((v) => v * 1.06), Math.PI / 4);
  ball(data, 0, 7.3, 0, 2.2, 1.4, stone.map((v) => v * 0.96), Math.PI / 4);
  cone(data, 0, 7.9, 0, 1.2, 1.9, 4, stone.map((v) => v * 1.1), Math.PI / 4);
  // Roots down one pier, as the jungle would have it.
  trunk(data, -2.5, -0.3, 0.7, 0.3, 5.2, 3, [0.46, 0.42, 0.3]);
  const group = new Group();
  group.name = 'landmark';
  group.add(new Mesh(geometryFrom(data), materials.plain));
  return { group, focus: 3.2, height: 9.8, triangles: data.positions.length / 9 };
}

/** A cairn for a site whose conversation is finished: three stacked stones. */
export function createCairn(materials) {
  const data = bucket();
  ball(data, 0, 0.3, 0, 0.42, 0.7, [0.62, 0.6, 0.56], 0.2);
  ball(data, 0, 0.78, 0, 0.3, 0.5, [0.7, 0.68, 0.62], 0.9);
  ball(data, 0, 1.12, 0, 0.18, 0.32, [0.78, 0.75, 0.7], 0.4);
  const group = new Group();
  group.name = 'cairn';
  group.add(new Mesh(geometryFrom(data), materials.plain));
  return { group };
}

/** A worn track along a way: a ribbon of quads laid on the ground through `points` ([[x, z], ...]). */
export function createTrack(materials, points, heightAt, { width = 1.6, lift = 0.12, color = [0.62, 0.5, 0.36], waterY = 0 } = {}) {
  const data = bucket();
  const half = width / 2;
  for (let n = 1; n < points.length; n += 1) {
    const [x0, z0] = points[n - 1];
    const [x1, z1] = points[n];
    const length = Math.hypot(x1 - x0, z1 - z0) || 1;
    const [px, pz] = [(-(z1 - z0) / length) * half, ((x1 - x0) / length) * half];
    const y = (x, z) => Math.max(heightAt(x, z), waterY) + lift;
    const [a, b, c, d] = [[x0 + px, y(x0 + px, z0 + pz), z0 + pz], [x0 - px, y(x0 - px, z0 - pz), z0 - pz], [x1 - px, y(x1 - px, z1 - pz), z1 - pz], [x1 + px, y(x1 + px, z1 + pz), z1 + pz]];
    const shade = n % 2 ? 1 : 0.9;
    const tone = color.map((v) => v * shade);
    tri(data, a, c, b, tone); // wound to face up
    tri(data, a, d, c, tone);
  }
  const mesh = new Mesh(geometryFrom(data), materials.plain);
  mesh.name = 'track';
  return mesh;
}

// Round 146: what the weather adds to the endless level beside its light (atmosphere.js): rain as short lines
// falling round the camera, snow in its place on high ground, stars on a clear night, fireflies over the meadows
// after dark, lightning in a storm, and the trees' crowns moving in the wind.
export const EFFECTS = Object.freeze({
  rain: Object.freeze({ drops: 900, box: 34, height: 22, speed: 27, length: 0.9 }),
  snow: Object.freeze({ above: 52, speed: 2.4, flakes: 500 }),
  stars: Object.freeze({ count: 260, radius: 380 }),
  fireflies: Object.freeze({ count: 40, box: 26 }),
  lightning: Object.freeze({ everySeconds: 9, lasts: 0.22, boost: 1.9 }), // one flash at a time, never a flicker
  // Round 147: the cloud layer. `reach` is how far from the camera a cloud is kept (it comes round again on the
  // other side); the layer is `top` metres over the camera overhead and `drop` metres lower at its rim, so far
  // clouds stand low over the horizon, where a low sun lights them. `least` is the share there on a clear day.
  clouds: Object.freeze({ count: 80, shapes: 6, reach: 640, top: 108, drop: 72, speed: Object.freeze([2.5, 16]), least: 0.4, glow: 0.4 }),
});

// A fixed stream of numbers in [0, 1): the effects need no seed of their own.
function sequence(start) {
  let a = start >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * The weather's effects in `world` (an endless world).
 *
 *   update(weather, dt, camera)  once a frame; returns { flash } (true in the frame a lightning flash begins)
 *   state                        what is showing now, for tests and the playthrough
 *
 * `reducedMotion` leaves the lightning out. The flash is slow and single on purpose: no strobing.
 */
export function createWeatherEffects(world, { terrain = world.terrain, reducedMotion = false } = {}) {
  const next = sequence(146);
  const group = new Group();
  group.name = 'weather';
  world.scene.add(group);
  const plain = (material) => Object.assign(material, { fog: false, depthWrite: false, transparent: true });

  // Rain and snow share their drops: a column of points round the camera, falling and coming round again.
  const { drops, box, height: tall } = EFFECTS.rain;
  const seeds = Array.from({ length: drops }, () => [next() * box - box / 2, next() * tall, next() * box - box / 2]);
  const rainGeometry = new BufferGeometry();
  rainGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(drops * 6), 3));
  const rain = new LineSegments(rainGeometry, plain(new LineBasicMaterial({ color: 0xb9c6d8, opacity: 0 })));
  const snowGeometry = new BufferGeometry();
  snowGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(EFFECTS.snow.flakes * 3), 3));
  const snow = new Points(snowGeometry, plain(new PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, opacity: 0 })));
  for (const object of [rain, snow]) { object.frustumCulled = false; object.renderOrder = 30; object.visible = false; }

  // Stars on the upper half of a sphere, more of them low down, where the sky is wide.
  const starPositions = [];
  for (let n = 0; n < EFFECTS.stars.count; n += 1) {
    const [a, y] = [next() * Math.PI * 2, 0.06 + 0.94 * next() ** 1.4];
    const r = Math.sqrt(1 - y * y) * EFFECTS.stars.radius;
    starPositions.push(Math.cos(a) * r, y * EFFECTS.stars.radius, Math.sin(a) * r);
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const stars = new Points(starGeometry, plain(new PointsMaterial({ color: 0xe8ecff, size: 1.5, sizeAttenuation: false, opacity: 0 })));
  stars.frustumCulled = false;
  stars.renderOrder = -9.5; // over the sky's dome, under its clouds
  stars.visible = false;

  const flies = Array.from({ length: EFFECTS.fireflies.count }, () => ({ x: next() * EFFECTS.fireflies.box - EFFECTS.fireflies.box / 2, z: next() * EFFECTS.fireflies.box - EFFECTS.fireflies.box / 2, y: 0.5 + next() * 1.8, phase: next() * 6.28, rate: 0.4 + next() * 0.7 }));
  const flyGeometry = new BufferGeometry();
  flyGeometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(flies.length * 3), 3));
  const fireflies = new Points(flyGeometry, plain(new PointsMaterial({ color: 0xd8ff7a, size: 2.5, sizeAttenuation: false, opacity: 0, blending: AdditiveBlending })));
  fireflies.frustumCulled = false;
  fireflies.renderOrder = 29;
  fireflies.visible = false;
  group.add(stars, rain, snow, fireflies);

  // Round 147: clouds. A few shapes, each some faceted balls with a flat base, shared by all the clouds; every
  // cloud is one mesh that drifts with the wind and comes round again. Their faces are coloured when the light is
  // set (`setAtmosphere`): tops in the sky's cloud colour, undersides in its `cloudUnder`, and the faces turned to
  // a low sun warmed by it, which is what makes a sunset.
  const CLOUDS = EFFECTS.clouds;
  const cloudMaterial = createPS1Material(world.uniforms, { name: 'cloud-layer', lit: false, fog: 0.22 });
  const shapes = Array.from({ length: CLOUDS.shapes }, () => {
    const balls = [];
    const count = 3 + Math.floor(next() * 3);
    let x = 0;
    for (let n = 0; n < count; n += 1) {
      const [rx, ry, rz] = [22 + next() * 26, 7 + next() * 8, 15 + next() * 16];
      const ball = new DodecahedronGeometry(1, 0); // twelve flat faces: a cloud of few triangles, as the trees are
      ball.rotateY(next() * Math.PI);
      ball.scale(rx, ry, rz);
      const at = ball.attributes.position;
      for (let v = 0; v < at.count; v += 1) at.setY(v, Math.max(at.getY(v), -ry * 0.3) + ry * 0.3); // a flat base
      ball.translate(x, (next() - 0.3) * 3, (next() - 0.5) * 16);
      ball.deleteAttribute('uv');
      ball.deleteAttribute('normal');
      balls.push(ball);
      x += rx * (0.9 + next() * 0.5);
    }
    const shape = mergeGeometries(balls);
    shape.translate(-x / 2, 0, 0);
    shape.computeVertexNormals(); // not indexed: every face has its own normal
    shape.setAttribute('uv', new Float32BufferAttribute(new Float32Array(shape.attributes.position.count * 2), 2));
    shape.setAttribute('color', new Float32BufferAttribute(new Float32Array(shape.attributes.position.count * 3).fill(1), 3));
    shape.computeBoundingSphere();
    for (const ball of balls) ball.dispose();
    return shape;
  });
  const clouds = new Group();
  clouds.name = 'clouds';
  const cloudList = Array.from({ length: CLOUDS.count }, (_, n) => {
    const mesh = new Mesh(shapes[n % shapes.length], cloudMaterial);
    mesh.frustumCulled = false;
    mesh.visible = false;
    clouds.add(mesh);
    return { mesh, x: (next() - 0.5) * CLOUDS.reach * 2, z: (next() - 0.5) * CLOUDS.reach * 2, size: 0.75 + next() * 0.8, lift: next() * 26 };
  });
  group.add(clouds);
  let painted = '';
  function setAtmosphere(p) {
    const sun = p.sunDisc ?? p.sunDir;
    const key = [p.cloud, p.cloudUnder, p.sun, ...sun.map((value) => value.toFixed(2))].join();
    if (key === painted) return;
    painted = key;
    const [top, under, lit] = [hexToRgb(p.cloud), hexToRgb(p.cloudUnder ?? p.cloud), hexToRgb(p.sun)];
    const length = Math.hypot(...sun) || 1;
    const strength = CLOUDS.glow * Math.min(1, p.sunColor?.[0] ?? 1); // the moon lights a cloud's edge only faintly
    for (const shape of shapes) {
      const [normal, color] = [shape.attributes.normal, shape.attributes.color];
      for (let v = 0; v < normal.count; v += 1) {
        const up = Math.min(1, Math.max(0, (normal.getY(v) + 0.3) / 0.9));
        const facing = Math.max(0, (normal.getX(v) * sun[0] + normal.getY(v) * sun[1] + normal.getZ(v) * sun[2]) / length);
        const glow = strength * facing * facing;
        color.setXYZ(v, ...top.map((value, i) => { const base = under[i] + (value - under[i]) * up * up * (3 - 2 * up); return base + (lit[i] - base) * glow; }));
      }
      color.needsUpdate = true;
    }
  }

  const state = { rain: 0, snow: 0, stars: 0, fireflies: 0, flash: 0, sway: 0, flashes: 0, clouds: 0 };
  let clock = 0;
  let drift = 0;
  let sinceFlash = EFFECTS.lightning.everySeconds;
  const wrap = (value, size) => ((value % size) + size) % size;

  function update(weather, dt, camera) {
    clock += dt;
    const [cx, cy, cz] = [camera.position.x, camera.position.y, camera.position.z];
    const ground = terrain.heightAt(cx, cz);
    const snowing = ground > EFFECTS.snow.above;
    state.rain = snowing ? 0 : weather.rain;
    state.snow = snowing ? weather.rain : 0;

    rain.visible = state.rain > 0.01;
    if (rain.visible) {
      const count = Math.max(1, Math.round(drops * (0.25 + 0.75 * state.rain)));
      const positions = rainGeometry.attributes.position.array;
      const slant = EFFECTS.rain.length * (0.15 + 0.5 * weather.wind);
      for (let n = 0; n < count; n += 1) {
        const [sx, sy, sz] = seeds[n];
        // The drops keep their places in the world as the camera moves: each is wrapped into the box round it.
        const x = cx + wrap(sx - cx, box) - box / 2;
        const z = cz + wrap(sz - cz, box) - box / 2;
        const y = cy - tall * 0.35 + wrap(sy - clock * EFFECTS.rain.speed, tall);
        positions.set([x, y, z, x - slant, y + EFFECTS.rain.length, z], n * 6);
      }
      rainGeometry.attributes.position.needsUpdate = true;
      rainGeometry.setDrawRange(0, count * 2);
      rain.material.opacity = 0.22 + 0.4 * state.rain;
      rain.material.color.setScalar(0.35 + 0.5 * weather.daylight);
    }
    snow.visible = state.snow > 0.01;
    if (snow.visible) {
      const count = Math.max(1, Math.round(EFFECTS.snow.flakes * (0.3 + 0.7 * state.snow)));
      const positions = snowGeometry.attributes.position.array;
      for (let n = 0; n < count; n += 1) {
        const [sx, sy, sz] = seeds[n];
        const drift = Math.sin(clock * 0.7 + n) * 0.8;
        positions.set([cx + wrap(sx + drift - cx, box) - box / 2, cy - tall * 0.35 + wrap(sy - clock * EFFECTS.snow.speed, tall), cz + wrap(sz - cz, box) - box / 2], n * 3);
      }
      snowGeometry.attributes.position.needsUpdate = true;
      snowGeometry.setDrawRange(0, count);
      snow.material.opacity = 0.5 + 0.4 * state.snow;
    }

    // Clouds: as many as the cover asks for, blown along by the wind (they stand still with reduced motion). Each
    // keeps its place in the world and is wrapped into the circle round the camera, where it grows from nothing at
    // the rim: a cloud never appears at once, at the rim or when the cover changes.
    if (!reducedMotion) drift += dt * (CLOUDS.speed[0] + (CLOUDS.speed[1] - CLOUDS.speed[0]) * weather.wind);
    const wanted = CLOUDS.count * (CLOUDS.least + (1 - CLOUDS.least) * weather.cloud);
    const ceiling = cy + CLOUDS.top; // over the camera wherever it is: a peak may stand up into the clouds
    state.clouds = 0;
    cloudList.forEach((cloud, n) => {
      const there = Math.min(1, Math.max(0, wanted - n));
      const dx = wrap(cloud.x + drift - cx + CLOUDS.reach, CLOUDS.reach * 2) - CLOUDS.reach;
      const dz = wrap(cloud.z - cz + CLOUDS.reach, CLOUDS.reach * 2) - CLOUDS.reach;
      const away = Math.hypot(dx, dz) / CLOUDS.reach;
      const rim = Math.min(1, Math.max(0, (1 - away) / 0.22));
      const scale = cloud.size * there * there * (3 - 2 * there) * rim * rim * (3 - 2 * rim);
      cloud.mesh.visible = scale > 0.02;
      if (!cloud.mesh.visible) return;
      state.clouds += 1;
      cloud.mesh.position.set(cx + dx, ceiling + cloud.lift - CLOUDS.drop * away * away, cz + dz);
      cloud.mesh.scale.setScalar(scale);
    });

    // Stars: out when the daylight is gone and the cloud is thin. They turn slowly, as the night does.
    state.stars = Math.max(0, 1 - weather.daylight * 3) * Math.max(0, 1 - weather.cloud * 1.5);
    stars.visible = state.stars > 0.02;
    if (stars.visible) {
      stars.position.set(cx, world.terrain.waterY, cz);
      stars.rotation.y = weather.phase * Math.PI * 2;
      stars.material.opacity = 0.9 * state.stars;
    }

    // Fireflies: after dark, when it is dry, below the tree line.
    state.fireflies = Math.max(0, 1 - weather.daylight * 2.5) * (weather.rain > 0.02 ? 0 : 1) * (ground > 1 && ground < 34 ? 1 : 0);
    fireflies.visible = state.fireflies > 0.02;
    if (fireflies.visible) {
      const positions = flyGeometry.attributes.position.array;
      const size = EFFECTS.fireflies.box;
      flies.forEach((fly, n) => {
        const x = cx + wrap(fly.x + Math.sin(clock * fly.rate + fly.phase) * 1.4 - cx, size) - size / 2;
        const z = cz + wrap(fly.z + Math.cos(clock * fly.rate * 0.8 + fly.phase) * 1.4 - cz, size) - size / 2;
        positions.set([x, Math.max(terrain.heightAt(x, z), world.terrain.waterY) + fly.y + 0.3 * Math.sin(clock * 1.3 + fly.phase), z], n * 3);
      });
      flyGeometry.attributes.position.needsUpdate = true;
      fireflies.material.opacity = state.fireflies * (0.55 + 0.35 * Math.sin(clock * 2.1));
    }

    // Lightning: in a storm, one slow flash now and then. Never with reduced motion.
    sinceFlash += dt;
    let flash = false;
    if (weather.storm && !reducedMotion && sinceFlash > EFFECTS.lightning.everySeconds * (0.6 + next())) {
      sinceFlash = 0;
      state.flash = 1;
      state.flashes += 1;
      flash = true;
    }
    state.flash = Math.max(0, state.flash - dt / EFFECTS.lightning.lasts);
    world.uniforms.uLightBoost.value = 1 + (EFFECTS.lightning.boost - 1) * state.flash * state.flash;

    // The wind in the trees: the crowns' tips move (the leaves' material sways by height).
    state.sway = 0.03 + 0.3 * weather.wind;
    world.materials.leaves.uniforms.uSway.value = state.sway;
    return { flash };
  }

  return {
    group, update, state, setAtmosphere,
    dispose() {
      world.scene.remove(group);
      for (const object of [rain, snow, stars, fireflies]) { object.geometry.dispose(); object.material.dispose(); }
      for (const shape of shapes) shape.dispose();
      cloudMaterial.dispose();
    },
  };
}
