// Round 144: the three.js host of The Long Way Home. It owns the renderer, the endless level from
// @parallang/aesthetic and the PS1 pipeline, keeps the ground around the camera built (and nothing else), shows who
// stands at the sites near the player as plain stand-ins, lays a track along the ways, and moves the camera as the
// road's director says. Loaded lazily, as the dungeon's host is.
//
// The landscape and its graph are the server's own functions (server/src/road/terrain.js and graph.js), bundled
// here: the seed the server sends is all the client needs to stand on the same ground.
import { Group, PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import { ENDLESS, createCairn, createEndlessWorld, createPS1Pipeline, createStandIn, createTrack } from '@parallang/aesthetic';
import { createTerrain } from '../../../server/src/road/terrain.js';
import { createGraph } from '../../../server/src/road/graph.js';
import { createRoadDirector } from './roadDirector.js';
import { freeRect } from './insets.js';

const FOV = 60;
const FIGURE = { near: 1.4, far: 2.3, bob: 0.02, hop: 0.16 };
const easeTo = (current, target, dt, tau) => current + (target - current) * (1 - Math.exp(-dt / tau));

/**
 * Starts rendering the road of `seed` into `canvas`. Throws if WebGL is not available.
 *
 *   setRoad(road)        the server's view of the road ({ at, trail, cleared, frontier, current }): the markers follow
 *   show({ at, from, mode })  where the camera should be: 'arrive' (from the sky), 'travel' (from `from` to `at`),
 *                        'stand' (at once)
 *   setTalking(on)       whether somebody is being talked to at the site (else the camera wanders round it)
 *   setEncounter(...)    the conversation's progress, as the dungeon's host takes it
 */
export function createRoadView(canvas, { seed, onArrive = () => {}, reducedMotion = false } = {}) {
  const terrain = createTerrain(seed);
  const graph = createGraph(terrain);
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const world = createEndlessWorld({ terrain, seed: 7 });
  const camera = new PerspectiveCamera(FOV, 1, 0.3, 900);
  const pipeline = createPS1Pipeline(renderer, { uniforms: world.uniforms });
  const director = createRoadDirector({ heightAt: terrain.heightAt, waterY: terrain.waterY });
  const markers = new Group();
  markers.name = 'road-markers';
  world.scene.add(markers);

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
  const talk = { beatId: null };
  const anchor = new Vector3();

  function resize() {
    const width = Math.max(1, canvas.clientWidth || canvas.width || 1);
    const height = Math.max(1, canvas.clientHeight || canvas.height || 1);
    if (width === size.width && height === size.height) return;
    Object.assign(size, { width, height });
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    pipeline.resize();
  }

  function applyView(dt) {
    for (const side of Object.keys(insets)) insets[side] = dt === null ? insetTarget[side] : easeTo(insets[side], insetTarget[side], dt, 0.35);
    const free = freeRect(insets, size.width, size.height);
    camera.setViewOffset(size.width, size.height, size.width / 2 - free.centreX, size.height / 2 - free.centreY, size.width, size.height);
  }

  const dropMarkers = () => {
    for (const child of [...markers.children]) {
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
    at = road.at;
    if (key === roadKey) return;
    roadKey = key;
    dropMarkers();
    const place = (id, made, kind) => {
      const node = graph.node(id);
      if (!node || figures.has(id)) return;
      made.group.position.set(node.x, node.y, node.z);
      markers.add(made.group);
      figures.set(id, { ...made, x: node.x, z: node.z, ground: node.y, hop: 0, kind });
    };
    if (road.current) place(road.at, createStandIn(world.materials, { hue: road.current.character.hue }), 'figure');
    for (const site of road.frontier) place(site.id, createStandIn(world.materials, { hue: site.offer.character.hue }), 'figure');
    for (const id of road.cleared) place(id, createCairn(world.materials), 'cairn');
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

  function show({ at: siteId, from = null, mode = 'stand' }) {
    const node = graph.node(siteId);
    if (!node) return;
    const previous = from ? graph.node(from) : null;
    if (mode === 'travel' && previous && !reducedMotion) {
      // Along the way when the two sites are joined; straight over the country when they are not.
      const points = graph.pathPoints(from, siteId) ?? [[previous.x, previous.z], [node.x, node.z]];
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
    if (!talking && director.arrived && director.mode === 'hold' && !reducedMotion) director.wander();
    if (talking && director.mode === 'wander') director.face();
    const pose = director.update(dt);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    // Only the ground around the camera exists. A few chunks a frame keep a glide ahead of the fog.
    world.streamTo(pose.position[0], pose.position[2], world.chunkCount < 9 ? 6 : 2);
    for (const [id, figure] of figures) {
      const away = Math.hypot(pose.position[0] - figure.x, pose.position[2] - figure.z);
      figure.group.visible = away < ENDLESS.fog.far + 20;
      if (!figure.group.visible || figure.kind !== 'figure') continue;
      // A figure shrinks away as the camera passes through the place where it stands (a glide onwards starts there).
      const whole = Math.min(1, Math.max(0, (away - FIGURE.near) / (FIGURE.far - FIGURE.near)));
      figure.group.scale.setScalar(Math.max(0.001, whole * whole * (3 - 2 * whole)));
      figure.group.rotation.y = Math.atan2(pose.position[0] - figure.x, pose.position[2] - figure.z) - Math.PI / 2;
      figure.hop = easeTo(figure.hop, 0, dt, 0.3);
      figure.group.position.y = figure.ground + (reducedMotion ? 0 : FIGURE.bob * Math.sin(clock * 1.3 + figure.x) + (id === at ? FIGURE.hop * Math.sin(Math.PI * figure.hop) : 0));
    }
    world.update(dt, camera);
    pipeline.render(world.scene, camera);
    if (director.arrived && !notified) {
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
    /** What the scene holds now, for the playthrough script. */
    get stats() { return { chunks: world.chunkCount, triangles: world.triangleCount, figures: figures.size, tracks: tracks.length, mode: director.mode }; },
    resize,
    step,
    dispose() {
      disposed = true;
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
