// Round 144: the camera of The Journey 2. Pure: no DOM and no three.js, so it is tested in Node. A pose is
// { position: [x, y, z], target: [x, y, z] }, as the dungeon's director gives (director.js); the host copies it to
// its camera.
//
//   arrive(site)          down from the sky to the site, the first time the road is shown
//   travel(points, site)  along a way to a site: a glide at eye height over the ground (round 191: it no longer
//                         rises), faster than a walk, because the road is "on rails", with a slow low swell
//   hold                  at a site: a few steps back from whoever stands there, with a slow sway; each objective
//                         closed steps the camera in (engage), a verdict is a small push or pull (beat)
//   wander                at a site where nobody waits: a slow turn around it, to look at the country
//   title(site)           round 175: the title screen: far over the site, above the clouds, turning slowly round it
//   arrive(site) from the title  the zoom down from there to the site: the distance shrinks by the same share each
//                         moment (it falls through the clouds quickly and settles slowly), the camera levels out and
//                         turns a little round the site on the way
//
// The ground is the terrain's heightAt; the camera never goes under it or under the water.

export const ROAD_CAMERA = Object.freeze({
  eye: 1.7, // metres above the ground
  standoff: 5.2, // how far from the site the camera stands
  focus: 1.5, // where on a figure it looks
  lookAhead: 14, // metres along the way, while travelling
  speed: 16, // metres per second of a glide, between the limits below
  travel: Object.freeze({ min: 3.2, max: 12 }), // seconds (round 176: a walk of several ways may take longer)
  // Round 176: the height the camera keeps on a glide: the highest ground within `reach` metres before and after,
  // smoothed over `smooth` metres, so it rises and sinks with the land in long curves and not with every bump.
  clearance: Object.freeze({ step: 2, reach: 8, smooth: 14 }),
  // Round 191: a glide no longer rises over the country (round 144's lift, up to 18 m): it keeps the height of the
  // conversation it left, eye height over the ground, as a walker would. It bobs a little as it goes: a long, low
  // swell of `height` metres every `length` metres, faded in and out over `fade` of the glide at each end.
  bob: Object.freeze({ height: 0.14, length: 22, fade: 0.18 }),
  arrive: 2.8, // seconds from the sky
  sky: 46, // metres above the site
  blend: 0.9, // seconds to leave a hold
  engageMax: 0.34,
  wander: Object.freeze({ radius: 9, rise: 2.6, period: 70 }),
  // Round 175: the title screen. `distance` is from the site, along a line `pitch` radians under the level; the
  // frame holds about `across` metres of land across its narrower side, the map's own width (about 1 km at its
  // closest) taken twice, within the distances given. One turn round the site takes `period` seconds, and the zoom
  // down takes `descend`.
  title: Object.freeze({ pitch: 0.96, across: 2100, distance: Object.freeze([1400, 2600]), period: 360, descend: 6.5 }),
});

/** Round 175: how far the title's camera stands from the site, for a view of `aspect` (width over height) and `fov` (degrees, vertical). */
export function titleDistance(aspect, fov = 60) {
  const { across, distance: [near, far] } = ROAD_CAMERA.title;
  const wide = 2 * Math.tan(((fov / 2) * Math.PI) / 180) * Math.min(1, Math.max(0.1, aspect || 1));
  return clamp(across / wide, near, far);
}

import { FREE_LOOK, turnSight } from './tilt.js';

const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const BEAT = Object.freeze({ pass: 0.05, resolved: 0.05, fail: -0.05 });
// Round 194: tilt to look, as in the dungeons (round 125): at a hold the phone's tilt turns the line of sight, the
// position stays. `LOOK_MAX` bounds the turn (radians; tilt.js keeps inside it), and it eases in and out.
// Round 199: the free look's range and ease are tilt.js's (FREE_LOOK): 135 degrees to either side, and up or down to
// just short of the vertical (turnSight).
export const LOOK_MAX = Object.freeze({ yaw: FREE_LOOK.maxYaw, pitch: FREE_LOOK.maxPitch });
const LOOK_TAU = FREE_LOOK.ease;
const LOOK_IN = FREE_LOOK.fadeIn;
const turned = turnSight;

