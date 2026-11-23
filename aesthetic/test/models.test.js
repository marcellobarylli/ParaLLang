// Round 162 (issue #11): the models pulled from outside. The web client's model file loads, gives a template for
// every kind of tree the terrain grows, and the endless level stamps the near chunks' trees from them and stays
// inside the style's triangle budget.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';
import { ENDLESS, MODEL_KINDS, PS1_STYLE, buildChunk, createEndlessWorld, loadModels, stampModel } from '../src/index.js';
import { BIOMES, createTerrain } from '../../server/src/road/terrain.js';

const FILE = resolve(import.meta.dirname, '..', '..', 'client', 'public', 'models', 'nature.glb');
const bytes = readFileSync(FILE);
const models = await loadModels(null, { bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
const terrain = createTerrain(4242);
const meshes = (object) => { const out = []; object.traverse((o) => o.isMesh && out.push(o)); return out; };
const trianglesOf = (object) => meshes(object).reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count / 3, 0);

describe('the models', () => {
  test('the file is small enough for the page and holds a model for every name the kinds list', () => {
    assert.ok(bytes.length < 60_000, `${bytes.length} bytes`);
    assert.deepEqual(Object.keys(models).sort(), Object.keys(MODEL_KINDS).sort());
    for (const [kind, names] of Object.entries(MODEL_KINDS)) assert.equal(models[kind].length, names.length, kind);
  });

  test('every kind of tree a biome grows has models', () => {
    const kinds = new Set(['fir', ...Object.values(BIOMES).flatMap((biome) => biome.trees.map(([, kind]) => kind))]);
    for (const kind of kinds) assert.ok(models[kind]?.length, `${kind} has a model`);
  });

  test('a template stands on the ground over its foot, is one unit tall, and is light enough for a chunk of thirty trees', () => {
    for (const [kind, shapes] of Object.entries(models)) {
      for (const shape of shapes) {
        assert.equal(shape.triangles.length, shape.count * 9);
        assert.equal(shape.colors.length, shape.count * 3);
        let [low, high] = [Infinity, -Infinity];
        for (let n = 1; n < shape.triangles.length; n += 3) { low = Math.min(low, shape.triangles[n]); high = Math.max(high, shape.triangles[n]); }
        assert.ok(Math.abs(low) < 1e-6 && Math.abs(high - 1) < 1e-6, `${kind}: from ${low} to ${high}`);
        assert.ok(shape.count <= 190, `${kind}: ${shape.count} triangles`);
        assert.ok(shape.spread > 0.05 && shape.spread < (kind === 'stone' ? 2 : 1.2), `${kind}: spread ${shape.spread}`);
        for (const value of shape.colors) assert.ok(value >= 0 && value <= 1.2001);
      }
    }
    // Greens are green and trunks are brown: the lift keeps the hue.
    const palm = models.palm[0];
    const greens = [...Array(palm.count).keys()].filter((n) => palm.colors[n * 3 + 1] > palm.colors[n * 3] * 1.5).length;
    assert.ok(greens > palm.count * 0.3 && greens < palm.count, `${greens} of ${palm.count} triangles of a palm are green`);
  });

  test('a stamp puts the model where it is asked, as tall as it is asked, in flat triangles', () => {
    const out = { positions: [], normals: [], uvs: [], colors: [] };
    stampModel(out, models.fir[0], 100, 20, -50, 8, 1.1, [1, 0.5, 1]);
    const count = models.fir[0].count;
    assert.equal(out.positions.length, count * 9);
    assert.equal(out.normals.length, count * 9);
    assert.equal(out.uvs.length, count * 6);
    assert.equal(out.colors.length, count * 9);
    let [low, high] = [Infinity, -Infinity];
    for (let n = 0; n < out.positions.length; n += 3) {
      low = Math.min(low, out.positions[n + 1]); high = Math.max(high, out.positions[n + 1]);
      assert.ok(Math.hypot(out.positions[n] - 100, out.positions[n + 2] + 50) < 8 * 1.2);
    }
    assert.ok(Math.abs(low - 20) < 1e-3 && Math.abs(high - 28) < 1e-3);
    // The three corners of a triangle share its normal and its colour.
    assert.deepEqual(out.normals.slice(0, 3), out.normals.slice(3, 6));
    assert.deepEqual(out.colors.slice(0, 3), out.colors.slice(6, 9));
    assert.ok(Math.abs(Math.hypot(...out.normals.slice(0, 3)) - 1) < 1e-6);
  });
});

describe('the endless level with models', () => {
  const world = createEndlessWorld({ terrain });
  const settle = (x, z) => { while (world.streamTo(x, z, 12) > 0); };

  test('a chunk built with models has its trees in one plain mesh, and none of the level\'s own', () => {
    const plain = buildChunk(terrain, world.materials, 0, 0, { detail: true });
    const modelled = buildChunk(terrain, world.materials, 0, 0, { detail: true, models });
    const names = (group) => meshes(group).map((mesh) => mesh.material.name).sort();
    assert.ok(names(plain).includes('leaves') && !names(plain).includes('plain'));
    assert.ok(names(modelled).includes('plain') && !names(modelled).includes('leaves') && !names(modelled).includes('bark'));
    assert.ok(terrain.treesIn(0, 0).length > 5);
    for (const mesh of meshes(modelled)) for (const name of ['position', 'normal', 'uv', 'color']) assert.ok(mesh.geometry.getAttribute(name), `${mesh.material.name} has ${name}`);
  });

  test('without models no chunk is a model chunk; once they are set, the chunks nearest the camera are built again with them', () => {
    settle(10, 10);
    assert.equal(world.chunkCount, 81);
    assert.equal(world.modelChunks, 0);
    const before = world.triangleCount;
    world.setModels(models);
    assert.ok(world.streamTo(10, 10, 1) > 0, 'there is work again');
    settle(10, 10);
    assert.equal(world.modelChunks, 5); // the camera's chunk and the four beside it
    assert.equal(world.chunkCount, 81);
    const after = world.triangleCount;
    assert.ok(after > before, `${before} -> ${after}`);
    assert.ok(after <= PS1_STYLE.geometry.maxTrianglesPerScene, `${after} triangles with models`);
    console.log(`  the start of seed 4242: ${before} triangles without models, ${after} with`);
  });

  test('a chunk the camera walks up to is built again at what it should now carry, and the count of model chunks stays', () => {
    // One chunk on: the five round the camera have models, and the ones just left keep theirs (nine at most).
    settle(10 + ENDLESS.chunk, 10);
    assert.ok(world.modelChunks >= 5 && world.modelChunks <= 9, `${world.modelChunks} model chunks one chunk on`);
    // Three chunks on: the ones left behind are built again without.
    settle(10 + 3 * ENDLESS.chunk, 10);
    assert.equal(world.modelChunks, 5);
    assert.ok(world.chunkCount >= 81 && world.chunkCount <= 99, `${world.chunkCount} chunks (a ring behind the camera is kept)`);
    assert.equal(world.scene.getObjectByName('chunk:3,0').children.some((mesh) => mesh.material.name === 'plain') || terrain.treesIn(3, 0).length === 0, true);
    assert.equal(world.scene.getObjectByName('chunk:0,0').children.some((mesh) => mesh.material.name === 'plain'), false);
    // The models taken away: every chunk goes back to the level's own trees.
    world.setModels(null);
    settle(10 + 3 * ENDLESS.chunk, 10);
    assert.equal(world.modelChunks, 0);
  });

  test('stays inside the triangle budget with models, in the densest forest it can find', () => {
    let best = [0, 0, -1];
    for (let cx = -16; cx <= 16; cx += 4) {
      for (let cz = -16; cz <= 16; cz += 4) {
        const count = terrain.treesIn(cx, cz).length;
        if (count > best[2]) best = [cx, cz, count];
      }
    }
    const dense = createEndlessWorld({ terrain });
    dense.setModels(models);
    while (dense.streamTo(best[0] * 48 + 24, best[1] * 48 + 24, 12) > 0);
    assert.equal(dense.modelChunks, 5);
    console.log(`  the densest forest of seed 4242 (${best[2]} trees in its chunk): ${dense.triangleCount} triangles with models`);
    assert.ok(dense.triangleCount <= PS1_STYLE.geometry.maxTrianglesPerScene, `${dense.triangleCount} triangles exceed ${PS1_STYLE.geometry.maxTrianglesPerScene}`);
  });
});
