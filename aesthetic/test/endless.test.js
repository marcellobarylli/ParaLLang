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

  test('round 215: where a pull has taken the ground under the sea, the chunk has water over it, at the sea\'s level', () => {
    const graph = createGraph(terrain);
    const start = graph.node(graph.start);
    const { terrain: pulled } = withPulls(terrain, graph, [{ step: 1, depth: PULL.depth, sites: [graph.start] }]);
    const materials = createEndlessWorld({ terrain: pulled }).materials;
    const [cx, cz] = [Math.floor(start.x / 48), Math.floor(start.z / 48)];
    const [before, after] = [buildChunk(terrain, materials, cx, cz), buildChunk(pulled, materials, cx, cz)];
    const of = (group, names) => meshes(group).filter((mesh) => names.includes(mesh.material.name));
    assert.equal(of(before, ['water']).length, 0, 'the start of a road is dry land');
    const [water] = of(after, ['water']);
    assert.ok(water, 'the pulled start has water');
    for (let k = 0; k < water.geometry.attributes.position.count; k += 1) assert.equal(water.geometry.attributes.position.getY(k), terrain.waterY);
    // The ground is the pulled ground, and some of it is under that water.
    let lowest = Infinity;
    for (const mesh of of(after, ['ground', 'rock', 'snow'])) {
      const position = mesh.geometry.attributes.position;
      for (let k = 0; k < position.count; k += 1) {
        assert.ok(Math.abs(position.getY(k) - pulled.heightAt(position.getX(k), position.getZ(k))) < 1e-4, 'a ground vertex is on the pulled terrain');
        lowest = Math.min(lowest, position.getY(k));
      }
    }
    assert.ok(lowest < terrain.waterY - 5, `the ground of the chunk is ${lowest} m: under the sea`);
    // Away from any pull a chunk of the pulled land is the chunk it always was.
    const shape = (group) => meshes(group).map((mesh) => [mesh.material.name, mesh.geometry.attributes.position.count]);
    assert.deepEqual(shape(buildChunk(pulled, materials, cx + 40, cz + 40)), shape(buildChunk(terrain, materials, cx + 40, cz + 40)));
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
