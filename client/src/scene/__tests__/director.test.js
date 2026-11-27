// @vitest-environment node
// Round 115: the camera director. States join without a jump, a walk stays on its path at eye height, the camera
// never looks at itself, and the overview holds the whole map at phone and desktop shapes.
// Round 119: the dungeon is a map. Every path is walked in both directions, from every way the camera can have come,
// and the camera is never inside a wall of the level's plan.
import { describe, expect, test } from 'vitest';
import { taProhmHeightAt } from '@parallang/aesthetic';
import { DUNGEON } from '../../dungeon.js';
import { routePoints } from '../director.js';
import { CLEAR, DURATIONS, ENGAGE_MAX, EYE, LOOK_MAX, STANDOFF, WALK_SPEED, arrivalPoints, blendPoses, createDirector, dropPoses, measurePath, pathPoints, turnPoses, walkFraction } from '../director.js';
import { blocked } from '../../__tests__/taProhmPlan.js';
import { dockInsets, freeRect } from '../insets.js';

const FRAME = 1 / 30;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const director = (options = {}) => createDirector({ dungeon: DUNGEON, heightAt: taProhmHeightAt, ...options });
const lastSite = DUNGEON.sites.length - 1;
const siteIndex = (id) => DUNGEON.sites.findIndex((site) => site.id === id);
// Every path as a pair of site indices, and each site's neighbours.
const PAIRS = DUNGEON.paths.map(({ between }) => between.map(siteIndex));
const neighbours = (index) => PAIRS.flatMap(([a, b]) => (a === index ? [b] : b === index ? [a] : []));
// The sites a run passes on its way to each site, from the start.
const WAY = [[0], [0, 1], [0, 2], [0, 2, 3], [0, 2, 3, 4], [0, 2, 5], [0, 2, 5, 6]];

// Runs the current state for `seconds`, checking every frame.
function run(d, seconds, check = () => {}) {
  let previous = d.pose;
  for (let t = 0; t < seconds; t += FRAME) {
    const pose = d.update(FRAME);
    check(pose, previous, d);
    previous = pose;
  }
}

const distanceToPath = ([x, , z], points) => measurePath(points).nearest([x, z]).distance;

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

