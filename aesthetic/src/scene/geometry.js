import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  Matrix4,
  Mesh,
  Quaternion,
  Shape,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, hexToRgb } from '../palette.js';
import { smoothstep, valueNoise3 } from '../util/random.js';

const KEEP = new Set(['position', 'normal', 'uv', 'color']);
const MOSS = hexToRgb(PALETTE.moss);

/** A transform: position, Y rotation, scale, then optional X and Z rotations. */
export function M(x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) {
  return new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromEuler(new Euler(rx, ry, rz, 'YXZ')),
    new Vector3(sx, sy, sz),
  );
}

export function chain(...matrices) {
  const out = new Matrix4();
  for (const m of matrices) out.multiply(m);
  return out;
}

/** World-space box mapping: each face takes UVs from the two axes it does not face. Gives an
 * even texel density across every piece, so blocks line up from building to building. */
export function boxUV(geometry, scale) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(new Vector3().subVectors(a, b));
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    for (let k = 0; k < 3; k++) {
      const v = k === 0 ? a : k === 1 ? b : c;
      let u;
      let w;
      if (ax >= ay && ax >= az) [u, w] = [v.z, v.y];
      else if (ay >= az) [u, w] = [v.x, v.z];
      else [u, w] = [v.x, v.y];
      uv[(i + k) * 2] = u * scale;
      uv[(i + k) * 2 + 1] = w * scale;
    }
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

/** Flip any triangle whose face normal points down, so single-sided lighting of leaves reads. */
export function faceUp(geometry) {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const ny = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z);
    if (ny < 0) {
      for (const attr of [pos, uv]) {
        if (!attr) continue;
        for (let k = 0; k < attr.itemSize; k++) {
          const t = attr.array[(i + 1) * attr.itemSize + k];
          attr.array[(i + 1) * attr.itemSize + k] = attr.array[(i + 2) * attr.itemSize + k];
          attr.array[(i + 2) * attr.itemSize + k] = t;
        }
      }
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Collects geometry per material key and merges each bucket into one mesh, so the whole
 * scene costs one draw call per material.
 */
export class MeshBuilder {
  constructor(rng) {
    this.rng = rng;
    this.buckets = new Map();
  }

  /**
   * options:
   *  matrix       Matrix4 placed in world space
   *  uv           'box' (world box mapping, default) or 'keep'
   *  uvScale      for 'box': texture repeats per world unit
   *  color        [r,g,b] vertex colour, or fn(x, y, z) -> [r,g,b]
   *  jitter       per-triangle brightness variation (faceted stone)
   *  grime        darkening towards the ground
   *  grimeHeight  height over which grime fades out
   *  moss         amount of moss creeping over upward faces and low stone
   *  flat         recompute flat normals after transform
   */
  add(key, source, options = {}) {
    const { matrix, uv = 'box', uvScale = 0.25, flat = false } = options;
    let g = source.index ? source.toNonIndexed() : source.clone();
    for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name);
    g.clearGroups();
    if (matrix) g.applyMatrix4(matrix);
    if (flat || !g.attributes.normal) g.computeVertexNormals();
    if (uv === 'box') boxUV(g, uvScale);
    else if (!g.attributes.uv) g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    paint(g, options, this.rng);
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(g);
    return g;
  }

  triangleCount() {
    let n = 0;
    for (const list of this.buckets.values()) for (const g of list) n += g.attributes.position.count / 3;
    return n;
  }

  build(materials, name = 'props') {
    const group = new Group();
    group.name = name;
    for (const [key, list] of this.buckets) {
      if (!materials[key]) throw new Error(`No PS1 material for "${key}"`);
      const merged = mergeGeometries(list, false);
      merged.computeBoundingSphere();
      const mesh = new Mesh(merged, materials[key]);
      mesh.name = `${name}:${key}`;
      group.add(mesh);
      for (const g of list) g.dispose();
    }
    this.buckets.clear();
    return group;
  }
}

function paint(g, options, rng) {
  const { color = [1, 1, 1], jitter = 0.05, grime = 0, grimeHeight = 3, moss = 0 } = options;
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const out = new Float32Array(pos.count * 3);
  const fn = typeof color === 'function' ? color : null;
  for (let i = 0; i < pos.count; i += 3) {
    const f = 1 + (rng.next() * 2 - 1) * jitter;
    for (let k = i; k < i + 3; k++) {
      const x = pos.getX(k);
      const y = pos.getY(k);
      const z = pos.getZ(k);
      let c = fn ? fn(x, y, z) : color;
      c = [c[0] * f, c[1] * f, c[2] * f];
      if (grime > 0) {
        const d = grime * (1 - smoothstep(0, grimeHeight, y));
        c = [c[0] * (1 - d * 0.45), c[1] * (1 - d * 0.42), c[2] * (1 - d * 0.4)];
      }
      if (moss > 0) {
        const n = valueNoise3(x * 0.35, y * 0.35, z * 0.35, 17);
        const up = Math.max(0, nrm.getY(k));
        let m = moss * smoothstep(0.55, 0.85, n) * (0.4 + 0.6 * up);
        m += moss * 0.6 * (1 - smoothstep(0, 1.6, y)) * n;
        m = Math.min(0.75, m);
        c = [c[0] + (MOSS[0] * 1.3 - c[0]) * m, c[1] + (MOSS[1] * 1.3 - c[1]) * m, c[2] + (MOSS[2] * 1.3 - c[2]) * m];
      }
      out[k * 3] = c[0];
      out[k * 3 + 1] = c[1];
      out[k * 3 + 2] = c[2];
    }
  }
  g.setAttribute('color', new BufferAttribute(out, 3));
}

/** A tube whose radius tapers from r0 to r1 along a curve. Low radial counts read as PS1. */
export function taperedTube(curve, tubular, radial, r0, r1, vRepeat = 1) {
  const frames = curve.computeFrenetFrames(tubular, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, p);
    const r = r0 + (r1 - r0) * t;
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const v = (j / radial) * Math.PI * 2;
      n.set(0, 0, 0).addScaledVector(N, -Math.cos(v)).addScaledVector(B, Math.sin(v)).normalize();
      positions.push(p.x + r * n.x, p.y + r * n.y, p.z + r * n.z);
      normals.push(n.x, n.y, n.z);
      uvs.push(j / radial, t * vRepeat);
    }
  }
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}

/** A gable (triangular prism), apex up, running along X, centred, base at y = 0. */
export function gable(length, width, height) {
  const s = new Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(0, height);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

/** A quad strip from rows of points; rows[i] is an array of Vector3 across the strip. */
export function stripGeometry(rows, uvAcross) {
  const pos = [];
  const uv = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const v0 = i / (rows.length - 1);
    const v1 = (i + 1) / (rows.length - 1);
    for (let j = 0; j < rows[i].length - 1; j++) {
      const a = rows[i][j];
      const b = rows[i][j + 1];
      const c = rows[i + 1][j + 1];
      const d = rows[i + 1][j];
      const ua = uvAcross[j];
      const ub = uvAcross[j + 1];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
      uv.push(ua, v0, ub, v0, ub, v1, ua, v0, ub, v1, ua, v1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
