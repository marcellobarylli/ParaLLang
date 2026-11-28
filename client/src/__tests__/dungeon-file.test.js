// @vitest-environment node
// Round 115: the dungeon file against the level it is played on (aesthetic/src/scene/taprohm.js). Every site stands
// on clear ground, and nothing crosses a gallery or the outer wall except through an east gate passage.
// Round 119: the dungeon is a map: every path is checked, and the world file with its fog.
import { describe, expect, test } from 'vitest';
import { FIGURES, LAYOUT, TA_PROHM, WORLDS, createFigure, createWorldKit, taProhmHeightAt, taProhmIsClear } from '@parallang/aesthetic';
import { ANGKOR_WAT, DUNGEON, DUNGEONS, GATE_DUNGEONS, KILN } from '../dungeon.js';
import { angkorHeightAt } from '../scene/levelView.js';
import { isWater } from '../../../aesthetic/src/scene/layout.js';
import { ATLAS, ATLAS_FILE, ROAD_NAME } from '../atlas.js';
import { ROAD_PLACE } from '../../../server/src/road/encounters.js';
import { atlasView, neighbourIds, unexploredSites } from '../dungeonModel.js';
import { pathPoints } from '../scene/director.js';
import { PASSAGE, blocked } from './taProhmPlan.js';

test('the bundled dungeon is the content file in the client shape, on a level aesthetic knows', () => {
  expect(DUNGEON.id).toBe('ta_prohm');
  expect(WORLDS[DUNGEON.level]).toBeTruthy();
  expect(DUNGEON.sites.map((site) => [site.id, site.encounterId])).toEqual([
    ['face_gate', 'market_entrance_tutorial'], ['buttress_tree', 'butchers_stall_charcutier'], ['root_court', 'imp_coffee_greeting'],
    ['sunlit_court', 'cracked_fountain_letharger'], ['library', 'old_bookshop_bookworm'], ['before_sanctuary', 'high_gate_bambieshart'], ['sanctuary', 'the_rift_errata'],
  ]);
  for (const site of DUNGEON.sites) expect(site).toMatchObject({ name: expect.any(String), at: [expect.any(Number), expect.any(Number)], characterName: null, figure: expect.any(String) });
  expect([DUNGEON.start, DUNGEON.goal]).toEqual(['face_gate', 'sanctuary']);
  expect(DUNGEON.paths.length).toBe(8);
  expect(Object.isFrozen(DUNGEON)).toBe(true);
  expect(neighbourIds(DUNGEON, 'library')).toEqual(['sunlit_court']);
  expect(neighbourIds(DUNGEON, 'root_court')).toEqual(['face_gate', 'buttress_tree', 'sunlit_court', 'before_sanctuary']);
  // Before the server has answered, the map is the unexplored temple.
  expect(unexploredSites(DUNGEON)).toMatchObject({
    face_gate: { state: 'current', cleared: false, reachable: false }, buttress_tree: { state: 'known' }, root_court: { state: 'known' },
    sunlit_court: { state: 'hidden' }, library: { state: 'hidden' }, before_sanctuary: { state: 'hidden' }, sanctuary: { state: 'hidden' },
  });
});

// Round 133: The Kiln is the second dungeon, on Ta Prohm's plan under the ember theme.
test('The Kiln is bundled too: Ta Prohm\'s sites, encounters, figures, paths and seals on the level `kiln`, under its own names', () => {
  expect(DUNGEONS.filter((entry) => entry.id !== 'micromort_mountain')).toEqual([DUNGEON, KILN]);
  expect(KILN).toMatchObject({ id: 'the_kiln', name: 'The Kiln', level: 'kiln', start: DUNGEON.start, goal: DUNGEON.goal, entrance: DUNGEON.entrance, paths: DUNGEON.paths });
  expect(WORLDS[KILN.level]).toBeTruthy();
  const plan = (dungeon) => dungeon.sites.map(({ id, encounterId, at, figure }) => ({ id, encounterId, at, figure }));
  expect(plan(KILN)).toEqual(plan(DUNGEON));
  const names = KILN.sites.map((site) => site.name);
  expect(new Set(names).size).toBe(names.length);
  for (const name of names) expect(DUNGEON.sites.map((site) => site.name)).not.toContain(name);
});

