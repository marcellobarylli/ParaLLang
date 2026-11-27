// Round 115: the three.js host of the dungeon screen. It owns the renderer, the level from @parallang/aesthetic, the
// PS1 pipeline, the path ribbons and the site beacons, and it moves the camera as the director says. Everything
// that needs WebGL is here, and this module is loaded lazily (it is three.js and the level, about 700 kB).
// Round 119: the dungeon is a map. One ribbon per path, shown from above when both its sites are out of the fog, and
// a dark patch over each hidden site.
// Round 122: a site that names a figure shows its character (aesthetic's figures.js) in place of the beacon. The
// figure faces the camera, bobs, hops when an objective is passed, and shrinks away as the camera steps through the
// place where it stands.
// Round 125: tilt to look. A look source (tilt.js) turns the camera's line of sight at a site.
import {
  AdditiveBlending, BufferGeometry, CircleGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial,
  OctahedronGeometry, PerspectiveCamera, RingGeometry, Vector3, WebGLRenderer,
} from 'three';
import { ATMOSPHERE, PRESETS, TA_PROHM, atmosphereFor, createFigure, createPS1Pipeline, createWeatherEffects, createWorld, micromortHeightAt, taProhmHeightAt } from '@parallang/aesthetic';
import { currentWeather, onWeatherPin } from './weatherClock.js';
import { createDirector, pathPoints } from './director.js';
import { freeRect } from './insets.js';

const FOV = 60;
// What the host needs to know about each aesthetic level a dungeon may name.
const LEVELS = {
  taprohm: { heightAt: taProhmHeightAt, box: { minX: -TA_PROHM.outer, maxX: TA_PROHM.outer, minZ: -TA_PROHM.outer, maxZ: TA_PROHM.outer } },
  // Round 133: The Kiln is Ta Prohm's plan under another theme: the same heights and the same box.
  kiln: { heightAt: taProhmHeightAt, box: { minX: -TA_PROHM.outer, maxX: TA_PROHM.outer, minZ: -TA_PROHM.outer, maxZ: TA_PROHM.outer } },
  angkor: { heightAt: () => 0, box: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 } },
  // Round 133: the mountain climbs from the valley at +z to the summit plateau at -z; the orbit looks at its middle.
  micromort: { heightAt: micromortHeightAt, box: { minX: -100, maxX: 100, minZ: -200, maxZ: 100, centreY: 50 } },
};
const GOLD = [1, 0.8, 0.36]; // written as is: the PS1 materials and the post pass do no colour conversion
const RIBBON = { width: 1.5, lift: 0.4 };
// The fog over a hidden site, seen from above: three stacked discs, so the patch is darkest in the middle.
// Round 124: each disc at 0.3 (0.42 before), so the rim covers 30 % of the ground, the middle 51 % and the centre 66 %.
const FOG_PATCH = { radii: [7, 9.5, 12], height: 16, opacity: 0.3, segments: 12 }; // 12 segments: the scene's triangle budget (round 122)
// A figure is whole from FIGURE.far metres and gone at FIGURE.near: the camera's way on from some sites leads through
// the place where the character stands. The nearest the camera comes in a conversation is about 2.4 m.
const FIGURE = { near: 1.3, far: 2.1, bob: 0.02, hop: 0.14 };
const ease = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));
const basic = (rgb, options = {}) => {
  const material = new MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, side: DoubleSide, ...options });
  material.color.setRGB(...rgb);
  return material;
};

