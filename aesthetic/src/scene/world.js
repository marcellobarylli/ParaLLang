import { Scene } from 'three';
import { createPS1Material, createPS1Uniforms } from '../ps1/material.js';
import { createTextures } from '../ps1/textures.js';
import { PALETTE, hexToRgb } from '../palette.js';
import { createRandom } from '../util/random.js';
import { MeshBuilder } from './geometry.js';
import { LAYOUT } from './layout.js';
import { PRESETS } from './presets.js';
import { buildLion, buildRubble, buildShrine, buildStele, buildWallFig } from './ruins.js';
import { createSky } from './sky.js';
import { buildCauseways, buildEnclosure, buildLibraries, buildTemple } from './temple.js';
import { buildTerrain } from './terrain.js';
import { buildVegetation } from './vegetation.js';
import { TOUR } from '../camera.js';

export function createMaterials(uniforms, textures) {
  const m = (options) => createPS1Material(uniforms, options);
  return {
    stone: m({ name: 'stone', map: textures.sandstone }),
    relief: m({ name: 'relief', map: textures.relief }),
    inscription: m({ name: 'inscription', map: textures.inscription, glow: 0.85, glowMask: true }),
    laterite: m({ name: 'laterite', map: textures.laterite }),
    roof: m({ name: 'roof', map: textures.roof }),
    ground: m({ name: 'ground', map: textures.grass }),
    water: m({ name: 'water', map: textures.water, transparent: true, opacity: 0.5, scroll: [0.012, 0.02], ripple: 0.04 }),
    bark: m({ name: 'bark', map: textures.bark }),
    root: m({ name: 'root', map: textures.root }),
    rootGlow: m({ name: 'root-glow', map: textures.root, glow: 1, tint: [0.8, 0.75, 0.7] }),
    leaves: m({ name: 'leaves', map: textures.leaves }),
    frond: m({ name: 'frond', map: textures.frond, alphaTest: 0.5, doubleSided: true, sway: 0.22 }),
    tuft: m({ name: 'tuft', map: textures.tuft, alphaTest: 0.5, doubleSided: true, sway: 0.08 }),
    plain: m({ name: 'plain' }),
    thitpok: m({ name: 'thitpok', map: textures.thitpok }),
    devata: m({ name: 'devata', map: textures.devata }),
    face: m({ name: 'face', map: textures.face }),
    litter: m({ name: 'litter', map: textures.litter }),
    shaft: m({ name: 'light-shaft', lit: false, fog: 0.4, transparent: true, opacity: 0.16, doubleSided: true }),
  };
}

function countTriangles(object) {
  let n = 0;
  object.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return n;
}

/** What every level shares: seeded randomness, the shared uniforms, textures and materials. */
export function createWorldKit(seed = 7) {
  const rng = createRandom(seed);
  const uniforms = createPS1Uniforms();
  const textures = createTextures(seed);
  const materials = createMaterials(uniforms, textures);
  return { seed, rng, uniforms, textures, materials };
}

/**
 * Turns filled builders into a playable world: sky, optional water reflection, presets,
 * corruption and effect toggles. Every level returns this same interface, so hosts can swap
 * levels without knowing which one they run.
 */