describe.each(DUNGEONS.filter((dungeon) => dungeon.id !== 'micromort_mountain').map((dungeon) => [dungeon.name, dungeon]))('%s against the wall plan', (_name, DUNGEON) => {
test('every site stands on clear, level ground', () => {
  expect(DUNGEON.sites.filter((site) => taProhmIsClear(...site.at)).length).toBeGreaterThan(3);
  for (const site of DUNGEON.sites) {
    const [x, z] = site.at;
    // The level's own test (its planting rule) covers the ground inside the outer wall, and it keeps plants off the
    // axis by calling the axis not clear. The start site is outside the wall and two sites are on the axis; the plan
    // test covers them.
    if (site.id !== DUNGEON.start && Math.abs(x) >= 2.5) expect(taProhmIsClear(x, z), site.name).toBe(true);
    expect(blocked(x, z), site.name).toBeNull();
    expect(taProhmHeightAt(x, z), site.name).toBe(0);
  }
});

// Every point of a polyline, 0.2 m apart.
function* along(points) {
  for (let i = 1; i < points.length; i++) {
    const [x0, z0] = points[i - 1];
    const [x1, z1] = points[i];
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.2);
    for (let k = 0; k <= steps; k++) yield [x0 + ((x1 - x0) * k) / steps, z0 + ((z1 - z0) * k) / steps];
  }
}

test('every path, and the entrance, crosses walls only through the east gate passages', () => {
  const index = (id) => DUNGEON.sites.findIndex((site) => site.id === id);
  const crossed = {};
  const lines = [['the entrance', [...DUNGEON.entrance, DUNGEON.sites[index(DUNGEON.start)].at]], ...DUNGEON.paths.map(({ between }) => [between.join(' to '), pathPoints(DUNGEON, index(between[0]), index(between[1]))])];
  for (const [name, points] of lines) {
    const crossings = new Set();
    for (const [x, z] of along(points)) {
      expect(blocked(x, z), `${name}: [${x.toFixed(2)}, ${z.toFixed(2)}] is inside ${blocked(x, z)}`).toBeNull();
      for (const [line, at] of [['outer', TA_PROHM.outer], ...TA_PROHM.rings.map((ring, i) => [`ring ${i}`, ring.hz])]) {
        if (Math.abs(z - at) < 0.2 && Math.abs(x) < PASSAGE) crossings.add(line);
      }
    }
    crossed[name] = [...crossings].sort();
  }
  expect(crossed).toEqual({
    'the entrance': [],
    'face_gate to buttress_tree': ['outer'], // in through the gopura
    'face_gate to root_court': ['outer', 'ring 0'], // and the third enclosure's gate tree
    'buttress_tree to root_court': ['ring 0'],
    'root_court to sunlit_court': [],
    'sunlit_court to library': [],
    'root_court to before_sanctuary': ['ring 1'], // the second enclosure's gate
    'sunlit_court to before_sanctuary': ['ring 1'],
    'before_sanctuary to sanctuary': ['ring 2'], // the inner gate
  });
});

});

test('the plan test itself refuses a wall, a pier and the sanctuary', () => {
  expect(blocked(12, 29)).toBe('a gallery');
  expect(blocked(2, 29)).not.toBeNull();
  expect(blocked(0.3, 29)).toBeNull();
  expect(blocked(5, 57)).toBe('the east gopura');
  expect(blocked(30, 56)).toBe('the outer wall');
  expect(blocked(0, 0)).not.toBeNull();
  expect(blocked(-26, 22)).toBe('the library');
});

// Round 122: the characters' figures.
test('every site names its character\'s figure, and the figure has room at its site', () => {
  expect(DUNGEON.sites.map((site) => [site.id, site.figure])).toEqual([
    ['face_gate', 'archway'], ['buttress_tree', 'charcutier'], ['root_court', 'imp'], ['sunlit_court', 'letharger'],
    ['library', 'bookworm'], ['before_sanctuary', 'wanderer'], ['sanctuary', 'erratum'],
  ]);
  for (const site of DUNGEON.sites) expect(Object.hasOwn(FIGURES, site.figure), site.figure).toBe(true);
  expect(new Set(DUNGEON.sites.map((site) => site.figure)).size).toBe(DUNGEON.sites.length);
  // The figure's footprint (the farthest any of it is from its axis), whichever way it is turned, is clear of walls.
  const { materials } = createWorldKit(7);
  for (const site of DUNGEON.sites) {
    const { radius } = createFigure(site.figure, materials, { seed: 7 });
    expect(radius, site.figure).toBeLessThanOrEqual(0.9);
    for (let step = 0; step < 36; step += 1) {
      const angle = (step / 36) * 2 * Math.PI;
      const [x, z] = [site.at[0] + radius * Math.cos(angle), site.at[1] + radius * Math.sin(angle)];
      // The stone itself, with 5 cm to spare: a figure needs no walker's shoulder room.
      expect(blocked(x, z, 0.05), `${site.figure} at ${site.name}: [${x.toFixed(2)}, ${z.toFixed(2)}] is inside ${blocked(x, z, 0.05)}`).toBeNull();
    }
  }
});