// A flat ribbon along a path: one quad per segment, each run on by half the width so the corners close.
function ribbonGeometry(route, heightAt) {
  const positions = [];
  const half = RIBBON.width / 2;
  for (let i = 1; i < route.length; i++) {
    const [x0, z0] = route[i - 1];
    const [x1, z1] = route[i];
    const length = Math.hypot(x1 - x0, z1 - z0) || 1;
    const [dx, dz] = [(x1 - x0) / length, (z1 - z0) / length];
    const [ax, az, bx, bz] = [x0 - dx * half, z0 - dz * half, x1 + dx * half, z1 + dz * half];
    const [nx, nz] = [-dz * half, dx * half];
    const y = Math.max(heightAt(x0, z0), heightAt(x1, z1)) + RIBBON.lift;
    const corners = [[ax + nx, az + nz], [ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz]];
    for (const index of [0, 1, 2, 0, 2, 3]) positions.push(corners[index][0], y, corners[index][1]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

// The fog patch over a hidden site.
function fogPatch([x, z], heightAt) {
  const group = new Group();
  const materials = FOG_PATCH.radii.map(() => basic([0.02, 0.03, 0.03], { depthTest: false, opacity: 0 }));
  FOG_PATCH.radii.forEach((radius, i) => {
    const disc = new Mesh(new CircleGeometry(radius, FOG_PATCH.segments), materials[i]);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, heightAt(x, z) + FOG_PATCH.height + i * 0.05, z);
    disc.renderOrder = 15;
    disc.frustumCulled = false;
    group.add(disc);
  });
  group.visible = false;
  return { group, materials, opacity: 0 };
}

// A site's beacon, standing in for the encounter's character until there are assets: a turning crystal, a ring on
// the ground and a faint shaft of light.
function beacon([x, z], heightAt) {
  const group = new Group();
  const y = heightAt(x, z);
  const gem = new OctahedronGeometry(0.22, 0);
  // Flat shades per face, light from above: the scene has no lights, so the facets are painted into vertex colours.
  const colours = [];
  const normals = gem.attributes.normal;
  for (let i = 0; i < normals.count; i++) {
    const shade = 0.62 + 0.38 * Math.max(0, normals.getX(i) * 0.3 + normals.getY(i) * 0.8 + normals.getZ(i) * 0.5);
    colours.push(GOLD[0] * shade, GOLD[1] * shade, GOLD[2] * shade);
  }
  gem.setAttribute('color', new Float32BufferAttribute(colours, 3));
  const materials = [basic([1, 1, 1], { vertexColors: true }), basic(GOLD), basic(GOLD, { blending: AdditiveBlending })];
  const crystal = new Mesh(gem, materials[0]);
  crystal.scale.y = 1.5;
  crystal.position.set(x, y + 1.5, z);
  const ring = new Mesh(new RingGeometry(0.62, 0.7, 14), materials[1]);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, y + 0.06, z);
  const shaft = new Mesh(new CylinderGeometry(0.05, 0.12, 7, 5, 1, true), materials[2]);
  shaft.position.set(x, y + 3.5, z);
  group.add(ring, shaft, crystal);
  group.visible = false;
  return { group, crystal, ring, materials, opacity: 0, cleared: 0, flare: 0, base: [1, 0.55, 0.1] };
}

/**
 * Starts rendering `dungeon`'s level into `canvas`. Throws if WebGL is not available.
 *
 *   setPhase({ phase, siteIndex, walkFrom })  the store's phase; the director gets the matching state
 *   setInsets({ top, right, bottom, left })   what the interface covers, in CSS pixels; the camera frames the rest
 *   setLabels([element, ...])                 one element per site, placed over its site every frame
 */
// Round 204: with a `seed` (the road's), the level has the road's sky: the same clock and seed give the same time of
// day and weather (weatherClock.js), lit and coloured by the same atmosphere, with the same rain, snow, stars,
// fireflies, clouds and lightning. The level keeps what is its own: its glow, its corruption, and its fog's reach
// (shortened by mist in the proportion the road's is). Without a seed the level keeps its fixed preset, as before.
const GLITCH_SWAY = 0.12; // round 205: the most the wind may tear at a level's leaves; in a gale they would fill the whole view
const CLOUDS_BELOW = 45; // metres of camera over its target above which the low clouds are hidden: the map is seen from above
export function createLevelView(canvas, { dungeon, onArrive = () => {}, onThunder = () => {}, reducedMotion = false, seed = null, now = () => Date.now(), glitch = false } = {}) {
  const level = LEVELS[dungeon.level];
  if (!level) throw new Error(`No level view for "${dungeon.level}"`);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const world = createWorld(dungeon.level, { seed: 7 });
  const camera = new PerspectiveCamera(FOV, 1, 0.3, 900);
  const pipeline = createPS1Pipeline(renderer, { uniforms: world.uniforms });
  const director = createDirector({ dungeon, heightAt: level.heightAt, fov: FOV, levelBox: level.box });
  director.attract();
  const preset = PRESETS[world.preset];
  const fog = { near: preset.fogNear, far: preset.fogFar };
  const skyed = seed !== null && seed !== undefined;
  // Round 205: the wind's sway is weighted by a leaf's texture coordinate, which on the road runs 0 to 1 up a crown.
  // A level's canopy is textured in metres, so the same sway throws its corners many metres about: round 204 let it,
  // and the trees came apart into shards. The sway is kept from a level's leaves unless "Glitch" is on in Settings.
  let glitching = glitch === true;
  const realSway = world.materials.leaves?.uniforms?.uSway ?? { value: 0 };
  const leafSway = { get value() { return realSway.value; }, set value(amount) { realSway.value = glitching ? Math.min(GLITCH_SWAY, amount) : 0; } };
  const effects = skyed ? createWeatherEffects(
    { scene: world.scene, uniforms: world.uniforms, materials: { leaves: { uniforms: { uSway: leafSway } } }, terrain: { heightAt: level.heightAt, waterY: 0 } },
    { reducedMotion },
  ) : null;
  const lowClouds = effects?.group.getObjectByName('clouds') ?? null;
  let weather = skyed ? currentWeather(seed, now()) : null;
  let sinceLight = Infinity;
  const unpin = skyed ? onWeatherPin(() => { sinceLight = Infinity; }) : () => {};

  const indexOf = (siteId) => dungeon.sites.findIndex((site) => site.id === siteId);
  const ribbons = dungeon.paths.map(({ between }) => {
    const ends = between.map(indexOf);
    const mesh = new Mesh(ribbonGeometry(pathPoints(dungeon, ends[0], ends[1]), level.heightAt), basic(GOLD, { depthTest: false, opacity: 0 }));
    mesh.renderOrder = 20;
    mesh.frustumCulled = false;
    mesh.visible = false;
    return { mesh, between, opacity: 0 };
  });
  // Round 122: a site's character, where the site names a figure the package knows; else the beacon.
  const figures = dungeon.sites.map((site) => {
    const figure = site.figure ? createFigure(site.figure, world.materials, { seed: 7 }) : null;
    if (!figure) return null;
    const [x, z] = site.at;
    figure.group.position.set(x, level.heightAt(x, z), z);
    figure.group.visible = false;
    return { ...figure, x, z, ground: level.heightAt(x, z), hop: 0, shown: 0 };
  });
  const beacons = dungeon.sites.map((site, index) => (figures[index] ? null : beacon(site.at, level.heightAt)));
  const patches = dungeon.sites.map((site) => fogPatch(site.at, level.heightAt));
  const markers = new Group();
  markers.name = 'dungeon-markers';
  markers.add(...patches.map((patch) => patch.group), ...ribbons.map((ribbon) => ribbon.mesh), ...beacons.filter(Boolean).map((b) => b.group), ...figures.filter(Boolean).map((figure) => figure.group));
  for (const b of beacons.filter(Boolean)) for (const child of b.group.children) child.renderOrder = 10;
  world.scene.add(markers);
  // Which sites the fog hides, by id (setProgress). Before the first report nothing is hidden.
  let hidden = new Set();
  const siteAnchors = dungeon.sites.map((site) => new Vector3(site.at[0], level.heightAt(site.at[0], site.at[1]) + 1.2, site.at[1]));

  const size = { width: 1, height: 1 };
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const insetTarget = { ...insets };
  let insetsSet = false;
  let labels = [];
  let phaseKey = 'attract:0:null'; // the director starts in the attract orbit
  let notified = true;
  let clock = 0;
  let raf = 0;
  let last = null;
  let disposed = false;
  const projected = new Vector3();
  // Round 116: the conversation at the site the camera holds at.
  const talk = { resolved: false, beatId: null };
  // Round 125: where the phone's tilt comes from (setLook), or null.
  let lookSource = null;

  function resize() {
    const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
    const height = Math.max(1, canvas.clientHeight || canvas.height || 1);
    if (width === size.width && height === size.height) return;
    Object.assign(size, { width, height });
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    pipeline.resize();
  }

  // The camera's axis goes to the middle of the area the interface leaves free, and the director frames that area.
  function applyView(dt) {
    for (const side of Object.keys(insets)) insets[side] = dt === null ? insetTarget[side] : ease(insets[side], insetTarget[side], dt, 0.35);
    const free = freeRect(insets, size.width, size.height);
    director.setView({ aspect: free.width / free.height, scale: free.height / size.height });
    camera.setViewOffset(size.width, size.height, size.width / 2 - free.centreX, size.height / 2 - free.centreY, size.width, size.height);
  }

  function placeLabels() {
    labels.forEach((element, index) => {
      if (!element || !siteAnchors[index]) return;
      projected.copy(siteAnchors[index]).project(camera);
      const visible = projected.z > -1 && projected.z < 1;
      element.style.display = visible ? '' : 'none';
      if (visible) element.style.transform = `translate(${((projected.x + 1) / 2 * size.width).toFixed(1)}px, ${((1 - projected.y) / 2 * size.height).toFixed(1)}px)`;
    });
  }

  function step(dt) {
    clock += dt;
    resize();
    applyView(dt);
    director.look(lookSource?.look);
    const pose = director.update(dt);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    // The level's fog is set for the ground. From the air it backs off, and it stays short of the ground's edge.
    const distance = Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]);
    if (effects) {
      sinceLight += dt;
      if (sinceLight > 0.25) {
        sinceLight = 0;
        weather = currentWeather(seed, now());
        const light = atmosphereFor(weather);
        world.setAtmosphere({ ...light, corruption: preset.corruption, ...(preset.glow ? { glow: preset.glow } : {}), ...(preset.glowHot ? { glowHot: preset.glowHot } : {}) });
        effects.setAtmosphere(light);
        fog.near = preset.fogNear * (light.fogNear / ATMOSPHERE.fog.near);
        fog.far = preset.fogFar * (light.fogFar / ATMOSPHERE.fog.far);
      }
      if (effects.update(weather, dt, camera).flash) onThunder();
      if (lowClouds) lowClouds.visible = pose.position[1] - pose.target[1] < CLOUDS_BELOW;
    }
    const far = Math.min(440, fog.far + Math.max(0, distance - 30) * 1.7);
    world.uniforms.uFogFar.value = far;
    world.uniforms.uFogNear.value = Math.min(far - 80, fog.near + Math.max(0, distance - 30) * 0.85);
    // Vertex snapping opens seams in the ground where its fine and coarse grids meet. They show only from the air.
    world.uniforms.uJitter.value = distance > 60 ? 0 : 1;

    const mode = director.mode;
    for (const ribbon of ribbons) {
      const shown = mode === 'overview' && !ribbon.between.some((id) => hidden.has(id));
      ribbon.opacity = ease(ribbon.opacity, shown ? 0.9 : 0, dt, 0.4);
      ribbon.mesh.material.opacity = ribbon.opacity;
      ribbon.mesh.visible = ribbon.opacity > 0.02;
    }
    patches.forEach((patch, index) => {
      const shown = mode === 'overview' && hidden.has(dungeon.sites[index].id);
      patch.opacity = ease(patch.opacity, shown ? 1 : 0, dt, 0.5);
      patch.group.visible = patch.opacity > 0.02;
      for (const material of patch.materials) material.opacity = patch.opacity * FOG_PATCH.opacity;
    });
    // Round 122: each figure out of the fog stands at its site, turned to the camera.
    figures.forEach((figure, index) => {
      if (!figure) return;
      const away = Math.hypot(pose.position[0] - figure.x, pose.position[2] - figure.z);
      const whole = Math.min(1, Math.max(0, (away - FIGURE.near) / (FIGURE.far - FIGURE.near)));
      figure.shown = hidden.has(dungeon.sites[index].id) ? 0 : whole * whole * (3 - 2 * whole);
      figure.group.visible = figure.shown > 0.02;
      if (!figure.group.visible) return;
      figure.hop = ease(figure.hop, 0, dt, 0.3);
      figure.group.scale.setScalar(figure.shown);
      figure.group.rotation.y = Math.atan2(pose.position[0] - figure.x, pose.position[2] - figure.z);
      // Review 1 of round 122 (R1.1): with reduced motion a figure neither bobs nor hops.
      figure.group.position.y = figure.ground + (reducedMotion ? 0 : FIGURE.bob * Math.sin(clock * 1.3 + index) + FIGURE.hop * Math.sin(Math.PI * figure.hop));
    });
    beacons.forEach((b, index) => {
      if (!b) return;
      const on = (mode === 'approach' || mode === 'walk') && director.site === index;
      b.opacity = ease(b.opacity, on ? 1 : 0, dt, 0.5);
      b.group.visible = b.opacity > 0.02;
      if (!b.group.visible) return;
      // A resolved site lets go of its beacon: the crystal rises and fades, the shaft goes, the ring turns green.
      b.cleared = ease(b.cleared, on && talk.resolved ? 1 : 0, dt, 0.9);
      b.flare = ease(b.flare, 0, dt, 0.35);
      const pulse = 0.85 + 0.15 * Math.sin(clock * 2.2) + 0.5 * b.flare;
      const fade = [1 - 0.85 * b.cleared, 1, 1 - b.cleared];
      b.materials.forEach((material, i) => { material.opacity = Math.min(1, b.opacity * pulse * b.base[i] * fade[i]); });
      b.materials[1].color.setRGB(GOLD[0] + (0.5 - GOLD[0]) * b.cleared, GOLD[1] + (0.9 - GOLD[1]) * b.cleared, GOLD[2] + (0.5 - GOLD[2]) * b.cleared);
      b.crystal.rotation.y = clock * (1.3 + 4 * b.flare);
      b.crystal.scale.set(1 + 0.5 * b.flare, 1.5 * (1 + 0.5 * b.flare), 1 + 0.5 * b.flare);
      b.crystal.position.y = siteAnchors[index].y + 0.3 + 0.08 * Math.sin(clock * 1.7) + 1.8 * b.cleared;
      b.ring.scale.setScalar(1 + 0.35 * b.flare);
    });

    world.update(dt, camera);
    pipeline.render(world.scene, camera);
    placeLabels();
    if (director.arrived && !notified) {
      notified = true;
      onArrive(mode);
    }
  }

  function frame(now) {
    if (disposed) return;
    raf = requestAnimationFrame(frame);
    const dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
    last = now;
    step(dt);
  }

  const onContextLost = (event) => event.preventDefault();
  canvas.addEventListener('webglcontextlost', onContextLost);
  resize();
  applyView(null);
  raf = requestAnimationFrame(frame);

  return {
    director,
    camera,
    world,
    get size() { return { ...size }; },
    setPhase({ phase, siteIndex = 0, walkFrom = null }) {
      // Round 120: a conversation with a party member leaves the camera where it is.
      if (phase === 'party') return;
      const key = `${phase}:${siteIndex}:${walkFrom}`;
      const atSite = (director.mode === 'approach' || director.mode === 'walk') && director.site === siteIndex;
      // A conversation and the site card (round 119) keep the hold the camera arrived at.
      if (key === phaseKey || ((phase === 'encounter' || phase === 'site' || phase === 'enter') && atSite)) { phaseKey = key; return; }
      phaseKey = key;
      // Round 119: the world map lies over the same orbit as the title.
      if (phase === 'attract' || phase === 'world') { if (director.mode !== 'attract') director.attract(); }
      else if (phase === 'overview') director.overview();
      else if (phase === 'victory') director.victory();
      else if (phase === 'walk' && walkFrom !== null && walkFrom !== siteIndex) director.walk(walkFrom, siteIndex);
      else if (phase === 'enter') director.enter(siteIndex); // round 191: into a legacy dungeon from the road, on foot
      else director.approach(siteIndex);
      if (reducedMotion) director.skip();
      notified = false;
      Object.assign(talk, { resolved: false });
      lookSource?.recentre?.(); // the way the phone is held on arriving is "straight ahead"
    },
    /**
     * Round 116: the conversation at the site the camera holds at. `closed` objectives step the camera in, a new
     * `beatId` is a verdict of `beatKind` ('pass', 'fail' or 'resolved'), and `resolved` releases the beacon. The
     * camera keeps looking at the site (round 119).
     */
    setEncounter({ closed = 0, resolved = false, beatId = null, beatKind = null } = {}) {
      if (director.mode !== 'approach' && director.mode !== 'walk') return;
      director.engage(resolved ? 1 : Math.min(0.7, closed * 0.35));
      talk.resolved = resolved;
      if (beatId !== null && beatId !== talk.beatId) {
        if (!reducedMotion) director.beat(beatKind);
        if (beatKind !== 'fail') {
          const b = beacons[director.site];
          if (b) b.flare = 1;
          if (figures[director.site] && !reducedMotion) figures[director.site].hop = 1; // a pass: the character hops
        }
      }
      talk.beatId = beatId;
    },
    /** Round 125: `source.look` is { yaw, pitch } in radians, read every frame; null turns the look back to the site. */
    setLook(source) { lookSource = source ?? null; },
    setInsets(next) {
      for (const side of Object.keys(insetTarget)) insetTarget[side] = Math.max(0, Number(next?.[side]) || 0);
      // The first measurement applies at once: the level must not slide into place when the page opens.
      if (!insetsSet) Object.assign(insets, insetTarget);
      insetsSet = true;
    },
    setLabels(elements) { labels = elements ?? []; },
    /** Round 119: the fog. `sites` is the run's `progress.sites`: a site whose state is 'hidden' gets a patch and loses its ribbons. */
    setProgress(sites) { hidden = new Set(Object.entries(sites ?? {}).filter(([, site]) => site.state === 'hidden').map(([id]) => id)); },
    get hiddenSites() { return [...hidden]; },
    /** Round 122: each site's figure as the scene holds it, for the playthrough: null for a site with a beacon. */
    get figures() {
      return figures.map((figure, index) => figure && {
        name: figure.name, site: dungeon.sites[index].id, visible: figure.group.visible, scale: figure.group.scale.x, facing: figure.group.rotation.y, lift: figure.group.position.y - figure.ground,
        position: [figure.x, figure.ground, figure.z], focus: figure.focus, height: figure.height, triangles: figure.triangles,
      });
    },
    /**
     * The triangles the level, the dungeon's markers and the figures hold together. The level's are counted as the
     * package's own budget test counts them (`world.stats.triangles`: props and surface, without the sky's 712).
     */
    get sceneTriangles() {
      const count = (object) => { let n = 0; object?.traverse((o) => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
      return { level: world.stats.triangles, markers: count(markers), total: world.stats.triangles + count(markers) };
    },
    resize,
    /** One frame of `dt` seconds, outside the animation loop (screenshots). */
    step,
    /** Round 205: lets the wind tear at the level's leaves (true), or keeps them still (false). */
    setGlitch(on) { glitching = on === true; if (!glitching) realSway.value = 0; },
    get glitch() { return glitching; },
    get leafSway() { return realSway.value; },
    /** Round 204: the weather showing (null without a seed) and what its effects show, for tests and the console. */
    get weather() { return weather; },
    get effects() { return effects ? { ...effects.state } : null; },
    dispose() {
      disposed = true;
      unpin();
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      world.scene.traverse((object) => {
        object.geometry?.dispose?.();
        for (const material of [].concat(object.material ?? [])) material.dispose?.();
      });
      for (const texture of Object.values(world.textures ?? {})) texture?.dispose?.();
      pipeline.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
