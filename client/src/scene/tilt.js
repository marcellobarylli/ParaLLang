// Round 125: tilt to look. The phone's orientation turns the camera's look at a site, as if the phone were a window.
// Pure apart from the three browser helpers at the end, so it is unit-tested in Node.
//
// A `deviceorientation` event carries three angles in degrees (alpha about the phone's z axis, beta about x, gamma
// about y, applied in that order); the W3C quaternion of those angles turns the phone's frame into the Earth's.
// Round 199 replaced round 125's small tilt (12 degrees to the side, 8 up or down, drifting back to the middle) with
// the free look below, on the road; round 200 gave the legacy dungeons the same, and the small tilt was removed.

const RAD = Math.PI / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// The W3C Device Orientation specification's quaternion for the angles (Z-X'-Y'' intrinsic), as [w, x, y, z].
export function orientationQuaternion({ alpha, beta, gamma }) {
  const [x, y, z] = [beta * RAD / 2, gamma * RAD / 2, alpha * RAD / 2];
  const [cX, cY, cZ, sX, sY, sZ] = [Math.cos(x), Math.cos(y), Math.cos(z), Math.sin(x), Math.sin(y), Math.sin(z)];
  return [cX * cY * cZ - sX * sY * sZ, sX * cY * cZ - cX * sY * sZ, cX * sY * cZ + sX * cY * sZ, cX * cY * sZ + sX * sY * cZ];
}

const multiply = ([aw, ax, ay, az], [bw, bx, by, bz]) => [
  aw * bw - ax * bx - ay * by - az * bz,
  aw * bx + ax * bw + ay * bz - az * by,
  aw * by - ax * bz + ay * bw + az * bx,
  aw * bz + ax * by - ay * bx + az * bw,
];
const conjugate = ([w, x, y, z]) => [w, -x, -y, -z];

// Round 199: the free look (the road's; round 200, the legacy dungeons' too). The phone is a window on the world: the way its back points is the way the camera
// looks, turned from where it pointed on arrival. Sideways it turns up to FREE_LOOK.maxYaw either way (270 degrees in
// all, nearly the whole way round); up and down it goes as far as the phone does, to straight up and straight down.
// It does not drift back to the middle while held (the dungeons' gentle tilt does), and it reads the direction, not
// the small-angle tilt, so large turns compose properly whichever way the phone is held. Signs as the tilt's: turning
// the phone left looks left, its top towards the player (its back up) looks up.
export const FREE_LOOK = Object.freeze({
  maxYaw: 135 * RAD, // to either side
  maxPitch: 90 * RAD, // up or down, from the way the phone pointed on arrival (the road's camera makes 90 straight up or down)
  steep: 80 * RAD, // past this the phone's heading means little (it points at the sky or the ground): the yaw is kept
  ease: 0.05, // seconds: the camera's ease to a new look, short, so the window follows the hand
  fadeIn: 0.5, // seconds: the look fades in over the start of a hold, so an arrival joins without a jump
  sightMax: 1.55, // radians: the line of sight stops just short of straight up or down, so the view never flips
});

/**
 * A camera pose ({ position, target }) with its line of sight turned by `yaw` (to the left) and `pitch` (up); the
 * position stays. A pitch of a quarter turn up (or down) is straight up (or down), wherever the sight was: the rest of
 * the way from the sight's own angle is spread over the quarter turn, so a phone pointed at the sky shows the sky.
 */
export function turnSight({ position, target }, yaw, pitch) {
  if (!yaw && !pitch) return { position, target };
  const d = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
  const distance = Math.hypot(...d) || 1e-6;
  const p0 = Math.asin(clamp(d[1] / distance, -1, 1));
  const lift = pitch >= 0 ? pitch * (Math.PI / 2 - p0) / (Math.PI / 2) : pitch * (Math.PI / 2 + p0) / (Math.PI / 2);
  const [y, p] = [Math.atan2(d[0], d[2]) + yaw, clamp(p0 + lift, -FREE_LOOK.sightMax, FREE_LOOK.sightMax)];
  const c = Math.cos(p);
  return { position, target: [position[0] + Math.sin(y) * c * distance, position[1] + Math.sin(p) * distance, position[2] + Math.cos(y) * c * distance] };
}

// The direction out of the phone's back in the Earth frame (x east, y north, z up), for a W3C orientation quaternion.
export function backDirection(q) {
  const [, x, y, z] = multiply(multiply(q, [0, 0, 0, -1]), conjugate(q));
  return [x, y, z];
}

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/**
 * The free look: orient(angles) with each `deviceorientation` event; `look` is { yaw, pitch } in radians; `recentre()`
 * makes the next event "ahead" (a host calls it on arriving at a site).
 */
export function createFreeLook(options = {}) {
  const config = { ...FREE_LOOK, ...options };
  let baseline = null; // { heading, elevation } of the phone's back on arrival
  let look = { yaw: 0, pitch: 0 };
  return {
    get look() { return { ...look }; },
    get active() { return baseline !== null; },
    recentre() { baseline = null; look = { yaw: 0, pitch: 0 }; },
    orient(angles) {
      const { beta, gamma } = angles ?? {};
      if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return look;
      const [x, y, z] = backDirection(orientationQuaternion({ alpha: Number.isFinite(angles.alpha) ? angles.alpha : 0, beta, gamma }));
      const elevation = Math.asin(clamp(z, -1, 1));
      const heading = Math.atan2(x, y); // clockwise from north
      if (!baseline) baseline = { heading, elevation };
      const pitch = clamp(elevation - baseline.elevation, -config.maxPitch, config.maxPitch);
      let yaw = look.yaw;
      if (Math.abs(elevation) < config.steep) {
        yaw = wrap(baseline.heading - heading); // turning left lowers the heading and looks left
        // Past the range the baseline is dragged along, so turning back answers at once.
        if (Math.abs(yaw) > config.maxYaw) {
          const over = yaw - Math.sign(yaw) * config.maxYaw;
          baseline = { ...baseline, heading: wrap(baseline.heading - over) };
          yaw = Math.sign(yaw) * config.maxYaw;
        }
      }
      look = { yaw, pitch };
      return look;
    },
  };
}

// The browser. iOS Safari hands out orientation events only after the page has asked from inside a tap.

/** True where the browser wants to be asked (iOS Safari 13 and later). */
export const tiltNeedsAsking = (scope = globalThis) => typeof scope.DeviceOrientationEvent?.requestPermission === 'function';

/**
 * Asks for the orientation events. Call it from a click. Resolves to 'granted', 'denied', 'unsupported' (the browser
 * has no orientation events) or 'unknown' (an answer that is neither yes nor no: headless Chromium says "prompt").
 */
export function requestTiltPermission(scope = globalThis) {
  if (!scope.DeviceOrientationEvent) return Promise.resolve('unsupported');
  if (!tiltNeedsAsking(scope)) return Promise.resolve('granted');
  try {
    return Promise.resolve(scope.DeviceOrientationEvent.requestPermission()).then((answer) => (answer === 'granted' || answer === 'denied' ? answer : 'unknown'), () => 'denied');
  } catch {
    return Promise.resolve('denied');
  }
}

/** The screen's rotation from the phone's natural orientation, in degrees. */
export const screenAngle = (scope = globalThis) => Number(scope.screen?.orientation?.angle ?? scope.orientation ?? 0) || 0;
