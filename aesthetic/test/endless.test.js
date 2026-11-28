// Round 144: the endless level. Chunks are built around a point and dropped behind it, every mesh is in the PS1
// materials with the attributes the shaders read, neighbouring chunks meet without a crack, and the whole stays
// inside the style's triangle budget wherever the camera stands.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ENDLESS, PS1_STYLE, buildChunk, createCairn, createEndlessWorld, createStandIn, createTrack } from '../src/index.js';
import { TERRAIN, createTerrain } from '../../server/src/road/terrain.js';
import { createGraph } from '../../server/src/road/graph.js';
import { PULL, withPulls } from '../../server/src/road/pulls.js';

const terrain = createTerrain(4242);
const meshes = (object) => { const out = []; object.traverse((o) => o.isMesh && out.push(o)); return out; };

describe('the endless level', () => {
  test('its chunk is the terrain\'s chunk', () => {
    assert.equal(ENDLESS.chunk, TERRAIN.chunk);
    assert.equal(ENDLESS.cells, TERRAIN.cells);
  });

  test('keeps the chunks around a point and drops the ones left behind', () => {
    const world = createEndlessWorld({ terrain, radius: 2 });
    assert.equal(world.chunkCount, 0);
    let left = world.streamTo(10, 10, 3);
    assert.equal(world.chunkCount, 3);
    assert.equal(left, 25 - 3);
    while (left > 0) left = world.streamTo(10, 10, 4);
    assert.equal(world.chunkCount, 25);
    assert.ok(world.scene.getObjectByName('chunk:0,0'), 'the chunk under the point exists');
    assert.equal(world.streamTo(10, 10), 0, 'nothing more to build');
    // A long way off: the old chunks go, the new ones come, and the count stays what it was.
    while (world.streamTo(5000, -3000, 8) > 0);
    assert.equal(world.chunkCount, 25);
    assert.equal(world.scene.getObjectByName('chunk:0,0'), undefined);
    assert.ok(world.scene.getObjectByName(`chunk:${Math.floor(5000 / 48)},${Math.floor(-3000 / 48)}`));
  });

  test('every mesh uses a PS1 material with positions, normals, uvs and vertex colours', () => {
    const world = createEndlessWorld({ terrain, radius: 1 });
    while (world.streamTo(0, 0, 9) > 0);
    const ground = world.scene.getObjectByName('endless-ground');
    assert.ok(meshes(ground).length >= 9);
    for (const mesh of meshes(ground)) {
      assert.ok(mesh.material.userData.ps1, `${mesh.name} is not a PS1 material`);
      for (const attribute of ['position', 'normal', 'uv', 'color']) assert.ok(mesh.geometry.attributes[attribute], `${mesh.name} lacks ${attribute}`);
      for (const value of mesh.geometry.attributes.position.array) assert.ok(Number.isFinite(value));
    }
  });

  test('the ground follows the terrain, faces up, and two chunks share their edge', () => {
    const a = buildChunk(terrain, createEndlessWorld({ terrain }).materials, 0, 0);
    const b = buildChunk(terrain, createEndlessWorld({ terrain }).materials, 1, 0);
    const edge = (group, x) => {
      const out = new Map();
      for (const mesh of meshes(group).filter((m) => ['ground', 'rock', 'snow'].includes(m.material.name))) {
        const position = mesh.geometry.attributes.position;
        const normal = mesh.geometry.attributes.normal;
        for (let k = 0; k < position.count; k += 1) {
          assert.ok(Math.abs(position.getY(k) - terrain.heightAt(position.getX(k), position.getZ(k))) < 1e-4, 'a ground vertex is on the terrain');
          assert.ok(normal.getY(k) > 0.2, 'the ground faces up');
          if (position.getX(k) === x) out.set(position.getZ(k), [position.getY(k), normal.getX(k), normal.getY(k), normal.getZ(k)].map((v) => Math.round(v * 1e4)));
        }
      }
      return out;
    };
    const [left, right] = [edge(a, 48), edge(b, 48)];
    assert.equal(left.size, ENDLESS.cells + 1);
    assert.deepEqual([...left].sort(), [...right].sort(), 'the same heights and normals on both sides of the seam');
  });

  test('round 213: on pulled land the ground, the trees and the water sink together, and the water bends with the pull', () => {
    // A lake, and a pull at its shore: the nearest dry point to a point of water near the start.
    const graph = createGraph(terrain);
    let shore = null;
    for (let r = 100; r < 3000 && !shore; r += 48) {
      for (let a = 0; a < 24 && !shore; a += 1) {
        const [x, z] = [Math.cos(a) * r, Math.sin(a) * r];
        if (terrain.heightAt(x, z) < -1 && terrain.heightAt(x + 30, z) > 0.5) shore = { x: x + 30, z, depth: PULL.depth };
      }
    }
    assert.ok(shore, 'the landscape has a shore to pull at');
    const { terrain: pulled } = withPulls(terrain, graph, [], { extra: [shore] });
    const materials = createEndlessWorld({ terrain: pulled }).materials;
    const [cx, cz] = [Math.floor(shore.x / 48), Math.floor(shore.z / 48)];
    const [before, after] = [buildChunk(terrain, materials, cx, cz), buildChunk(pulled, materials, cx, cz)];
    const of = (group, names) => meshes(group).filter((mesh) => names.includes(mesh.material.name));
    // The ground is on the pulled terrain, and lower than it was.
    let sank = 0;
    for (const mesh of of(after, ['ground', 'rock', 'snow'])) {
      const position = mesh.geometry.attributes.position;
      for (let k = 0; k < position.count; k += 1) {
        const [x, y, z] = [position.getX(k), position.getY(k), position.getZ(k)];
        assert.ok(Math.abs(y - pulled.heightAt(x, z)) < 1e-4, 'a ground vertex is on the pulled terrain');
        sank = Math.max(sank, terrain.heightAt(x, z) - y);
      }
    }
    assert.ok(sank > PULL.depth * 0.5, `the ground of the chunk sank ${sank} m`);
    // The water was one flat quad; now it is a quad a cell, each corner as far down as the pull is there.
    const [flat] = of(before, ['water']);
    const [bent] = of(after, ['water']);
    assert.equal(flat.geometry.attributes.position.count, 6);
    assert.equal(bent.geometry.attributes.position.count, 6 * ENDLESS.cells * ENDLESS.cells);
    const position = bent.geometry.attributes.position;
    let lowest = 0;
    for (let k = 0; k < position.count; k += 1) {
      assert.ok(Math.abs(position.getY(k) - pulled.waterAt(position.getX(k), position.getZ(k))) < 1e-4, 'a water vertex is on the pulled water');
      lowest = Math.min(lowest, position.getY(k));
    }
    assert.ok(lowest < -PULL.depth * 0.3, `the water sank with the ground: ${lowest} m`);
    // Away from any pull a chunk of the pulled land is the chunk it always was.
    const far = (group) => meshes(group).map((mesh) => [mesh.material.name, mesh.geometry.attributes.position.count]);
    assert.deepEqual(far(buildChunk(pulled, materials, cx + 40, cz + 40)), far(buildChunk(terrain, materials, cx + 40, cz + 40)));
    // A track over the pulled land lies on its surface, water and all.
    const track = createTrack(materials, [[shore.x - 40, shore.z], [shore.x, shore.z]], pulled.heightAt, { waterY: pulled.waterY, surfaceAt: pulled.surfaceAt });
    const laid = track.geometry.attributes.position;
    for (let k = 0; k < laid.count; k += 1) assert.ok(Math.abs(laid.getY(k) - (pulled.surfaceAt(laid.getX(k), laid.getZ(k)) + 0.12)) < 1e-4);
  });

  test('stays inside the triangle budget in the densest forest it can find', () => {
    // The spot with the most trees in a square mile of this seed.
    let best = [0, 0, -1];
    for (let cx = -16; cx <= 16; cx += 4) {
      for (let cz = -16; cz <= 16; cz += 4) {
        const count = terrain.treesIn(cx, cz).length;
        if (count > best[2]) best = [cx, cz, count];
      }
    }
    const world = createEndlessWorld({ terrain });
    while (world.streamTo(best[0] * 48 + 24, best[1] * 48 + 24, 12) > 0);
    assert.equal(world.chunkCount, (2 * ENDLESS.radius + 1) ** 2);
    assert.ok(world.triangleCount > 5000, `${world.triangleCount} triangles`);
    assert.ok(world.triangleCount <= PS1_STYLE.geometry.maxTrianglesPerScene, `${world.triangleCount} triangles exceed ${PS1_STYLE.geometry.maxTrianglesPerScene}`);
    assert.ok(best[2] > 0, 'there are trees');
  });

  test('the same seed builds the same chunk', () => {
    const materials = createEndlessWorld({ terrain }).materials;
    const one = meshes(buildChunk(terrain, materials, 2, -3))[0].geometry.attributes.position.array;
    const two = meshes(buildChunk(createTerrain(4242), materials, 2, -3))[0].geometry.attributes.position.array;
    assert.deepEqual(Array.from(one), Array.from(two));
  });

  test('the stand-in, the cairn and a track are small plain meshes', () => {
    const { materials } = createEndlessWorld({ terrain });
    const figure = createStandIn(materials, { hue: 0.6 });
    assert.ok(figure.triangles <= 40 && figure.height < 2.2 && figure.focus > 1.2);
    assert.notDeepEqual(Array.from(createStandIn(materials, { hue: 0.1 }).group.children[0].geometry.attributes.color.array.slice(0, 3)), Array.from(figure.group.children[0].geometry.attributes.color.array.slice(0, 3)), 'the hue colours the cloak');
    assert.equal(meshes(createCairn(materials).group).length, 1);
    const track = createTrack(materials, [[0, 0], [8, 0], [16, 4]], terrain.heightAt);
    assert.equal(track.geometry.attributes.position.count, 12);
    for (let k = 0; k < 12; k += 1) assert.ok(track.geometry.attributes.normal.getY(k) > 0, 'the track faces up');
  });
});
