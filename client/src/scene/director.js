// Round 115: the dungeon's camera director. Pure: no DOM and no three.js, so it is unit-tested in Node. A pose is
// { position: [x, y, z], target: [x, y, z] }; the host copies it to its camera and calls lookAt.
//
// Five states. Each starts from the pose the camera holds, so states join without a jump:
//   attract  : a slow isometric orbit around the whole level
//   overview : a bird's-eye view over the route and the sites, east (the entrance) at the bottom of the screen
//   approach : down to a site (the first one framed from a few metres up), then a slow drift
//   walk     : along the route at eye height above the ground to the next site, then the drift
//   victory  : back out to the isometric orbit

export const EYE = 1.6; // eye height above the ground, metres
export const WALK_SPEED = 2.8; // metres per second along the route, between the ramps
export const STANDOFF = 4; // a walk stops this far before its site, along the route, and looks at it
export const LOOK_AHEAD = 4; // while walking the camera looks this far ahead on the route, never past the site
export const DURATIONS = Object.freeze({ overview: 2.6, approach: 3.6, descend: 1.6, orbit: 3.6, ramp: 1.4 });
const ORBIT_PERIOD = 100; // seconds per turn of the attract and victory orbits
const ORBIT_PITCH = 0.62; // about 35 degrees, the isometric look
const ORBIT_START_YAW = 0.6;
const OVERVIEW_PITCH = 1.49; // about 85 degrees: top-down, with a tilt that keeps lookAt's up vector defined
// The approach to the first site ends this far back on the route and this far above eye height. The first site is
// outside the wall, under open sky; the later ones stand in courts and gate passages, where there is no room above.
const APPROACH = Object.freeze({ back: 9.5, rise: 2.8 });
const TARGET_LIFT = EYE - 0.25; // where on a site (and on the path ahead) the camera looks
// Ta Prohm's outer enclosure (aesthetic's TA_PROHM.outer), the default level extent.
export const TA_PROHM_BOX = Object.freeze({ minX: -56, maxX: 56, minZ: -56, maxZ: 56 });

const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const easeInOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const clonePose = (pose) => ({ position: [...pose.position], target: [...pose.target] });

function toSpherical({ position, target }) {
  const d = [position[0] - target[0], position[1] - target[1], position[2] - target[2]];
  const distance = Math.hypot(...d) || 1e-6;
  return { target, distance, yaw: Math.atan2(d[0], d[2]), pitch: Math.asin(clamp(d[1] / distance, -1, 1)) };
}

function fromSpherical({ target, distance, yaw, pitch }) {
  const c = Math.cos(pitch);
  return { position: [target[0] + Math.sin(yaw) * c * distance, target[1] + Math.sin(pitch) * distance, target[2] + Math.cos(yaw) * c * distance], target: [...target] };
}

// Rotates and zooms: the look-at point moves in a line, yaw the short way round, pitch linearly, distance geometrically.
export function blendPoses(a, b, u) {
  if (u <= 0) return clonePose(a);
  if (u >= 1) return clonePose(b);
  const sa = toSpherical(a);
  const sb = toSpherical(b);
  let dYaw = sb.yaw - sa.yaw;
  while (dYaw > Math.PI) dYaw -= 2 * Math.PI;
  while (dYaw < -Math.PI) dYaw += 2 * Math.PI;
  return fromSpherical({
    target: lerp3(sa.target, sb.target, u),
    yaw: sa.yaw + dYaw * u,
    pitch: lerp(sa.pitch, sb.pitch, u),
    distance: Math.exp(lerp(Math.log(sa.distance), Math.log(sb.distance), u)),
  });
}

// A slow sway that starts at zero, so a hold joins its transition without a jump.
function drift(t) {
  return {
    position: [0.35 * Math.sin(0.31 * t), 0.12 * Math.sin(0.23 * t), 0.3 * Math.sin(0.17 * t)],
    target: [0.18 * Math.sin(0.27 * t), 0.06 * Math.sin(0.19 * t), 0.12 * Math.sin(0.21 * t)],
  };
}
const withDrift = (pose, t) => { const d = drift(Math.max(0, t)); return { position: add3(pose.position, d.position), target: add3(pose.target, d.target) }; };

