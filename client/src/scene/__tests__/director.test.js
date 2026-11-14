// @vitest-environment node
// Round 115: the camera director. States join without a jump, the walk stays on the route at eye height, the camera
// never looks at itself, and the overview holds the whole route at phone and desktop shapes.
import { describe, expect, test } from 'vitest';
import { taProhmHeightAt } from '@parallang/aesthetic';
import { DUNGEON } from '../../dungeon.js';
import { DURATIONS, EYE, STANDOFF, WALK_SPEED, blendPoses, createDirector, measureRoute, walkFraction } from '../director.js';
import { dockInsets, freeRect } from '../insets.js';

const FRAME = 1 / 30;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const director = (options = {}) => createDirector({ dungeon: DUNGEON, heightAt: taProhmHeightAt, ...options });
const lastSite = DUNGEON.sites.length - 1;

// Runs the current state for `seconds`, checking every frame.
function run(d, seconds, check = () => {}) {
  let previous = d.pose;
  for (let t = 0; t < seconds; t += FRAME) {
    const pose = d.update(FRAME);
    check(pose, previous, d);
    previous = pose;
  }
}

function distanceToRoute([x, , z], route) {
  let best = Infinity;
  for (let i = 1; i < route.points.length; i++) {
    const [ax, az] = route.points[i - 1];
    const [bx, bz] = route.points[i];
    const length2 = (bx - ax) ** 2 + (bz - az) ** 2;
    const u = Math.min(1, Math.max(0, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / length2));
    best = Math.min(best, Math.hypot(x - (ax + (bx - ax) * u), z - (az + (bz - az) * u)));
  }
  return best;
}

