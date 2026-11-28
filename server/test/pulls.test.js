// Round 213 (issue #23): the pulls. At each change of level the land is pulled down at the sites of the walk: the
// displacement field's geometry (pulls.js), the conversation that triggers it, the event the client plays and reports
// seen, and the developer's jump to a unit that makes it testable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { createTerrain, TALLEST_TREE } from '../src/road/terrain.js';
import { createGraph, GRAPH } from '../src/road/graph.js';
import { PULL, createPull, pullKey, pullPoints, siteDepths, withPulls } from '../src/road/pulls.js';
import { PACING, emptyProgress, gateDue, jumpProgress, levelAt, levelRose, plan, position } from '../src/road/pacing.js';
import { api } from './helpers.js';
import { moveTo, road, roadRuntime, talkHere } from './road-helpers.js';

// A walk of `count` sites along the ways from the start, by a fixed draw.
function walkOf(graph, count) {
  let state = 7;
  const draw = () => { state = (state * 1103515245 + 12345) & 0x7fffffff; return state / 0x7fffffff; };
  const out = [graph.start];
  const seen = new Set(out);
  let at = graph.start;
  for (let tries = 0; out.length < count && tries < count * 30; tries += 1) {
    const next = graph.neighbours(at).filter((id) => !seen.has(id));
    if (!next.length) { at = out[Math.floor(draw() * out.length)]; continue; }
    at = next[Math.floor(draw() * next.length)];
    out.push(at);
    seen.add(at);
  }
  return out;
}

test('a pull is two of the tallest trees deep', () => {
  assert.equal(TALLEST_TREE, 13);
  assert.equal(PULL.depth, 26);
});

test('every pulled site is exactly its depth lower, the land between is lowered smoothly, and far land is untouched', () => {
  const terrain = createTerrain(4242);
  const graph = createGraph(terrain);
  const sites = walkOf(graph, 60);
  const made = withPulls(terrain, graph, [{ step: 12, depth: PULL.depth, sites }]);
  assert.equal(made.pull.points.length, 60);
  for (const id of sites) {
    const [before, after] = [graph.node(id), made.graph.node(id)];
    assert.ok(Math.abs(after.y - (before.y - PULL.depth)) < 1e-3, `${id} is ${before.y - after.y} m lower`);
    assert.ok(Math.abs(made.terrain.heightAt(before.x, before.z) - (terrain.heightAt(before.x, before.z) - PULL.depth)) < 1e-3);
  }
  // Nowhere is the land raised, and nowhere is it far deeper than a pull.
  let deepest = 0;
  for (const point of made.pull.points) {
    for (let n = 0; n < 40; n += 1) {
      const [x, z] = [point.x + ((n * 37) % 300) - 150, point.z + ((n * 91) % 300) - 150];
      const dip = made.terrain.pullAt(x, z);
      assert.ok(dip <= 0);
      deepest = Math.min(deepest, dip);
    }
  }
  assert.ok(deepest > -PULL.depth * 1.4 && deepest <= -PULL.depth, `the deepest point is ${deepest} m down`);
  // Half way along a walked way the valley is still most of a pull deep: the hollows run together.
  const [a, b] = [graph.node(sites[0]), graph.node(sites[1])];
  assert.ok(made.terrain.pullAt((a.x + b.x) / 2, (a.z + b.z) / 2) < -PULL.depth * 0.5);
  // Beyond the radius of every site nothing has moved.
  const reach = PULL.radius * GRAPH.cell;
  const far = { x: Math.max(...made.pull.points.map((point) => point.x)) + reach + 1, z: 0 };
  assert.equal(made.terrain.pullAt(far.x, far.z), 0);
  assert.equal(made.terrain.heightAt(far.x, far.z), terrain.heightAt(far.x, far.z));
});

test('the pulled land is smooth: no step anywhere along a line through the hollow', () => {
  const terrain = createTerrain(99);
  const graph = createGraph(terrain);
  const { terrain: pulled, pull } = withPulls(terrain, graph, [{ step: 1, depth: PULL.depth, sites: walkOf(graph, 25) }]);
  const from = pull.points[0];
  let previous = pulled.pullAt(from.x - 400, from.z);
  for (let x = from.x - 400; x <= from.x + 400; x += 0.5) {
    const now = pulled.pullAt(x, from.z + 13);
    assert.ok(Math.abs(now - previous) < 0.6, `a step of ${Math.abs(now - previous)} m at ${x}`);
    previous = now;
  }
});

