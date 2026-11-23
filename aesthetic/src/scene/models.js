// Round 162 (issue #11): models pulled from outside, in the endless level. The level builds its own trees from a
// few triangles (endless.js); a model file gives the trees nearest the camera a real shape. This module turns a
// loaded model into a template the chunk builder can stamp into a chunk's one mesh, as it stamps its own trees: a
// list of triangles, each with one colour, standing on y = 0 and one unit tall.
//
// The file's models are named after their source files (client/scripts/make-models.mjs); MODEL_KINDS says which
// stand for which kind of tree of the terrain (server/src/road/terrain.js). The package still does not fetch
// anything by itself: `loadModels(url)` is the host's to call, when and if it wants models.
import { Color, Vector3 } from 'three';

export const MODEL_KINDS = Object.freeze({
  palm: Object.freeze(['palm_tree_1', 'palm_tree_2', 'palm_tree_3']),
  broad: Object.freeze(['common_tree_1', 'common_tree_3']),
  round: Object.freeze(['common_tree_2', 'common_tree_1']),
  fir: Object.freeze(['pine_tree_1', 'pine_tree_2', 'pine_tree_3']),
  shrub: Object.freeze(['bush_1', 'bush_2', 'bush_3']),
  stone: Object.freeze(['stone_1', 'stone_2', 'stone_3']),
});
// The models' colours are dark, as their author's renderer lights them. The PS1 materials do no colour conversion
// and light a vertex colour as it is, so each is lifted to the level's own range (the trees it builds itself).
export const MODEL_LIFT = 2.3;

/**
 * A template from a loaded model (a three.js object: a glTF scene's node): { triangles, colors, count, spread }.
 * `triangles` holds nine numbers a triangle, `colors` three. The model stands on y = 0 over the middle of its foot
 * and is one unit tall; `spread` is its widest reach from that middle, in the same units.
 */
export function templateFrom(object) {
  object.updateWorldMatrix(true, true);
  const corners = [];
  const colours = [];
  const point = new Vector3();
  const colour = new Color();
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.getIndex();
    const count = index ? index.count : position.count;
    colour.copy(mesh.material?.color ?? new Color(1, 1, 1)).convertLinearToSRGB();
    for (let n = 0; n + 2 < count; n += 3) {
      for (let k = 0; k < 3; k += 1) {
        point.fromBufferAttribute(position, index ? index.getX(n + k) : n + k).applyMatrix4(mesh.matrixWorld);
        corners.push(point.x, point.y, point.z);
      }
      colours.push(Math.min(1.2, colour.r * MODEL_LIFT), Math.min(1.2, colour.g * MODEL_LIFT), Math.min(1.2, colour.b * MODEL_LIFT));
    }
  });
  if (!corners.length) return null;
  let [low, high] = [Infinity, -Infinity];
  for (let n = 1; n < corners.length; n += 3) { low = Math.min(low, corners[n]); high = Math.max(high, corners[n]); }
  const tall = Math.max(1e-6, high - low);
  // The foot: the middle of the corners in the lowest tenth of the model (a palm leans; its crown is not its place).
  let [fx, fz, feet] = [0, 0, 0];
  for (let n = 0; n < corners.length; n += 3) if (corners[n + 1] <= low + tall * 0.1) { fx += corners[n]; fz += corners[n + 2]; feet += 1; }
  [fx, fz] = [fx / feet, fz / feet];
  const triangles = new Float32Array(corners.length);
  let spread = 0;
  for (let n = 0; n < corners.length; n += 3) {
    triangles[n] = (corners[n] - fx) / tall;
    triangles[n + 1] = (corners[n + 1] - low) / tall;
    triangles[n + 2] = (corners[n + 2] - fz) / tall;
    spread = Math.max(spread, Math.hypot(triangles[n], triangles[n + 2]));
  }
  return Object.freeze({ triangles, colors: new Float32Array(colours), count: corners.length / 9, spread });
}

/** The templates of a loaded file's scene, by kind: { palm: [template, …], … }. A kind with no model is left out. */
export function templatesFrom(scene) {
  const out = {};
  for (const [kind, names] of Object.entries(MODEL_KINDS)) {
    const found = names.map((name) => scene.getObjectByName(name)).filter(Boolean).map(templateFrom).filter(Boolean);
    if (found.length) out[kind] = found;
  }
  return out;
}

/**
 * Stamps `template` into `out` (a bucket of positions, normals, uvs and colors, as endless.js fills them): at
 * (x, y, z), `height` metres tall, turned by `turn` radians, its colours multiplied by `shade` ([r, g, b]).
 * Every triangle is flat: its normal is its own.
 */
export function stampModel(out, template, x, y, z, height, turn = 0, shade = [1, 1, 1]) {
  const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
  const t = template.triangles;
  for (let n = 0; n < template.count; n += 1) {
    const p = [];
    for (let k = 0; k < 3; k += 1) {
      const [mx, my, mz] = [t[n * 9 + k * 3], t[n * 9 + k * 3 + 1], t[n * 9 + k * 3 + 2]];
      p.push([x + (mx * cos - mz * sin) * height, y + my * height, z + (mx * sin + mz * cos) * height]);
    }
    const [ux, uy, uz] = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
    const [vx, vy, vz] = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    let [nx, ny, nz] = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const length = Math.hypot(nx, ny, nz) || 1;
    [nx, ny, nz] = [nx / length, ny / length, nz / length];
    const colour = [template.colors[n * 3] * shade[0], template.colors[n * 3 + 1] * shade[1], template.colors[n * 3 + 2] * shade[2]];
    for (let k = 0; k < 3; k += 1) {
      out.positions.push(...p[k]);
      out.normals.push(nx, ny, nz);
      out.uvs.push(k === 1 ? 1 : k === 2 ? 0.5 : 0, k === 2 ? 1 : 0);
      out.colors.push(...colour);
    }
  }
}

/**
 * Loads a model file (a .glb made by client/scripts/make-models.mjs: meshopt-compressed, quantized) and returns its
 * templates by kind. The loader and the decoder are imported here, on the first call, so a host that never asks for
 * models never loads them. `parse` (an ArrayBuffer) is for a host that has the bytes already.
 */
export async function loadModels(url, { bytes = null } = {}) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/libs/meshopt_decoder.module.js'),
  ]);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = bytes ? await loader.parseAsync(bytes, '') : await loader.loadAsync(url);
  return templatesFrom(gltf.scene);
}
