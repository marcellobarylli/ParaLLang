// Round 144: the three.js host of The Journey 2. It owns the renderer, the endless level from
// @parallang/aesthetic and the PS1 pipeline, keeps the ground around the camera built (and nothing else), shows who
// stands at the sites near the player as plain stand-ins, lays a track along the ways, and moves the camera as the
// road's director says. Loaded lazily, as the dungeon's host is.
//
// The landscape and its graph are the server's own functions (server/src/road/terrain.js and graph.js), bundled
// here: the seed the server sends, and from round 213 the pulls (pulls.js), are all the client needs to stand on the
// same ground.
import { Group, PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import { ENDLESS, atmosphereFor, createCairn, createEndlessWorld, createLandmark, createPS1Pipeline, createStandIn, createTrack, createWeatherEffects, loadModels } from '@parallang/aesthetic';
import { landOf } from '../land.js';
import { clearOfWays } from './wayClearance.js';
import { currentWeather, onWeatherPin, pinWeather } from './weatherClock.js';
import { createRoadDirector, titleDistance } from './roadDirector.js';
import { freeRect } from './insets.js';
import { createFarLand } from './farLand.js';
import { travelLine } from './roadPath.js';

const FOV = 60;
// Round 175: how the view stands back with a high camera. `distance` is the camera's from what it looks at.
const HIGH = Object.freeze({ fogNear: 0.75, fogFar: 2.4, clipFar: 3.5, clipNear: 1 / 400, from: 150, full: 700 });
const smooth01 = (value) => { const u = Math.min(1, Math.max(0, value)); return u * u * (3 - 2 * u); };
const FIGURE = { near: 1.4, far: 2.3, bob: 0.02, hop: 0.16 };
// Round 211: a character whose conversation is complete sinks into the ground before the camera walks on.
const SINK = { seconds: 3.2, depth: 2.4 };
const easeTo = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));

/**
 * Starts rendering the road of `seed` into `canvas`. Throws if WebGL is not available.
 *
 *   setRoad(road)        the server's view of the road ({ at, trail, cleared, frontier, current }): the markers follow
 *   show({ at, from, mode })  where the camera should be: 'arrive' (from the sky), 'travel' (from `from` to `at`),
 *                        'stand' (at once)
 *   setTalking(on)       whether somebody is being talked to at the site (else the camera wanders round it)
 *   setEncounter(...)    the conversation's progress, as the dungeon's host takes it
 *   setTitle(at)         round 175: the title screen: the camera far over the site `at` (an id; the landscape's start
 *                        if it is not one), above the clouds, turning slowly. The next show({ mode: 'arrive' }) is the
 *                        zoom down from there. While the camera is high the fog and the clip planes stand back with
 *                        it, the ground is built round the site, not under the camera, and a coarse sheet of the
 *                        landscape (farLand.js) fills the view beyond the built ground; once the camera is down
 *                        that sheet is thrown away.
 */
