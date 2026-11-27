// Round 125: tilt to look. The phone's orientation turns the camera's look at a site, as if the phone were a window
// on the temple. Pure apart from the three browser helpers at the end, so it is unit-tested in Node.
//
// A `deviceorientation` event carries three angles in degrees (alpha about the phone's z axis, beta about x, gamma
// about y, applied in that order). The tilt is the rotation from a baseline orientation to the present one, read in
// the phone's own frame: its part about the screen's horizontal axis is the pitch, its part about the screen's
// vertical axis is the yaw. Read this way it has no jump however the phone is held (the raw gamma angle jumps when
// the phone is upright).
//
// Signs: a positive yaw turns the look to the left (the director's sight yaw grows to the left), a positive pitch
// turns it up. Turning the phone to the left looks left; tilting its top towards the player looks up. (The vertical
// was a window's at first, top away looks up; the owner found it inverted on the iPhone, 2026-11-19.) For the
// opposite, flip TILT.yawSign or TILT.pitchSign.

const RAD = Math.PI / 180;
export const TILT = Object.freeze({
  gain: 0.6, // degrees of look per degree of tilt
  maxYaw: 12 * RAD, // the look's range to either side
  maxPitch: 8 * RAD, // and up or down
  recentre: 30, // seconds: the baseline follows the phone this slowly (12 at first: a held look crept back by a tenth a second)
  yawSign: 1,
  pitchSign: -1,
});

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

// A unit quaternion as a rotation vector (axis times angle, radians), the short way round.
function rotationVector(q) {
  const [w, x, y, z] = q[0] < 0 ? q.map((v) => -v) : q;
  const sine = Math.hypot(x, y, z);
  if (sine < 1e-9) return [0, 0, 0];
  const scale = (2 * Math.atan2(sine, w)) / sine;
  return [x * scale, y * scale, z * scale];
}

function fromRotationVector([x, y, z]) {
  const angle = Math.hypot(x, y, z);
  if (angle < 1e-9) return [1, 0, 0, 0];
  const scale = Math.sin(angle / 2) / angle;
  return [Math.cos(angle / 2), x * scale, y * scale, z * scale];
}

/**
 * The look a phone's tilt asks for.
 *
 *   orient({ alpha, beta, gamma }, screenAngle, now)  one orientation event; `now` in seconds
 *   look                                              { yaw, pitch } in radians, within the range
 *   recentre()                                        the next event is "straight ahead"
 */
export function createTilt(options = {}) {
  const config = { ...TILT, ...options };
  // How far the phone may tilt before the baseline is dragged along: the tilt at which the look reaches its range.
  const leash = { yaw: config.maxYaw / config.gain, pitch: config.maxPitch / config.gain };
  let baseline = null;
  let last = null;
  let look = { yaw: 0, pitch: 0 };

  return {
    get look() { return { ...look }; },
    get active() { return baseline !== null; },
    recentre() { baseline = null; last = null; look = { yaw: 0, pitch: 0 }; },
    orient(angles, screenAngle = 0, now = null) {
      const { beta, gamma } = angles ?? {};
      // A device without a sensor fires one event with null angles.
      if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return look;
      const present = orientationQuaternion({ alpha: Number.isFinite(angles.alpha) ? angles.alpha : 0, beta, gamma });
      const dt = now !== null && last !== null ? clamp(now - last, 0, 0.1) : 1 / 60;
      last = now;
      if (!baseline) baseline = present;
      let tilt = rotationVector(multiply(conjugate(baseline), present));
      // The baseline moves a fraction of the way to the present orientation: slowly always, and at once by as much
      // as the tilt is past the leash.
      const past = Math.hypot(tilt[0] / leash.pitch, tilt[1] / leash.yaw, tilt[2] / leash.yaw);
      const keep = Math.exp(-dt / config.recentre) * (past > 1 ? 1 / past : 1);
      baseline = multiply(baseline, fromRotationVector(tilt.map((v) => v * (1 - keep))));
      tilt = tilt.map((v) => v * keep);
      // The screen's axes in the phone's frame (landscape turns them).
      const [c, s] = [Math.cos(screenAngle * RAD), Math.sin(screenAngle * RAD)];
      const aboutHorizontal = tilt[0] * c - tilt[1] * s;
      const aboutVertical = tilt[0] * s + tilt[1] * c;
      look = {
        yaw: clamp(config.yawSign * config.gain * aboutVertical, -config.maxYaw, config.maxYaw),
        pitch: clamp(-config.pitchSign * config.gain * aboutHorizontal, -config.maxPitch, config.maxPitch),
      };
      return look;
    },
  };
}

// Round 197: the road's free look. The phone is a window on the world: the way its back points is the way the camera
// looks, turned from where it pointed on arrival. Sideways it turns up to FREE_LOOK.maxYaw either way (270 degrees in
// all, nearly the whole way round); up and down it goes as far as the phone does, to straight up and straight down.
// It does not drift back to the middle while held (the dungeons' gentle tilt does), and it reads the direction, not
// the small-angle tilt, so large turns compose properly whichever way the phone is held. Signs as the tilt's: turning
// the phone left looks left, its top towards the player (its back up) looks up.
export const FREE_LOOK = Object.freeze({
  maxYaw: 135 * RAD, // to either side
  maxPitch: 90 * RAD, // up or down, from the way the phone pointed on arrival (the road's camera makes 90 straight up or down)
  steep: 80 * RAD, // past this the phone's heading means little (it points at the sky or the ground): the yaw is kept
});

// The direction out of the phone's back in the Earth frame (x east, y north, z up), for a W3C orientation quaternion.
export function backDirection(q) {
  const [, x, y, z] = multiply(multiply(q, [0, 0, 0, -1]), conjugate(q));
  return [x, y, z];
}

const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** The road's free look: the same interface as createTilt (orient, look, active, recentre). */
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
