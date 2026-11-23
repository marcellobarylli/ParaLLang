// Round 147: the road's map is a picture of the landscape seen at an angle from far off. The projection that
// places the sites and the picture drawn under them are pure (roadMap.js), so they are tested here without a canvas.
import { describe, expect, test } from 'vitest';
import { createTerrain } from '../../../server/src/road/terrain.js';
import { createGraph } from '../../../server/src/road/graph.js';
import { ROAD_MAP, createMapView, renderMap } from '../roadMap.js';

const TAN30 = Math.tan(Math.PI / 6);
const pixel = (picture, [sx, sy], view) => {
  const [c, r] = [Math.floor((sx / view.width) * picture.width), Math.floor((sy / view.height) * picture.height)];
  return [...picture.data.subarray((r * picture.width + c) * 4, (r * picture.width + c) * 4 + 4)];
};

describe('the map\'s view', () => {
  const view = createMapView([{ x: 0, z: 0, y: 0 }, { x: 300, z: 0, y: 0 }, { x: 0, z: 300, y: 0 }, { x: 300, z: 300, y: 0 }]);

  test('it is isometric: the two ground axes run down to the right and to the left at the same slant, and height goes straight up', () => {
    const [origin, east, south, high] = [view.project(0, 0), view.project(100, 0), view.project(0, 100), view.project(0, 0, 40)];
    expect(east[0] - origin[0]).toBeGreaterThan(0);
    expect(south[0] - origin[0]).toBeCloseTo(-(east[0] - origin[0]), 9);
    expect(east[1] - origin[1]).toBeCloseTo(south[1] - origin[1], 9);
    expect((east[1] - origin[1]) / (east[0] - origin[0])).toBeCloseTo(TAN30, 9);
    expect(high[0]).toBeCloseTo(origin[0], 9);
    expect(origin[1] - high[1]).toBeCloseTo(40 * view.lift, 9);
    // Heights are drawn taller than true, by the relief: true would be the ground's own scale along an axis.
    expect(view.lift / (Math.hypot(east[0] - origin[0], east[1] - origin[1]) / 100)).toBeCloseTo(ROAD_MAP.relief, 9);
  });

  test('a place under the water is drawn on the water, and a position of the picture leads back to its ground', () => {
    expect(view.project(50, 80, -12)).toEqual(view.project(50, 80, 0));
    const [sx, sy] = view.project(123, -45);
    const back = view.ground(sx, sy);
    expect(back.x).toBeCloseTo(123, 6);
    expect(back.z).toBeCloseTo(-45, 6);
  });

  test('the frame holds every site with room for its mark, however high it stands, and never comes too close', () => {
    for (const seed of [4242, 77, 991, 5]) {
      const graph = createGraph(createTerrain(seed));
      const start = graph.node(graph.start);
      for (const cells of [1, 2, 3]) {
        const sites = graph.nodesNear(start.x, start.z, cells);
        const made = createMapView(sites);
        expect(made.scale).toBeLessThanOrEqual(ROAD_MAP.closest);
        if (made.scale === ROAD_MAP.farthest) continue; // too wide a country to hold whole
        for (const site of sites) {
          const [sx, sy] = made.project(site.x, site.z, site.y);
          expect(sx).toBeGreaterThanOrEqual(ROAD_MAP.margin.side - 1e-6);
          expect(sx).toBeLessThanOrEqual(made.width - ROAD_MAP.margin.side + 1e-6);
          expect(sy).toBeGreaterThanOrEqual(ROAD_MAP.margin.top - 1e-6);
          expect(sy).toBeLessThanOrEqual(made.height - ROAD_MAP.margin.bottom + 1e-6);
        }
      }
    }
    expect(createMapView([{ x: 10, z: 10, y: 5 }]).scale).toBe(ROAD_MAP.closest);
  });
});

describe('the map\'s picture', () => {
  test('every pixel is painted, and the same landscape gives the same picture', () => {
    const terrain = createTerrain(77);
    const graph = createGraph(terrain);
    const start = graph.node(graph.start);
    const view = createMapView(graph.nodesNear(start.x, start.z, 2));
    const picture = renderMap(terrain, view);
    expect([picture.width, picture.height]).toEqual([ROAD_MAP.columns, Math.round((ROAD_MAP.columns * view.height) / view.width)]);
    expect(picture.data.length).toBe(picture.width * picture.height * 4);
    for (let n = 3; n < picture.data.length; n += 4) expect(picture.data[n]).toBe(255);
    expect(Buffer.compare(Buffer.from(renderMap(terrain, view).data), Buffer.from(picture.data))).toBe(0);
    // A real landscape is not one colour.
    const colours = new Set();
    for (let n = 0; n < picture.data.length; n += 4) colours.add(`${picture.data[n] >> 4},${picture.data[n + 1] >> 4},${picture.data[n + 2] >> 4}`);
    expect(colours.size).toBeGreaterThan(20);
  });

  test('a hill stands up out of the plain: its top is drawn above its foot, and it hides the ground behind it', () => {
    // A flat meadow with one square block of rock, 50 m high, in the middle.
    const inBlock = (x, z) => Math.abs(x) < 60 && Math.abs(z) < 60;
    const terrain = { seed: 1, waterY: 0, heightAt: (x, z) => (inBlock(x, z) ? 50 : 2), coverAt: (_x, _z, h) => (h > 36 ? 'highland' : 'meadow') };
    const view = createMapView([{ x: -200, z: -200, y: 2 }, { x: 200, z: 200, y: 2 }, { x: -200, z: 200, y: 2 }, { x: 200, z: -200, y: 2 }]);
    const picture = renderMap(terrain, view);
    const green = ([r, g, b]) => g > r && g > b;
    const grey = ([r, g, b]) => Math.abs(r - g) < 40 && Math.abs(g - b) < 40;
    expect(green(pixel(picture, view.project(150, 150, 2), view))).toBe(true); // the plain in front
    expect(grey(pixel(picture, view.project(0, 0, 50), view))).toBe(true); // the top of the block, where its height puts it
    // The ground just behind the block is hidden by it: where it would be drawn, the block is.
    expect(grey(pixel(picture, view.project(-70, -70, 2), view))).toBe(true);
    // And far enough behind, the plain shows again over the block's top.
    const [, topOfBlock] = view.project(-60, -60, 50);
    const behind = view.project(-60 - 200, -60 - 200, 2);
    expect(behind[1]).toBeLessThan(topOfBlock);
    expect(green(pixel(picture, behind, view))).toBe(true);
  });
});

// Round 161 (issue #9): the whole journey is shown from as far off as it takes.
test('a frame for the whole journey holds sites many kilometres apart, where the usual frame would not', () => {
  const points = [{ x: 0, z: 0, y: 4 }, { x: 9000, z: -2500, y: 30 }, { x: -6000, z: 7000, y: 12 }];
  const usual = createMapView(points);
  const journey = createMapView(points, { farthest: ROAD_MAP.journey });
  const inside = (view) => points.every((point) => { const [x, y] = view.project(point.x, point.z, point.y); return x >= 0 && x <= view.width && y >= 0 && y <= view.height; });
  expect(usual.scale).toBe(ROAD_MAP.farthest);
  expect(inside(usual)).toBe(false);
  expect(journey.scale).toBeLessThan(ROAD_MAP.farthest);
  expect(journey.scale).toBeGreaterThanOrEqual(ROAD_MAP.journey);
  expect(inside(journey)).toBe(true);
  // A short journey is not shown from further off than the usual map.
  expect(createMapView(points.slice(0, 1), { farthest: ROAD_MAP.journey }).scale).toBe(ROAD_MAP.closest);
});

