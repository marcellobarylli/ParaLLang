// Expo / React Native host for the aesthetic package (reference adapter).
//
// Not wired into mobile/ yet. To use it there:
//   cd mobile && npx expo install expo-gl && npm install three@0.186.1
//   import TempleView from '../aesthetic/native/TempleView';   (or copy this file in)
//   <TempleView preset="golden" style={{ flex: 1 }} />
//
// Same scene, pipeline and camera rig as the web demo; only the GL context and input differ.
// Status: written against the expo-gl and three.js APIs but not yet run in the iOS Simulator.

import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import { GLView } from 'expo-gl';
import { PerspectiveCamera, WebGLRenderer } from 'three';
import { createCameraRig, createPS1Pipeline, createTempleWorld } from '../src/index.js';

function createRenderer(gl) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;
  // three.js expects a canvas; expo-gl gives a bare context, so pass a minimal stand-in.
  const canvas = {
    width,
    height,
    style: {},
    clientWidth: width,
    clientHeight: height,
    addEventListener() {},
    removeEventListener() {},
    getContext: () => gl,
  };
  const renderer = new WebGLRenderer({ canvas, context: gl, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  return renderer;
}

export default function TempleView({ preset = 'golden', corruption, style }) {
  const sceneRef = useRef(null);
  const world = useMemo(() => createTempleWorld({ seed: 7, preset }), []);

  useEffect(() => {
    world.setPreset(preset);
  }, [preset, world]);
  useEffect(() => {
    if (corruption !== undefined) world.setCorruption(corruption);
  }, [corruption, world]);

  const pan = useMemo(() => {
    let last = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => (last = { x: 0, y: 0 }),
      onPanResponderMove: (_e, g) => {
        sceneRef.current?.rig.orbit(g.dx - last.x, g.dy - last.y);
        last = { x: g.dx, y: g.dy };
      },
    });
  }, []);

  useEffect(() => () => sceneRef.current?.stop(), []);

  const onContextCreate = (gl) => {
    const renderer = createRenderer(gl);
    const camera = new PerspectiveCamera(60, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.3, 700);
    const pipeline = createPS1Pipeline(renderer, { uniforms: world.uniforms });
    pipeline.resize();
    const rig = createCameraRig(camera);
    let running = true;
    let last = Date.now();
    const frame = () => {
      if (!running) return;
      const now = Date.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      rig.update(dt);
      world.update(dt, camera);
      pipeline.render(world.scene, camera);
      gl.endFrameEXP();
      requestAnimationFrame(frame);
    };
    sceneRef.current = { rig, stop: () => (running = false) };
    requestAnimationFrame(frame);
  };

  return (
    <View style={style ?? { flex: 1 }} {...pan.panHandlers}>
      <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
    </View>
  );
}
