// Round 156 (issue #6): the italic text is a narrator. The generated narration is asked for in a storybook voice that
// knows more than it says (the fixture test in encounters.test.js pins the prompt); the narrator also has written
// passages, told when the player sets out or arrives, and remembered in the save.
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';
import { matches, passageView, selectPassage, toSegments } from '../src/narration.js';
import { api, createRuntime } from './helpers.js';
import { moveTo, road, roadRuntime, talkHere } from './road-helpers.js';

const content = loadGameContent({ language: 'it' });
const byId = (id) => content.passagesById.get(id);

test('the narrator\'s rules: second person, present tense, an inventory\'s manner, and nothing explained', () => {
  const { narrator, narrator_voice: voice } = content.styleGuide;
  assert.match(voice, /storybook narrator.*second person and the present tense.*knows more than it says/);
  const rules = narrator.rules.join('\n');
  assert.match(rules, /"you" are the player, and the tense is the present/);
  assert.match(rules, /never speaks for the player, and never says what the player thinks, feels or decides/);
  assert.match(rules, /the way an old inventory describes it.*an implication left standing\. It does not finish the thought/);
  assert.match(rules, /never explains how the world works/);
  assert.match(rules, /At most once in a conversation it lets a hint stand, and most narratives have none/);
  assert.match(narrator.knows, /The world is a web\. Its roads are threads/);
});

test('the written passages keep the voice: told to "you", in the present, and none of them says what the narrator knows', () => {
  assert.ok(content.passages.length >= 20);
  for (const passage of content.passages) {
    assert.match(passage.text, /\b[Yy]ou(r)?\b|^The |^A |^Snow /, `${passage.id} is told to the player or describes what they see`);
    assert.doesNotMatch(passage.text, /\b(web|graph|stitched to|other worlds?|are threads)\b/i, `${passage.id} explains nothing`);
    assert.doesNotMatch(passage.text, /\byou (think|feel|decide|realise|realize|understand|wonder)\b/i, `${passage.id} does not speak for the player`);
    assert.ok(passage.text.split(/\s+/).length <= 60, `${passage.id} is short`);
  }
  // Some hint, with a word for sewing where a word for a road is expected; most do not.
  const hinting = content.passages.filter((passage) => /\b(thread|hem|seam|string|pulled tight|sleeve)\b/.test(passage.text));
  assert.ok(hinting.length >= 4 && hinting.length <= content.passages.length / 2);
});

test('choosing a passage: a once-only one first, then the most particular, and the place picks among equals', () => {
  const { passages } = content;
  assert.equal(matches(byId('ford_thread'), { event: 'road_arrive', way: 'ford', biome: 'forest' }), true);
  assert.equal(matches(byId('ford_thread'), { event: 'road_arrive', way: 'path' }), false);
  assert.equal(selectPassage(passages, { event: 'road_enter' }).id, 'road_first_step');
  assert.equal(selectPassage(passages, { event: 'road_enter' }, { told: { road_first_step: '2026-01-01T00:00:00.000Z' } }), null);
  // A path through a forest has its own passage; a path through water (no passage of its own) gets a general one.
  assert.equal(selectPassage(passages, { event: 'road_arrive', way: 'path', biome: 'forest' }).id, 'path_forest');
  const general = ['path_bends', 'path_unmended', 'path_host', 'path_milestone'];
  assert.deepEqual([0, 0.26, 0.51, 0.99].map((pick) => selectPassage(passages, { event: 'road_arrive', way: 'path', biome: 'water' }, { pick }).id), general);
  assert.deepEqual([0, 0.6].map((pick) => selectPassage(passages, { event: 'road_arrive', way: 'ferry', biome: 'shore' }, { pick }).id), ['ferry_rope', 'ferry_sky']);
  assert.equal(selectPassage(passages, { event: 'no_such_event' }), null);
  assert.equal(selectPassage([], { event: 'road_enter' }), null);
});

test('a passage is sent as segments, the shape that later holds spans of other kinds', () => {
  assert.deepEqual(toSegments('  You  walk.\n  The road goes on. '), [{ text: 'You walk. The road goes on.' }]);
  assert.deepEqual(passageView(byId('path_snow')), { id: 'path_snow', segments: [{ text: 'Snow lies on everything but the road. The road is clear, though nobody clears it.' }] });
  assert.equal(passageView(null), null);
});

test('the road: the first step is told once, each arrival has its passage, and the save remembers what was told', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  const first = (await road(runtime, learnerId)).data.road;
  assert.equal(first.narration.id, 'road_first_step');
  assert.match(first.narration.segments[0].text, /^You step onto the road\./);
  // Read again, it is the same (it is what was said of where the player stands).
  assert.equal((await road(runtime, learnerId)).data.road.narration.id, 'road_first_step');
  await talkHere(runtime, learnerId);
  const before = (await road(runtime, learnerId)).data.road;
  const target = before.frontier[0];
  const moved = (await moveTo(runtime, learnerId, target.id)).data.road;
  const passage = byId(moved.narration.id);
  assert.equal(passage.when.event, 'road_arrive');
  assert.equal(passage.when.way, target.way);
  if (passage.when.biome) assert.equal(passage.when.biome, target.biome);
  assert.equal((await road(runtime, learnerId)).data.road.narration.id, moved.narration.id);
  const save = await runtime.storage.load(learnerId);
  assert.deepEqual(Object.keys(save.told).sort(), ['road_first_step', moved.narration.id].sort());
  assert.equal(save.road.narration, moved.narration.id);
  // A new landscape: the first step is not told twice.
  const again = (await api(runtime, '/api/road/reset', { learnerId, method: 'POST', body: {} })).data.road;
  assert.equal(again.narration, null);
});

test('a dungeon: the site the player stands at has its passage, and a site without one has none', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const view = (await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId })).data;
  assert.equal(view.narration.id, 'ta_prohm_face_gate');
  const kiln = (await api(runtime, '/api/dungeons/the_kiln/map?client=121', { learnerId })).data;
  assert.equal(kiln.narration.id, 'the_kiln_face_gate');
  const moved = (await api(runtime, '/api/dungeons/the_kiln/move', { learnerId, method: 'POST', body: { siteId: 'buttress_tree', client: 121 } })).data;
  assert.equal(moved.narration, null);
});

test('a save keeps what was told, and drops anything in its place that is not that', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const envelope = await runtime.storage.load(learnerId);
  await runtime.storage.save({ ...envelope, told: { path_snow: '2026-01-15T12:00:00.000Z', bad: 7, worse: 'never' } });
  assert.deepEqual((await runtime.storage.load(learnerId)).told, { path_snow: '2026-01-15T12:00:00.000Z' });
  await runtime.storage.save({ ...envelope, told: ['x'] });
  assert.deepEqual((await runtime.storage.load(learnerId)).told, {});
});
