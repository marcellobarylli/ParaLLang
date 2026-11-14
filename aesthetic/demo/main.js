// Web host for the aesthetic package. Everything platform-specific lives here: the canvas,
// DOM controls and pointer input. The scene, pipeline and camera rig come from ../src.
//
// URL parameters (for screenshots and comparisons):
//   ?preset=golden|dawn|day|corrupted  ?t=0.25 (tour position)  ?pause=1  ?ps1=0
//   ?lines=240|480|0  ?corruption=0.6  ?ui=0  ?orbit=yaw,pitch,distance  ?cam=x,y,z,lookX,lookY,lookZ

import { PerspectiveCamera, Timer, WebGLRenderer } from 'three';
import { PRESETS, createCameraRig, createPS1Pipeline, createTempleWorld } from '../src/index.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('view');
const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const world = createTempleWorld({ seed: 7, preset: params.get('preset') ?? 'golden' });
const camera = new PerspectiveCamera(60, 1, 0.3, 700);
const pipeline = createPS1Pipeline(renderer, { uniforms: world.uniforms });
const rig = createCameraRig(camera);

const ui = {
  ps1: params.get('ps1') !== '0',
  jitter: true,
  affine: true,
  dither: true,
  scanlines: false,
  lines: Number(params.get('lines') ?? 240),
};

if (params.has('t')) rig.seek(Number(params.get('t')));
if (params.get('pause') === '1') rig.setPaused(true);
if (params.has('corruption')) world.setCorruption(Number(params.get('corruption')));
if (params.has('orbit')) {
  const [yaw, pitch, distance] = params.get('orbit').split(',').map(Number);
  rig.setOrbit({ yaw, pitch, distance });
}
if (params.has('cam')) {
  const v = params.get('cam').split(',').map(Number);
  rig.lookFrom(v.slice(0, 3), v.slice(3, 6));
}
if (params.get('ui') === '0') {
  document.getElementById('panel').style.display = 'none';
  document.querySelector('.title').style.display = 'none';
}

function applyLook() {
  const on = ui.ps1;
  world.setEffects({ jitter: on && ui.jitter, affine: on && ui.affine });
  pipeline.setDither(on && ui.dither);
  pipeline.setColorBits(on ? 5 : 8);
  pipeline.setScanlines(on && ui.scanlines ? 0.18 : 0);
  pipeline.setLines(on ? ui.lines : 0);
  syncButtons();
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  pipeline.resize();
}

// ---- controls
const $ = (id) => document.getElementById(id);
const press = (el, on) => el.setAttribute('aria-pressed', String(Boolean(on)));

const presetRow = $('presets');
for (const [key, p] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.textContent = p.label;
  b.dataset.preset = key;
  b.onclick = () => {
    world.setPreset(key);
    $('corruption').value = String(world.corruption);
    syncButtons();
  };
  presetRow.append(b);
}
const resRow = $('res');
for (const [lines, label] of [
  [240, '240p'],
  [480, '480i'],
  [0, 'Native'],
]) {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.lines = String(lines);
  b.onclick = () => {
    ui.lines = lines;
    applyLook();
  };
  resRow.append(b);
}

function syncButtons() {
  press($('ps1'), ui.ps1);
  press($('jitter'), ui.jitter);
  press($('affine'), ui.affine);
  press($('dither'), ui.dither);
  press($('scan'), ui.scanlines);
  press($('mode'), rig.mode === 'orbit');
  for (const b of presetRow.querySelectorAll('button')) press(b, b.dataset.preset === world.preset);
  for (const b of resRow.querySelectorAll('button')) press(b, Number(b.dataset.lines) === ui.lines);
}

$('ps1').onclick = () => ((ui.ps1 = !ui.ps1), applyLook());
$('jitter').onclick = () => ((ui.jitter = !ui.jitter), applyLook());
$('affine').onclick = () => ((ui.affine = !ui.affine), applyLook());
$('dither').onclick = () => ((ui.dither = !ui.dither), applyLook());
$('scan').onclick = () => ((ui.scanlines = !ui.scanlines), applyLook());
$('mode').onclick = () => (rig.setMode(rig.mode === 'orbit' ? 'tour' : 'orbit'), syncButtons());
$('toggle-panel').onclick = () => {
  const hidden = $('panel').classList.toggle('hidden');
  press($('toggle-panel'), !hidden);
};
$('corruption').oninput = (e) => world.setCorruption(Number(e.target.value));
$('corruption').value = String(world.corruption);
if (window.innerWidth < 600) {
  $('panel').classList.add('hidden');
  press($('toggle-panel'), false);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'p') $('ps1').click();
  if (e.key === 'h') $('toggle-panel').click();
  if (e.key === ' ') $('mode').click();
  const n = Number(e.key);
  if (n >= 1 && n <= 4) presetRow.querySelectorAll('button')[n - 1].click();
});

// ---- pointer input -> camera rig
const pointers = new Map();
let pinch = 0;
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
canvas.addEventListener('pointermove', (e) => {
  const prev = pointers.get(e.pointerId);
  if (!prev) return;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const before = Math.hypot(a.x - b.x, a.y - b.y);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [c, d] = [...pointers.values()];
    const after = Math.hypot(c.x - d.x, c.y - d.y);
    if (pinch && before > 0) rig.zoom(before / after);
    pinch = after;
  } else {
    rig.orbit(e.clientX - prev.x, e.clientY - prev.y);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  syncButtons();
});
const release = (e) => {
  pointers.delete(e.pointerId);
  pinch = 0;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    rig.zoom(Math.exp(e.deltaY * 0.001));
    syncButtons();
  },
  { passive: false },
);

// ---- loop
window.addEventListener('resize', resize);
resize();
applyLook();

const timer = new Timer();
const statsEl = $('stats');
let frames = 0;
let acc = 0;
function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  rig.update(dt);
  world.update(dt, camera);
  pipeline.render(world.scene, camera);
  frames++;
  acc += dt;
  if (acc > 0.5) {
    const { width, height } = pipeline.internalSize;
    statsEl.textContent = `${width}x${height} · ${Math.round(frames / acc)} fps · ${Math.round(world.stats.triangles / 1000)}k tris (+${Math.round(world.stats.reflectedTriangles / 1000)}k mirrored)`;
    frames = 0;
    acc = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__parallang = { world, rig, pipeline, camera };