// Round 119: the world map.
test('the world file: places joined by paths, one of them this dungeon, and a fog that shows the start and its neighbours', () => {
  const ids = ATLAS_FILE.places.map((place) => place.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toContain(ATLAS_FILE.start);
  for (const [a, b] of ATLAS_FILE.paths) { expect(ids).toContain(a); expect(ids).toContain(b); expect(a).not.toBe(b); }
  for (const place of ATLAS_FILE.places) {
    expect(place.map.x).toBeGreaterThan(0); expect(place.map.x).toBeLessThan(1);
    expect(place.map.y).toBeGreaterThan(0); expect(place.map.y).toBeLessThan(1);
    expect(place.description.trim().length).toBeGreaterThan(10);
    // A place is open (it has a dungeon) or says why it is closed.
    // (Round 133: a bundled dungeon, and no dungeon is opened by two places.)
    // Round 144: or it is the endless road, which has no dungeon file.
    if (place.dungeon) expect(DUNGEONS.map((dungeon) => dungeon.id)).toContain(place.dungeon);
    else if (place.road) expect(place.closed).toBeUndefined();
    else expect(place.closed.length).toBeGreaterThan(5);
  }
  expect(ATLAS_FILE.places.filter((place) => place.road).map((place) => place.id)).toEqual(['the_long_way']);
  // Round 152: the road's name is the atlas's, and the server's copy (what the narrator is told) is the same.
  expect(ROAD_NAME).toBe('The Journey 2: Journathan Returns (again)');
  expect({ id: ROAD_PLACE.id, name: ROAD_PLACE.name }).toEqual({ id: 'the_long_way', name: ROAD_NAME });
  const opened = ATLAS_FILE.places.filter((place) => place.dungeon).map((place) => place.dungeon);
  expect(opened.sort()).toEqual(DUNGEONS.map((dungeon) => dungeon.id).sort());
  expect(ATLAS.places.map((place) => [place.id, place.state, place.dungeonId, Boolean(place.closed)])).toEqual([
    ['ta_prohm', 'current', 'ta_prohm', false], ['the_kiln', 'known', 'the_kiln', false], ['angkor_wat', 'known', null, true], ['micromort_mountain', 'known', 'micromort_mountain', false],
    ['the_long_way', 'known', null, false], // round 144: open, with no dungeon
  ]);
  expect(ATLAS.places.find((place) => place.id === 'the_long_way').road).toBe(true);
  expect(ATLAS.paths).toEqual([['ta_prohm', 'the_long_way'], ['ta_prohm', 'the_kiln'], ['ta_prohm', 'angkor_wat'], ['ta_prohm', 'micromort_mountain']]); // The Bone Dome is under the fog
  expect(atlasView({ ...ATLAS_FILE, start: 'angkor_wat' }).places.map((place) => place.id)).toEqual(['ta_prohm', 'angkor_wat', 'the_bone_dome']);
});

// Round 218: Angkor Wat, where the gate that ends a level stands (the level `angkor`, aesthetic/src/scene/temple.js).
// Only the road's gates open it. Every site and every point of every path and of the entrance is on dry ground, off
// the temple's tiers and the libraries, and crosses the enclosure's west gopura only through its central passage.
test('Angkor Wat is bundled for the gates only, and walks on its plan', () => {
  expect(GATE_DUNGEONS).toEqual([ANGKOR_WAT]);
  expect(DUNGEONS.map((entry) => entry.id)).not.toContain('angkor_wat');
  expect(ANGKOR_WAT).toMatchObject({ id: 'angkor_wat', name: 'Angkor Wat', level: 'angkor', start: 'naga_causeway' });
  expect(WORLDS[ANGKOR_WAT.level]).toBeTruthy();
  expect(ANGKOR_WAT.sites.length).toBeGreaterThanOrEqual(3); // a gate holds three conversations at three sites
  const along = (points) => points.slice(1).flatMap((to, i) => {
    const from = points[i];
    const steps = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.2);
    return Array.from({ length: steps + 1 }, (_, k) => [from[0] + ((to[0] - from[0]) * k) / steps, from[1] + ((to[1] - from[1]) * k) / steps]);
  });
  const wall = LAYOUT.wall;
  const problem = ([x, z]) => {
    if (isWater(x, z)) return 'in the water';
    if (Math.abs(x) < 29 && z < 27 && z > -27) return 'in the temple';
    if (Math.abs(Math.abs(x) - 24) < 4.5 && Math.abs(z - 45) < 3.5) return 'in a library';
    if (Math.abs(z - wall) < 3.4 && Math.abs(x) < 23 && Math.abs(x) >= 1.6) return 'through the gopura';
    if (Math.abs(z - wall) < 1 && Math.abs(x) >= 23) return 'through the wall';
    return null;
  };
  const index = (id) => ANGKOR_WAT.sites.findIndex((site) => site.id === id);
  const lines = [['the entrance', [...ANGKOR_WAT.entrance, ANGKOR_WAT.sites[index(ANGKOR_WAT.start)].at]],
    ...ANGKOR_WAT.paths.map(({ between: [a, b] }) => [`${a} to ${b}`, pathPoints(ANGKOR_WAT, index(a), index(b))])];
  for (const site of ANGKOR_WAT.sites) expect(problem(site.at), site.name).toBeNull();
  for (const [name, points] of lines) for (const point of along(points)) expect(problem(point), `${name} at ${point.map((v) => v.toFixed(1))}`).toBeNull();
  // The camera walks on the causeways and the terrace of honour.
  expect([angkorHeightAt(0, 63), angkorHeightAt(0, 40), angkorHeightAt(0, 30.5), angkorHeightAt(-9, 37), angkorHeightAt(0, 100)]).toEqual([0.82, 0.7, 1, 0, 0]);
});
