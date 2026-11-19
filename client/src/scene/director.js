// Round 115: the dungeon's camera director. Pure: no DOM and no three.js, so it is unit-tested in Node. A pose is
// { position: [x, y, z], target: [x, y, z] }; the host copies it to its camera and calls lookAt.
//
// Five states. Each starts from the pose the camera holds, so states join without a jump:
//   attract  : a slow isometric orbit around the whole level
//   overview : a bird's-eye view over the sites and their paths, east (the entrance) at the bottom of the screen
//   approach : across to the point above a site and down to it (the start site framed from a few metres up), then a slow drift
//   walk     : along a path at eye height above the ground to a neighbouring site, then the drift
//   victory  : back out to the isometric orbit
//
// Round 116: at a site the conversation shapes the hold. Each closed objective steps the camera in, and a verdict is
// a brief push or pull.
// Round 125: tilt to look. At a hold at a site the phone's tilt turns the line of sight; the position is the director's.
// Round 119: the dungeon is a map. A walk follows the path between two neighbouring sites in either direction. After
// a resolve the camera keeps looking at the site: the player picks the way on (round 116's turn to it is gone).

export const EYE = 1.6; // eye height above the ground, metres
export const WALK_SPEED = 2.8; // metres per second along a path, between the ramps
export const STANDOFF = 4; // a walk stops this far before its site, along the path, and looks at it
export const LOOK_AHEAD = 4; // while walking the camera looks this far ahead on the path, never past the site
export const DURATIONS = Object.freeze({ overview: 2.6, approach: 3.6, descend: 1.6, orbit: 3.6, ramp: 1.4 });
const ORBIT_PERIOD = 100; // seconds per turn of the attract and victory orbits
const ORBIT_PITCH = 0.62; // about 35 degrees, the isometric look
const ORBIT_START_YAW = 0.6;
const OVERVIEW_PITCH = 1.49; // about 85 degrees: top-down, with a tilt that keeps lookAt's up vector defined
// The approach to the start site ends this far back on the entrance and this far above eye height. The start site is
// outside the wall, under open sky; the others stand in courts and gate passages, where there is no room above.
const APPROACH = Object.freeze({ back: 9.5, rise: 2.8 });
const TARGET_LIFT = EYE - 0.25; // where on a site (and on the path ahead) the camera looks
// Round 116: how the conversation shapes a hold at a site.
export const ENGAGE_MAX = 0.35; // at a resolved site the camera stands this fraction of the way in to it
const ENGAGE_TAU = 0.7; // seconds, the ease of a step in
// Round 125: the look a tilt may ask for (the host's tilt.js keeps inside it), and how it is applied.
export const LOOK_MAX = Object.freeze({ yaw: 0.25, pitch: 0.18 }); // radians
const LOOK_TAU = 0.12; // seconds, the ease to a new look
const LOOK_IN = 0.5; // seconds, the look fades in over the start of a hold
const FAR = 25; // a walk that starts further than this from its path (from the overview) comes down as an approach does
const ON_PATH = 1.5; // a camera this near to the path it is about to walk (the way it came) starts from where it stands
const LEAD_SPEED = 3; // metres per second, the camera's pace to the start of a path
const OVERVIEW_MARGIN = 8; // metres around the sites and paths in the overview
const OVERVIEW_MIN = 28; // the overview frames at least this much on each side of its middle (a dungeon of one site, round 133)
const BEAT = Object.freeze({ pass: 0.045, resolved: 0.045, fail: -0.05, peak: 0.25 }); // a verdict's push or pull, and when it peaks
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

// Round 119: a turn on the spot, for the start of a walk. The camera goes in a straight line and its line of sight
// turns the short way round. (blendPoses swings the camera around the point it looks at, which is right for a crane
// shot from the sky and wrong in a gate passage 2.2 m wide: a half turn would swing it through the piers.)
export function turnPoses(a, b, u) {
  if (u <= 0) return clonePose(a);
  if (u >= 1) return clonePose(b);
  const sight = ({ position, target }) => {
    const d = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    const distance = Math.hypot(...d) || 1e-6;
    return { distance, yaw: Math.atan2(d[0], d[2]), pitch: Math.asin(clamp(d[1] / distance, -1, 1)) };
  };
  const [sa, sb] = [sight(a), sight(b)];
  let dYaw = sb.yaw - sa.yaw;
  while (dYaw > Math.PI) dYaw -= 2 * Math.PI;
  while (dYaw < -Math.PI) dYaw += 2 * Math.PI;
  const [yaw, pitch, distance] = [sa.yaw + dYaw * u, lerp(sa.pitch, sb.pitch, u), lerp(sa.distance, sb.distance, u)];
  const position = lerp3(a.position, b.position, u);
  const c = Math.cos(pitch);
  return { position, target: [position[0] + Math.sin(yaw) * c * distance, position[1] + Math.sin(pitch) * distance, position[2] + Math.cos(yaw) * c * distance] };
}

