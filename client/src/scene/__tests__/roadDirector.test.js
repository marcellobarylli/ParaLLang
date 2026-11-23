// @vitest-environment node
// Round 144: the road's camera. It arrives from the sky, glides along a way and holds at a site without ever going
// under the ground or the water, joins its states without a jump, and steps in as a conversation goes on.
import { expect, test } from 'vitest';
import { ROAD_CAMERA, createRoadDirector } from '../roadDirector.js';
import { createTerrain } from '../../../../server/src/road/terrain.js';
import { createGraph } from '../../../../server/src/road/graph.js';

const terrain = createTerrain(4242);
const graph = createGraph(terrain);
const start = graph.node(graph.start);
const nextId = graph.neighbours(start.id)[0];
const next = graph.node(nextId);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const make = () => createRoadDirector({ heightAt: terrain.heightAt, waterY: terrain.waterY });
const above = (pose) => pose.position[1] - Math.max(terrain.heightAt(pose.position[0], pose.position[2]), terrain.waterY);

function run(director, seconds, check = () => {}) {
  let previous = director.pose;
  for (let t = 0; t < seconds; t += 1 / 30) {
    const pose = director.update(1 / 30);
    check(pose, previous);
    previous = pose;
  }
  return previous;
}

test('it arrives from the sky and holds a few steps from the site, looking at it', () => {
  const director = make();
  director.arrive(start);
  expect(director.arrived).toBe(false);
  expect(director.pose.position[1]).toBeGreaterThan(start.y + 30);
  run(director, ROAD_CAMERA.arrive + 0.2, (pose, previous) => {
    expect(above(pose)).toBeGreaterThan(1);
    expect(distance(pose.position, previous.position)).toBeLessThan(4);
  });
  expect([director.mode, director.arrived]).toEqual(['hold', true]);
  const pose = director.update(1 / 30);
  expect(Math.hypot(pose.position[0] - start.x, pose.position[2] - start.z)).toBeCloseTo(ROAD_CAMERA.standoff, 0);
  expect(pose.target[0]).toBeCloseTo(start.x, 5);
  expect(pose.target[1]).toBeCloseTo(start.y + ROAD_CAMERA.focus, 5);
});

test('a glide follows the way, stays above the ground, takes a few seconds and ends at the next site without a jump', () => {
  const director = make();
  director.stand(start);
  const points = graph.pathPoints(start.id, nextId);
  director.travel(points, next);
  expect([director.mode, director.arrived]).toEqual(['travel', false]);
  let seconds = 0;
  let highest = 0;
  while (!director.arrived && seconds < 20) {
    const before = director.pose;
    const pose = director.update(1 / 30);
    seconds += 1 / 30;
    expect(above(pose)).toBeGreaterThan(1.2);
    expect(distance(pose.position, before.position)).toBeLessThan(2.2); // no jump between frames
    highest = Math.max(highest, above(pose));
  }
  expect(seconds).toBeGreaterThanOrEqual(ROAD_CAMERA.travel.min - 0.1);
  expect(seconds).toBeLessThanOrEqual(ROAD_CAMERA.travel.max + 0.1);
  expect(highest).toBeGreaterThan(ROAD_CAMERA.eye + 1); // it rises over the country on the way
  run(director, 2.5, (pose, previous) => expect(distance(pose.position, previous.position)).toBeLessThan(1));
  const pose = director.update(1 / 30);
  expect(Math.hypot(pose.position[0] - next.x, pose.position[2] - next.z)).toBeLessThan(ROAD_CAMERA.standoff + 0.8);
  expect(pose.target[0]).toBeCloseTo(next.x, 5);
});

test('closed objectives step the camera in; with nobody to talk to it wanders round the site and comes back', () => {
  const director = make();
  director.stand(start);
  const far = Math.hypot(director.pose.position[0] - start.x, director.pose.position[2] - start.z);
  director.engage(1);
  const near = run(director, 4);
  expect(Math.hypot(near.position[0] - start.x, near.position[2] - start.z)).toBeLessThan(far * 0.8);
  director.engage(0);
  director.wander();
  expect(director.mode).toBe('wander');
  const turned = run(director, 6, (pose, previous) => { expect(distance(pose.position, previous.position)).toBeLessThan(1); expect(above(pose)).toBeGreaterThan(1.2); });
  expect(Math.hypot(turned.position[0] - start.x, turned.position[2] - start.z)).toBeGreaterThan(ROAD_CAMERA.standoff);
  director.face();
  run(director, 3, (pose, previous) => expect(distance(pose.position, previous.position)).toBeLessThan(1));
  expect(director.mode).toBe('hold');
  director.skip();
  expect(director.arrived).toBe(true);
});

// Round 173: the title screen: far over the site, above the clouds, turning slowly; then the zoom down to it.
test('the title stands far over the site and turns round it; the start zooms down to the hold without a jump or a dip under the ground', async () => {
  const { titleDistance } = await import('../roadDirector.js');
  expect(titleDistance(0.46)).toBe(ROAD_CAMERA.title.distance[1]); // a phone held upright: as far as it goes
  expect(titleDistance(16 / 9)).toBeCloseTo(ROAD_CAMERA.title.across / (2 * Math.tan(Math.PI / 6)), 5);
  const director = make();
  director.title(start, { distance: 1800 });
  expect(director.mode).toBe('title');
  expect(director.arrived).toBe(false);
  const first = director.pose;
  expect(distance(first.position, first.target)).toBeCloseTo(1800, 3);
  expect(above(first)).toBeGreaterThan(1000); // over the clouds (EFFECTS.high.altitude is 330 m)
  const later = run(director, 30);
  expect(distance(later.position, later.target)).toBeCloseTo(1800, 3);
  const turned = Math.atan2(later.position[2] - start.z, later.position[0] - start.x) - Math.atan2(first.position[2] - start.z, first.position[0] - start.x);
  expect(Math.abs(Math.atan2(Math.sin(turned), Math.cos(turned)))).toBeCloseTo((30 / ROAD_CAMERA.title.period) * Math.PI * 2, 1);
  expect(director.mode).toBe('title'); // it turns until the start

  director.arrive(start);
  expect(director.mode).toBe('descend');
  let worst = Infinity;
  const end = run(director, ROAD_CAMERA.title.descend + 2.5, (pose, previous) => {
    worst = Math.min(worst, above(pose));
    expect(distance(pose.position, previous.position)).toBeLessThan(120); // no jump (the first moments fall fast)
  });
  expect(worst).toBeGreaterThan(ROAD_CAMERA.eye - 0.01);
  expect(director.arrived).toBe(true);
  expect(director.mode).toBe('hold');
  expect(distance(end.position, end.target)).toBeLessThan(ROAD_CAMERA.standoff + 1);
});