// A polyline with its running lengths: at(s) is the point s metres along it.
function measured(points) {
  const lengths = [0];
  for (let n = 1; n < points.length; n += 1) lengths.push(lengths[n - 1] + Math.hypot(points[n][0] - points[n - 1][0], points[n][1] - points[n - 1][1]));
  const total = lengths.at(-1);
  const at = (s) => {
    const d = clamp(s, 0, total);
    let n = 1;
    while (n < points.length - 1 && lengths[n] < d) n += 1;
    const span = lengths[n] - lengths[n - 1] || 1;
    const u = (d - lengths[n - 1]) / span;
    return [lerp(points[n - 1][0], points[n][0], u), lerp(points[n - 1][1], points[n][1], u)];
  };
  return { total, at };
}

export function createRoadDirector({ heightAt, waterY = 0, surfaceAt = null }) {
  // Round 213: on pulled land the water is not level; `surfaceAt` is then the ground or the water over it.
  const ground = surfaceAt ?? ((x, z) => Math.max(heightAt(x, z), waterY));
  // Round 176: the smoothed height of the ground along `line` (see ROAD_CAMERA.clearance), as a function of the
  // distance along it.
  function profile(line, length, smooth = ROAD_CAMERA.clearance.smooth) {
    const { step, reach } = ROAD_CAMERA.clearance;
    const count = Math.max(1, Math.ceil(length / step));
    const raw = Array.from({ length: count + 1 }, (_, n) => ground(...line.at(n * step)));
    const sigma = smooth / step;
    const r = Math.ceil(sigma * 2.5);
    // The highest ground as far each way as the smoothing reaches: every sample the smoothing takes at a point is then
    // at least that point's ground, so the smoothed height is never under it.
    const wide = Math.max(Math.round(reach / step), r);
    const envelope = raw.map((_, n) => Math.max(...raw.slice(Math.max(0, n - wide), n + wide + 1)));
    const smoothed = envelope.map((_, n) => {
      let [sum, weight] = [0, 0];
      for (let k = -r; k <= r; k += 1) {
        const value = envelope[Math.min(count, Math.max(0, n + k))];
        const w = Math.exp(-(k * k) / (2 * sigma * sigma));
        sum += value * w; weight += w;
      }
      return sum / weight;
    });
    // Read between the samples on a Catmull-Rom curve, so that the slope has no break at each sample either.
    const at = (n) => smoothed[Math.min(count, Math.max(0, n))];
    return (s) => {
      const f = clamp(s / step, 0, count);
      const n = Math.min(count - 1, Math.floor(f));
      const u = f - n;
      const [p0, p1, p2, p3] = [at(n - 1), at(n), at(n + 1), at(n + 2)];
      return p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)));
    };
  }
  let mode = 'idle';
  let t = 0;
  let site = null; // { x, z }
  let from = [0, 1]; // the direction the camera stands in, seen from the site (unit)
  let start = null; // the pose a transition began at
  let way = null; // { total, at, floor, duration }
  let engage = 0;
  let engageTarget = 0;
  let beat = { kind: null, t: 1 };
  const tilt = { look: { yaw: 0, pitch: 0 }, looked: { yaw: 0, pitch: 0 } }; // round 194
  let arrived = true;
  let pose = { position: [0, 30, 30], target: [0, 0, 0] };
  let titleAt = { distance: ROAD_CAMERA.title.distance[0], angle: 0 }; // round 175
  let descent = null; // round 175: { r0, r1, pitch0, pitch1, yaw0, yaw1, duration } of a zoom down from the title

  const siteTarget = () => [site.x, heightAt(site.x, site.z) + ROAD_CAMERA.focus, site.z];
  function holdPose(time) {
    const sway = 0.1 * Math.sin(time * 0.23) + 0.05 * Math.sin(time * 0.11 + 1.3);
    const [c, s] = [Math.cos(sway), Math.sin(sway)];
    const dir = [from[0] * c - from[1] * s, from[0] * s + from[1] * c];
    const push = (beat.t < 1 ? Math.sin(Math.PI * beat.t) * (BEAT[beat.kind] ?? 0) : 0);
    const distance = ROAD_CAMERA.standoff * (1 - engage - push);
    const [x, z] = [site.x + dir[0] * distance, site.z + dir[1] * distance];
    // Level with the figure's feet or above them, whatever the slope.
    const y = Math.max(ground(x, z), heightAt(site.x, site.z) - 0.4) + ROAD_CAMERA.eye + 0.12 * Math.sin(time * 0.31);
    return { position: [x, y, z], target: siteTarget() };
  }
  function wanderPose(time) {
    const angle = Math.atan2(from[1], from[0]) + (time / ROAD_CAMERA.wander.period) * Math.PI * 2;
    const [x, z] = [site.x + Math.cos(angle) * ROAD_CAMERA.wander.radius, site.z + Math.sin(angle) * ROAD_CAMERA.wander.radius];
    return { position: [x, Math.max(ground(x, z), heightAt(site.x, site.z)) + ROAD_CAMERA.eye + ROAD_CAMERA.wander.rise, z], target: siteTarget() };
  }
  function travelPose(u) {
    const s = ease(u) * way.total;
    const [x, z] = way.at(s);
    const [ax, az] = way.at(s + ROAD_CAMERA.lookAhead);
    // Round 191: the swell, by distance, so it keeps its length whatever the pace. It only lifts (never under eye
    // height), and it is zero at both ends of the glide.
    const { height, length, fade } = ROAD_CAMERA.bob;
    const swell = ease(clamp(u / fade, 0, 1)) * ease(clamp((1 - u) / fade, 0, 1)) * height * 0.5 * (1 - Math.cos((2 * Math.PI * s) / length));
    // Round 176: on the smoothed profile of the ground along the way, and never under the ground here.
    // Over the last fifth it settles onto the ground here, where the hold takes it up.
    const here = ground(x, z);
    const settle = ease(clamp((u - 0.8) / 0.2, 0, 1));
    const y = here + (Math.max(way.floor(s), here) - here) * (1 - settle) + ROAD_CAMERA.eye + swell;
    const near = clamp((way.total - s) / ROAD_CAMERA.lookAhead, 0, 1); // towards the end the look settles on the site
    const ahead = [ax, ground(ax, az) + ROAD_CAMERA.eye * 0.8 + swell * 0.5, az];
    return { position: [x, y, z], target: lerp3(siteTarget(), ahead, near) };
  }

  // Round 175: the title's pose: far over the site, turning round it.
  function titlePose(time) {
    const angle = titleAt.angle + (time / ROAD_CAMERA.title.period) * Math.PI * 2;
    const { pitch } = ROAD_CAMERA.title;
    const flat = Math.cos(pitch) * titleAt.distance;
    const base = heightAt(site.x, site.z);
    return { position: [site.x + Math.cos(angle) * flat, base + Math.sin(pitch) * titleAt.distance, site.z + Math.sin(angle) * flat], target: [site.x, base, site.z] };
  }
  // The zoom down: the camera's place seen from the site's focus as a distance, a pitch and a bearing, each eased
  // from the title's to the hold's (the distance by the same share each moment), and never under the ground.
  function descentPose(u) {
    const e = ease(u);
    const focus = siteTarget();
    const r = descent.r0 * (descent.r1 / descent.r0) ** e;
    const pitch = lerp(descent.pitch0, descent.pitch1, e);
    const yaw = lerp(descent.yaw0, descent.yaw1, e);
    const [x, z] = [focus[0] + Math.cos(yaw) * Math.cos(pitch) * r, focus[2] + Math.sin(yaw) * Math.cos(pitch) * r];
    const y = Math.max(focus[1] + Math.sin(pitch) * r, ground(x, z) + ROAD_CAMERA.eye);
    // The look comes down from the ground under the site to the figure as the camera levels out.
    return { position: [x, y, z], target: [focus[0], lerp(descent.look0, focus[1], e), focus[2]] };
  }
  const polar = (position, focus) => {
    const [dx, dy, dz] = [position[0] - focus[0], position[1] - focus[1], position[2] - focus[2]];
    const r = Math.max(0.5, Math.hypot(dx, dy, dz));
    return { r, pitch: Math.asin(clamp(dy / r, -1, 1)), yaw: Math.atan2(dz, dx) };
  };

  const begin = (next) => { mode = next; t = 0; start = { position: [...pose.position], target: [...pose.target] }; arrived = false; };
  const setSite = (next, facing) => {
    site = { x: next.x, z: next.z };
    if (facing) {
      const d = [facing[0] - next.x, facing[1] - next.z];
      const length = Math.hypot(d[0], d[1]);
      if (length > 0.01) from = [d[0] / length, d[1] / length];
    }
    engage = 0; engageTarget = 0; beat = { kind: null, t: 1 };
  };

  return {
    get mode() { return mode; },
    get arrived() { return arrived; },
    get pose() { return pose; },
    get site() { return site; },

    /** Round 175: the title screen, far over `next`, turning slowly; `distance` from titleDistance(). */
    title(next, { distance = titleAt.distance } = {}) {
      const moved = !site || site.x !== next.x || site.z !== next.z;
      if (moved || mode !== 'title') {
        setSite(next, null);
        titleAt = { distance, angle: Math.atan2(from[1], from[0]) };
        mode = 'title'; t = 0; start = null; arrived = false;
      }
      titleAt.distance = distance;
      pose = titlePose(t);
    },
    /** Round 175: the title's distance, when the view changes shape. */
    setTitleDistance(distance) { titleAt.distance = distance; },

    /** Down from the sky to `next` ({ x, z }), seen from `facing` ([x, z]) if given. From the title, the zoom down. */
    arrive(next, facing = null) {
      if (mode === 'title' && site) {
        // The camera comes down on the side it is on, and turns a little further round on the way.
        const focus = [next.x, heightAt(next.x, next.z) + ROAD_CAMERA.focus, next.z];
        const begun = polar(pose.position, focus);
        setSite(next, [next.x + Math.cos(begun.yaw + 0.7), next.z + Math.sin(begun.yaw + 0.7)]);
        const end = polar(holdPose(0).position, focus);
        descent = { r0: begun.r, r1: end.r, pitch0: begun.pitch, pitch1: end.pitch, yaw0: begun.yaw, yaw1: begun.yaw + 0.7, look0: heightAt(next.x, next.z), duration: ROAD_CAMERA.title.descend };
        begin('descend');
        return;
      }
      setSite(next, facing);
      pose = { position: [next.x + from[0] * 24, heightAt(next.x, next.z) + ROAD_CAMERA.sky, next.z + from[1] * 24], target: siteTarget() };
      begin('arrive');
    },

    /** Along `points` ([[x, z], ...], the last one the site) to `next`. */
    travel(points, next) {
      const line = measured(points);
      const stop = Math.max(0, line.total - ROAD_CAMERA.standoff);
      const before = line.at(Math.max(0, stop - 2));
      setSite(next, before);
      const duration = clamp(stop / ROAD_CAMERA.speed, ROAD_CAMERA.travel.min, ROAD_CAMERA.travel.max);
      // The faster the glide, the longer the stretch of ground its height is smoothed over: about a second of it at
      // the glide's top speed (an eased glide's top speed is 1.5 times its mean).
      const smooth = Math.max(ROAD_CAMERA.clearance.smooth, (1.5 * stop) / duration);
      way = {
        total: stop, at: line.at, floor: profile(line, stop + ROAD_CAMERA.lookAhead, smooth),
        duration,
      };
      begin('travel');
    },

    /** Stand at `next` at once (a reload, reduced motion). */
    stand(next, facing = null) { setSite(next, facing); mode = 'hold'; t = 0; arrived = true; pose = holdPose(0); },
    /** A slow turn around the site: nobody waits here. */
    wander() { if (site && mode !== 'wander') begin('wander'); },
    /** Back to the hold, from a wander. */
    face() { if (site && mode === 'wander') begin('hold'); },
    /** The end of whatever is under way. */
    skip() { if (mode === 'arrive' || mode === 'travel' || mode === 'descend' || mode === 'title') { mode = 'hold'; t = 0; start = null; } arrived = true; pose = site ? (mode === 'wander' ? wanderPose(0) : holdPose(0)) : pose; },

    engage(level) { engageTarget = clamp(level, 0, 1) * ROAD_CAMERA.engageMax; },
    /** Round 194: the turn of the line of sight a tilt asks for, in radians: `yaw` to the left, `pitch` up. It shapes a hold. */
    look({ yaw = 0, pitch = 0 } = {}) {
      tilt.look = { yaw: clamp(Number(yaw) || 0, -LOOK_MAX.yaw, LOOK_MAX.yaw), pitch: clamp(Number(pitch) || 0, -LOOK_MAX.pitch, LOOK_MAX.pitch) };
    },
    get looked() { return { ...tilt.looked }; },
    beat(kind) { beat = { kind, t: 0 }; },

    update(dt) {
      if (!site) return pose;
      t += dt;
      const lookEase = 1 - Math.exp(-dt / LOOK_TAU);
      tilt.looked.yaw += (tilt.look.yaw - tilt.looked.yaw) * lookEase;
      tilt.looked.pitch += (tilt.look.pitch - tilt.looked.pitch) * lookEase;
      engage += (engageTarget - engage) * (1 - Math.exp(-dt / 0.7));
      if (beat.t < 1) beat.t = Math.min(1, beat.t + dt / 0.9);
      if (mode === 'title') {
        pose = titlePose(t);
      } else if (mode === 'descend') {
        const u = Math.min(1, t / descent.duration);
        pose = descentPose(u);
        if (u >= 1) { mode = 'hold'; t = 0; start = { position: [...pose.position], target: [...pose.target] }; arrived = true; descent = null; }
      } else if (mode === 'arrive') {
        const u = Math.min(1, t / ROAD_CAMERA.arrive);
        const end = holdPose(0);
        pose = { position: lerp3(start.position, end.position, ease(u)), target: lerp3(start.target, end.target, ease(u)) };
        if (u >= 1) { mode = 'hold'; t = 0; start = null; arrived = true; }
      } else if (mode === 'travel') {
        const u = Math.min(1, t / way.duration);
        const moving = travelPose(u);
        // The first moments leave the pose the camera held, without a jump.
        const leave = ease(Math.min(1, t / ROAD_CAMERA.blend));
        pose = { position: lerp3(start.position, moving.position, leave), target: lerp3(start.target, moving.target, leave) };
        // The hold starts from where the glide ended and eases to its own place.
        if (u >= 1) { mode = 'hold'; t = 0; start = { position: [...pose.position], target: [...pose.target] }; arrived = true; }
      } else if (mode === 'wander' || mode === 'hold') {
        const steady = mode === 'wander' ? wanderPose(t) : holdPose(t);
        const join = start ? ease(Math.min(1, t / 1.6)) : 1;
        pose = start && join < 1 ? { position: lerp3(start.position, steady.position, join), target: lerp3(start.target, steady.target, join) } : steady;
        if (join >= 1) start = null;
        arrived = true;
      }
      // Round 194: at a hold the tilt turns the look, fading in from the hold's start so it joins without a jump.
      // Round 199: and at a site where nobody waits (the wander), so the player can look round wherever the camera stops.
      if (mode === 'hold' || mode === 'wander') {
        const weight = 1 - Math.exp(-t / LOOK_IN);
        pose = turned(pose, tilt.looked.yaw * weight, tilt.looked.pitch * weight);
      }
      return pose;
    },
  };
}