export function assembleWorld(kit, { name, props, surface, preset, reflections, waterY = 0, layout, tour, orbitTarget }) {
  const { uniforms, materials, textures, seed } = kit;
  const scene = new Scene();
  scene.name = name;
  const sky = createSky(uniforms, seed);
  const propsGroup = props.build(materials, 'props');
  const surfaceGroup = surface.build(materials, 'surface');
  scene.add(sky.group, surfaceGroup, propsGroup);

  // The PS1 had no reflections; games faked them with mirrored geometry under translucent
  // water. The mirrored copy shares geometry and materials, so it costs draw calls only.
  let mirror = null;
  if (reflections) {
    mirror = propsGroup.clone();
    mirror.name = 'reflection';
    mirror.scale.y = -1;
    mirror.position.y = 2 * waterY;
    scene.add(mirror);
  }
  for (const group of [surfaceGroup, propsGroup]) {
    for (const mesh of group.children) {
      if (mesh.material === materials.water) mesh.renderOrder = 5;
      if (mesh.material === materials.ember) mesh.renderOrder = 7;
      if (mesh.material === materials.shaft) mesh.renderOrder = 6;
    }
  }

  const state = { preset, corruption: PRESETS[preset].corruption };

  function setCorruption(v) {
    state.corruption = Math.min(1, Math.max(0, v));
    uniforms.uCorruption.value = state.corruption;
    const p = PRESETS[state.preset];
    const t = state.corruption;
    materials.water.uniforms.uTint.value.set(
      p.water[0] * (1 - t) + 0.85 * t,
      p.water[1] * (1 - t) + 0.7 * t,
      p.water[2] * (1 - t) + 1.0 * t,
    );
  }

  function setPreset(presetName) {
    const p = PRESETS[presetName];
    if (!p) throw new Error(`Unknown preset "${presetName}"`);
    state.preset = presetName;
    uniforms.uSunDir.value.set(...p.sunDir).normalize();
    uniforms.uSunColor.value.set(...p.sunColor);
    uniforms.uAmbientSky.value.set(...p.ambientSky);
    uniforms.uAmbientGround.value.set(...p.ambientGround);
    uniforms.uFogColor.value.set(...hexToRgb(p.fog));
    uniforms.uFogNear.value = p.fogNear;
    uniforms.uFogFar.value = p.fogFar;
    materials.shaft.uniforms.uTint.value.set(...hexToRgb(p.sun));
    // The glow is the strings' violet unless the preset names its own (ember).
    uniforms.uGlowColor.value.set(...hexToRgb(p.glow ?? PALETTE.stringGlow));
    uniforms.uGlowHot.value.set(...hexToRgb(p.glowHot ?? p.glow ?? PALETTE.stringGlow));
    sky.applyPreset(p);
    setCorruption(p.corruption);
  }

  setPreset(preset);

  return {
    name,
    scene,
    uniforms,
    materials,
    textures,
    layout,
    tour,
    orbitTarget,
    get preset() {
      return state.preset;
    },
    get corruption() {
      return state.corruption;
    },
    setPreset,
    setCorruption,
    setEffects({ jitter, affine } = {}) {
      if (jitter !== undefined) uniforms.uJitter.value = jitter ? 1 : 0;
      if (affine !== undefined) uniforms.uAffine.value = affine ? 1 : 0;
    },
    update(dt, camera) {
      uniforms.uTime.value += dt;
      if (camera) sky.follow(camera, waterY);
    },
    stats: {
      triangles: countTriangles(propsGroup) + countTriangles(surfaceGroup),
      reflectedTriangles: mirror ? countTriangles(mirror) : 0,
      meshes: propsGroup.children.length + surfaceGroup.children.length + sky.group.children.length + (mirror ? mirror.children.length : 0),
    },
  };
}

/**
 * Builds the Angkor Wat dead-branch scene. Platform-neutral: needs no DOM and no renderer, so it
 * runs in the browser, under expo-gl, and in Node for tests.
 *
 * Returns { scene, uniforms, materials, textures, tour, orbitTarget, update(dt, camera),
 *           setPreset(name), setCorruption(v), setEffects({ jitter, affine }), stats }.
 */
export function createTempleWorld(options = {}) {
  const { seed = 7, preset = 'golden', reflections = true } = options;
  const kit = createWorldKit(seed);
  const { rng } = kit;
  const props = new MeshBuilder(rng);
  const surface = new MeshBuilder(rng);

  buildTemple(props);
  buildEnclosure(props);
  buildCauseways(props);
  buildLibraries(props);
  buildShrine(props, rng, LAYOUT.shrine);
  for (const fig of LAYOUT.wallFigs) buildWallFig(props, rng, fig);
  buildStele(props, 9.5, 86, -0.5);
  for (const s of [-1, 1]) buildLion(props, s * 5.2, 90.6, 0);
  buildRubble(props, rng);
  buildTerrain(surface, props);
  buildVegetation(props, surface, rng);

  return assembleWorld(kit, {
    name: 'angkor-dead-branch',
    props,
    surface,
    preset,
    reflections,
    waterY: LAYOUT.waterY,
    layout: LAYOUT,
    tour: TOUR,
    orbitTarget: [0, 12, 0],
  });
}
