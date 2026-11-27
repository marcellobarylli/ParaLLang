// @vitest-environment node
// Round 125: tilt to look. The phone's orientation becomes a small turn of the camera's look: a window's direction,
// a gain, a range, a leash at the range, a slow recentre, and no jump however the phone is held.
import { describe, expect, test, vi } from 'vitest';
import { TILT, createTilt, orientationQuaternion, requestTiltPermission, screenAngle, tiltNeedsAsking } from '../tilt.js';

const DEG = Math.PI / 180;
const HELD = { alpha: 30, beta: 50, gamma: 0 }; // a phone held in the hand
const UPRIGHT = { alpha: 0, beta: 90, gamma: 0 }; // held up like a window: alpha turns it about the screen's vertical
// Feeds `tilt` the orientation `angles` for `seconds` at 60 events a second, from time `from`.
function hold(tilt, angles, seconds, from = 0, screen = 0) {
  let look = tilt.look;
  for (let i = 0; i <= Math.round(seconds * 60); i++) look = tilt.orient(angles, screen, from + i / 60);
  return look;
}

describe('the tilt', () => {
  test('the first orientation is straight ahead, and a still phone stays there', () => {
    const tilt = createTilt();
    expect(tilt.look).toEqual({ yaw: 0, pitch: 0 });
    expect(tilt.active).toBe(false);
    const look = hold(tilt, HELD, 5);
    expect(tilt.active).toBe(true);
    expect(look.yaw).toBeCloseTo(0, 9);
    expect(look.pitch).toBeCloseTo(0, 9);
  });

  test('turning the phone about its long axis turns the look sideways, by the gain: right edge down looks left', () => {
    const tilt = createTilt();
    tilt.orient(HELD, 0, 0);
    const left = tilt.orient({ ...HELD, gamma: 10 }, 0, 1 / 60);
    expect(left.yaw / DEG).toBeCloseTo(TILT.yawGain * 10, 1);
    expect(left.pitch).toBeCloseTo(0, 6);
    const right = createTilt();
    right.orient(HELD, 0, 0);
    expect(right.orient({ ...HELD, gamma: -10 }, 0, 1 / 60).yaw / DEG).toBeCloseTo(-TILT.yawGain * 10, 1);
  });

  test('tilting the top of the phone towards the player looks up, away looks down (the owner\'s phone, 2026-11-19)', () => {
    const up = createTilt();
    up.orient(HELD, 0, 0);
    const look = up.orient({ ...HELD, beta: HELD.beta - 10 }, 0, 1 / 60);
    expect(look.pitch / DEG).toBeCloseTo(-TILT.gain * 10, 1);
    expect(look.yaw).toBeCloseTo(0, 6);
    const down = createTilt();
    down.orient(HELD, 0, 0);
    expect(down.orient({ ...HELD, beta: HELD.beta + 10 }, 0, 1 / 60).pitch / DEG).toBeCloseTo(TILT.gain * 10, 1);
  });

  test('the look stays in its range however far the phone tilts', () => {
    for (const [beta, gamma] of [[0, 80], [0, -80], [-40, 0], [60, 0], [45, 45], [-45, -60]]) {
      const tilt = createTilt();
      tilt.orient(HELD, 0, 0);
      const look = tilt.orient({ ...HELD, beta: HELD.beta + beta, gamma }, 0, 1 / 60);
      expect(Math.abs(look.yaw)).toBeLessThanOrEqual(TILT.maxYaw + 1e-9);
      expect(Math.abs(look.pitch)).toBeLessThanOrEqual(TILT.maxPitch + 1e-9);
    }
    // Round 191: 135 degrees to either side. Turning round with the phone held upright reaches it.
    expect(TILT.maxYaw / DEG).toBeCloseTo(135, 9);
    const far = createTilt();
    far.orient(UPRIGHT, 0, 0);
    expect(far.orient({ ...UPRIGHT, alpha: 160 }, 0, 1 / 60).yaw).toBeCloseTo(TILT.maxYaw, 2); // less one frame of the recentre
    const round = createTilt();
    round.orient(UPRIGHT, 0, 0);
    expect(round.orient({ ...UPRIGHT, alpha: -120 }, 0, 1 / 60).yaw / DEG).toBeCloseTo(-120, 0);
  });

  test('past the range the baseline is dragged along, so tilting back answers at once', () => {
    const tilt = createTilt();
    tilt.orient(UPRIGHT, 0, 0);
    tilt.orient({ ...UPRIGHT, alpha: 170 }, 0, 1 / 60); // 35 degrees past the leash of 135
    const back = tilt.orient({ ...UPRIGHT, alpha: 165 }, 0, 2 / 60);
    expect(back.yaw / DEG).toBeCloseTo(TILT.maxYaw / DEG - TILT.yawGain * 5, 0);
    // Without the leash 165 degrees would still be far past the range.
    expect(back.yaw).toBeLessThan(TILT.maxYaw - 2 * DEG);
  });

  test('a new way of holding the phone becomes straight ahead again, slowly', () => {
    const tilt = createTilt();
    tilt.orient(HELD, 0, 0);
    const tilted = { ...HELD, gamma: 10 };
    const first = tilt.orient(tilted, 0, 1 / 60).yaw;
    const soon = hold(tilt, tilted, 1, 2 / 60).yaw;
    expect(soon).toBeGreaterThan(first * 0.9); // a second later the look has barely moved
    const later = hold(tilt, tilted, 150, 2).yaw;
    expect(Math.abs(later)).toBeLessThan(0.02 * first);
  });

  test('recentre makes the next orientation straight ahead', () => {
    const tilt = createTilt();
    tilt.orient(HELD, 0, 0);
    expect(tilt.orient({ ...HELD, gamma: 10 }, 0, 1 / 60).yaw).toBeGreaterThan(0.05);
    tilt.recentre();
    expect(tilt.look).toEqual({ yaw: 0, pitch: 0 });
    expect(tilt.orient({ ...HELD, gamma: 10 }, 0, 2 / 60).yaw).toBeCloseTo(0, 9);
  });

  test('an upright phone gives no jump: a small turn is a small change of the look, whatever the angles do', () => {
    // At beta 90 the specification's alpha and gamma turn about the same axis. A phone turned 4 degrees about the
    // vertical may report it as alpha or as gamma, and gamma wraps at 90.
    const tilt = createTilt();
    tilt.orient({ alpha: 0, beta: 90, gamma: 0 }, 0, 0);
    const byGamma = tilt.orient({ alpha: 0, beta: 90, gamma: 4 }, 0, 1 / 60).yaw;
    const other = createTilt();
    other.orient({ alpha: 0, beta: 90, gamma: 0 }, 0, 0);
    const byAlpha = other.orient({ alpha: 4, beta: 90, gamma: 0 }, 0, 1 / 60).yaw;
    expect(byGamma / DEG).toBeCloseTo(TILT.yawGain * 4, 1);
    expect(byAlpha / DEG).toBeCloseTo(TILT.yawGain * 4, 1);
    // Past upright the angles flip (beta 95 is reported as alpha + 180, beta 85, gamma - 180 on some devices).
    const over = createTilt();
    over.orient({ alpha: 0, beta: 88, gamma: 0 }, 0, 0);
    const a = over.orient({ alpha: 0, beta: 92, gamma: 0 }, 0, 1 / 60);
    const same = createTilt();
    same.orient({ alpha: 0, beta: 88, gamma: 0 }, 0, 0);
    const b = same.orient({ alpha: 180, beta: 88, gamma: 180 }, 0, 1 / 60); // the same orientation, written the other way
    expect(b.pitch).toBeCloseTo(a.pitch, 6);
    expect(b.yaw).toBeCloseTo(a.yaw, 6);
    expect(a.pitch / DEG).toBeCloseTo(TILT.gain * 4, 1);
  });

  test('a sweep of the phone moves the look smoothly', () => {
    const tilt = createTilt();
    let previous = tilt.orient({ alpha: 0, beta: 70, gamma: -30 }, 0, 0);
    for (let i = 1; i <= 600; i++) {
      const look = tilt.orient({ alpha: 20 * Math.sin(i / 90), beta: 70 + 25 * Math.sin(i / 50), gamma: -30 + 60 * (i / 600) }, 0, i / 60);
      expect(Math.abs(look.yaw - previous.yaw)).toBeLessThan(0.6 * DEG * TILT.yawGain / TILT.gain);
      expect(Math.abs(look.pitch - previous.pitch)).toBeLessThan(0.6 * DEG);
      previous = look;
    }
  });

  test('events without angles are ignored (a device with no sensor), and a missing alpha counts as zero', () => {
    const tilt = createTilt();
    expect(tilt.orient({ alpha: null, beta: null, gamma: null })).toEqual({ yaw: 0, pitch: 0 });
    expect(tilt.orient(undefined)).toEqual({ yaw: 0, pitch: 0 });
    expect(tilt.active).toBe(false);
    tilt.orient({ alpha: null, beta: 50, gamma: 0 }, 0, 0);
    expect(tilt.orient({ alpha: null, beta: 50, gamma: 10 }, 0, 1 / 60).yaw / DEG).toBeCloseTo(TILT.yawGain * 10, 1);
  });

  test('in landscape the screen\'s axes are the phone\'s, turned', () => {
    // Screen angle 90: the screen's horizontal axis is the phone's long axis. A turn about the phone's x axis (beta)
    // is then a turn about the screen's vertical, and a turn about the long axis (gamma) is a pitch.
    const flat = { alpha: 0, beta: 0, gamma: 0 };
    const yaw = createTilt();
    yaw.orient(flat, 90, 0);
    const a = yaw.orient({ ...flat, beta: 10 }, 90, 1 / 60);
    expect(a.yaw / DEG).toBeCloseTo(TILT.yawGain * 10, 1);
    expect(a.pitch).toBeCloseTo(0, 6);
    const pitch = createTilt();
    pitch.orient(flat, 90, 0);
    const b = pitch.orient({ ...flat, gamma: 10 }, 90, 1 / 60);
    expect(b.pitch / DEG).toBeCloseTo(-TILT.gain * 10, 1);
    expect(b.yaw).toBeCloseTo(0, 6);
  });

  test('the quaternion is the specification\'s: a unit, and one angle is one axis', () => {
    const q = orientationQuaternion({ alpha: 40, beta: -20, gamma: 65 });
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
    expect(orientationQuaternion({ alpha: 0, beta: 90, gamma: 0 })).toEqual([Math.cos(Math.PI / 4), Math.sin(Math.PI / 4), 0, 0]);
    const z = orientationQuaternion({ alpha: 90, beta: 0, gamma: 0 });
    expect([z[1], z[2]]).toEqual([0, 0]);
    expect(z[3]).toBeCloseTo(Math.sin(Math.PI / 4), 12);
  });
});