/**
 * The fraction of a walk covered after `t` of `total` seconds: a ramp up, a steady pace, a ramp down. The ramps
 * take `ramp` seconds each (less on a short walk).
 */
export function walkFraction(t, total, ramp = DURATIONS.ramp) {
  if (t <= 0) return 0;
  if (t >= total) return 1;
  const r = Math.min(ramp, total / 2) / total;
  const u = t / total;
  const cruise = 1 / (1 - r); // the steady pace, in fractions per unit of u
  if (u < r) return (cruise * u * u) / (2 * r);
  if (u > 1 - r) return 1 - (cruise * (1 - u) ** 2) / (2 * r);
  return cruise * (u - r / 2);
}

/** The route as a polyline measured by arc length, and where each site stands on it. */
export function measureRoute(dungeon) {
  const points = dungeon.route.map(([x, z]) => [x, z]);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  let from = 0;
  const siteS = dungeon.sites.map((site) => {
    const index = points.findIndex(([x, z], i) => i >= from && x === site.at[0] && z === site.at[1]);
    if (index < 0) throw new Error(`Site at [${site.at}] is not on the route`);
    from = index + 1;
    return lengths[index];
  });
  const total = lengths.at(-1);
  function pointAt(s) {
    const d = clamp(s, 0, total);
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    const u = (d - lengths[i - 1]) / span;
    return [lerp(points[i - 1][0], points[i][0], u), lerp(points[i - 1][1], points[i][1], u)];
  }
  return { points, lengths, total, siteS, pointAt };
}

