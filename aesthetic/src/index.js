// @parallang/aesthetic: the PS1 look and the Angkor Wat dead-branch scene.
// Platform-neutral: nothing here touches the DOM. Hosts supply a three.js WebGLRenderer
// (a browser canvas, or an expo-gl context on iOS) and feed input to the camera rig.

export { createPS1Uniforms, createPS1Material } from './ps1/material.js';
export { createPS1Pipeline, internalResolution } from './ps1/pipeline.js';
export { createTextures } from './ps1/textures.js';
export { createTempleWorld, createMaterials } from './scene/world.js';
export { MeshBuilder } from './scene/geometry.js';
export { createCameraRig, TOUR } from './camera.js';
export { PRESETS } from './scene/presets.js';
export { LAYOUT } from './scene/layout.js';
export { PALETTE, hexToRgb } from './palette.js';
export { PS1_STYLE } from './style.js';
