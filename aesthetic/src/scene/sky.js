import { BufferAttribute, CircleGeometry, Group, IcosahedronGeometry, Mesh, SphereGeometry, BufferGeometry, Float32BufferAttribute, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPS1Material } from '../ps1/material.js';
import { hexToRgb, mixRgb } from '../palette.js';
import { createRandom, valueNoise2 } from '../util/random.js';

const RADIUS = 400;

function colorAttr(g) {
  const c = new Float32Array(g.attributes.position.count * 3).fill(1);
  g.setAttribute('color', new BufferAttribute(c, 3));
  return g;
}

/**
 * A Gouraud-shaded gradient dome, mirrored below the horizon so the water reflects it, with a
 * sun disc, a few low-poly clouds and a ring of distant hills. It follows the camera.
 */
export function createSky(uniforms, seed = 7) {
  const rng = createRandom(seed + 100);
  const group = new Group();
  group.name = 'sky';

  const dome = colorAttr(new SphereGeometry(RADIUS, 16, 14));
  const domeMat = createPS1Material(uniforms, { name: 'sky', lit: false, fog: 0, depthWrite: false, doubleSided: true });
  const domeMesh = new Mesh(dome, domeMat);
  domeMesh.renderOrder = -10;
  domeMesh.frustumCulled = false;
  group.add(domeMesh);

  const sunMat = createPS1Material(uniforms, { name: 'sun', lit: false, fog: 0, depthWrite: false });
  const haloMat = createPS1Material(uniforms, { name: 'sun-halo', lit: false, fog: 0, transparent: true, opacity: 0.28 });
  const sun = new Mesh(colorAttr(new CircleGeometry(13, 10)), sunMat);
  const halo = new Mesh(colorAttr(new CircleGeometry(30, 10)), haloMat);
  sun.renderOrder = -9;
  halo.renderOrder = -8;
  group.add(sun, halo);

  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const g = new IcosahedronGeometry(1, 0);
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(220, 330);
    g.scale(rng.range(30, 60), rng.range(4, 7), rng.range(14, 24));
    g.rotateY(rng.range(0, Math.PI));
    g.translate(Math.cos(a) * d, rng.range(55, 110), Math.sin(a) * d);
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
    clouds.push(g);
  }
  const cloudGeo = colorAttr(mergeGeometries(clouds));
  cloudGeo.computeVertexNormals();
  cloudGeo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(cloudGeo.attributes.position.count * 2), 2));
  const cloudMesh = new Mesh(cloudGeo, createPS1Material(uniforms, { name: 'clouds', lit: false, fog: 0.35, depthWrite: false }));
  cloudMesh.renderOrder = -7;
  cloudMesh.frustumCulled = false;
  group.add(cloudMesh);

  const hills = [];
  const steps = 48;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2;
    const a1 = ((i + 1) / steps) * Math.PI * 2;
    const h0 = 4 + 16 * valueNoise2(i * 0.5, 0, steps / 2, seed);
    const h1 = 4 + 16 * valueNoise2((i + 1) * 0.5, 0, steps / 2, seed);
    const r = 330;
    const p = (a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
    hills.push(...p(a0, -4), ...p(a1, -4), ...p(a1, h1), ...p(a0, -4), ...p(a1, h1), ...p(a0, h0));
  }
  const hillGeo = new BufferGeometry();
  hillGeo.setAttribute('position', new Float32BufferAttribute(hills, 3));
  hillGeo.setAttribute('uv', new Float32BufferAttribute(new Float32Array((hills.length / 3) * 2), 2));
  hillGeo.computeVertexNormals();
  colorAttr(hillGeo);
  const hillMesh = new Mesh(hillGeo, createPS1Material(uniforms, { name: 'hills', lit: false, fog: 0.55, doubleSided: true, depthWrite: false }));
  hillMesh.renderOrder = -6;
  hillMesh.frustumCulled = false;
  group.add(hillMesh);

  function paint(geometry, fn) {
    const pos = geometry.attributes.position;
    const col = geometry.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
      col.setXYZ(i, c[0], c[1], c[2]);
    }
    col.needsUpdate = true;
  }

  function applyPreset(p) {
    const zenith = hexToRgb(p.zenith);
    const mid = hexToRgb(p.mid);
    const horizon = hexToRgb(p.horizon);
    const fog = hexToRgb(p.fog);
    paint(dome, (_x, y) => {
      const t = Math.abs(y) / RADIUS;
      if (t < 0.04) return mixRgb(fog, horizon, t / 0.04);
      if (t < 0.25) return mixRgb(horizon, mid, (t - 0.04) / 0.21);
      return mixRgb(mid, zenith, Math.min(1, (t - 0.25) / 0.5));
    });
    const cloud = hexToRgb(p.cloud);
    paint(cloudGeo, (_x, y) => mixRgb(mixRgb(cloud, fog, 0.45), cloud, Math.min(1, Math.max(0, (y - 55) / 55))));
    const hill = hexToRgb(p.hills);
    paint(hillGeo, (_x, y) => mixRgb(hill, fog, Math.max(0, (y + 4) / 30) * 0.5));
    const sunCol = hexToRgb(p.sun);
    paint(sun.geometry, () => sunCol);
    paint(halo.geometry, () => mixRgb(sunCol, horizon, 0.3));
    const dir = new Vector3(...p.sunDir).normalize();
    sun.position.copy(dir).multiplyScalar(360);
    halo.position.copy(dir).multiplyScalar(365);
  }

  return {
    group,
    applyPreset,
    follow(camera, waterY) {
      group.position.set(camera.position.x, waterY, camera.position.z);
      group.updateMatrixWorld();
      sun.lookAt(group.position);
      halo.lookAt(group.position);
    },
  };
}