test('the pull moves space, not soil: the water sinks with the ground, the kind of ground and the trees stay, the graph does not move', () => {
  const terrain = createTerrain(4242);
  const graph = createGraph(terrain);
  const sites = walkOf(graph, 40);
  const { terrain: pulled, graph: pulledGraph } = withPulls(terrain, graph, [{ step: 1, depth: PULL.depth, sites }]);
  for (const id of sites) {
    const node = pulledGraph.node(id);
    assert.ok(node.y > pulled.waterAt(node.x, node.z) + 1, `${id} stands over the water`);
    assert.equal(pulled.surfaceAt(node.x, node.z), node.y);
    assert.equal(node.cover, graph.node(id).cover);
    assert.equal(pulled.coverAt(node.x, node.z), terrain.coverAt(node.x, node.z));
    assert.equal(pulled.coverAt(node.x, node.z, pulled.heightAt(node.x, node.z)), terrain.coverAt(node.x, node.z, terrain.heightAt(node.x, node.z)));
    assert.deepEqual([node.x, node.z, node.id], [graph.node(id).x, graph.node(id).z, id]);
    assert.deepEqual(pulledGraph.neighbours(id), graph.neighbours(id));
  }
  assert.deepEqual(pulledGraph.pathPoints(sites[0], sites[1]), graph.pathPoints(sites[0], sites[1]));
  assert.equal(pulledGraph.start, graph.start);
  // The same trees stand, each lower by what its ground sank.
  const start = graph.node(graph.start);
  const [cx, cz] = [Math.floor(start.x / 48), Math.floor(start.z / 48)];
  const [before, after] = [terrain.treesIn(cx, cz), pulled.treesIn(cx, cz)];
  assert.equal(after.length, before.length);
  before.forEach((tree, n) => {
    assert.deepEqual([after[n].x, after[n].z, after[n].kind, after[n].height], [tree.x, tree.z, tree.kind, tree.height]);
    assert.ok(Math.abs(after[n].y - (tree.y + pulled.pullAt(tree.x, tree.z))) < 1e-9);
  });
  assert.ok(after.some((tree, n) => tree.y < before[n].y - 5), 'the trees round the start have sunk');
});

test('the same seed and the same pulls give the same ground; no pulls give the land as it was', () => {
  const pulled = [{ step: 3, depth: PULL.depth, sites: walkOf(createGraph(createTerrain(7)), 15) }];
  const make = () => { const terrain = createTerrain(7); return withPulls(terrain, createGraph(terrain), pulled).terrain; };
  const [one, two] = [make(), make()];
  for (let n = 0; n < 200; n += 1) assert.equal(one.heightAt(n * 7.3 - 300, n * 3.1 - 200), two.heightAt(n * 7.3 - 300, n * 3.1 - 200));
  const terrain = createTerrain(7);
  const graph = createGraph(terrain);
  const none = withPulls(terrain, graph, []);
  assert.equal(none.terrain, terrain);
  assert.equal(none.graph, graph);
  assert.equal(none.pull, null);
  assert.equal(createPull([]).pullAt(10, 10), 0);
  assert.notEqual(pullKey(pulled), pullKey([]));
});

test('each later pull draws the earlier sites down again, to a limit', () => {
  const depths = siteDepths([{ step: 1, depth: 26, sites: ['0,0', '0,1'] }, { step: 9, depth: 26, sites: ['1,1'] }]);
  assert.deepEqual([...depths], [['1,1', 26], ['0,0', 52], ['0,1', 52]]);
  const many = siteDepths(Array.from({ length: 6 }, (unused, n) => ({ step: n, depth: 26, sites: [`${n},0`] })));
  assert.equal(many.get('0,0'), PULL.limit);
  assert.equal(many.get('5,0'), 26);
  const graph = createGraph(createTerrain(4242));
  const points = pullPoints(graph, [{ step: 1, depth: 26, sites: [graph.start, '9999999,9999999x'] }]);
  assert.deepEqual(points.map((point) => point.id), [graph.start], 'a site that does not exist is left out');
});

