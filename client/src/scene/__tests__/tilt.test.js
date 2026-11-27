// @vitest-environment node
// Round 125: tilt to look. Round 199: the free look (the phone's back is the camera's line of sight), on the road and,
// from round 200, in the legacy dungeons; round 125's small tilt was removed with round 200.
import { describe, expect, test, vi } from 'vitest';
import { FREE_LOOK, backDirection, createFreeLook, orientationQuaternion, requestTiltPermission, screenAngle, tiltNeedsAsking, turnSight } from '../tilt.js';

const DEG = Math.PI / 180;

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

// Round 199: the road's free look. The phone's back is the camera's line of sight, turned from where it pointed on
// arrival: 135 degrees to either side, and all the way up and down.
describe('the free look', () => {
  const UPRIGHT = { alpha: 0, beta: 90, gamma: 0 }; // held up in front, looking north
  const near = (a, b, digits = 3) => expect(a).toBeCloseTo(b, digits);

  test('the phone\'s back is where it looks: flat on a table it looks down, upright it looks ahead', () => {
    const down = backDirection(orientationQuaternion({ alpha: 0, beta: 0, gamma: 0 }));
    near(down[2], -1);
    const ahead = backDirection(orientationQuaternion(UPRIGHT));
    near(ahead[1], 1);
    near(ahead[2], 0);
  });

  test('turning on the spot looks round, by as much as the phone turns, left to the left', () => {
    const look = createFreeLook();
    look.orient(UPRIGHT);
    near(look.look.yaw, 0);
    near(look.orient({ ...UPRIGHT, alpha: 90 }).yaw, 90 * DEG); // a quarter turn to the left
    near(look.orient({ ...UPRIGHT, alpha: -90 }).yaw, -90 * DEG);
    near(look.orient({ ...UPRIGHT, alpha: 130 }).yaw, 130 * DEG);
    near(look.orient({ ...UPRIGHT, alpha: 130 }).pitch, 0);
  });

  test('270 degrees in all: past 135 the look stops, and turning back answers at once', () => {
    const look = createFreeLook();
    look.orient(UPRIGHT);
    near(look.orient({ ...UPRIGHT, alpha: 160 }).yaw, FREE_LOOK.maxYaw);
    near(look.orient({ ...UPRIGHT, alpha: 170 }).yaw, FREE_LOOK.maxYaw);
    near(look.orient({ ...UPRIGHT, alpha: 150 }).yaw, FREE_LOOK.maxYaw - 20 * DEG);
  });

  test('up and down it follows the phone all the way: top towards the player looks up', () => {
    const look = createFreeLook();
    look.orient(UPRIGHT);
    near(look.orient({ ...UPRIGHT, beta: 120 }).pitch, 30 * DEG);
    near(look.orient({ ...UPRIGHT, beta: 60 }).pitch, -30 * DEG);
    near(look.orient({ alpha: 0, beta: 179.9, gamma: 0 }).pitch, 90 * DEG, 2); // straight up
    // A phone held low, as in the hand, is "straight ahead" too: the pitch is from where it pointed on arrival.
    const held = createFreeLook();
    held.orient({ alpha: 0, beta: 50, gamma: 0 });
    near(held.orient({ alpha: 0, beta: 140, gamma: 0 }).pitch, 90 * DEG);
    near(held.orient({ alpha: 0, beta: 0, gamma: 0 }).pitch, -50 * DEG);
  });

  test('looking straight up or down keeps the yaw it had; it does not drift back while held', () => {
    const look = createFreeLook();
    look.orient(UPRIGHT);
    look.orient({ ...UPRIGHT, alpha: 60 });
    near(look.orient({ alpha: 200, beta: 179, gamma: 0 }).yaw, 60 * DEG); // at the sky the heading means nothing
    for (let i = 0; i < 600; i++) look.orient({ ...UPRIGHT, alpha: 60 });
    near(look.look.yaw, 60 * DEG);
    look.recentre();
    near(look.orient({ ...UPRIGHT, alpha: 60 }).yaw, 0);
  });

  test('a sideways turn with the phone held in landscape is a sideways turn', () => {
    const look = createFreeLook();
    const LANDSCAPE = { alpha: 0, beta: 0, gamma: -90 }; // turned on its side, screen to the player
    look.orient(LANDSCAPE);
    near(look.orient({ ...LANDSCAPE, alpha: 45 }).yaw, 45 * DEG);
    near(look.look.pitch, 0);
  });
});

// Round 200: the one turn of the line of sight both levels use.
describe('the turn of the sight', () => {
  const rise = ({ position, target }) => Math.asin((target[1] - position[1]) / Math.hypot(target[0] - position[0], target[1] - position[1], target[2] - position[2]));
  const pose = { position: [0, 2, 0], target: [0, 1.5, 6] }; // a little below the horizon, as at a hold
  test('a quarter turn up or down is (nearly) straight up or down from any sight, and the position stays', () => {
    expect(rise(turnSight(pose, 0, Math.PI / 2))).toBeCloseTo(FREE_LOOK.sightMax, 6);
    expect(rise(turnSight(pose, 0, -Math.PI / 2))).toBeCloseTo(-FREE_LOOK.sightMax, 6);
    expect(turnSight(pose, 1, 1).position).toBe(pose.position);
    expect(turnSight(pose, 0, 0)).toEqual(pose);
  });
  test('a small turn is close to its angle; sideways it is exact and keeps the distance', () => {
    expect(rise(turnSight(pose, 0, 0.1)) - rise(pose)).toBeCloseTo(0.1, 1);
    const turned = turnSight(pose, 0.5, 0);
    expect(Math.atan2(turned.target[0], turned.target[2] - 0)).toBeCloseTo(0.5, 6);
    expect(Math.hypot(turned.target[0], turned.target[1] - 2, turned.target[2])).toBeCloseTo(Math.hypot(0, -0.5, 6), 6);
  });
});
