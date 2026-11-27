// GLSL for the PS1 look. Written for three.js ShaderMaterial (WebGL2 / GLSL ES 3.00), which
// also runs under expo-gl on iOS.
//
// What each part imitates on the original hardware (see STYLE.md):
//  - vertex snapping: the GTE produced integer screen coordinates, so vertices jump pixel to pixel
//  - affine texture mapping: the GPU interpolated UVs linearly in screen space (no perspective divide)
//  - Gouraud vertex lighting and per-vertex depth cueing (fog)
//  - 15-bit colour with the 4x4 ordered dither the GPU applied to shaded polygons
//  - low internal resolution, upscaled with nearest-neighbour filtering

export const ps1VertexShader = /* glsl */ `
uniform vec2 uResolution;
uniform float uJitter;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uAmbientSky;
uniform vec3 uAmbientGround;
uniform float uLightBoost;
uniform float uFogNear;
uniform float uFogFar;
uniform float uTime;
uniform vec2 uScroll;
uniform float uLit;
uniform float uSway;
uniform float uRipple;
uniform vec2 uRise;

varying vec3 vColor;
varying vec3 vUvAffine;
varying vec2 vUvPerspective;
varying float vFog;
varying float vPulse;
varying float vHeight;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);

  // Embers: each quad carries its own phase in the direction of its normal (unlit, so the normal is
  // free), rises through uRise.y metres at uRise.x metres a second and starts again at the ground.
  if (uRise.x > 0.0) {
    float phase = atan(normal.z, normal.x) * 0.15915494 + 0.5;
    float t = fract(phase + uTime * uRise.x / uRise.y);
    world.y += t * uRise.y;
    world.x += 0.6 * sin(uTime * 0.9 + phase * 40.0 + t * 5.0);
    world.z += 0.6 * cos(uTime * 0.7 + phase * 23.0 + t * 4.0);
  }

  // Foliage sway, weighted towards the tip (uv.y runs base 0 -> tip 1 on fronds and tufts).
  float tip = uv.y * uv.y;
  world.x += uSway * tip * sin(uTime * 1.6 + world.x * 0.37 + world.z * 0.21);
  world.z += uSway * tip * cos(uTime * 1.3 + world.z * 0.29 + world.x * 0.11);
  world.y += uSway * tip * 0.35 * sin(uTime * 2.1 + world.x * 0.5);

  // Water ripple.
  world.y += uRipple * sin(uTime * 1.8 + world.x * 0.6 + world.z * 0.45);

  vec4 viewPos = viewMatrix * world;
  vec4 clip = projectionMatrix * viewPos;

  // Vertex snapping to the internal pixel grid.
  if (uJitter > 0.5 && clip.w > 0.0) {
    vec2 grid = uResolution * 0.5;
    clip.xy = floor(clip.xy / clip.w * grid + 0.5) / grid * clip.w;
  }
  gl_Position = clip;

  // Gouraud lighting: one sun plus a sky/ground ambient, evaluated per vertex.
  mat3 m = mat3(modelMatrix);
  vec3 n = normalize(m * normal);
  // A mirrored copy (the water reflection) is lit like the original.
  if (determinant(m) < 0.0) n.y = -n.y;
  float ndl = max(dot(n, normalize(uSunDir)), 0.0);
  vec3 ambient = mix(uAmbientGround, uAmbientSky, n.y * 0.5 + 0.5);
  vec3 light = (ambient + uSunColor * ndl) * uLightBoost;
  vColor = color * mix(vec3(1.0), light, uLit);

  vec2 tuv = uv + uScroll * uTime;
  vUvPerspective = tuv;
  vUvAffine = vec3(tuv * clip.w, clip.w);

  // Depth cueing per vertex.
  float dist = length(viewPos.xyz);
  vFog = clamp((dist - uFogNear) / max(uFogFar - uFogNear, 0.001), 0.0, 1.0);
  vPulse = world.x * 0.15 + world.z * 0.15 + world.y * 0.3;
  vHeight = world.y;
}
`;

export const ps1FragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uAffine;
uniform vec2 uAffineNear;
uniform vec3 uTint;
uniform float uOpacity;
uniform float uAlphaTest;
uniform vec3 uFogColor;
uniform float uFogAmount;
uniform float uCorruption;
uniform vec3 uGlowColor;
uniform float uGlow;
uniform float uGlowMask;
uniform vec3 uGlowHot;
uniform vec2 uGlowDark;
uniform vec2 uGlowFade;
uniform float uTime;

