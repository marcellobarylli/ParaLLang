import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  NearestFilter,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { postFragmentShader, postVertexShader } from './shaders.js';

/**
 * The internal render size. `lines` is the number of pixels on the short side of the screen
 * (240 for the PS1's 320x240), so portrait phones keep the same chunkiness as landscape.
 * `lines` of 0 or null renders at the full drawing-buffer size.
 */
export function internalResolution(width, height, lines = 240) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (!lines) return { width: w, height: h };
  const scale = lines / Math.min(w, h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/**
 * Renders a scene at low resolution into an off-screen target, then upscales it to the screen
 * with nearest filtering, 15-bit colour quantisation and the PS1 ordered dither.
 *
 * Works with any three.js WebGLRenderer: one made from a browser canvas or one made from an
 * expo-gl context on iOS.
 */
export function createPS1Pipeline(renderer, options = {}) {
  const { uniforms = null, lines = 240, dither = true, colorBits = 5, scanlines = 0 } = options;

  const target = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    generateMipmaps: false,
    depthBuffer: true,
  });

  const post = new ShaderMaterial({
    name: 'ps1-post',
    uniforms: {
      tScene: { value: target.texture },
      uRes: { value: new Vector2(1, 1) },
      uOutput: { value: new Vector2(1, 1) },
      uDither: { value: dither ? 1 : 0 },
      uColorBits: { value: colorBits },
      uScanlines: { value: scanlines },
    },
    vertexShader: postVertexShader,
    fragmentShader: postFragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  const triangle = new BufferGeometry();
  triangle.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const quad = new Mesh(triangle, post);
  quad.frustumCulled = false;
  const postScene = new Scene();
  postScene.add(quad);
  const postCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const state = { lines, enabled: true };
  const bufferSize = new Vector2();

  function resize() {
    renderer.getDrawingBufferSize(bufferSize);
    const size = internalResolution(bufferSize.x, bufferSize.y, state.enabled ? state.lines : 0);
    target.setSize(size.width, size.height);
    post.uniforms.uRes.value.set(size.width, size.height);
    post.uniforms.uOutput.value.copy(bufferSize);
    if (uniforms) uniforms.uResolution.value.set(size.width, size.height);
    return size;
  }

  function render(scene, camera) {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  }

  return {
    target,
    render,
    /** Call after renderer.setSize (or when the drawing buffer changes). */
    resize,
    setLines(n) {
      state.lines = n;
      return resize();
    },
    setDither(on) {
      post.uniforms.uDither.value = on ? 1 : 0;
    },
    setColorBits(bits) {
      post.uniforms.uColorBits.value = bits;
    },
    setScanlines(amount) {
      post.uniforms.uScanlines.value = amount;
    },
    get internalSize() {
      return { width: post.uniforms.uRes.value.x, height: post.uniforms.uRes.value.y };
    },
    dispose() {
      target.dispose();
      post.dispose();
      triangle.dispose();
    },
  };
}