// Where a world point falls in the camera's view, as tangents of the horizontal and vertical angles off its axis.
function viewTangents(pose, point) {
  const forward = pose.target.map((v, i) => v - pose.position[i]);
  const length = Math.hypot(...forward);
  const f = forward.map((v) => v / length);
  const right = [-f[2], 0, f[0]].map((v, _i, all) => v / Math.hypot(all[0], all[2])); // forward x up
  const up = [right[1] * f[2] - right[2] * f[1], right[2] * f[0] - right[0] * f[2], right[0] * f[1] - right[1] * f[0]];
  const rel = point.map((v, i) => v - pose.position[i]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return { x: dot(rel, right) / dot(rel, f), y: dot(rel, up) / dot(rel, f), depth: dot(rel, f) };
}

describe('the route', () => {
  test('is measured by arc length and every site stands on it, in order', () => {
    const route = measureRoute(DUNGEON);
    expect(route.siteS.length).toBe(3);
    expect(route.siteS[0]).toBeLessThan(route.siteS[1]);
    expect(route.siteS[1]).toBeLessThan(route.siteS[2]);
    expect(route.siteS[2]).toBeCloseTo(route.total, 9);
    DUNGEON.sites.forEach((site, index) => expect(route.pointAt(route.siteS[index])).toEqual(site.at));
    expect(route.pointAt(-5)).toEqual(DUNGEON.route[0]);
    expect(() => measureRoute({ sites: [{ at: [9, 9] }], route: [[0, 0], [1, 1]] })).toThrow(/not on the route/);
  });

  test('a walk ramps up, holds a steady pace and ramps down', () => {
    expect(walkFraction(0, 10)).toBe(0);
    expect(walkFraction(10, 10)).toBe(1);
    let previous = 0;
    for (let t = 0; t <= 10; t += 0.05) {
      const now = walkFraction(t, 10);
      expect(now).toBeGreaterThanOrEqual(previous);
      expect(now - previous).toBeLessThan(0.05 / (10 - DURATIONS.ramp) + 1e-9); // never faster than the steady pace
      previous = now;
    }
    expect(walkFraction(5, 10)).toBeCloseTo(0.5, 9);
    expect(walkFraction(1, 2)).toBeCloseTo(0.5, 9); // a short walk is all ramp
  });
});

describe('the five states', () => {
  test('each state starts at the pose the camera holds, also when it interrupts a transition', () => {
    const d = director();
    const steps = [
      () => d.attract(), () => d.overview(), () => d.approach(0), () => d.walk(0, 1), () => d.walk(1, 2), () => d.victory(),
      () => d.overview(), () => d.approach(1), () => d.attract(),
    ];
    steps.forEach((begin, index) => {
      const before = d.pose;
      begin();
      if (before) {
        expect(distance(d.pose.position, before.position)).toBeLessThan(1e-9);
        expect(distance(d.pose.target, before.target)).toBeLessThan(1e-9);
      }
      // Odd steps are cut short, so the next state starts mid-transition.
      run(d, index % 2 ? 0.7 : d.arrival + 1.5);
    });
  });

  test('a whole playthrough has no jump and the camera never looks at itself', () => {
    const d = director();
    const check = (pose, previous) => {
      expect(distance(pose.position, previous.position)).toBeLessThan(6); // 180 m/s, the fastest crane shot
      expect(distance(pose.position, pose.target)).toBeGreaterThan(1.5);
      expect(pose.position[1]).toBeGreaterThan(taProhmHeightAt(pose.position[0], pose.position[2]) + 1.3);
      for (const value of [...pose.position, ...pose.target]) expect(Number.isFinite(value)).toBe(true);
    };
    d.attract(); run(d, 8, check);
    d.overview(); run(d, 5, check);
    d.approach(0); run(d, 8, check);
    d.walk(0, 1); run(d, d.arrival + 4, check);
    d.walk(1, 2); run(d, d.arrival + 4, check);
    d.victory(); run(d, 9, check);
  });

  test('the walk keeps to the route at eye height and at walking pace, and stops before its site looking at it', () => {
    const d = director();
    d.approach(0);
    run(d, d.arrival + 2);
    for (const [from, to] of [[0, 1], [1, 2]]) {
      d.walk(from, to);
      expect(d.arrived).toBe(false);
      const travelled = [];
      run(d, d.arrival + 1, (pose, previous) => {
        if (d.stage !== 'travel') return;
        travelled.push(pose);
        expect(distanceToRoute(pose.position, d.route)).toBeLessThan(1e-6);
        expect(pose.position[1] - taProhmHeightAt(pose.position[0], pose.position[2])).toBeCloseTo(EYE, 9);
        expect(Math.hypot(pose.position[0] - previous.position[0], pose.position[2] - previous.position[2])).toBeLessThan(WALK_SPEED * FRAME * 1.05 + 1e-6);
        expect(distance(pose.position, pose.target)).toBeGreaterThan(STANDOFF * 0.5); // around a corner the chord is shorter
      });
      expect(travelled.length).toBeGreaterThan(60);
      expect(d.arrived).toBe(true);
      const hold = d.peek(d.arrival);
      const site = DUNGEON.sites[to].at;
      expect(Math.hypot(hold.target[0] - site[0], hold.target[2] - site[1])).toBeLessThan(1e-6);
      expect(Math.hypot(hold.position[0] - site[0], hold.position[2] - site[1])).toBeLessThanOrEqual(STANDOFF + 1e-6);
      expect(Math.hypot(hold.position[0] - site[0], hold.position[2] - site[1])).toBeGreaterThan(STANDOFF * 0.5); // site 3's last leg turns a corner
    }
  });

  test('an approach ends on the route looking at the site: the first from a few metres up, the later ones at eye height', () => {
    for (let index = 0; index <= lastSite; index++) {
      const d = director();
      d.overview();
      run(d, 4);
      d.approach(index);
      expect(d.site).toBe(index);
      run(d, d.arrival + 0.01);
      expect(d.arrived).toBe(true);
      const pose = d.peek(DURATIONS.approach);
      const site = DUNGEON.sites[index].at;
      expect(Math.hypot(pose.target[0] - site[0], pose.target[2] - site[1])).toBeLessThan(1e-6);
      expect(distanceToRoute(pose.position, d.route)).toBeLessThan(1e-6);
      if (index === 0) {
        expect(pose.position[1]).toBeGreaterThan(EYE + 1.5);
        expect(pose.position[1]).toBeLessThan(EYE + 5);
      } else {
        expect(pose.position[1]).toBeCloseTo(EYE, 9);
        // Where a walk to this site ends, so a reload and a walk leave the camera in the same place.
        const walked = director();
        walked.walk(index - 1, index);
        expect(distance(walked.peek(walked.arrival).position, pose.position)).toBeLessThan(1e-6);
      }
    }
  });

  test('the overview is top-down with east at the foot of the screen, and holds the whole route in the free area', () => {
    const shapes = [
      { aspect: 390 / 844, scale: 1 }, // a phone, nothing covered
      { aspect: 390 / (844 * 0.55), scale: 0.55 }, // a phone with the route card over the lower part
      { aspect: 1440 / 900, scale: 1 },
      { aspect: 1000 / 844, scale: 844 / 900 }, // a desktop with the top bar
    ];
    for (const shape of shapes) {
      const d = director();
      d.setView(shape);
      d.overview();
      const pose = d.pose;
      const half = Math.atan(Math.tan(Math.PI / 6) * shape.scale);
      const [limitX, limitY] = [Math.tan(half) * shape.aspect, Math.tan(half)];
      expect(pose.position[1]).toBeGreaterThan(60);
      const entrance = viewTangents(pose, [DUNGEON.route[0][0], 0, DUNGEON.route[0][1]]);
      const sanctuary = viewTangents(pose, [DUNGEON.sites[lastSite].at[0], 0, DUNGEON.sites[lastSite].at[1]]);
      expect(entrance.y).toBeLessThan(sanctuary.y); // the entrance is lower on the screen
      for (const [x, z] of DUNGEON.route) {
        const seen = viewTangents(pose, [x, 0, z]);
        expect(seen.depth).toBeGreaterThan(0);
        expect(Math.abs(seen.x)).toBeLessThan(limitX);
        expect(Math.abs(seen.y)).toBeLessThan(limitY);
      }
    }
  });

  test('the orbit turns once in 100 s at the isometric pitch, and a narrow view stands further back', () => {
    const d = director();
    d.attract();
    const start = d.pose;
    const pitch = Math.asin((start.position[1] - start.target[1]) / distance(start.position, start.target));
    expect(pitch).toBeCloseTo(0.62, 6);
    d.update(50);
    expect(distance(d.pose.position, start.position)).toBeGreaterThan(100);
    d.update(50);
    expect(distance(d.pose.position, start.position)).toBeLessThan(1e-6);
    const wide = distance(start.position, start.target);
    d.setView({ aspect: 390 / 844 });
    d.update(0);
    expect(distance(d.pose.position, d.pose.target)).toBeGreaterThan(wide * 1.8);
  });

  test('skip jumps to the hold (reduced motion)', () => {
    const d = director();
    d.overview();
    d.walk(0, 1);
    expect(d.arrived).toBe(false);
    d.skip();
    expect(d.arrived).toBe(true);
    expect(d.stage).toBe('hold');
  });

  test('blending two poses ends on each of them', () => {
    const a = { position: [0, 100, 10], target: [0, 0, 0] };
    const b = { position: [5, 3, 60], target: [3, 1, 63] };
    expect(blendPoses(a, b, 0)).toEqual(a);
    expect(blendPoses(a, b, 1)).toEqual(b);
    const mid = blendPoses(a, b, 0.5);
    expect(mid.position[1]).toBeGreaterThan(3);
    expect(mid.position[1]).toBeLessThan(100);
  });
});

describe('the free area', () => {
  test('a bottom sheet covers the bottom, a tall side panel covers its side, and the top bar the top', () => {
    expect(dockInsets({ left: 0, right: 390, top: 320, width: 390, height: 524 }, 390, 844, 56)).toEqual({ top: 56, right: 0, bottom: 524, left: 0 });
    expect(dockInsets({ left: 1000, right: 1440, top: 0, width: 440, height: 900 }, 1440, 900, 56)).toEqual({ top: 56, right: 440, bottom: 0, left: 0 });
    expect(dockInsets({ left: 440, right: 1000, top: 640, width: 560, height: 228 }, 1440, 900, 56)).toEqual({ top: 56, right: 0, bottom: 260, left: 0 });
    expect(dockInsets(undefined, 390, 844, 56)).toEqual({ top: 56, right: 0, bottom: 0, left: 0 });
    expect(dockInsets({ left: 0, right: 0, top: 0, width: 0, height: 0 }, 390, 844)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  test('the free area is centred between the insets and never collapses', () => {
    expect(freeRect({ top: 56, right: 0, bottom: 524, left: 0 }, 390, 844)).toEqual({ width: 390, height: 264, centreX: 195, centreY: 188 });
    expect(freeRect({ top: 56, right: 440, bottom: 0, left: 0 }, 1440, 900)).toEqual({ width: 1000, height: 844, centreX: 500, centreY: 478 });
    const squeezed = freeRect({ top: 100, right: 0, bottom: 800, left: 0 }, 390, 844);
    expect(squeezed.height).toBeCloseTo(844 * 0.3, 6);
    expect(squeezed.centreY).toBeLessThan(844 / 2);
  });
});