export function createDirector({ dungeon, heightAt = () => 0, fov = 60, aspect = 1, levelBox = TA_PROHM_BOX } = {}) {
  const route = measureRoute(dungeon);
  // The view the poses are framed for: the part of the screen the interface leaves free. `aspect` is that area's
  // width over height; `scale` is its height as a fraction of the screen's (the host shifts the projection to it).
  const view = { fov, aspect, scale: 1 };
  const halfV = () => Math.atan(Math.tan((view.fov * Math.PI) / 360) * view.scale);
  const halfH = () => Math.atan(Math.tan(halfV()) * view.aspect);
  // The distance at which a flat box of half-extents (w, h) on screen fills the view.
  const fitBox = (w, h) => Math.max(w / Math.tan(halfH()), h / Math.tan(halfV()));
  const fitSphere = (r) => r / Math.sin(Math.min(halfH(), halfV()));

  const routeXs = route.points.map((p) => p[0]);
  const routeZs = route.points.map((p) => p[1]);
  const orbitCentre = [(levelBox.minX + levelBox.maxX) / 2, 2, (levelBox.minZ + levelBox.maxZ) / 2 + 6];
  const orbitRadius = Math.max(levelBox.maxX - levelBox.minX, levelBox.maxZ - levelBox.minZ) / 2;
  // The overview frames the route and the enclosures around it, not the whole jungle.
  const overviewBox = {
    minX: Math.min(-40, ...routeXs) - 4, maxX: Math.max(40, ...routeXs) + 4,
    minZ: Math.min(-36, ...routeZs) - 6, maxZ: Math.max(36, ...routeZs) + 6,
  };

  const ground = ([x, z], lift) => [x, heightAt(x, z) + lift, z];

  const orbitPose = (t, yaw0) => fromSpherical({
    target: orbitCentre,
    yaw: yaw0 + (2 * Math.PI * t) / ORBIT_PERIOD,
    pitch: ORBIT_PITCH,
    distance: fitSphere(orbitRadius),
  });

  const overviewPose = () => {
    const w = (overviewBox.maxX - overviewBox.minX) / 2;
    const h = (overviewBox.maxZ - overviewBox.minZ) / 2;
    return fromSpherical({
      target: [(overviewBox.minX + overviewBox.maxX) / 2, 0, (overviewBox.minZ + overviewBox.maxZ) / 2],
      yaw: 0, pitch: OVERVIEW_PITCH, distance: 1.06 * fitBox(w, h),
    });
  };

  const sitePoint = (index) => ground(dungeon.sites[index].at, TARGET_LIFT);
  // A walk's pose at arc length s: eye height over the ground, looking ahead on the route but never past the site.
  const pathPose = (s, siteS) => ({ position: ground(route.pointAt(s), EYE), target: ground(route.pointAt(Math.min(s + LOOK_AHEAD, siteS)), TARGET_LIFT) });
  const approachPose = (index) => (index === 0
    ? { position: ground(route.pointAt(route.siteS[0] - APPROACH.back), EYE + APPROACH.rise), target: sitePoint(0) }
    : pathPose(route.siteS[index] - STANDOFF, route.siteS[index]));

  let time = 0;
  let mode = null;
  let pose = null;

  function begin(name, plan) {
    mode = { name, start: time, from: pose ? clonePose(pose) : null, ...plan };
    pose = evaluate(0);
    return api;
  }

  function evaluate(t) {
    const m = mode;
    if (m.name === 'walk') {
      const lead = m.from ? DURATIONS.descend : 0;
      if (t < lead) return { stage: 'transition', ...blendPoses(m.from, pathPose(m.s0, m.siteS), easeInOut(t / lead)) };
      const tt = t - lead;
      if (tt < m.travel) return { stage: 'travel', ...pathPose(lerp(m.s0, m.s1, walkFraction(tt, m.travel)), m.siteS) };
      return { stage: 'hold', ...withDrift(pathPose(m.s1, m.siteS), tt - m.travel) };
    }
    const hold = m.hold(t);
    if (m.from && t < m.duration) return { stage: 'transition', ...blendPoses(m.from, hold, easeInOut(t / m.duration)) };
    return { stage: 'hold', ...hold };
  }

  const currentYaw = () => (pose ? toSpherical(pose).yaw : ORBIT_START_YAW);
  const orbit = (name) => {
    const yaw0 = currentYaw();
    return begin(name, { duration: DURATIONS.orbit, hold: (t) => orbitPose(t, yaw0) });
  };

  const api = {
    get mode() { return mode?.name ?? null; },
    get site() { return mode?.site ?? null; },
    get stage() { return pose?.stage ?? null; },
    get pose() { return pose ? clonePose(pose) : null; },
    get time() { return time; },
    /** True once the state's transition (and, for a walk, the travel) is over. */
    get arrived() { return pose?.stage === 'hold'; },
    /** Seconds from the state's start to its hold. */
    get arrival() {
      if (!mode) return 0;
      if (mode.name === 'walk') return (mode.from ? DURATIONS.descend : 0) + mode.travel;
      return mode.from ? mode.duration : 0;
    },
    route,
    setView({ aspect: nextAspect, scale } = {}) {
      if (Number.isFinite(nextAspect) && nextAspect > 0) view.aspect = nextAspect;
      if (Number.isFinite(scale) && scale > 0) view.scale = Math.min(1, scale);
    },
    attract() { return orbit('attract'); },
    overview() { return begin('overview', { duration: DURATIONS.overview, hold: () => overviewPose() }); },
    approach(index) {
      const target = approachPose(index);
      return begin('approach', { site: index, duration: DURATIONS.approach, hold: (t) => withDrift(target, t - DURATIONS.approach) });
    },
    /** Walks from site `from` to site `to` (from < to), ending STANDOFF before `to`. */
    walk(from, to) {
      const siteS = route.siteS[to];
      const s1 = Math.max(0, siteS - STANDOFF);
      const s0 = Math.min(s1, Math.max(0, route.siteS[from] - STANDOFF));
      const length = s1 - s0;
      // The ramps cost one ramp's time in all, so the steady stretch runs at WALK_SPEED.
      return begin('walk', { site: to, s0, s1, siteS, travel: Math.max(2, length / WALK_SPEED + DURATIONS.ramp) });
    },
    victory() { return orbit('victory'); },
    /** Advances the clock and returns the pose. */
    update(dt) {
      time += Math.max(0, dt);
      if (mode) pose = evaluate(time - mode.start);
      return api.pose;
    },
    /** Jumps to the state's hold (reduced motion). */
    skip() {
      if (!mode) return api;
      mode.start = Math.min(mode.start, time - api.arrival);
      pose = evaluate(time - mode.start);
      return api;
    },
    /** The pose `t` seconds into the current state, without advancing the clock (tests, screenshots). */
    peek(t) { return mode ? evaluate(t) : null; },
  };
  return api;
}