varying vec3 vColor;
varying vec3 vUvAffine;
varying vec2 vUvPerspective;
varying float vFog;
varying float vPulse;
varying float vHeight;

void main() {
  // Interpolating (uv * w) and w perspective-correctly, then dividing, gives screen-linear UVs.
  // Round 193: close to the camera the mapping is perspective-correct, fading to affine between uAffineNear.x and
  // .y metres. A large triangle right under the camera (a 6 m ground quad seen from eye height) otherwise smears and
  // swims as the camera moves; further off the PS1 wobble stays. vUvAffine.z, interpolated perspective-correctly, is
  // the fragment's own depth.
  float affine = uAffine * smoothstep(uAffineNear.x, uAffineNear.y, vUvAffine.z);
  vec2 uv = mix(vUvPerspective, vUvAffine.xy / vUvAffine.z, affine);
  vec4 tex = vec4(1.0);
  if (uHasMap > 0.5) tex = texture2D(uMap, uv);
  if (tex.a < uAlphaTest) discard;

  vec3 col = tex.rgb * vColor * uTint;

  // The strings between the worlds glow as corruption rises. With uGlowMask the texture's
  // alpha marks where (carved grooves of inscriptions are alpha 0).
  float mask = mix(1.0, 1.0 - tex.a, uGlowMask);
  // Heat (the ember levels): the dark parts of the texture glow (joints, grooves, cracks), below
  // luminance uGlowDark.x fully and not at all above uGlowDark.y; and the glow fades with height,
  // down to the share uGlowFade.y at uGlowFade.x metres. Both are off at zero.
  // Far off, the fog takes the fine glow, so a minified texture does not sparkle.
  if (uGlowDark.y > 0.0) mask *= (1.0 - smoothstep(uGlowDark.x, uGlowDark.y, dot(tex.rgb, vec3(0.299, 0.587, 0.114)))) * (1.0 - 0.8 * vFog);
  if (uGlowFade.x > 0.0) mask *= mix(1.0, uGlowFade.y, smoothstep(0.0, uGlowFade.x, vHeight));
  float glow = clamp(uGlow * uCorruption * mask, 0.0, 1.0);
  float pulse = 0.72 + 0.28 * sin(uTime * 2.4 + vPulse);
  // The brightest parts go to the hot colour (the same as the glow colour unless a preset names one).
  col = mix(col, mix(uGlowColor, uGlowHot, glow * glow) * pulse * 1.25, glow);

  float fog = vFog * uFogAmount * (1.0 - 0.7 * glow);
  col = mix(col, uFogColor, fog);

  float alpha = uOpacity;
  if (uAlphaTest > 0.0) alpha *= tex.a;
  gl_FragColor = vec4(col, alpha);
}
`;

export const postVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const postFragmentShader = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uRes;
uniform vec2 uOutput;
uniform float uDither;
uniform float uColorBits;
uniform float uScanlines;
varying vec2 vUv;

// The PlayStation GPU's dither table, added to 8-bit colour before truncating to 5 bits.
const float PS1_DITHER[16] = float[16](
  -4.0,  0.0, -3.0,  1.0,
   2.0, -2.0,  3.0, -1.0,
  -3.0,  1.0, -4.0,  0.0,
   3.0, -1.0,  2.0, -2.0
);

void main() {
  vec2 px = floor(vUv * uRes);
  vec3 c = texture2D(tScene, (px + 0.5) / uRes).rgb;
  vec3 c8 = clamp(c, 0.0, 1.0) * 255.0;

  if (uDither > 0.5) {
    int idx = int(mod(px.x, 4.0)) + int(mod(px.y, 4.0)) * 4;
    // The table is in 8-bit units for 5-bit output; scale it to other bit depths.
    c8 += PS1_DITHER[idx] * pow(2.0, 5.0 - uColorBits);
  }

  float levels = pow(2.0, uColorBits);
  float stepSize = 256.0 / levels;
  c = floor(clamp(c8, 0.0, 255.0) / stepSize) / (levels - 1.0);

  if (uScanlines > 0.0) {
    float row = mod(floor(vUv.y * uOutput.y), 2.0);
    c *= 1.0 - uScanlines * row;
  }
  gl_FragColor = vec4(c, 1.0);
}
`;
