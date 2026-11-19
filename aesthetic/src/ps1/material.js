import { DoubleSide, FrontSide, ShaderMaterial, Vector2, Vector3 } from 'three';
import { ps1FragmentShader, ps1VertexShader } from './shaders.js';
import { hexToRgb } from '../palette.js';

// Uniforms shared by every PS1 material in a scene. Materials reference the same uniform
// objects, so one change (a toggle, a preset, the clock) reaches the whole scene at once.
export function createPS1Uniforms() {
  return {
    uResolution: { value: new Vector2(320, 240) },
    uJitter: { value: 1 },
    uAffine: { value: 1 },
    uSunDir: { value: new Vector3(0.5, 0.4, 0.7).normalize() },
    uSunColor: { value: new Vector3(0.8, 0.7, 0.55) },
    uAmbientSky: { value: new Vector3(0.45, 0.48, 0.58) },
    uAmbientGround: { value: new Vector3(0.3, 0.26, 0.2) },
    uLightBoost: { value: 1 },
    uFogColor: { value: new Vector3(0.85, 0.72, 0.55) },
    uFogNear: { value: 50 },
    uFogFar: { value: 230 },
    uTime: { value: 0 },
    uCorruption: { value: 0 },
    uGlowColor: { value: new Vector3(...hexToRgb('#c08cff')) },
    uGlowHot: { value: new Vector3(...hexToRgb('#c08cff')) },
  };
}

/**
 * A PS1 material. Options:
 *  map         DataTexture (nearest filtered) or null for vertex colour only
 *  tint        [r,g,b] multiplier
 *  lit         false for unlit surfaces (sky, sun)
 *  fog         0..1, how much depth cueing applies
 *  alphaTest   > 0 for cut-out textures (fronds, grass)
 *  transparent / opacity
 *  scroll      [u,v] texture scroll per second (water)
 *  sway        foliage sway amplitude, weighted by uv.y
 *  ripple      vertical vertex wave amplitude (water)
 *  glow        0..1, how strongly the surface glows with corruption
 *  glowMask    true: the texture alpha marks the glowing parts (0 = glows)
 *  glowDark    [lo, hi]: the dark parts of the texture glow, fully below luminance lo, not above hi
 *  glowFade    [height, share]: the glow fades with height, down to `share` of itself at `height`
 *  rise        [speed, height]: ember quads rise `height` metres at `speed` and start again
 *  doubleSided
 */
export function createPS1Material(shared, options = {}) {
  const {
    name = 'ps1',
    map = null,
    tint = [1, 1, 1],
    lit = true,
    fog = 1,
    alphaTest = 0,
    transparent = false,
    opacity = 1,
    scroll = [0, 0],
    sway = 0,
    ripple = 0,
    glow = 0,
    glowMask = false,
    glowDark = [0, 0],
    glowFade = [0, 0],
    rise = [0, 0],
    doubleSided = false,
    depthWrite,
  } = options;

  const uniforms = {
    ...shared,
    uMap: { value: map },
    uHasMap: { value: map ? 1 : 0 },
    uTint: { value: new Vector3(...tint) },
    uLit: { value: lit ? 1 : 0 },
    uFogAmount: { value: fog },
    uAlphaTest: { value: alphaTest },
    uOpacity: { value: opacity },
    uScroll: { value: new Vector2(...scroll) },
    uSway: { value: sway },
    uRipple: { value: ripple },
    uGlow: { value: glow },
    uGlowMask: { value: glowMask ? 1 : 0 },
    uGlowDark: { value: new Vector2(...glowDark) },
    uGlowFade: { value: new Vector2(...glowFade) },
    uRise: { value: new Vector2(...rise) },
  };

  const material = new ShaderMaterial({
    name,
    uniforms,
    vertexShader: ps1VertexShader,
    fragmentShader: ps1FragmentShader,
    vertexColors: true,
    transparent,
    side: doubleSided ? DoubleSide : FrontSide,
    depthWrite: depthWrite ?? !transparent,
  });
  material.userData.ps1 = true;
  return material;
}
