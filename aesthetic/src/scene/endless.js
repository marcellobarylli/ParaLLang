import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { MeshBuilder } from './geometry.js';
import { assembleWorld, createWorldKit } from './world.js';

// Round 144: the endless landscape of The Long Way Home, in the PS1 look. The ground is not built once: it is cut
// into square chunks, and only the chunks around a point (the camera) exist. `streamTo(x, z)` builds the missing ones
// nearest first, a few per call, and drops those left behind, so the level is as large as the walk and costs the same
// at every step.
//
// The package does not know the landscape: the host passes `terrain` ({ heightAt, biomeAt, treesIn, waterY }), the
// pure functions of server/src/road/terrain.js, so the server's graph and this ground always agree. Trees are very
// simple on purpose: a trunk and a cone or two (a fir), or a trunk and a faceted ball (a round tree).

export const ENDLESS = Object.freeze({
  chunk: 48, // metres; must equal the terrain's chunk (the trees are asked for per chunk)
  cells: 8, // quads per side
  radius: 4, // chunks kept on each side of the camera's chunk
  fog: Object.freeze({ near: 46, far: 186 }), // the far edge of the kept chunks is hidden in the fog
});

const SAND = [1.5, 1.22, 0.9]; // a tint over the grass texture, as the Angkor level tints its dirt
const BIOME_TINT = { shore: SAND, meadow: [1.06, 1.04, 0.86], forest: [0.82, 0.92, 0.74], highland: [1, 1, 1], snow: [1, 1, 1], water: [0.9, 0.86, 0.72] };
const BIOME_KEY = { shore: 'ground', meadow: 'ground', forest: 'ground', water: 'ground', highland: 'rock', snow: 'snow' };

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
  const [top, bottom] = [[x, y + height * 0.6, z], [x, y - height * 0.4, z]];
  for (let k = 0; k < 4; k += 1) {
    const [a, b] = [ring[k], ring[(k + 1) % 4]];
    tri(out, b, a, top, color.map((v) => v * (0.9 + 0.1 * k)));
    tri(out, a, b, bottom, color.map((v) => v * (0.62 + 0.06 * k)));
  }
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
      const biome = terrain.biomeAt(x0 + (i + 0.5) * size, z0 + (j + 0.5) * size, middle);
      const out = grounds[BIOME_KEY[biome]];
      const tint = BIOME_TINT[biome];
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
    const green = tree.kind === 'fir' ? [0.5 + 0.2 * tree.tint, 0.82 + 0.18 * tree.tint, 0.6 + 0.2 * tree.tint] : [0.86 + 0.3 * tree.tint, 1.05, 0.62 + 0.3 * tree.tint];
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
