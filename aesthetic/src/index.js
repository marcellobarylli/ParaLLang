// @parallang/aesthetic: the PS1 look and the dead-branch levels (Angkor Wat, Ta Prohm).
// Platform-neutral: nothing here touches the DOM. Hosts supply a three.js WebGLRenderer
// (a browser canvas, or an expo-gl context on iOS) and feed input to the camera rig.

export { createPS1Uniforms, createPS1Material } from './ps1/material.js';
export { createPS1Pipeline, internalResolution } from './ps1/pipeline.js';
export { createTextures } from './ps1/textures.js';
export { createTempleWorld, createMaterials, createWorldKit, assembleWorld } from './scene/world.js';
export { createTaProhmWorld, createKilnWorld, TA_PROHM, TA_PROHM_TOUR, taProhmHeightAt, isClear as taProhmIsClear } from './scene/taprohm.js';
export { createMicromortWorld, MICROMORT, MICROMORT_TOUR, micromortHeightAt } from './scene/micromort.js';
export { createWorld, WORLDS } from './worlds.js';
export { MeshBuilder } from './scene/geometry.js';
export { FIGURES, createFigure } from './scene/figures.js';
export { createCameraRig, TOUR } from './camera.js';
export { PRESETS } from './scene/presets.js';
export { LAYOUT } from './scene/layout.js';
export { PALETTE, hexToRgb } from './palette.js';
export { PS1_STYLE } from './style.js';