describe('the browser', () => {
  test('a browser without orientation events is unsupported; one that needs no asking is granted', async () => {
    expect(await requestTiltPermission({})).toBe('unsupported');
    expect(await requestTiltPermission({ DeviceOrientationEvent: function DeviceOrientationEvent() {} })).toBe('granted');
    expect(tiltNeedsAsking({})).toBe(false);
  });

  test('iOS Safari is asked, and its answer, a rejection or a throw is reported', async () => {
    const scope = (requestPermission) => ({ DeviceOrientationEvent: { requestPermission } });
    const yes = vi.fn(async () => 'granted');
    expect(tiltNeedsAsking(scope(yes))).toBe(true);
    expect(await requestTiltPermission(scope(yes))).toBe('granted');
    expect(yes).toHaveBeenCalledOnce();
    expect(await requestTiltPermission(scope(async () => 'denied'))).toBe('denied');
    expect(await requestTiltPermission(scope(async () => 'prompt'))).toBe('unknown'); // headless Chromium's answer
    expect(await requestTiltPermission(scope(async () => { throw new Error('NotAllowedError'); }))).toBe('denied');
    expect(await requestTiltPermission(scope(() => { throw new Error('no gesture'); }))).toBe('denied');
  });

  test('the screen angle comes from screen.orientation, else window.orientation, else zero', () => {
    expect(screenAngle({ screen: { orientation: { angle: 90 } }, orientation: 0 })).toBe(90);
    expect(screenAngle({ orientation: -90 })).toBe(-90);
    expect(screenAngle({})).toBe(0);
  });
});
