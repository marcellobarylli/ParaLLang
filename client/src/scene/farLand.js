// Round 173: the land seen from above the clouds, on the title screen. The road's own ground exists only in the
// chunks around the camera (aesthetic's endless world: about 430 m square), which from a kilometre and more up is a
// tile in the middle of nothing. This is the rest: a coarse sheet of the same terrain, `radius` metres round the
// site, painted with the map's colours (roadMap.js `groundColour`) and lit by the scene's sun. It lies a little under
// the true ground, so wherever a chunk is built the chunk is what shows.
//
// It is built in tiles, the nearest first, a few a frame (`build(budget)`), so the page never stalls on it; it is
// shown only while the camera is high (`setShown`), and its tiles are thrown away with `dispose`.
import { BufferGeometry, Float32BufferAttribute, Group, Mesh } from 'three';
import { createPS1Material } from '@parallang/aesthetic';
import { groundColour } from '../roadMap.js';

export const FAR_LAND = Object.freeze({
  radius: 3200, // metres of land round the site
  tile: 800, // metres a tile
  cell: 32, // metres between two samples
  sink: 2.5, // metres under the true ground
});

export function createFarLand(terrain, uniforms, centre, { radius = FAR_LAND.radius, tile = FAR_LAND.tile, cell = FAR_LAND.cell, sink = FAR_LAND.sink } = {}) {
  const group = new Group();
  group.name = 'far-land';
  const material = createPS1Material(uniforms, { name: 'far-land', lit: true, fog: 1 });
  const count = Math.ceil((2 * radius) / tile);
  const [x0, z0] = [centre.x - (count * tile) / 2, centre.z - (count * tile) / 2];
  const todo = [];
  for (let i = 0; i < count; i += 1) {
    for (let j = 0; j < count; j += 1) {
      const [cx, cz] = [x0 + (i + 0.5) * tile, z0 + (j + 0.5) * tile];
      todo.push({ i, j, distance: Math.hypot(cx - centre.x, cz - centre.z) });
    }
  }
  todo.sort((a, b) => a.distance - b.distance);
  const cells = Math.round(tile / cell);

  function buildTile({ i, j }) {
    const [tx, tz] = [x0 + i * tile, z0 + j * tile];
    const side = cells + 1;
    const heights = new Float32Array(side * side);
    const colours = new Float32Array(side * side * 3);
    for (let a = 0; a < side; a += 1) {
      for (let b = 0; b < side; b += 1) {
        const [x, z] = [tx + a * cell, tz + b * cell];
        const h = terrain.heightAt(x, z);
        heights[a * side + b] = Math.max(h, terrain.waterY) - sink;
        colours.set(groundColour(terrain, x, z, h), (a * side + b) * 3);
      }
    }
    // Two triangles a cell, each vertex its own (flat faces, as the rest of the level is drawn).
    const positions = [];
    const colour = [];
    const vertex = (a, b) => {
      positions.push(tx + a * cell, heights[a * side + b], tz + b * cell);
      colour.push(...colours.subarray((a * side + b) * 3, (a * side + b) * 3 + 3));
    };
    for (let a = 0; a < cells; a += 1) {
      for (let b = 0; b < cells; b += 1) {
        vertex(a, b); vertex(a, b + 1); vertex(a + 1, b);
        vertex(a + 1, b); vertex(a, b + 1); vertex(a + 1, b + 1);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.name = `far:${i},${j}`;
    group.add(mesh);
  }

  return {
    group,
    centre: { x: centre.x, z: centre.z },
    /** Builds up to `budget` tiles, the nearest first. Returns how many are still to build. */
    build(budget = 2) {
      for (let n = 0; n < budget && todo.length; n += 1) buildTile(todo.shift());
      return todo.length;
    },
    get built() { return group.children.length; },
    get total() { return count * count; },
    setShown(on) { group.visible = Boolean(on); },
    dispose() {
      for (const mesh of group.children) mesh.geometry.dispose();
      material.dispose();
      group.removeFromParent();
    },
  };
}