// Review 1 of round 119 (R1.2): the way down from the sky to a place on the ground. The camera crosses to the point
// above where it will stand while it is still above everything (CLEAR), and comes down there. (blendPoses comes down
// on a slant, which from the map to a court crosses a gallery roof on the way.) A camera that starts below CLEAR
// goes up first, then across, then down. `u` is the fraction of the time, not eased.
export const CLEAR = 36; // metres: above every roof and tower, and above the crowns of the giant trees
const uneased = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v < 0.5 ? Math.cbrt(v / 4) : 1 - Math.cbrt(2 * (1 - v)) / 2); // easeInOut's inverse
export function dropPoses(a, b, u) {
  if (u <= 0) return clonePose(a);
  if (u >= 1) return clonePose(b);
  const [ay, by] = [a.position[1], b.position[1]];
  let across;
  let y;
  if (ay > CLEAR && by < CLEAR) {
    // One descent: the crossing is over by the time the camera is down to CLEAR.
    y = lerp(ay, by, easeInOut(u));
    across = easeInOut(Math.min(1, u / uneased((ay - CLEAR) / (ay - by))));
  } else {
    const top = Math.max(CLEAR, ay, by);
    y = u < 0.25 ? lerp(ay, top, easeInOut(u / 0.25)) : u < 0.65 ? top : lerp(top, by, easeInOut((u - 0.65) / 0.35));
    across = easeInOut(clamp((u - 0.25) / 0.4, 0, 1));
  }
  return {
    position: [lerp(a.position[0], b.position[0], across), y, lerp(a.position[2], b.position[2], across)],
    target: lerp3(a.target, b.target, easeInOut(u)),
  };
}

// Round 125: the pose with its line of sight turned by `yaw` (to the left) and `pitch` (up); the position stays.
function turned({ position, target }, yaw, pitch) {
  if (!yaw && !pitch) return { position, target };
  const d = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
  const distance = Math.hypot(...d) || 1e-6;
  const [y, p] = [Math.atan2(d[0], d[2]) + yaw, clamp(Math.asin(clamp(d[1] / distance, -1, 1)) + pitch, -1.4, 1.4)];
  const c = Math.cos(p);
  return { position, target: [position[0] + Math.sin(y) * c * distance, position[1] + Math.sin(p) * distance, position[2] + Math.cos(y) * c * distance] };
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

/** A polyline measured by arc length. */
export function measurePath(polyline) {
  const points = polyline.map(([x, z]) => [x, z]);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = lengths.at(-1);
  function pointAt(s) {
    const d = clamp(s, 0, total);
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < d) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    const u = (d - lengths[i - 1]) / span;
    return [lerp(points[i - 1][0], points[i][0], u), lerp(points[i - 1][1], points[i][1], u)];
  }
  // The point of the polyline nearest to [x, z]: its arc length and how far away it is.
  function nearest([x, z]) {
    let best = { s: 0, distance: Infinity };
    for (let i = 1; i < points.length; i++) {
      const [ax, az] = points[i - 1];
      const [bx, bz] = points[i];
      const span2 = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
      const u = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / span2, 0, 1);
      const d = Math.hypot(x - (ax + (bx - ax) * u), z - (az + (bz - az) * u));
      if (d < best.distance) best = { s: lengths[i - 1] + (lengths[i] - lengths[i - 1]) * u, distance: d };
    }
    return best;
  }
  return { points, lengths, total, pointAt, nearest };
}

/** The polyline from site `from` to its neighbour `to` (site indices), or null when no path joins them. */
export function pathPoints(dungeon, from, to) {
  const [a, b] = [dungeon.sites[from], dungeon.sites[to]];
  if (!a || !b) return null;
  for (const { between, via } of dungeon.paths) {
    if (between[0] === a.id && between[1] === b.id) return [a.at, ...via, b.at];
    if (between[0] === b.id && between[1] === a.id) return [b.at, ...via, a.at].reverse();
  }
  return null;
}

/** The polyline an approach to site `index` comes in on: the entrance for the start site, else the first path listed for it. */
export function arrivalPoints(dungeon, index) {
  const site = dungeon.sites[index];
  if (site.id === dungeon.start) return [...dungeon.entrance, site.at];
  const other = dungeon.paths.find(({ between }) => between.includes(site.id)).between.find((id) => id !== site.id);
  return pathPoints(dungeon, dungeon.sites.findIndex((candidate) => candidate.id === other), index);
}