test('the level is the stage of the unit the learner is in, and a gate owed belongs to the units it closes', () => {
  const { curriculum } = loadGameContent({ language: 'it' });
  const a2 = curriculum.units.findIndex((unit) => curriculum.stages.find((stage) => stage.id === unit.stageId).cefr === 'A2');
  assert.equal(a2, 12);
  assert.equal(levelAt(curriculum, emptyProgress(), { streamlined: true }), 'A1');
  // Streamlined: the last unit of A1 done, its gate owed: still A1. The gate's last conversation played: A2.
  const owed = jumpProgress(curriculum, emptyProgress(), { index: a2 - 1, gate: true, streamlined: true, step: 20 });
  assert.deepEqual([gateDue(curriculum, owed).part, gateDue(curriculum, owed).unitId], [PACING.gateEvery - 1, curriculum.units[a2 - 1].id]);
  assert.equal(levelAt(curriculum, owed, { streamlined: true }), 'A1');
  const through = jumpProgress(curriculum, emptyProgress(), { index: a2, streamlined: true, step: 20 });
  assert.equal(gateDue(curriculum, through), null);
  assert.equal(position(curriculum, through).unit.id, curriculum.units[a2].id);
  assert.equal(levelAt(curriculum, through, { streamlined: true }), 'A2');
  // The full pacing: the unit's own gate is the last thing of A1.
  const gate = jumpProgress(curriculum, emptyProgress(), { index: a2 - 1, gate: true, streamlined: false, step: 20 });
  assert.equal(levelAt(curriculum, gate), 'A1');
  assert.equal(plan(curriculum, gate, 20)[0].kind, 'checkpoint');
  assert.equal(levelAt(curriculum, jumpProgress(curriculum, emptyProgress(), { index: curriculum.units.length - 1, streamlined: true }), { streamlined: true }), 'B1');
  assert.ok(levelRose(curriculum, 'A1', 'A2') && levelRose(curriculum, 'A2', 'B1') && !levelRose(curriculum, 'A2', 'A2') && !levelRose(curriculum, 'B1', 'A1'));
});

const jump = (runtime, learnerId, body) => api(runtime, '/api/road/jump', { learnerId, method: 'POST', body });
const seen = (runtime, learnerId, number) => api(runtime, '/api/road/event', { learnerId, method: 'POST', body: { number } });

test('the developer\'s jump puts the learner down at a unit, and at a gate', async (t) => {
  const { runtime, content, learnerId } = await roadRuntime(t, { streamlined: true });
  const units = content.curriculum.units;
  let view = (await jump(runtime, learnerId, { unitId: units[13].id })).data;
  assert.deepEqual([view.curriculum.position.unitId, view.curriculum.position.cefr, view.curriculum.totals.unitsDone], [units[13].id, 'A2', 13]);
  assert.deepEqual([view.road.current.kind, view.road.current.unitId], ['unit', units[13].id]);
  assert.equal(view.road.event, null, 'a jump pulls nothing');
  assert.deepEqual(view.road.pulled, []);
  // Back to the start.
  view = (await jump(runtime, learnerId, { unitId: units[0].id })).data;
  assert.deepEqual([view.curriculum.position.unitId, view.curriculum.totals.unitsDone, view.road.current.unitId], [units[0].id, 0, units[0].id]);
  // At a gate: nobody waits here; the gate is a walk away, in its old place, at its last conversation.
  view = (await jump(runtime, learnerId, { unitId: units[11].id, gate: true })).data;
  assert.equal(view.road.current, null);
  assert.equal(view.road.gate.hops, 0);
  const offer = view.road.frontier.find((site) => site.id === view.road.rails).offer;
  assert.equal(offer.kind, 'gate');
  assert.ok(offer.dungeon);
  assert.equal((await jump(runtime, learnerId, { unitId: 'no_such_unit' })).status, 400);
  assert.equal((await jump(runtime, learnerId, { unitId: units[10].id, gate: true })).status, 400, 'no gate closes the eleventh unit');
});

