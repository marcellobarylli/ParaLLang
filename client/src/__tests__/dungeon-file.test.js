// @vitest-environment node
// Round 115: the dungeon file against the level it is played on (aesthetic/src/scene/taprohm.js). Every site stands
// on clear ground, and the route crosses a gallery or the outer wall only through an east gate passage.
import { expect, test } from 'vitest';
import { TA_PROHM, WORLDS, taProhmHeightAt, taProhmIsClear } from '@parallang/aesthetic';
import { DUNGEON } from '../dungeon.js';

const G = TA_PROHM.gallery;
const PASSAGE = 1.1; // half the width of a gate passage: the piers stand from 1.1 to 3.2 either side of the axis
const SHOULDER = 0.35; // room a walker needs either side

// Where a walker's centre may not be, from the level's plan.
function blocked(x, z) {
  const [ax, az] = [Math.abs(x), Math.abs(z)];
  const inPassage = ax < PASSAGE - SHOULDER && z > 0;
  for (const ring of TA_PROHM.rings) {
    const inBand = ax < ring.hx + SHOULDER && az < ring.hz + SHOULDER && (ax > ring.hx - G.depth - SHOULDER || az > ring.hz - G.depth - SHOULDER);
    if (inBand && !(inPassage && az > ring.hz - G.depth - SHOULDER)) return 'a gallery';
    // The gate pavilion is deeper than its gallery (G.depth + 1.6, centred on the gallery).
    if (ax < 3.2 + SHOULDER && z > ring.hz - G.depth - 0.8 - SHOULDER && z < ring.hz + 0.8 + SHOULDER && !inPassage) return 'a gate pavilion';
  }
  const W = TA_PROHM.outer;
  // The east gopura: wings to 10 m either side of the passage, 4.2 m deep, centred G.depth / 2 beyond the wall line.
  if (ax < 10 + SHOULDER && z > W + G.depth / 2 - 2.1 - SHOULDER && z < W + G.depth / 2 + 2.1 + SHOULDER && !inPassage) return 'the east gopura';
  if ((Math.abs(ax - W) < 0.6 + SHOULDER && az < W + 1) || (Math.abs(az - W) < 0.6 + SHOULDER && ax < W + 1 && !(z > 0 && ax < 10))) return 'the outer wall';
  if (ax < 3.7 + SHOULDER && az < 3.7 + SHOULDER) return 'the sanctuary';
  if (Math.abs(x + 26) < 3.5 + SHOULDER && Math.abs(z - 22) < 2.5 + SHOULDER) return 'the library';
  return null;
}

test('the bundled dungeon is the content file in the client shape, on a level aesthetic knows', () => {
  expect(DUNGEON.id).toBe('ta_prohm');
  expect(WORLDS[DUNGEON.level]).toBeTruthy();
  expect(DUNGEON.sites.map((site) => site.encounterId)).toEqual(['market_entrance_tutorial', 'imp_coffee_greeting', 'high_gate_bambieshart']);
  for (const site of DUNGEON.sites) expect(site).toMatchObject({ name: expect.any(String), at: [expect.any(Number), expect.any(Number)], characterName: null });
  expect(Object.isFrozen(DUNGEON)).toBe(true);
});

test('every site stands on clear, level ground', () => {
  expect(DUNGEON.sites.filter((site) => taProhmIsClear(...site.at)).length).toBeGreaterThan(0);
  DUNGEON.sites.forEach((site, index) => {
    const [x, z] = site.at;
    // The level's own test (its planting rule) covers the ground inside the outer wall, and it keeps plants off the
    // axis by calling the axis not clear. Site 1 is outside the wall and site 3 is on the axis; the plan test covers both.
    if (index > 0 && Math.abs(x) >= 2.5) expect(taProhmIsClear(x, z), site.name).toBe(true);
    expect(blocked(x, z), site.name).toBeNull();
    expect(taProhmHeightAt(x, z), site.name).toBe(0);
  });
});

test('the route crosses walls only through the east gate passages', () => {
  const crossings = new Set();
  for (let i = 1; i < DUNGEON.route.length; i++) {
    const [x0, z0] = DUNGEON.route[i - 1];
    const [x1, z1] = DUNGEON.route[i];
    const steps = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.2);
    for (let k = 0; k <= steps; k++) {
      const [x, z] = [x0 + ((x1 - x0) * k) / steps, z0 + ((z1 - z0) * k) / steps];
      expect(blocked(x, z), `route point [${x.toFixed(2)}, ${z.toFixed(2)}] is inside ${blocked(x, z)}`).toBeNull();
      for (const [name, line] of [['outer', TA_PROHM.outer], ...TA_PROHM.rings.map((ring, index) => [`ring ${index}`, ring.hz])]) {
        if (Math.abs(z - line) < 0.2 && Math.abs(x) < PASSAGE) crossings.add(name);
      }
    }
  }
  // In through the gopura, the third enclosure's gate tree and the second enclosure's gate; the sanctuary's ring stays shut.
  expect([...crossings].sort()).toEqual(['outer', 'ring 0', 'ring 1']);
});

test('the plan test itself refuses a wall, a pier and the sanctuary', () => {
  expect(blocked(12, 29)).toBe('a gallery');
  expect(blocked(2, 29)).not.toBeNull();
  expect(blocked(0.3, 29)).toBeNull();
  expect(blocked(5, 57)).toBe('the east gopura');
  expect(blocked(30, 56)).toBe('the outer wall');
  expect(blocked(0, 0)).not.toBeNull();
});
