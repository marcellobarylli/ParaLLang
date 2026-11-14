import { PALETTE } from './palette.js';
import { PRESETS } from './scene/presets.js';

// The look as data: the numbers a port to another engine (Godot, Unity, a later three.js
// build) needs to reproduce it. STYLE.md explains each rule.

export const PS1_STYLE = {
  name: 'ParaLLang PS1',
  resolution: {
    shortSideLines: 240, // 320x240 on a 4:3 screen; the short side stays 240 on phones
    hiResLines: 480, // the PS1's interlaced high-res mode, for menus or text-heavy screens
    upscale: 'nearest',
  },
  color: {
    bitsPerChannel: 5, // 15-bit colour
    ditherMatrix: [
      [-4, 0, -3, 1],
      [2, -2, 3, -1],
      [-3, 1, -4, 0],
      [3, -1, 2, -2],
    ],
    space: 'display (gamma); no linear lighting, no tone mapping',
  },
  geometry: {
    vertexSnapping: 'clip-space xy snapped to the internal pixel grid',
    textureMapping: 'affine (screen-linear UVs), no perspective correction',
    shading: 'Gouraud, per vertex: one sun plus sky/ground ambient; vertex colours carry grime and moss',
    maxTrianglesPerScene: 64000, // excluding the mirrored reflection
    maxRadialSegments: 8,
  },
  textures: {
    maxSize: 64,
    powerOfTwo: true,
    filtering: 'nearest',
    mipmaps: false,
    texelsPerUnit: 16, // 64 px over 4 world units on stone; ground is 8
    alpha: 'cut-out only (alpha test 0.5), no blended foliage',
  },
  fog: {
    kind: 'linear depth cueing per vertex',
    rule: 'the sky horizon colour equals the fog colour',
  },
  reflections: 'mirrored geometry under translucent water (opacity about 0.6)',
  palette: PALETTE,
  presets: PRESETS,
};
