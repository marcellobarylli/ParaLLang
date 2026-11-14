import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';

// An input-agnostic camera rig. The host feeds it deltas (mouse, touch, a React Native
// PanResponder, a gamepad), so the same rig runs on web and on the phone.
//
// 'tour'  : the attract-mode fly-through used by PS1 title screens
// 'orbit' : drag to orbit the temple, pinch or wheel to zoom

export const TOUR = [
  { pos: [0, 2.6, 150], look: [0, 12, 0] },
  { pos: [5, 3.2, 104], look: [0, 10, 0] },
  { pos: [9, 4.2, 80], look: [0, 9, 30] },
  { pos: [-28, 8, 61], look: [-16, 2, 34] },
  { pos: [-25, 7.5, 47], look: [-6, 6, 20] },
  { pos: [-10, 2.6, 38], look: [0, 14, 0] },
  { pos: [-30, 14, 20], look: [-38, 6, 4] },
  { pos: [-15, 22, -30], look: [0, 18, 0] },
  { pos: [28, 27, -42], look: [0, 20, 0] },
  { pos: [54, 15, 10], look: [0, 13, 0] },
  { pos: [32, 8, 62], look: [0, 12, 0] },
  { pos: [12, 3.2, 118], look: [0, 12, 0] },
];

export function createCameraRig(camera, options = {}) {
  const { keyframes = TOUR, duration = 95, target = [0, 12, 0] } = options;
  const path = new CatmullRomCurve3(keyframes.map((k) => new Vector3(...k.pos)), true, 'centripetal');
  const look = new CatmullRomCurve3(keyframes.map((k) => new Vector3(...k.look)), true, 'centripetal');
  const orbit = { target: new Vector3(...target), yaw: 0, pitch: 0.2, distance: 80 };
  const state = { mode: 'tour', t: 0, paused: false };
  const tmp = new Vector3();

  function placeTour() {
    camera.position.copy(path.getPointAt(state.t));
    camera.lookAt(look.getPointAt(state.t, tmp));
  }

  function placeOrbit() {
    orbit.pitch = MathUtils.clamp(orbit.pitch, -0.05, 1.35);
    orbit.distance = MathUtils.clamp(orbit.distance, 18, 190);
    const cp = Math.cos(orbit.pitch);
    camera.position.set(
      orbit.target.x + Math.sin(orbit.yaw) * cp * orbit.distance,
      Math.max(1.2, orbit.target.y + Math.sin(orbit.pitch) * orbit.distance),
      orbit.target.z + Math.cos(orbit.yaw) * cp * orbit.distance,
    );
    camera.lookAt(orbit.target);
  }

  function enterOrbit() {
    if (state.mode === 'orbit') return;
    const d = tmp.subVectors(camera.position, orbit.target);
    orbit.distance = d.length();
    orbit.yaw = Math.atan2(d.x, d.z);
    orbit.pitch = Math.asin(MathUtils.clamp(d.y / orbit.distance, -1, 1));
    state.mode = 'orbit';
  }

  return {
    get mode() {
      return state.mode;
    },
    get t() {
      return state.t;
    },
    update(dt) {
      if (state.mode === 'tour') {
        if (!state.paused) state.t = (state.t + dt / duration) % 1;
        placeTour();
      } else if (state.mode === 'orbit') placeOrbit();
    },
    /** Jump the tour to a point in [0, 1). */
    seek(t) {
      state.t = ((t % 1) + 1) % 1;
      state.mode = 'tour';
      placeTour();
    },
    setPaused(p) {
      state.paused = p;
    },
    setMode(mode) {
      if (mode === 'orbit') enterOrbit();
      else state.mode = 'tour';
    },
    /** Drag deltas in pixels. Switches to orbit mode. */
    orbit(dx, dy) {
      enterOrbit();
      orbit.yaw -= dx * 0.006;
      orbit.pitch += dy * 0.004;
    },
    /** Hold the camera at a fixed view (cutscenes, screenshots). */
    lookFrom(position, at) {
      state.mode = 'fixed';
      camera.position.set(...position);
      camera.lookAt(...at);
    },
    /** Place the orbit camera directly (angles in radians). */
    setOrbit({ yaw = orbit.yaw, pitch = orbit.pitch, distance = orbit.distance } = {}) {
      state.mode = 'orbit';
      Object.assign(orbit, { yaw, pitch, distance });
      placeOrbit();
    },
    /** Zoom factor: > 1 moves away, < 1 moves closer. */
    zoom(factor) {
      enterOrbit();
      orbit.distance *= factor;
    },
  };
}
