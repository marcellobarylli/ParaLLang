// Round 160 (issue #8): biomes in the endless landscape, starting in the jungle, and the legacy dungeons as nodes of
// the road: a unit's gate stands in a dungeon, and the site where it is offered enters that dungeon.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';
import { BIOME, BIOMES, TERRAIN, createTerrain } from '../src/road/terrain.js';
import { createGraph, graphFor } from '../src/road/graph.js';
import { LEGACY_ORDER, LEVEL_GATE, endsLevel, legacyDungeonFor, legacyGateFor } from '../src/road/encounters.js';
import { answer, fullAnswer, moveTo, road, roadRuntime, startHere, talkHere } from './road-helpers.js';

const content = loadGameContent({ language: 'it' });

test('a biome says how wooded the country is, which trees grow and what colour it is; the first is the jungle', () => {
  assert.deepEqual(Object.keys(BIOMES), ['jungle', 'woodland', 'steppe']);
  assert.equal(BIOME.order[0], 'jungle');
  for (const biome of Object.values(BIOMES)) {
    assert.ok(biome.name && biome.wet > 0 && biome.wet < 1);
    assert.deepEqual(Object.keys(biome.density).sort(), ['forest', 'highland', 'meadow', 'shore', 'snow', 'water']);
    assert.equal(biome.trees.at(-1)[0], 1, 'the last kind takes the rest of the draw');
    assert.ok(biome.tint.meadow.length === 3 && biome.map.forest.length === 2);
  }
  assert.ok(BIOMES.jungle.wet < BIOMES.woodland.wet && BIOMES.woodland.wet < BIOMES.steppe.wet, 'the jungle closes over drier ground than the steppe does');
  assert.ok(BIOMES.jungle.density.forest > BIOMES.steppe.density.forest);
});

test('every road starts in the jungle, and far enough off the other biomes are found', () => {
  for (const seed of [1, 7, 42, 4242, 123456, 2 ** 31 - 2]) {
    const terrain = createTerrain(seed);
    for (let angle = 0; angle < 6.28; angle += 0.4) {
      for (const far of [0, 200, 450, BIOME.home]) assert.equal(terrain.biomeAt(Math.cos(angle) * far, Math.sin(angle) * far), 'jungle', `seed ${seed}, ${far} m out`);
    }
    const graph = createGraph(terrain);
    assert.equal(graph.node(graph.start).biome, 'jungle');
    const seen = new Set();
    for (let x = -12000; x <= 12000; x += 400) for (let z = -12000; z <= 12000; z += 400) seen.add(terrain.biomeAt(x, z));
    assert.deepEqual([...seen].sort(), ['jungle', 'steppe', 'woodland'], `seed ${seed} has all three within 12 km`);
  }
});

test('the biome is a pure function of the seed and the place, and so are the trees that grow in it', () => {
  const [a, b] = [createTerrain(99), createTerrain(99)];
  const kinds = { jungle: new Set(), woodland: new Set(), steppe: new Set() };
  const count = { jungle: 0, woodland: 0, steppe: 0 };
  const chunks = { jungle: 0, woodland: 0, steppe: 0 };
  for (let cx = -160; cx <= 160; cx += 7) {
    for (let cz = -160; cz <= 160; cz += 7) {
      const [x, z] = [(cx + 0.5) * TERRAIN.chunk, (cz + 0.5) * TERRAIN.chunk];
      assert.equal(a.biomeAt(x, z), b.biomeAt(x, z));
      const trees = a.treesIn(cx, cz);
      assert.deepEqual(trees, b.treesIn(cx, cz));
      const biome = a.biomeAt(x, z);
      chunks[biome] += 1;
      for (const tree of trees) {
        if (a.biomeAt(tree.x, tree.z) !== biome) continue; // a chunk on a border holds both sides' trees
        count[biome] += 1;
        if (tree.y <= 30) kinds[biome].add(tree.kind);
      }
    }
  }
  assert.deepEqual([...kinds.jungle].sort(), ['broad', 'palm']);
  assert.deepEqual([...kinds.woodland].sort(), ['fir', 'round']);
  assert.deepEqual([...kinds.steppe].sort(), ['round', 'shrub']);
  assert.ok(count.jungle / chunks.jungle > 2.5 * (count.steppe / chunks.steppe), 'the jungle is far more thickly wooded than the steppe');
});