export function createDirector({ dungeon, heightAt = () => 0, fov = 60, aspect = 1, levelBox = TA_PROHM_BOX } = {}) {
  // The view the poses are framed for: the part of the screen the interface leaves free. `aspect` is that area's
  // width over height; `scale` is its height as a fraction of the screen's (the host shifts the projection to it).
  const view = { fov, aspect, scale: 1 };
  const halfV = () => Math.atan(Math.tan((view.fov * Math.PI) / 360) * view.scale);
  const halfH = () => Math.atan(Math.tan(halfV()) * view.aspect);
  // The distance at which a flat box of half-extents (w, h) on screen fills the view.
  const fitBox = (w, h) => Math.max(w / Math.tan(halfH()), h / Math.tan(halfV()));
  const fitSphere = (r) => r / Math.sin(Math.min(halfH(), halfV()));

  const mapPoints = [...dungeon.sites.map((site) => site.at), ...dungeon.paths.flatMap(({ via }) => via)];
  const mapXs = mapPoints.map((p) => p[0]);
  const mapZs = mapPoints.map((p) => p[1]);
  const orbitCentre = [(levelBox.minX + levelBox.maxX) / 2, levelBox.centreY ?? 2, (levelBox.minZ + levelBox.maxZ) / 2 + 6];
  const orbitRadius = Math.max(levelBox.maxX - levelBox.minX, levelBox.maxZ - levelBox.minZ) / 2;
  // The overview frames the map: one fixed box around every site and path (round 119, critique 1.5).
  const spread = (values) => Math.max((Math.max(...values) - Math.min(...values)) / 2 + OVERVIEW_MARGIN, OVERVIEW_MIN);
  const mid = (values) => (Math.max(...values) + Math.min(...values)) / 2;
  const overviewBox = {
    minX: mid(mapXs) - spread(mapXs), maxX: mid(mapXs) + spread(mapXs),
    minZ: mid(mapZs) - spread(mapZs), maxZ: mid(mapZs) + spread(mapZs),
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
      target: [(overviewBox.minX + overviewBox.maxX) / 2, heightAt((overviewBox.minX + overviewBox.maxX) / 2, (overviewBox.minZ + overviewBox.maxZ) / 2), (overviewBox.minZ + overviewBox.maxZ) / 2],
      yaw: 0, pitch: OVERVIEW_PITCH, distance: 1.06 * fitBox(w, h),
    });
  };

  const sitePoint = (index) => ground(dungeon.sites[index].at, TARGET_LIFT);
  // A walk's pose at arc length s of `path`: eye height over the ground, looking ahead on the path but never past its end (the site).
  const pathPose = (path, s) => ({ position: ground(path.pointAt(s), EYE), target: ground(path.pointAt(Math.min(s + LOOK_AHEAD, path.total)), TARGET_LIFT) });
  // The conversation's hand on a hold: `engaged` eases to `level` (objectives closed), and a verdict's beat rises
  // and dies away.
  const react = { level: 0, engaged: 0, beat: 0, beatAge: Infinity };
  const beatNow = () => { const x = react.beatAge / BEAT.peak; return Number.isFinite(x) ? react.beat * x * Math.exp(1 - x) : 0; };
  // Round 125: the phone's tilt. `looked` eases to `look`. It is the player's hand, not the conversation's, so a new
  // state keeps it; it shapes a hold from zero, `held` seconds in, so a hold still joins its transition.
  const tilt = { look: { yaw: 0, pitch: 0 }, looked: { yaw: 0, pitch: 0 } };
  const shaped = (hold, index, held) => {
    const along = clamp(ENGAGE_MAX * react.engaged + beatNow(), -0.08, ENGAGE_MAX + 0.06);
    const weight = held > 0 ? 1 - Math.exp(-held / LOOK_IN) : 0;
    return turned({ position: lerp3(hold.position, sitePoint(index), along), target: hold.target }, tilt.looked.yaw * weight, tilt.looked.pitch * weight);
  };
  const standoff = (path) => Math.max(0, path.total - STANDOFF);
  const approachPose = (index) => {
    const path = measurePath(arrivalPoints(dungeon, index));
    return dungeon.sites[index].id === dungeon.start
      ? { position: ground(path.pointAt(path.total - APPROACH.back), EYE + APPROACH.rise), target: sitePoint(index) }
      : pathPose(path, standoff(path));
  };

  let time = 0;
  let mode = null;
  let pose = null;

  function begin(name, plan) {
    const from = pose ? clonePose(pose) : null;
    Object.assign(react, { level: 0, engaged: 0, beat: 0, beatAge: Infinity }); // a new state starts unshaped
    mode = { name, start: time, from, ...plan };
    pose = evaluate(0);
    return api;
  }

  function evaluate(t) {
    const m = mode;
    if (m.name === 'walk') {
      const lead = m.lead;
      if (t < lead) return { stage: 'transition', ...(m.far ? dropPoses(m.from, pathPose(m.path, m.s0), t / lead) : turnPoses(m.from, pathPose(m.path, m.s0), easeInOut(t / lead))) };
      const tt = t - lead;
      if (tt < m.travel) return { stage: 'travel', ...pathPose(m.path, lerp(m.s0, m.s1, walkFraction(tt, m.travel))) };
      return { stage: 'hold', ...shaped(withDrift(pathPose(m.path, m.s1), tt - m.travel), m.site, tt - m.travel) };
    }
    const hold = m.hold(t);
    if (m.from && t < m.duration) return { stage: 'transition', ...(m.name === 'approach' ? dropPoses(m.from, hold, t / m.duration) : blendPoses(m.from, hold, easeInOut(t / m.duration))) };
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
      if (mode.name === 'walk') return mode.lead + mode.travel;
      return mode.from ? mode.duration : 0;
    },
    setView({ aspect: nextAspect, scale } = {}) {
      if (Number.isFinite(nextAspect) && nextAspect > 0) view.aspect = nextAspect;
      if (Number.isFinite(scale) && scale > 0) view.scale = Math.min(1, scale);
    },
    attract() { return orbit('attract'); },
    overview() { return begin('overview', { duration: DURATIONS.overview, hold: () => overviewPose() }); },
    approach(index) {
      const target = approachPose(index);
      return begin('approach', { site: index, duration: DURATIONS.approach, hold: (t) => shaped(withDrift(target, t - DURATIONS.approach), index, t - DURATIONS.approach) });
    },
    /** Walks from site `from` to its neighbour `to` along their path, ending STANDOFF before `to`. With no path it is an approach. */
    walk(from, to) {
      const points = pathPoints(dungeon, from, to);
      if (!points) return api.approach(to);
      const path = measurePath(points);
      const s1 = standoff(path);
      // Where the walk starts. From far off (the overview) the camera comes down onto the path's start (dropPoses). From a hold at the site it goes there in a straight line and turns as it goes. When the path is the
      // way the camera came, it stands on it already and only turns.
      let [s0, lead, far] = [0, 0, false];
      if (pose) {
        const start = pathPose(path, 0).position;
        const gap = Math.hypot(pose.position[0] - start[0], pose.position[1] - start[1], pose.position[2] - start[2]);
        far = gap > FAR;
        const here = path.nearest([pose.position[0], pose.position[2]]);
        if (!far && here.distance < ON_PATH && here.s < s1 - 0.5) s0 = here.s;
        lead = far ? DURATIONS.approach : s0 > 0 ? DURATIONS.descend : clamp(gap / LEAD_SPEED, DURATIONS.descend, DURATIONS.approach);
      }
      // The ramps cost one ramp's time in all, so the steady stretch runs at WALK_SPEED.
      return begin('walk', { site: to, path, s0, s1, lead, far, travel: Math.max(2, (s1 - s0) / WALK_SPEED + DURATIONS.ramp) });
    },
    victory() { return orbit('victory'); },
    /** Advances the clock and returns the pose. */
    update(dt) {
      const step = Math.max(0, dt);
      react.engaged += (react.level - react.engaged) * (1 - Math.exp(-step / ENGAGE_TAU));
      react.beatAge += step;
      const ease = 1 - Math.exp(-step / LOOK_TAU);
      tilt.looked.yaw += (tilt.look.yaw - tilt.looked.yaw) * ease;
      tilt.looked.pitch += (tilt.look.pitch - tilt.looked.pitch) * ease;
      time += Math.max(0, dt);
      if (mode) pose = evaluate(time - mode.start);
      return api.pose;
    },
    // Round 116: the conversation shapes the hold at a site (approach and walk). A new state resets both.
    /** How far the conversation has come, 0 to 1: the camera steps in to the site. */
    engage(level) { react.level = clamp(Number(level) || 0, 0, 1); return api; },
    /** A verdict: 'pass' and 'resolved' push in briefly, 'fail' pulls back. */
    beat(kind) { if (BEAT[kind]) Object.assign(react, { beat: BEAT[kind], beatAge: 0 }); return api; },
    get reaction() { return { level: react.level, engaged: react.engaged }; },
    /** Round 125: the turn of the line of sight a tilt asks for, in radians: `yaw` to the left, `pitch` up. It shapes a hold at a site. */
    look({ yaw = 0, pitch = 0 } = {}) {
      tilt.look = { yaw: clamp(Number(yaw) || 0, -LOOK_MAX.yaw, LOOK_MAX.yaw), pitch: clamp(Number(pitch) || 0, -LOOK_MAX.pitch, LOOK_MAX.pitch) };
      return api;
    },
    get looked() { return { ...tilt.looked }; },
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
