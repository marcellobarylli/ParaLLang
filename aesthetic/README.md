# @parallang/aesthetic

The visual direction for ParaLLang: PlayStation 1-style 3D, demonstrated on the lore's dead branch, an Angkor Wat
whose temple ruins are strangled by roots (the strings that pulled two worlds together). The package holds the look
and one scene. It does not touch the game code in `client/`, `server/` or `mobile/`.

![Approaching along the avenue at golden hour](docs/shots/approach-golden.png)

| | |
|---|---|
| ![Reflecting pool](docs/shots/pool-golden.png) | ![The same view with the PS1 look off](docs/shots/pool-modern.png) |
| Reflecting pool, PS1 look | Same view, PS1 look off |
| ![Inscribed stele at dawn](docs/shots/stele-dawn.png) | ![Shrine in the dead branch](docs/shots/shrine-corrupted.png) |
| An inscribed stele at dawn | The dead branch: roots glow with corruption |

![Aerial view at midday](docs/shots/aerial-day.png)

## Why three.js

[three.js](https://threejs.org) is plain JavaScript, so it runs in the browser and, through `expo-gl`, in the
Expo iPhone app. The scene, the PS1 shaders and the camera rig in `src/` use no DOM; only the hosts (`demo/` for
web, `native/` for Expo) know about canvases and touch input. Textures are generated in code from a seed, so there
are no image assets to load on any platform.

## Run it

```bash
cd aesthetic
npm install
npm run dev        # http://localhost:5180
npm test           # 9 headless checks: budget, determinism, VRAM rules, presets, dither table
```

Controls: drag to orbit, wheel or pinch to zoom, `Space` toggles tour and orbit, `1`–`4` pick the time of day,
`P` toggles the PS1 look, `H` hides the panel. The panel also toggles each effect (jitter, affine, dither,
scanlines), the resolution (240p, 480i, native) and the corruption level.

URL parameters for fixed views: `?preset=dawn`, `?t=0.3&pause=1` (tour position), `?cam=x,y,z,lookX,lookY,lookZ`,
`?orbit=yaw,pitch,distance`, `?ps1=0`, `?corruption=0.7`, `?ui=0`.

Reference shots: `npm run build && npm run preview`, then `node scripts/screenshots.cjs` (needs Playwright with
Chromium) rewrites `docs/shots/`.

## Use it

```js
import { PerspectiveCamera, WebGLRenderer } from 'three';
import { createTempleWorld, createPS1Pipeline, createCameraRig } from '@parallang/aesthetic';

const renderer = new WebGLRenderer({ canvas, antialias: false });
const world = createTempleWorld({ seed: 7, preset: 'golden' });
const camera = new PerspectiveCamera(60, width / height, 0.3, 700);
const pipeline = createPS1Pipeline(renderer, { uniforms: world.uniforms }); // 240 lines, 15-bit, dithered
const rig = createCameraRig(camera);

renderer.setSize(width, height, false);
pipeline.resize();
function frame(dt) {
  rig.update(dt);
  world.update(dt, camera);
  pipeline.render(world.scene, camera);
}
```

For new scenes, reuse the parts rather than the temple: `createPS1Uniforms` and `createPS1Material` give any mesh
the look, `MeshBuilder` merges geometry into one draw call per material and paints grime and moss into vertex
colours, and `createTextures` gives the stone, foliage and water textures.

**In the iPhone app.** `native/TempleView.js` is a reference Expo component that renders the same world through
`expo-gl` and maps pan gestures to the camera rig. It is not wired into `mobile/` and has not been run in the iOS
Simulator yet. To try it: `npx expo install expo-gl` and `npm install three@0.186.1` in `mobile/`, then render
`<TempleView preset="golden" />`.

**In another engine.** [STYLE.md](STYLE.md) states the look as rules and numbers, and `src/style.js` exports the
same values as data (`PS1_STYLE`).

## Files

| Path | What it holds |
|---|---|
| `src/ps1/shaders.js` | Vertex snapping, affine UVs, Gouraud lighting, depth-cue fog, corruption glow; the 15-bit dither post pass |
| `src/ps1/material.js` | `createPS1Material` and the shared uniforms every material references |
| `src/ps1/pipeline.js` | Low-resolution render target, nearest upscale, dither and quantise |
| `src/ps1/textures.js` | Procedural 32–64 px textures: sandstone, rosette relief, inscriptions, laterite, roof, grass, water, bark, roots, leaves, fronds, grass tufts |
| `src/scene/temple.js` | Three tiers with galleries, five lotus-bud prangs, gopura, enclosure, naga causeways, libraries |
| `src/scene/ruins.js` | The Ta Prohm-style shrine, strangler figs with glowing strings, mushrooms, stele, lions, rubble |
| `src/scene/vegetation.js` | Palms, jungle trees, bushes, grass tufts, lily pads and lotus |
| `src/scene/terrain.js`, `layout.js` | Ground grid, moat and pools, banks; the site plan |
| `src/scene/sky.js`, `presets.js` | Gradient sky, sun, clouds, hills; golden hour, dawn, midday haze, the dead branch |
| `src/camera.js` | Tour, orbit and fixed camera modes, fed by any input source |
| `demo/`, `index.html` | Web host |
| `native/TempleView.js` | Expo host (reference, untested) |