describe('the paths', () => {
  test('a path is measured by arc length and is walked in either direction', () => {
    const path = measurePath([[0, 0], [3, 4], [3, 10]]);
    expect(path.total).toBe(11);
    expect(path.pointAt(5)).toEqual([3, 4]);
    expect(path.pointAt(-5)).toEqual([0, 0]);
    expect(path.pointAt(99)).toEqual([3, 10]);
    expect(path.nearest([5, 7])).toEqual({ s: 8, distance: 2 });
    for (const [a, b] of PAIRS) {
      const there = pathPoints(DUNGEON, a, b);
      expect(there[0]).toEqual(DUNGEON.sites[a].at);
      expect(there.at(-1)).toEqual(DUNGEON.sites[b].at);
      expect(pathPoints(DUNGEON, b, a)).toEqual([...there].reverse());
    }
    expect(pathPoints(DUNGEON, siteIndex('face_gate'), siteIndex('library'))).toBeNull(); // no path joins them
    expect(pathPoints(DUNGEON, 0, 99)).toBeNull();
  });

  test('an approach comes in on the entrance at the start site, and on the first path listed for any other', () => {
    expect(arrivalPoints(DUNGEON, 0)).toEqual([...DUNGEON.entrance, DUNGEON.sites[0].at]);
    expect(arrivalPoints(DUNGEON, siteIndex('root_court'))).toEqual(pathPoints(DUNGEON, 0, siteIndex('root_court')));
    expect(arrivalPoints(DUNGEON, siteIndex('library'))).toEqual(pathPoints(DUNGEON, siteIndex('sunlit_court'), siteIndex('library')));
    expect(arrivalPoints(DUNGEON, siteIndex('sanctuary'))).toEqual(pathPoints(DUNGEON, siteIndex('before_sanctuary'), siteIndex('sanctuary')));
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
      () => d.attract(), () => d.overview(), () => d.approach(0), () => d.walk(0, 2), () => d.walk(2, 5), () => d.victory(),
      () => d.overview(), () => d.approach(3), () => d.walk(3, 4), () => d.walk(4, 3), () => d.attract(),
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
    // Every site, with a way back through the Sunlit Court, and a look at the map in the middle.
    for (const [from, to] of [[0, 1], [1, 2], [2, 3], [3, 4], [4, 3]]) { d.walk(from, to); run(d, d.arrival + 4, check); }
    d.overview(); run(d, 5, check);
    d.walk(3, 5); run(d, d.arrival + 4, check); // from the map, down to a walk
    d.walk(5, 6); run(d, d.arrival + 4, check);
    d.victory(); run(d, 9, check);
  });

  test('every walk keeps to its path at eye height and at walking pace, and stops before its site looking at it', () => {
    for (const [from, to] of [...PAIRS, ...PAIRS.map(([a, b]) => [b, a])]) {
      const name = `${DUNGEON.sites[from].id} to ${DUNGEON.sites[to].id}`;
      const points = pathPoints(DUNGEON, from, to);
      const d = director();
      d.approach(from);
      run(d, d.arrival + 2);
      d.walk(from, to);
      expect(d.arrived, name).toBe(false);
      const travelled = [];
      run(d, d.arrival + 1, (pose, previous) => {
        if (d.stage !== 'travel') return;
        travelled.push(pose);
        expect(distanceToPath(pose.position, points), name).toBeLessThan(1e-6);
        expect(pose.position[1] - taProhmHeightAt(pose.position[0], pose.position[2])).toBeCloseTo(EYE, 9);
        expect(Math.hypot(pose.position[0] - previous.position[0], pose.position[2] - previous.position[2]), name).toBeLessThan(WALK_SPEED * FRAME * 1.05 + 1e-6);
        expect(distance(pose.position, pose.target), name).toBeGreaterThan(STANDOFF * 0.5); // around a corner the chord is shorter
      });
      expect(travelled.length, name).toBeGreaterThan(55);
      expect(d.arrived, name).toBe(true);
      const hold = d.peek(d.arrival);
      const site = DUNGEON.sites[to].at;
      expect(Math.hypot(hold.target[0] - site[0], hold.target[2] - site[1]), name).toBeLessThan(1e-6);
      expect(Math.hypot(hold.position[0] - site[0], hold.position[2] - site[1]), name).toBeLessThanOrEqual(STANDOFF + 1e-6);
      expect(Math.hypot(hold.position[0] - site[0], hold.position[2] - site[1]), name).toBeGreaterThan(STANDOFF * 0.5); // a last leg may turn a corner
    }
  });

  // Round 119: the camera comes to a site by one path and leaves by any, the same one included. Through the turn at
  // the start, the walk and the hold it is never inside a wall, a pier or the sanctuary.
  test('whichever way the camera came and whichever way it goes, it never passes through stone', () => {
    let walks = 0;
    const clear = (name) => (pose) => expect(blocked(pose.position[0], pose.position[2]), `${name}: the camera at [${pose.position[0].toFixed(2)}, ${pose.position[2].toFixed(2)}]`).toBeNull();
    for (let at = 0; at <= lastSite; at++) {
      // By an approach (a reload, or down from the map), and by a walk from each neighbour.
      for (const cameFrom of [null, ...neighbours(at)]) {
        for (const goesTo of neighbours(at)) {
          const name = `${cameFrom === null ? 'an approach' : DUNGEON.sites[cameFrom].id} to ${DUNGEON.sites[at].id} to ${DUNGEON.sites[goesTo].id}`;
          const d = director();
          if (cameFrom === null) d.approach(at); else { d.approach(cameFrom); run(d, d.arrival + 0.5); d.walk(cameFrom, at); }
          run(d, d.arrival + 0.5, clear(name));
          d.engage(1); // the conversation has stepped the camera in as far as it goes
          run(d, 4, clear(name));
          d.walk(at, goesTo);
          run(d, d.arrival + 3, (pose, previous) => {
            clear(name)(pose);
            expect(distance(pose.position, previous.position), name).toBeLessThan(0.35); // no swing: 10 m/s at the very most
            expect(distance(pose.position, pose.target), name).toBeGreaterThan(1.5);
          });
          walks += 1;
        }
      }
    }
    expect(walks).toBe(60); // 16 directed paths after an approach, 44 after a walk
  });

  test('a walk back the way the camera came starts where it stands, with a turn on the spot', () => {
    const d = director();
    d.approach(0);
    run(d, d.arrival + 0.5);
    d.walk(0, 2);
    run(d, d.arrival + 2);
    const held = d.pose;
    d.walk(2, 0);
    const moves = [];
    run(d, DURATIONS.descend - FRAME, (pose) => { if (d.stage === 'transition') moves.push(distance(pose.position, held.position)); });
    expect(moves.length).toBeGreaterThan(40);
    expect(Math.max(...moves)).toBeLessThan(0.6); // it turns; the drift it stood in is all it sheds
    expect(d.arrival).toBeLessThan(DURATIONS.descend + (measurePath(pathPoints(DUNGEON, 2, 0)).total - STANDOFF) / WALK_SPEED + DURATIONS.ramp);
  });

  // Review 1 of round 119 (R1.2): from the map or the orbit down to a site, the camera comes down only over the
  // spot where it will stand. Below the height of the towers it is nowhere else, so it crosses no roof on the way.
  test('the way down from the sky comes down over the place the camera will stand, for an approach and for a walk from the map', () => {
    const TOWERS = 16;
    const shapes = [{ aspect: 390 / (844 * 0.45), scale: 0.45 }, { aspect: 1000 / 844, scale: 844 / 900 }];
    const descents = [];
    for (let to = 0; to <= lastSite; to++) {
      descents.push([`the map to ${DUNGEON.sites[to].id}`, (d) => d.overview(), (d) => d.approach(to)]);
      descents.push([`the orbit to ${DUNGEON.sites[to].id}`, (d) => d.attract(), (d) => d.approach(to)]);
    }
    for (const [from, to] of [...PAIRS, ...PAIRS.map(([a, b]) => [b, a])]) descents.push([`the map to the walk ${DUNGEON.sites[from].id} to ${DUNGEON.sites[to].id}`, (d) => d.overview(), (d) => d.walk(from, to)]);
    for (const shape of shapes) {
      for (const [name, above, down] of descents) {
        const d = director();
        d.setView(shape);
        above(d);
        run(d, 12.3); // the far state has settled; the orbit is somewhere on its round
        expect(d.pose.position[1], name).toBeGreaterThan(CLEAR);
        down(d);
        expect(d.peek(DURATIONS.approach - 0.05).stage, name).toBe('transition');
        const landing = d.peek(DURATIONS.approach).position;
        let low = 0;
        run(d, DURATIONS.approach, (pose, previous) => {
          if (d.stage !== 'transition') return; // the hold's drift is not the descent
          expect(pose.position[1], name).toBeLessThanOrEqual(previous.position[1] + 1e-9); // it only comes down
          expect(distance(pose.position, previous.position), name).toBeLessThan(15); // no jump: a phone's orbit stands far back, and from its far side the way down is 9 m a frame
          expect(distance(pose.position, pose.target), name).toBeGreaterThan(1.5);
          if (pose.position[1] >= TOWERS) return;
          low += 1;
          expect(Math.hypot(pose.position[0] - landing[0], pose.position[2] - landing[2]), `${name}: at ${pose.position[1].toFixed(1)} m`).toBeLessThan(0.5);
        });
        expect(low, name).toBeGreaterThan(5);
        expect(d.arrived || d.stage === 'travel', name).toBe(true);
      }
    }
  });

  test('a camera that starts below the roofs goes up before it crosses, and both ways down end on their poses', () => {
    const sky = { position: [-4, 120, 30], target: [-4, 0, 34] };
    const court = { position: [6, 1.6, 25.5], target: [6, 1.35, 21.5] };
    const gate = { position: [0.3, 1.6, 15.2], target: [0.3, 1.35, 11.2] };
    for (const [a, b] of [[sky, court], [gate, court]]) {
      expect(dropPoses(a, b, 0)).toEqual(a);
      expect(dropPoses(a, b, 1)).toEqual(b);
    }
    // From the sky the crossing is over when the camera is down to CLEAR.
    for (let u = 0; u <= 1; u += 0.01) {
      const pose = dropPoses(sky, court, u);
      if (pose.position[1] < CLEAR - 1e-6) expect(Math.hypot(pose.position[0] - 6, pose.position[2] - 25.5)).toBeLessThan(1e-6);
    }
    // From a gate passage (another tab moved the player): up where it stands, across at CLEAR, down where it will stand.
    for (let u = 0; u <= 1; u += 0.01) {
      const pose = dropPoses(gate, court, u);
      const moved = Math.hypot(pose.position[0] - 0.3, pose.position[2] - 15.2);
      const left = Math.hypot(pose.position[0] - 6, pose.position[2] - 25.5);
      if (pose.position[1] < CLEAR - 1e-6) expect(Math.min(moved, left)).toBeLessThan(1e-6);
    }
    expect(dropPoses(gate, court, 0.45).position[1]).toBe(CLEAR);
  });

  test('an approach ends on the way in looking at the site: the start site from a few metres up, the others at eye height', () => {
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
      expect(distanceToPath(pose.position, arrivalPoints(DUNGEON, index))).toBeLessThan(1e-6);
      expect(blocked(pose.position[0], pose.position[2]), DUNGEON.sites[index].id).toBeNull();
      if (index === 0) {
        expect(pose.position[1]).toBeGreaterThan(EYE + 1.5);
        expect(pose.position[1]).toBeLessThan(EYE + 5);
      } else {
        expect(pose.position[1]).toBeCloseTo(EYE, 9);
        // Where a walk along that path ends, so a reload and a walk leave the camera in the same place.
        const from = siteIndex(DUNGEON.paths.find(({ between }) => between.includes(DUNGEON.sites[index].id)).between.find((id) => id !== DUNGEON.sites[index].id));
        const walked = director();
        walked.walk(from, index);
        expect(distance(walked.peek(walked.arrival).position, pose.position)).toBeLessThan(1e-6);
      }
    }
  });

  test('the overview is top-down with east at the foot of the screen, and holds every site and path in the free area', () => {
    const shapes = [
      { aspect: 390 / 844, scale: 1 }, // a phone, nothing covered
      { aspect: 390 / (844 * 0.45), scale: 0.45 }, // a phone with the map card over the lower part
      { aspect: 1440 / 900, scale: 1 },
      { aspect: 1000 / 844, scale: 844 / 900 }, // a desktop with the top bar
    ];
    const mapPoints = [...DUNGEON.sites.map((site) => site.at), ...DUNGEON.paths.flatMap(({ via }) => via)];
    for (const shape of shapes) {
      const d = director();
      d.setView(shape);
      d.overview();
      const pose = d.pose;
      const half = Math.atan(Math.tan(Math.PI / 6) * shape.scale);
      const [limitX, limitY] = [Math.tan(half) * shape.aspect, Math.tan(half)];
      expect(pose.position[1]).toBeGreaterThan(40);
      const gate = viewTangents(pose, [DUNGEON.sites[0].at[0], 0, DUNGEON.sites[0].at[1]]);
      const sanctuary = viewTangents(pose, [DUNGEON.sites[lastSite].at[0], 0, DUNGEON.sites[lastSite].at[1]]);
      expect(gate.y).toBeLessThan(sanctuary.y); // the gate, in the east, is lower on the screen
      for (const [x, z] of mapPoints) {
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

  test('a turn ends on each pose, goes in a straight line and keeps the camera off its own line of sight', () => {
    const a = { position: [0.3, 1.6, 15.2], target: [0.3, 1.35, 11.2] }; // in a gate passage, facing west
    const b = { position: [0.3, 1.6, 15.2], target: [0.3, 1.35, 19.2] }; // the same place, facing east
    expect(turnPoses(a, b, 0)).toEqual(a);
    expect(turnPoses(a, b, 1)).toEqual(b);
    for (let u = 0.05; u < 1; u += 0.05) {
      const pose = turnPoses(a, b, u);
      expect(distance(pose.position, a.position)).toBeLessThan(1e-9); // blendPoses would swing it 4 m to the side
      expect(distance(pose.position, pose.target)).toBeCloseTo(distance(a.position, a.target), 6);
    }
    const c = { position: [6, 1.6, 21.5], target: [2, 1.35, 22] };
    const mid = turnPoses(a, c, 0.5);
    expect(mid.position).toEqual([3.15, 1.6, 18.35]);
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

// Round 116: the conversation shapes the hold at a site.
describe('the camera follows the conversation', () => {
  const siteOf = (index) => DUNGEON.sites[index].at;
  const toSite = (pose, index) => Math.hypot(pose.position[0] - siteOf(index)[0], pose.position[2] - siteOf(index)[1]);
  // The distance from the camera's position to the line from `a` to the site, on the ground plan.
  const offLine = (pose, a, index) => {
    const [bx, bz] = siteOf(index);
    const [dx, dz] = [bx - a[0], bz - a[2]];
    return Math.abs((pose.position[0] - a[0]) * dz - (pose.position[2] - a[2]) * dx) / Math.hypot(dx, dz);
  };
  // To a site by a way a run gets there: an approach to the gate, then walks.
  function holdAt(index) {
    const d = director();
    d.approach(0);
    run(d, d.arrival + 0.1);
    WAY[index].slice(1).forEach((to, i) => { d.walk(WAY[index][i], to); run(d, d.arrival + 0.1); });
    return d;
  }

  test('each closed objective steps the camera in along the line to the site, smoothly and never too near', () => {
    for (let index = 0; index <= lastSite; index++) {
      const d = holdAt(index);
      const rest = d.pose;
      const start = toSite(rest, index);
      let previous = start;
      for (const level of [0.35, 0.7, 1]) {
        d.engage(level);
        run(d, 6, (pose, before) => {
          expect(distance(pose.position, before.position)).toBeLessThan(0.12); // 3.6 m/s at most, drift and all
          expect(offLine(pose, rest.position, index)).toBeLessThan(0.6); // the drift is the only sideways motion
        });
        // The step itself is exact; the hold's drift (up to 0.46 m) rides on it.
        const now = toSite(d.pose, index);
        expect(d.reaction.engaged).toBeCloseTo(level, 2);
        expect(Math.abs(now - start * (1 - ENGAGE_MAX * level))).toBeLessThan(0.5);
        previous = now;
      }
      expect(previous).toBeGreaterThan(2);
      expect(previous / start).toBeGreaterThan(1 - ENGAGE_MAX - 0.12);
      expect(previous / start).toBeLessThan(1 - ENGAGE_MAX + 0.12);
      d.engage(0); // Start over: the camera steps back out
      run(d, 8);
      expect(toSite(d.pose, index)).toBeGreaterThan(start - 0.6);
    }
  });

  test('a verdict is a brief push or pull that dies away', () => {
    const d = holdAt(1);
    const quiet = director();
    quiet.approach(0); run(quiet, quiet.arrival + 0.1); quiet.walk(0, 1); run(quiet, quiet.arrival + 0.1);
    const gap = () => { const [a, b] = [d.pose, quiet.pose]; return Math.hypot(a.position[0] - siteOf(1)[0], a.position[2] - siteOf(1)[1]) - Math.hypot(b.position[0] - siteOf(1)[0], b.position[2] - siteOf(1)[1]); };
    for (const [kind, sign] of [['pass', -1], ['fail', 1], ['resolved', -1]]) {
      d.beat(kind);
      let peak = 0;
      for (let t = 0; t < 0.6; t += FRAME) {
        const before = d.pose;
        d.update(FRAME); quiet.update(FRAME);
        expect(distance(d.pose.position, before.position)).toBeLessThan(0.08);
        if (Math.abs(gap()) > Math.abs(peak)) peak = gap();
      }
      expect(Math.sign(peak)).toBe(sign); // a pass comes nearer, a fail backs off
      expect(Math.abs(peak)).toBeGreaterThan(0.1);
      expect(Math.abs(peak)).toBeLessThan(0.4);
      for (let t = 0; t < 3; t += FRAME) { d.update(FRAME); quiet.update(FRAME); }
      expect(Math.abs(gap())).toBeLessThan(0.01);
    }
    d.beat('nonsense');
    d.update(FRAME); quiet.update(FRAME);
    expect(Math.abs(gap())).toBeLessThan(0.01);
  });

  // Round 119 (critique 1.4): the player picks the way on, so the camera does not turn to one.
  test('after a resolve the camera keeps looking at the site, and a walk starts from that pose without a jump', () => {
    for (let index = 0; index <= lastSite; index++) {
      const d = holdAt(index);
      d.engage(1);
      run(d, 5);
      const facing = d.pose;
      expect(Math.hypot(facing.target[0] - siteOf(index)[0], facing.target[2] - siteOf(index)[1])).toBeLessThan(0.3);
      run(d, 3, (pose) => expect(Math.hypot(pose.target[0] - siteOf(index)[0], pose.target[2] - siteOf(index)[1])).toBeLessThan(0.3));

      const before = d.pose;
      const to = neighbours(index)[0];
      d.walk(index, to);
      expect(distance(d.pose.position, before.position)).toBeLessThan(1e-9);
      expect(distance(d.pose.target, before.target)).toBeLessThan(1e-9);
      expect(d.reaction).toEqual({ level: 0, engaged: 0 }); // a new state starts unshaped
      run(d, d.arrival + 2, (pose, earlier) => expect(distance(pose.position, earlier.position)).toBeLessThan(0.35));
      expect(Math.hypot(d.pose.target[0] - siteOf(to)[0], d.pose.target[2] - siteOf(to)[1])).toBeLessThan(0.3);
    }
  });

  test('the far states are not shaped', () => {
    const d = director();
    d.overview();
    run(d, 4);
    const before = d.pose;
    d.engage(1).beat('pass');
    run(d, 3);
    expect(distance(d.pose.position, before.position)).toBeLessThan(1e-9);
    expect(distance(d.pose.target, before.target)).toBeLessThan(1e-9);
  });
});

// Round 125: tilt to look. The phone's tilt turns the line of sight at a hold at a site and nothing else.
describe('the look follows the phone', () => {
  const sight = ({ position, target }) => {
    const d = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
    return { yaw: Math.atan2(d[0], d[2]), pitch: Math.asin(d[1] / Math.hypot(...d)), distance: Math.hypot(...d) };
  };
  const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
  // Two directors on the same clock, one with a look: at a hold at `index`, arrived by an approach.
  function pair(index, look) {
    const [plain, tilted] = [director(), director()];
    for (const d of [plain, tilted]) d.approach(index);
    tilted.look(look);
    return [plain, tilted];
  }
  const both = (plain, tilted, seconds, check = () => {}) => { for (let t = 0; t < seconds; t += FRAME) check(plain.update(FRAME), tilted.update(FRAME)); };

  test('with no look every pose is what it was', () => {
    const [plain, zero] = pair(2, { yaw: 0, pitch: 0 });
    both(plain, zero, DURATIONS.approach + 4, (a, b) => expect(b).toEqual(a));
    const never = director();
    never.approach(2);
    expect(never.looked).toEqual({ yaw: 0, pitch: 0 });
  });

  test('a look turns the sight to the left and up by its angles, and leaves the camera where it is', () => {
    for (let index = 0; index <= lastSite; index++) {
      const [plain, tilted] = pair(index, { yaw: 0.2, pitch: 0.1 });
      both(plain, tilted, DURATIONS.approach + 5, (a, b) => expect(b.position).toEqual(a.position));
      const [a, b] = [sight(plain.pose), sight(tilted.pose)];
      expect(wrap(b.yaw - a.yaw)).toBeCloseTo(0.2, 3);
      expect(b.pitch - a.pitch).toBeCloseTo(0.1, 3);
      expect(b.distance).toBeCloseTo(a.distance, 6);
    }
  });

  test('to the left is the left of the screen', () => {
    const [plain, tilted] = pair(2, { yaw: 0.2, pitch: 0 });
    both(plain, tilted, DURATIONS.approach + 5);
    const [a, b] = [plain.pose, tilted.pose];
    const forward = [a.target[0] - a.position[0], a.target[2] - a.position[2]];
    const right = [-forward[1], forward[0]]; // forward × up, on the ground plan
    const moved = [b.target[0] - a.target[0], b.target[2] - a.target[2]];
    expect(moved[0] * right[0] + moved[1] * right[1]).toBeLessThan(0);
  });

  test('the look is nothing on the way to a site and at the start of the hold, then fades in without a jump', () => {
    const [plain, tilted] = pair(3, { yaw: LOOK_MAX.yaw, pitch: -LOOK_MAX.pitch });
    both(plain, tilted, DURATIONS.approach - FRAME, (a, b) => expect(b).toEqual(a));
    let previous = sight(tilted.pose);
    both(plain, tilted, 4, (a, b) => {
      const now = sight(b);
      expect(Math.abs(wrap(now.yaw - previous.yaw))).toBeLessThan(0.03); // under a degree a second per degree of range
      expect(Math.abs(now.pitch - previous.pitch)).toBeLessThan(0.03);
      previous = now;
    });
    expect(wrap(sight(tilted.pose).yaw - sight(plain.pose).yaw)).toBeCloseTo(LOOK_MAX.yaw, 2);
  });

  test('the orbits, the map and a walk ignore the look', () => {
    for (const state of ['attract', 'overview', 'victory']) {
      const [plain, tilted] = [director(), director()];
      plain.approach(0); tilted.approach(0);
      plain.skip(); tilted.skip();
      tilted.look({ yaw: 0.2, pitch: 0.1 });
      plain[state](); tilted[state]();
      plain.skip(); tilted.skip();
      both(plain, tilted, 3, (a, b) => expect(b).toEqual(a));
    }
    const [plain, tilted] = [director(), director()];
    for (const d of [plain, tilted]) { d.approach(0); d.skip(); d.walk(0, 2); }
    tilted.look({ yaw: 0.2, pitch: 0.1 });
    both(plain, tilted, plain.arrival - FRAME, (a, b) => expect(b).toEqual(a));
  });

  test('a look is bounded, and junk is no look', () => {
    const d = director();
    d.approach(1);
    d.skip();
    d.look({ yaw: 9, pitch: -9 });
    run(d, 5);
    expect(d.looked.yaw).toBeCloseTo(LOOK_MAX.yaw, 4);
    expect(d.looked.pitch).toBeCloseTo(-LOOK_MAX.pitch, 4);
    for (const junk of [undefined, null, {}, { yaw: NaN, pitch: 'up' }]) {
      d.look(junk ?? undefined);
      run(d, 3);
      expect(d.looked.yaw).toBeCloseTo(0, 6);
      expect(d.looked.pitch).toBeCloseTo(0, 6);
    }
  });

  test('a new look is eased to, and taking the look away eases back', () => {
    const d = director();
    d.approach(2);
    d.skip();
    run(d, 3);
    let previous = sight(d.pose);
    const smooth = (pose) => {
      const now = sight(pose);
      expect(Math.abs(wrap(now.yaw - previous.yaw))).toBeLessThan(0.07);
      previous = now;
    };
    d.look({ yaw: LOOK_MAX.yaw });
    run(d, 1, smooth);
    expect(d.looked.yaw).toBeCloseTo(LOOK_MAX.yaw, 3);
    d.look();
    run(d, 1, smooth);
    expect(d.looked.yaw).toBeCloseTo(0, 3);
  });

  test('a new state keeps the look, and a walk that starts from a turned camera has no jump', () => {
    const [plain, d] = [director(), director()];
    for (const each of [plain, d]) { each.approach(0); each.skip(); }
    d.look({ yaw: 0.2, pitch: 0.1 });
    both(plain, d, 4);
    const before = d.pose;
    plain.walk(0, 2);
    d.walk(0, 2);
    expect(d.looked.yaw).toBeCloseTo(0.2, 4);
    expect(d.pose.position).toEqual(before.position);
    expect(distance(d.pose.target, before.target)).toBeLessThan(1e-9);
    // The walk goes where it goes without a look, and the sight never snaps.
    let previous = sight(d.pose);
    both(plain, d, d.arrival + 3, (a, b) => {
      expect(distance(b.position, a.position)).toBeLessThan(1e-9);
      const now = sight(b);
      expect(Math.abs(wrap(now.yaw - previous.yaw))).toBeLessThan(0.12); // looser since round 135 (the walk was briefly twice as fast)
      expect(Math.abs(now.pitch - previous.pitch)).toBeLessThan(0.12);
      previous = now;
    });
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

// Round 134: a walk between two sites that no single path joins follows the paths between, end to end.
test('a route joins non-neighbouring sites along their paths, and the camera walks it', () => {
  const index = (id) => DUNGEON.sites.findIndex((site) => site.id === id);
  const [library, face] = [index('library'), index('face_gate')];
  expect(pathPoints(DUNGEON, library, face)).toBeNull();
  const route = routePoints(DUNGEON, library, face);
  expect(route[0]).toEqual(DUNGEON.sites[library].at);
  expect(route.at(-1)).toEqual(DUNGEON.sites[face].at);
  expect(route.length).toBeGreaterThan(pathPoints(DUNGEON, index('library'), index('sunlit_court')).length);
  expect(routePoints(DUNGEON, face, face)).toBeNull();
  const d = createDirector({ dungeon: DUNGEON, heightAt: () => 0 });
  d.approach(library);
  d.update(DURATIONS.approach + 1);
  d.walk(library, face);
  expect(d.mode).toBe('walk');
  expect(d.arrival).toBeGreaterThan(5);
});

// Round 191: a legacy dungeon on the road is entered on foot and walked from one gate encounter to the next.
test('an entry from the road walks in at eye height outside the gate, then walks through it to the next sites', () => {
  const d = director();
  d.attract(); run(d, 2);
  d.enter(0);
  expect(d.mode).toBe('walk');
  const first = d.pose;
  expect(first.position[1] - taProhmHeightAt(first.position[0], first.position[2])).toBeCloseTo(EYE, 1); // on the ground at once, no drop
  expect(first.position[2]).toBeGreaterThan(DUNGEON.sites[0].at[1]); // outside, on the avenue
  const check = (pose, previous) => {
    expect(distance(pose.position, previous.position)).toBeLessThan(0.3); // a walk, never a crane shot
    expect(pose.position[1] - taProhmHeightAt(pose.position[0], pose.position[2])).toBeLessThan(EYE + 0.5);
    expect(blocked(pose.position[0], pose.position[2])).toBeFalsy();
  };
  run(d, d.arrival + 2, check);
  expect(d.arrived).toBe(true);
  for (const [from, to] of [[0, 1], [1, 2]]) { d.walk(from, to); run(d, d.arrival + 2, check); expect([d.site, d.arrived]).toEqual([to, true]); }
});