test('the questions of the issue: nothing in the road\'s generation draws from Math.random, and reading the graph is cheap', () => {
  const dir = resolve(import.meta.dirname, '..', 'src', 'road');
  for (const file of readdirSync(dir)) assert.doesNotMatch(readFileSync(resolve(dir, file), 'utf8'), /Math\.random/, `${file} is seeded`);
  // The one random draw is the seed of a new road (service.js, `roadSeed`), from node:crypto.
  assert.match(readFileSync(resolve(dir, 'service.js'), 'utf8'), /roadSeed\(\) \{ return this\.seedSource \? this\.seedSource\(\) : randomInt\(/);
  // A fresh graph: the start, its neighbours and theirs, as a view of the road asks for them.
  const started = process.hrtime.bigint();
  const graph = createGraph(createTerrain(31337));
  let sites = 0;
  for (const near of graph.neighbours(graph.start)) { sites += 1; for (const further of graph.neighbours(near)) { sites += 1; graph.edge(near, further); } }
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(sites > 4);
  assert.ok(ms < 400, `the first two rings of a new graph took ${ms.toFixed(1)} ms`);
  // The same again is answered from the graph's memory.
  const again = process.hrtime.bigint();
  for (const near of graph.neighbours(graph.start)) for (const further of graph.neighbours(near)) graph.edge(near, further);
  assert.ok(Number(process.hrtime.bigint() - again) / 1e6 < 20);
  assert.equal(graphFor(31337, createTerrain), graphFor(31337, createTerrain));
});

test('which dungeon a unit\'s gate stands in follows from the curriculum alone: the units go round the dungeons in order', () => {
  const { curriculum, dungeons } = content;
  assert.deepEqual(LEGACY_ORDER, ['ta_prohm', 'the_kiln', 'micromort_mountain']);
  const of = (index) => legacyDungeonFor(dungeons, curriculum, curriculum.units[index].id);
  assert.deepEqual(of(0), { id: 'ta_prohm', name: 'Ta Prohm', level: 'taprohm', site: { id: 'face_gate', name: 'The Face Gate' } });
  assert.deepEqual([0, 1, 2, 3, 4, 5, 35].map((index) => of(index).id), ['ta_prohm', 'the_kiln', 'micromort_mountain', 'ta_prohm', 'the_kiln', 'micromort_mountain', 'micromort_mountain']);
  assert.deepEqual(of(7), of(7));
  assert.equal(legacyDungeonFor(dungeons, curriculum, 'no_such_unit'), null);
  assert.equal(legacyDungeonFor(new Map(), curriculum, curriculum.units[0].id), null);
  assert.equal(legacyDungeonFor(null, curriculum, curriculum.units[0].id), null);
});

// Round 218: the gate that ends a level (A1 to A2 after unit 12, A2 to B1 after unit 24) stands in Angkor Wat; every
// other gate keeps its place in the turn of LEGACY_ORDER.
test('the gates that end a level stand in Angkor Wat; the others are where they were', () => {
  const { curriculum, dungeons } = content;
  assert.equal(LEVEL_GATE, 'angkor_wat');
  assert.deepEqual(curriculum.units.map((_, index) => index).filter((index) => endsLevel(curriculum, index)), [11, 23]);
  const full = (index) => legacyDungeonFor(dungeons, curriculum, curriculum.units[index].id).id;
  assert.deepEqual([0, 1, 2, 10, 11, 12, 22, 23, 24, 35].map(full), ['ta_prohm', 'the_kiln', 'micromort_mountain', 'the_kiln', 'angkor_wat', 'ta_prohm', 'the_kiln', 'angkor_wat', 'ta_prohm', 'micromort_mountain']);
  const gate = (index, part) => legacyGateFor(dungeons, curriculum, curriculum.units[index].id, part);
  // Streamlined: the gate after every third unit, three conversations at three sites.
  assert.deepEqual([2, 5, 8, 14, 17, 20, 26].map((index) => gate(index, 0).id), ['ta_prohm', 'the_kiln', 'micromort_mountain', 'the_kiln', 'micromort_mountain', 'ta_prohm', 'micromort_mountain']);
  assert.deepEqual([0, 1, 2].map((part) => gate(11, part)), [0, 1, 2].map((part) => ({ id: 'angkor_wat', name: 'Angkor Wat', level: 'angkor', site: [
    { id: 'naga_causeway', name: 'The Naga Causeway' }, { id: 'reflecting_pool', name: 'The Reflecting Pool' }, { id: 'terrace_of_honour', name: 'The Terrace of Honour' }][part] })));
  assert.equal(gate(23, 0).id, 'angkor_wat');
  assert.equal(endsLevel(curriculum, curriculum.units.length - 1), false); // the last unit ends the curriculum, not a level
  // Without Angkor Wat's file the gates go round as before.
  const without = new Map([...dungeons].filter(([id]) => id !== 'angkor_wat'));
  assert.equal(legacyGateFor(without, curriculum, curriculum.units[11].id).id, 'ta_prohm');
});

test('the first unit: the gate is counted down, offered at a site that is Ta Prohm\'s node, entered, passed and left', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  let view = (await road(runtime, learnerId)).data.road;
  const lessons = content.curriculum.units[0].lessons.length;
  assert.deepEqual(view.gate, { unitId: content.curriculum.units[0].id, unitTitle: content.curriculum.units[0].title, hops: lessons + 1, dungeon: { id: 'ta_prohm', name: 'Ta Prohm' } });
  assert.equal(view.here.dungeon, null);
  assert.equal(view.here.biome, 'jungle');
  assert.equal(view.here.biomeName, 'Jungle');
  // Walk the rails until a site ahead offers the gate.
  let gateSite = null;
  const hops = [view.gate.hops];
  for (let walked = 0; walked < 12 && !gateSite; walked += 1) {
    await talkHere(runtime, learnerId);
    view = (await road(runtime, learnerId)).data.road;
    hops.push(view.gate.hops);
    gateSite = view.frontier.find((site) => site.offer.kind === 'checkpoint') ?? null;
    if (!gateSite) await moveTo(runtime, learnerId, view.rails);
  }
  assert.ok(gateSite, 'the gate was offered');
  assert.ok(hops.every((value, index) => index === 0 || value <= hops[index - 1]), `the count never goes up: ${hops}`);
  assert.equal(hops.at(-1), 0);
  assert.deepEqual(gateSite.offer.dungeon, { id: 'ta_prohm', name: 'Ta Prohm', siteName: 'The Face Gate' });
  assert.equal(gateSite.recommended, true, 'on the rails');
  // The site the learner stands at is joined to it: the dungeon's node is next to the unit's last site but one.
  assert.equal(gateSite.from, view.at);
  assert.ok(graphFor(view.seed, createTerrain).neighbours(view.at).includes(gateSite.id));
  // The other sites ahead offer no dungeon.
  assert.ok(view.frontier.filter((site) => site.id !== gateSite.id).every((site) => site.offer.dungeon === null));

  // Entering it.
  const entered = (await moveTo(runtime, learnerId, gateSite.id)).data.road;
  assert.deepEqual(entered.here.dungeon, { id: 'ta_prohm', name: 'Ta Prohm', siteName: 'The Face Gate', siteId: 'face_gate' });
  assert.equal(entered.current.dungeon.id, 'ta_prohm');
  assert.equal(entered.narration.id, 'enter_ta_prohm');
  assert.equal((await runtime.storage.load(learnerId)).road.dungeon, 'ta_prohm');
  const started = (await startHere(runtime, learnerId)).data.encounter;
  assert.deepEqual(started.road.dungeon, { id: 'ta_prohm', name: 'Ta Prohm' });
  assert.equal(started.road.place, 'The Face Gate, Ta Prohm');
  assert.equal(started.road.kind, 'checkpoint');
  // The narrator is told the gate's scene is in the dungeon.
  const greeting = runtime.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration').at(-1);
  assert.match(greeting.messages.at(-1).content, /at The Face Gate in Ta Prohm\./);

  // Passing the gate, and walking on: the learner is back on the road, and the next gate is The Kiln's.
  const turn = await answer(runtime, learnerId, started, fullAnswer(runtime, learnerId));
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.roadResult.passed, true);
  view = (await road(runtime, learnerId)).data.road;
  assert.equal(view.here.dungeon.id, 'ta_prohm', 'still in the dungeon until the learner walks on');
  assert.equal(view.gate.dungeon.id, 'the_kiln');
  const on = (await moveTo(runtime, learnerId, view.rails)).data.road;
  assert.equal(on.here.dungeon, null);
  assert.equal((await runtime.storage.load(learnerId)).road.dungeon, null);
});