test('the conversation that takes the learner from A1 to A2 pulls the land at the sites of the walk, once; the event is the road\'s until it is seen', async (t) => {
  const { runtime, content, learnerId } = await roadRuntime(t, { streamlined: true });
  const units = content.curriculum.units;
  // Two units' walk first, so the journey has sites; neither is a change of level.
  let view = (await road(runtime, learnerId)).data;
  const start = view.road.at;
  let turn = await talkHere(runtime, learnerId);
  assert.equal(turn.roadResult.worldEvent, undefined);
  view = (await moveTo(runtime, learnerId, (await road(runtime, learnerId)).data.road.rails)).data;
  const second = view.road.at;
  // The last unit of A1: the gate of its three units, at its last conversation.
  view = (await jump(runtime, learnerId, { unitId: units[11].id, gate: true })).data;
  view = (await moveTo(runtime, learnerId, view.road.rails)).data;
  assert.ok(view.road.here.dungeon, 'the gate is in an old place');
  const gateSite = view.road.at;
  turn = await talkHere(runtime, learnerId);
  assert.deepEqual(turn.roadResult.worldEvent, { kind: 'pull', number: 1, from: 'A1', to: 'A2' });
  assert.equal(turn.roadResult.kind, 'gate');
  view = (await road(runtime, learnerId)).data;
  assert.equal(view.curriculum.position.cefr, 'A2');
  // The pull is in the save, but the land shown is not pulled until the event has been watched.
  assert.deepEqual(view.road.pulled, []);
  assert.deepEqual(view.road.event, { kind: 'pull', number: 1, pull: { step: view.road.step, depth: PULL.depth, sites: [start, second, gateSite], from: 'A1', to: 'A2' } });
  // A reload before it is watched: it is still owed.
  assert.equal((await road(runtime, learnerId)).data.road.event.number, 1);
  view = (await seen(runtime, learnerId, 1)).data;
  assert.equal(view.road.event, null);
  assert.deepEqual(view.road.pulled.map((pull) => pull.sites), [[start, second, gateSite]]);
  // Seen twice, or a number that is no event: nothing changes.
  assert.deepEqual((await seen(runtime, learnerId, 1)).data.road.pulled, view.road.pulled);
  assert.deepEqual((await seen(runtime, learnerId, 5)).data.road.pulled, view.road.pulled);
  assert.equal((await seen(runtime, learnerId, 'x')).status, 400);
  // The next conversation (the first unit of A2) is no change of level: nothing more is pulled.
  view = (await moveTo(runtime, learnerId, view.road.rails)).data;
  turn = await talkHere(runtime, learnerId);
  assert.equal(turn.roadResult.worldEvent, undefined);
  view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.event, null);
  assert.equal(view.road.pulled.length, 1);
  // The save reads back whole (the storage's check of a road takes the pulls).
  const again = await runtime.service.loadEnvelope(learnerId);
  assert.deepEqual([again.road.pulled.length, again.road.pullsSeen], [1, 1]);
  // The second change of level takes the sites walked since, and the first ones sink again.
  view = (await jump(runtime, learnerId, { unitId: units[23].id, gate: true })).data;
  view = (await moveTo(runtime, learnerId, view.road.rails)).data;
  turn = await talkHere(runtime, learnerId);
  assert.deepEqual(turn.roadResult.worldEvent, { kind: 'pull', number: 2, from: 'A2', to: 'B1' });
  view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.event.number, 2);
  assert.ok(view.road.event.pull.sites.length >= 1 && !view.road.event.pull.sites.includes(start));
  view = (await seen(runtime, learnerId, 2)).data;
  assert.equal(siteDepths(view.road.pulled).get(start), 2 * PULL.depth);
  // The developer can forget the pulls, to watch one again.
  view = (await jump(runtime, learnerId, { unitId: units[11].id, gate: true, unpull: true })).data;
  assert.deepEqual([view.road.pulled, view.road.event], [[], null]);
});

test('the full pacing pulls at the gate of the last unit of a level', async (t) => {
  const { runtime, content, learnerId } = await roadRuntime(t); // streamlined off
  const units = content.curriculum.units;
  let view = (await jump(runtime, learnerId, { unitId: units[11].id, gate: true })).data;
  assert.equal(view.road.current, null);
  const gate = view.road.frontier.find((site) => site.offer.kind === 'checkpoint');
  assert.ok(gate, 'the unit\'s gate is offered');
  await moveTo(runtime, learnerId, gate.id);
  const turn = await talkHere(runtime, learnerId);
  assert.equal(turn.roadResult.passed, true);
  assert.deepEqual(turn.roadResult.worldEvent, { kind: 'pull', number: 1, from: 'A1', to: 'A2' });
  view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.event.pull.sites.length, 2);
});
