// Round 144: the camera of The Journey 2. Pure: no DOM and no three.js, so it is tested in Node. A pose is
// { position: [x, y, z], target: [x, y, z] }, as the dungeon's director gives (director.js); the host copies it to
// its camera.
//
//   arrive(site)          down from the sky to the site, the first time the road is shown
//   travel(points, site)  along a way to a site: a glide a few metres up, faster than a walk, because the road is
//                         "on rails": the player jumps from one conversation to the next
//   hold                  at a site: a few steps back from whoever stands there, with a slow sway; each objective
//                         closed steps the camera in (engage), a verdict is a small push or pull (beat)
//   wander                at a site where nobody waits: a slow turn around it, to look at the country
//
// The ground is the terrain's heightAt; the camera never goes under it or under the water.

export const ROAD_CAMERA = Object.freeze({
  eye: 1.7, // metres above the ground
  standoff: 5.2, // how far from the site the camera stands
  focus: 1.5, // where on a figure it looks
  lookAhead: 14, // metres along the way, while travelling
  speed: 16, // metres per second of a glide, between the limits below
  travel: Object.freeze({ min: 3.2, max: 9 }), // seconds
  lift: Object.freeze({ share: 0.07, max: 18 }), // how high a glide rises: a share of its length
  arrive: 2.8, // seconds from the sky
  sky: 46, // metres above the site
  blend: 0.9, // seconds to leave a hold
  engageMax: 0.34,
  wander: Object.freeze({ radius: 9, rise: 2.6, period: 70 }),
});

const lerp = (a, b, u) => a + (b - a) * u;
const lerp3 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const BEAT = Object.freeze({ pass: 0.05, resolved: 0.05, fail: -0.05 });

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

export function createRoadDirector({ heightAt, waterY = 0 }) {
  const ground = (x, z) => Math.max(heightAt(x, z), waterY);
  let mode = 'idle';
  let t = 0;
  let site = null; // { x, z }
  let from = [0, 1]; // the direction the camera stands in, seen from the site (unit)
  let start = null; // the pose a transition began at
  let way = null; // { total, at, duration, lift }
  let engage = 0;
  let engageTarget = 0;
  let beat = { kind: null, t: 1 };
  let arrived = true;
  let pose = { position: [0, 30, 30], target: [0, 0, 0] };

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
    const rise = Math.sin(Math.PI * u) * way.lift;
    // Clear of the ground here and a little ahead, so a rise in the way does not swallow the camera.
    const y = Math.max(ground(x, z), ground(...way.at(s + 4))) + ROAD_CAMERA.eye + rise;
    const near = clamp((way.total - s) / ROAD_CAMERA.lookAhead, 0, 1); // towards the end the look settles on the site
    const ahead = [ax, ground(ax, az) + ROAD_CAMERA.eye * 0.8 + rise * 0.4, az];
    return { position: [x, y, z], target: lerp3(siteTarget(), ahead, near) };
  }

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

    /** Down from the sky to `next` ({ x, z }), seen from `facing` ([x, z]) if given. */
    arrive(next, facing = null) {
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
      way = {
        total: stop, at: line.at,
        duration: clamp(stop / ROAD_CAMERA.speed, ROAD_CAMERA.travel.min, ROAD_CAMERA.travel.max),
        lift: Math.min(ROAD_CAMERA.lift.max, stop * ROAD_CAMERA.lift.share),
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
    skip() { if (mode === 'arrive' || mode === 'travel') { mode = 'hold'; t = 0; start = null; } arrived = true; pose = site ? (mode === 'wander' ? wanderPose(0) : holdPose(0)) : pose; },

    engage(level) { engageTarget = clamp(level, 0, 1) * ROAD_CAMERA.engageMax; },
    beat(kind) { beat = { kind, t: 0 }; },

    update(dt) {
      if (!site) return pose;
      t += dt;
      engage += (engageTarget - engage) * (1 - Math.exp(-dt / 0.7));
      if (beat.t < 1) beat.t = Math.min(1, beat.t + dt / 0.9);
      if (mode === 'arrive') {
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
      return pose;
    },
  };
}
