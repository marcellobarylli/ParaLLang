// Round 122: the characters' figures (src/scene/figures.js). Each builds headless, inside the limits that let it
// stand at a site of the dungeon: few triangles, not too tall for a phone's view, within its footprint, on the
// ground (or floating by its stated clearance), with its face near the height the camera looks at.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { FIGURES, createFigure, createWorldKit } from '../src/index.js';

// A face is between 1.2 and 1.5 m, where a phone's view of a conversation shows it, except at the start site (the
// archway), where the camera stands back and above.
const LIMITS = { triangles: 160, height: 2.2, radius: 0.9, focus: [1.2, 1.5], startFocus: 1.9 };
const { materials } = createWorldKit(7);

test('the eight figures of the dungeons\' characters are known, and an unknown name gives none', () => {
  assert.deepEqual(Object.keys(FIGURES).sort(), ['archway', 'bookworm', 'charcutier', 'erratum', 'hiker', 'imp', 'letharger', 'wanderer']);
  assert.equal(createFigure('dragon', materials), null);
  assert.equal(createFigure('constructor', materials), null);
  assert.equal(createFigure(undefined, materials), null);
});

for (const name of Object.keys(FIGURES)) {
  describe(`figure: ${name}`, () => {
    const figure = createFigure(name, materials, { seed: 7 });

    test('is one mesh in the plain PS1 material, with vertex colours', () => {
      assert.equal(figure.group.children.length, 1);
      assert.equal(figure.mesh.material, materials.plain);
      assert.ok(figure.mesh.material.userData.ps1);
      for (const attribute of ['position', 'normal', 'uv', 'color']) assert.ok(figure.mesh.geometry.attributes[attribute], attribute);
      assert.equal(figure.mesh.geometry.attributes.position.count, figure.triangles * 3);
    });

    test('stays inside the limits of a site', () => {
      assert.ok(figure.triangles >= 60 && figure.triangles <= LIMITS.triangles, `${figure.triangles} triangles`);
      assert.ok(figure.height > 1.2 && figure.height <= LIMITS.height, `${figure.height.toFixed(2)} m tall`);
      assert.ok(figure.radius <= LIMITS.radius, `${figure.radius.toFixed(2)} m from its axis`);
      // On the ground, or floating by exactly its clearance.
      assert.ok(Math.abs(figure.lowest - figure.clearance) < 0.03, `lowest point at ${figure.lowest.toFixed(3)}, clearance ${figure.clearance}`);
      const top = name === 'archway' ? LIMITS.startFocus : LIMITS.focus[1];
      assert.ok(figure.focus >= LIMITS.focus[0] && figure.focus <= top && figure.focus < figure.height, `focus ${figure.focus} of ${figure.height.toFixed(2)}`);
      assert.deepEqual([figure.focus, figure.clearance], [FIGURES[name].focus, FIGURES[name].clearance]);
    });

    test('the same seed builds the same figure, and its numbers are finite', () => {
      const again = createFigure(name, materials, { seed: 7 });
      const [a, b] = [figure, again].map((one) => one.mesh.geometry.attributes);
      assert.deepEqual(Array.from(a.position.array), Array.from(b.position.array));
      assert.deepEqual(Array.from(a.color.array), Array.from(b.color.array));
      assert.ok(Array.from(a.position.array).every(Number.isFinite));
      assert.ok(Array.from(a.color.array).every((value) => Number.isFinite(value) && value >= 0));
    });
  });
}

test('the figures together leave the level inside the style\'s budget', async () => {
  const { PS1_STYLE, createWorld } = await import('../src/index.js');
  const level = createWorld('taprohm', { seed: 7 }).stats.triangles;
  const figures = Object.keys(FIGURES).reduce((sum, name) => sum + createFigure(name, materials).triangles, 0);
  assert.ok(figures <= 8 * LIMITS.triangles);
  // The dungeon's other markers (the path ribbons and the fog patches) are counted in the browser run.
  assert.ok(level + figures <= PS1_STYLE.geometry.maxTrianglesPerScene - 300, `${level} + ${figures} of ${PS1_STYLE.geometry.maxTrianglesPerScene}`);
});