export function createRoadView(canvas, { seed, pulled = [], onArrive = () => {}, onThunder = () => {}, reducedMotion = false, now = () => Date.now() } = {}) {
  // Round 213 (issue #23): the land with the pulls the learner has watched; a new pull is a new view.
  const { terrain, graph } = landOf(seed, pulled);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  // Round 192: the level's trees and undergrowth keep off the ways (wayClearance.js); the graph and the camera keep the terrain as it is.
  const world = createEndlessWorld({ terrain: clearOfWays(terrain, graph, ENDLESS.chunk), seed: 7 });
  // Round 162 (issue #11): the trees' models (client/public/models/, see ASSETS.md there), one small file asked for
  // when the view is made. Round 195: always; there is no setting. Until the file is here, and if it never comes,
  // and on the chunks beyond the nearest five (the triangle budget), the level's own simple trees stand.
  loadModels(`${import.meta.env?.BASE_URL ?? '/'}models/nature.glb`)
    .then((loaded) => { if (!disposed) world.setModels(loaded); })
    .catch((error) => { console.warn('The trees\' models could not be loaded; the simple trees stay:', error?.message ?? error); });
  const camera = new PerspectiveCamera(FOV, 1, 0.3, 900);
  // Round 219: the road is graded soft: tamer greens, gentler contrast, and warmth that follows the daylight.
  const GRADE = { soft: 1, green: 0.45, warm: 0.7 };
  const pipeline = createPS1Pipeline(renderer, { uniforms: world.uniforms, grade: { ...GRADE, warm: 0 } });
  const director = createRoadDirector({ heightAt: terrain.heightAt, waterY: terrain.waterY });
  const markers = new Group();
  markers.name = 'road-markers';
  world.scene.add(markers);
  // Round 146: the time of day and the weather (server/src/road/weather.js: the same clock and seed give the server
  // the same sky). The light is set a few times a second; the rain, the stars and the rest every frame.
  const effects = createWeatherEffects(world, { terrain, reducedMotion });
  let weather = currentWeather(seed, now());
  let sinceLight = Infinity;
  const unpin = onWeatherPin(() => { sinceLight = Infinity; }); // a weather held still (weatherClock.js) shows at once

  const size = { width: 1, height: 1 };
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const insetTarget = { ...insets };
  let insetsSet = false;
  let figures = new Map(); // site id -> { group, x, z, ground, hop, kind }
  let tracks = [];
  let roadKey = '';
  let at = null;
  let talking = false;
  let notified = true;
  let clock = 0;
  let raf = 0;
  let last = null;
  let disposed = false;
  let fog = { near: 46, far: 186 }; // the sky's own, as last set
  let farLand = null; // round 175: the land beyond the built ground, while the camera is high
  let high = 0; // round 175: 0 on the ground to 1 far up
  const groundGroup = world.scene.getObjectByName('endless-ground') ?? { visible: true };
  const talk = { beatId: null };
  // Round 211: the character of the site the player is at ({ site, hue }), still shown once its conversation is
  // complete (the server has put a cairn there); the figure sinking as the player walks on ({ group, site, ground, t,
  // cairn }); and the walk that waits for it ({ points, node }).
  let kept = null;
  let sinking = null;
  let waiting = null;
  const anchor = new Vector3();

  function resize() {
    const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
    const height = Math.max(1, canvas.clientHeight || canvas.height || 1);
    if (width === size.width && height === size.height) return;
    Object.assign(size, { width, height });
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    pipeline.resize();
    if (director.mode === 'title') director.setTitleDistance(titleDistance(camera.aspect, FOV));
  }

  function applyView(dt) {
    for (const side of Object.keys(insets)) insets[side] = dt === null ? insetTarget[side] : easeTo(insets[side], insetTarget[side], dt, 0.35);
    const free = freeRect(insets, size.width, size.height);
    camera.setViewOffset(size.width, size.height, size.width / 2 - free.centreX, size.height / 2 - free.centreY, size.width, size.height);
  }

  const dropMarkers = () => {
    for (const child of [...markers.children]) {
      if (child === sinking?.group) continue;
      markers.remove(child);
      child.traverse((object) => object.geometry?.dispose?.());
    }
    figures = new Map();
    tracks = [];
  };

  // The markers of the sites the server names: a stand-in where somebody waits (the site the player is at, while its
  // conversation is open, and every site of the frontier), a cairn where a conversation was finished, and a track
  // along each way of the trail and to each site ahead.
  function setRoad(road) {
    if (!road) return;
    const key = JSON.stringify([road.at, road.step, Boolean(road.current), road.frontier.map((site) => site.id), road.trail.length]);
    const previousAt = at;
    at = road.at;
    if (key === roadKey) return;
    roadKey = key;
    // Round 211: moving on from a site whose conversation was completed keeps its figure, to sink before the walk.
    if (kept && kept.site !== road.at) {
      const left = figures.get(kept.site);
      if (left?.kind === 'figure' && kept.site === previousAt && road.cleared.includes(kept.site) && !reducedMotion && !sinking) sinking = { group: left.group, site: kept.site, ground: left.ground, t: 0, cairn: null };
      kept = null;
    }
    if (road.current) kept = { site: road.at, hue: road.current.character.hue };
    else if (kept && !road.cleared.includes(kept.site)) kept = null;
    dropMarkers();
    const place = (id, made, kind) => {
      const node = graph.node(id);
      if (!node || figures.has(id)) return;
      made.group.position.set(node.x, node.y, node.z);
      markers.add(made.group);
      figures.set(id, { ...made, x: node.x, z: node.z, ground: node.y, hop: 0, kind });
    };
    if (road.current) place(road.at, createStandIn(world.materials, { hue: road.current.character.hue }), 'figure');
    else if (kept) place(kept.site, createStandIn(world.materials, { hue: kept.hue }), 'figure'); // round 211: complete, still there
    // Round 160: a site ahead that is a legacy dungeon's node shows the dungeon's gate, not a figure.
    for (const site of road.frontier) place(site.id, site.offer.dungeon ? createLandmark(world.materials) : createStandIn(world.materials, { hue: site.offer.character.hue }), site.offer.dungeon ? 'landmark' : 'figure');
    for (const id of road.cleared) place(id, createCairn(world.materials), 'cairn');
    // The cairn where the figure sinks comes up once it is gone.
    if (sinking) { const cairn = figures.get(sinking.site); if (cairn?.kind === 'cairn') { cairn.group.visible = false; sinking.cairn = cairn; } }
    const laid = new Set();
    const lay = (a, b) => {
      const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
      const points = graph.pathPoints(a, b);
      if (laid.has(pair) || !points) return;
      laid.add(pair);
      const mesh = createTrack(world.materials, points, terrain.heightAt, { waterY: terrain.waterY });
      markers.add(mesh);
      tracks.push(mesh);
    };
    for (let n = 1; n < road.trail.length; n += 1) lay(road.trail[n - 1], road.trail[n]);
    for (const site of road.frontier) lay(site.from, site.id);
  }

  // Round 194: where the phone's tilt comes from (setLook), or null, as the dungeon's host has it.
  let lookSource = null;

  // Round 211: the sunk figure is thrown away, its cairn shown, and a walk that waited for it set off.
  function endSink() {
    if (!sinking) return;
    markers.remove(sinking.group);
    sinking.group.traverse((object) => object.geometry?.dispose?.());
    if (sinking.cairn) sinking.cairn.group.visible = true;
    sinking = null;
    if (waiting) { director.travel(waiting.points, waiting.node); notified = false; waiting = null; }
  }

  function show({ at: siteId, from = null, mode = 'stand' }) {
    lookSource?.recentre?.(); // the way the phone is held on arriving is "straight ahead"
    const node = graph.node(siteId);
    if (!node) return;
    if (sinking && !(mode === 'travel' && sinking.site === from)) { waiting = null; endSink(); }
    const previous = from ? graph.node(from) : null;
    if (mode === 'travel' && previous && !reducedMotion) {
      // Round 176: along the shortest walk over the ways, smoothed (roadPath.js); straight over the country only when
      // no walk is found.
      const points = travelLine(graph, from, siteId)?.points ?? [[previous.x, previous.z], [node.x, node.z]];
      // Round 211: the camera stays on a completed site's character while it sinks, and walks on after.
      if (sinking?.site === from) { waiting = { points, node }; notified = true; return; }
      director.travel(points, node);
      notified = false;
    } else if (mode === 'arrive' && !reducedMotion) {
      director.arrive(node, previous ? [previous.x, previous.z] : null);
      notified = false;
    } else {
      director.stand(node, previous ? [previous.x, previous.z] : null);
      notified = false;
    }
  }

  function step(dt) {
    clock += dt;
    resize();
    applyView(dt);
    const engaged = talking || Boolean(sinking); // round 211: the camera stays on a sinking figure
    if (!engaged && director.arrived && director.mode === 'hold' && !reducedMotion) director.wander();
    if (engaged && director.mode === 'wander') director.face();
    director.look(lookSource?.look); // round 194: tilt to look, at a hold
    const pose = director.update(dt);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    // Round 175: how high the camera is over what it looks at, and how far from it: the fog and the clip planes
    // stand back with it (on the ground the sky's own fog is the farther, so nothing changes in play).
    const distance = Math.hypot(pose.position[0] - pose.target[0], pose.position[1] - pose.target[1], pose.position[2] - pose.target[2]);
    high = smooth01((pose.position[1] - terrain.heightAt(pose.target[0], pose.target[2]) - HIGH.from) / (HIGH.full - HIGH.from));
    const [near, far] = [Math.max(0.3, distance * HIGH.clipNear), Math.max(900, distance * HIGH.clipFar)];
    if (camera.near !== near || camera.far !== far) Object.assign(camera, { near, far });
    // Only the ground around the camera exists, or, with a high camera, round what it looks at. A few chunks a frame
    // keep a glide ahead of the fog.
    const [sx, sz] = high > 0.02 ? [pose.target[0], pose.target[2]] : [pose.position[0], pose.position[2]];
    world.streamTo(sx, sz, world.chunkCount < 9 ? 6 : 2);
    // From high up the built ground would show as a tile of another texture in the middle of the far land: it is
    // built all the same (the world is loading) and shown once the camera is low enough to be over it.
    groundGroup.visible = high < 0.35;
    if (high > 0.02) {
      farLand ??= (() => { const made = createFarLand(terrain, world.uniforms, { x: pose.target[0], z: pose.target[2] }); world.scene.add(made.group); return made; })();
      farLand.build(2);
      farLand.setShown(true);
    } else if (farLand && director.arrived) { farLand.dispose(); farLand = null; }
    else farLand?.setShown(false);
    sinceLight += dt;
    if (sinceLight > 0.25) {
      sinceLight = 0;
      weather = currentWeather(seed, now());
      const light = atmosphereFor(weather);
      world.setAtmosphere(light);
      pipeline.setGrade({ warm: GRADE.warm * weather.daylight * (1 - 0.6 * Math.max(0, weather.cloud - 0.35)) });
      effects.setAtmosphere(light); // the clouds take their colours from the same sky
      fog = { near: light.fogNear, far: light.fogFar };
    }
    world.uniforms.uFogNear.value = Math.max(fog.near, distance * HIGH.fogNear);
    world.uniforms.uFogFar.value = Math.max(fog.far, distance * HIGH.fogFar);
    if (effects.update(weather, dt, camera).flash) onThunder();
    for (const [id, figure] of figures) {
      const away = Math.hypot(pose.position[0] - figure.x, pose.position[2] - figure.z);
      figure.group.visible = away < ENDLESS.fog.far + 20 && figure !== sinking?.cairn; // round 211: its cairn waits
      if (!figure.group.visible || figure.kind !== 'figure') continue;
      // A figure shrinks away as the camera passes through the place where it stands (a glide onwards starts there).
      const whole = Math.min(1, Math.max(0, (away - FIGURE.near) / (FIGURE.far - FIGURE.near)));
      figure.group.scale.setScalar(Math.max(0.001, whole * whole * (3 - 2 * whole)));
      figure.group.rotation.y = Math.atan2(pose.position[0] - figure.x, pose.position[2] - figure.z) - Math.PI / 2;
      figure.hop = easeTo(figure.hop, 0, dt, 0.3);
      figure.group.position.y = figure.ground + (reducedMotion ? 0 : FIGURE.bob * Math.sin(clock * 1.3 + figure.x) + (id === at ? FIGURE.hop * Math.sin(Math.PI * figure.hop) : 0));
    }
    if (sinking) {
      // Round 211: down through the ground, slowly at first; it turns no more and does not bob.
      sinking.t += dt / SINK.seconds;
      const u = Math.min(1, sinking.t);
      sinking.group.position.y = sinking.ground - SINK.depth * u * u * (3 - 2 * u);
      if (u >= 1) endSink();
    }
    world.update(dt, camera);
    pipeline.render(world.scene, camera);
    if (director.arrived && !notified && director.mode !== 'title') {
      notified = true;
      onArrive(director.mode);
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
    director, camera, world, graph, terrain,
    get size() { return { ...size }; },
    setRoad,
    show,
    setTalking(on) { talking = Boolean(on); },
    /** Round 194: the source of the tilt (tilt.js's createTilt), or null. */
    setLook(source) { lookSource = source ?? null; },
    /** Round 175: the title screen, far over the site `siteId` (or the landscape's start). */
    setTitle(siteId) {
      const node = graph.node(siteId) ?? graph.node(graph.start);
      if (!node) return;
      director.title(node, { distance: titleDistance(camera.aspect, FOV) });
      // The land under a site the title moved to is another: the sheet is made again round it.
      if (farLand && Math.hypot(farLand.centre.x - node.x, farLand.centre.z - node.z) > 400) { farLand.dispose(); farLand = null; }
    },
    /** Round 175: 0 with the camera on the ground, 1 far over it. */
    get high() { return high; },
    setEncounter({ closed = 0, resolved = false, beatId = null, beatKind = null } = {}) {
      director.engage(resolved ? 1 : Math.min(0.7, closed * 0.35));
      if (beatId !== null && beatId !== talk.beatId) {
        if (!reducedMotion) director.beat(beatKind);
        const figure = figures.get(at);
        if (figure && beatKind !== 'fail' && !reducedMotion) figure.hop = 1;
      }
      talk.beatId = beatId;
    },
    setInsets(next) {
      for (const side of Object.keys(insetTarget)) insetTarget[side] = Math.max(0, Number(next?.[side]) || 0);
      if (!insetsSet) Object.assign(insets, insetTarget);
      insetsSet = true;
    },
    /** Where a site is on the screen, in CSS pixels, or null when it is behind the camera. */
    project(siteId) {
      const node = graph.node(siteId);
      if (!node) return null;
      anchor.set(node.x, node.y + 2.4, node.z).project(camera);
      return anchor.z > -1 && anchor.z < 1 ? [((anchor.x + 1) / 2) * size.width, ((1 - anchor.y) / 2) * size.height] : null;
    },
    /** Round 146: the weather showing now, and a way to hold one still ({ phase, rain, cloud, wind }, or null for the clock's). */
    get weather() { return weather; },
    pinWeather,
    get effects() { return { ...effects.state }; },
    /** What the scene holds now, for the playthrough script. */
    get stats() { return { sinking: sinking ? Math.min(1, sinking.t) : null, chunks: world.chunkCount, triangles: world.triangleCount, figures: figures.size, tracks: tracks.length, mode: director.mode, high, farTiles: farLand?.built ?? 0, highClouds: effects.state.highClouds }; },
    resize,
    step,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      unpin();
      farLand?.dispose();
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
