// Round 155 (issue #3): the characters belong to the world. The narrator's prompt carries what everybody knows, what
// the character's region knows and one thing the character has noticed, and is told how to let it show and how to
// answer "what do you mean?".
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { loadGameContent, worldFor } from '../src/content-loader.js';
import { buildNarrationMessages } from '../src/llm/prompt-builder.js';
import { buildRoadDefinition, roadWorld } from '../src/road/encounters.js';
import { createTerrain } from '../src/road/terrain.js';
import { graphFor } from '../src/road/graph.js';
import { LightProvider, createRuntime } from './helpers.js';
import { roadRuntime, startHere } from './road-helpers.js';

const it = loadGameContent({ language: 'it' });
const es = loadGameContent({ language: 'es' });
const systemOf = (call) => call.messages[0].content;
const narrations = (runtime) => runtime.provider.calls.filter((call) => ['encounter_narration', 'light_turn'].includes(call.options.schemaName));

test('the content has the three layers: what everybody knows, a lore for each region, and something each character has noticed', () => {
  const { knowledge } = it;
  assert.ok(knowledge.global.length > 200);
  assert.deepEqual(Object.keys(knowledge.regions).sort(), ['dead_branch', 'micromort_mountain', 'the_long_way']);
  for (const { character } of it.encounters.values()) {
    assert.ok(character.world, `${character.name} has a world entry`);
    assert.ok(knowledge.regions[character.world.region], `${character.name}'s region exists`);
    assert.ok(character.world.noticed.length > 20);
  }
  const pools = knowledge.regions.the_long_way.noticed;
  assert.ok(pools.plain.length >= 8 && pools.knowing.length >= 6);
});

test('the layers are short, and none states what no character knows', () => {
  const { knowledge } = it;
  const words = (text) => text.split(/\s+/).length;
  assert.ok(words(knowledge.global) < 280, 'the global blurb is short'); // 220 until round 168 added the faith
  for (const region of Object.values(knowledge.regions)) assert.ok(words(region.lore) < 110, 'a region blurb is short');
  const everything = JSON.stringify(knowledge) + [...it.encounters.values()].map(({ character }) => character.world.noticed).join(' ');
  // The lore book, "What the book does not say": the roads are threads, the world is a web or a graph, stitched to others.
  assert.doesNotMatch(everything, /roads? (?:are|is) (?:a )?threads?|\bgraph\b|\bweb\b|stitched|other worlds/i);
});

// Round 168 (the owner, 2026-11-23): the world's main religion teaches that the place under the ground is hell. That
// keeps people from going there. Everybody knows the teaching; each person stands to it in their own way.
test('everybody knows the faith and its hell under the ground, and people stand to it differently', () => {
  const { knowledge } = it;
  assert.match(knowledge.global, /keep the one faith, more or less/);
  assert.match(knowledge.global, /the place under the ground is hell and that nobody should go down looking for it/);
  assert.match(knowledge.global, /some are devout and afraid, some go along, some\s+doubt what they have never seen for themselves/);
  const { plain, knowing } = knowledge.regions.the_long_way.noticed;
  const of = (pool, pattern) => pool.filter((line) => pattern.test(line));
  // Among ordinary people: the afraid, one who goes along, and one who has never seen it for themselves.
  assert.equal(of(plain, /in no hurry to see hell|where that door goes/).length, 2);
  assert.equal(of(plain, /I keep the faith the way I keep the gate/).length, 1);
  assert.equal(of(plain, /I have never seen it for myself/).length, 1);
  // Among those who have seen more: doubt of the people who teach it, not knowledge of what is there.
  assert.equal(of(knowing, /priests|preacher/).length, 2);
  // The faith is one thing among many a character may have noticed, not the only one.
  assert.ok(of(plain, /hell|faith|door goes/).length < plain.length / 2);
  // Nobody says what is truly below: no tree, cave, root of the world or void is in any line about it.
  for (const line of [...plain, ...knowing].filter((text) => /hell|faith|priest|preacher/.test(text))) assert.doesNotMatch(line, /tree|cave|void|abyss|chasm/i);
  // And it reaches a character's prompt with the rest of what everybody knows.
  assert.match(worldFor(knowledge, 'it', 'the_long_way', plain.at(-1)).global, /the place under the ground is hell/);
});

test('the road acts as a region the model knows, and nothing about that region is written into the content', () => {
  const file = readFileSync(resolve(import.meta.dirname, '..', '..', 'content', 'world', 'knowledge.yaml'), 'utf8');
  assert.equal(file.match(/Tuscany/g).length, 1); // the one name, in acts_as
  assert.doesNotMatch(file, /Ital(y|ian)|Florence|Siena|Chianti|cypress|olive|Spain|Madrid/i);
  const world = worldFor(it.knowledge, 'it', 'the_long_way', 'A thing noticed.');
  assert.match(world.region, /This region is this world's Tuscany\. You know Tuscany well/);
  assert.match(world.region, /Never say "Tuscany" or name its country: nobody here has heard of either\./);
  assert.match(worldFor(es.knowledge, 'es', 'the_long_way', 'x').region, /this world's Castile/);
  assert.doesNotMatch(worldFor(it.knowledge, 'it', 'dead_branch', 'x').region, /this world's/);
  assert.equal(worldFor(it.knowledge, 'it', 'no_such_region', 'x'), null);
  assert.equal(worldFor(null, 'it', 'dead_branch', 'x'), null);
});

test('with the layers the narrator\'s prompt has the world block after the character; without them it is as before', () => {
  const base = { language: it.language, character: it.character, styleGuide: it.styleGuide, locationName: 'The Coffee Cart', vocabularyById: it.vocabularyById, objectives: it.encounter.objectives, targetRatio: 0.25 };
  const plain = buildNarrationMessages(base)[0].content;
  const world = worldFor(it.knowledge, 'it', it.character.world.region, it.character.world.noticed);
  const told = buildNarrationMessages({ ...base, world })[0].content;
  assert.doesNotMatch(plain, /THE WORLD Gerald LIVES IN/);
  assert.equal(told.replace(/\n\nTHE WORLD Gerald LIVES IN[\s\S]*?(?=\n\nSTYLE:)/, ''), plain);
  assert.match(told, /Character quirks: [^\n]+\n\nTHE WORLD Gerald LIVES IN\. Gerald was born in it and takes all of it for granted: a fish does not know it is in water\./);
  assert.match(told, /- What everybody knows: Everyone here speaks the one language/);
  assert.match(told, /- Gerald's own region: The market stands among the roots of an old temple/);
  assert.match(told, /- Something Gerald has noticed: The beans come up a road on which nobody has ever seen a cart\./);
  assert.match(told, /in about one reply in three and never more than once in a reply, let one small detail of this world show in passing/);
  assert.match(told, /If the player asks what Gerald means by such a remark, Gerald answers, in character, with what Gerald has seen or been told/);
  assert.match(told, /Never a refusal, never "I do not know what you mean", and never the nature of the world\./);
  assert.match(told, /These details are never the answer to an objective/);
});

test('an authored conversation carries it in the greeting, in a strict reply and in a light turn', async (t) => {
  const runtime = await createRuntime({ language: 'it', provider: new LightProvider([{ meant: 'Hello.', target: 'Ciao.', clean: true, objectives_met: ['greet'] }]) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' });
  const light = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'a', message: 'Ciao', light: true });
  runtime.provider.grade = () => ({ objective_results: light.encounter.openObjectives.map(({ id }) => ({ objective_id: id, passed: false, feedback: 'Still wanted.', vocabulary_evidence: [] })), overall_feedback: 'Not yet.' });
  await runtime.service.submitDialogue(learnerId, { encounterId: light.encounter.id, version: light.encounter.version, attemptId: 'b', message: 'boh' });
  const prompts = narrations(runtime).map(systemOf);
  assert.equal(prompts.length, 3);
  for (const prompt of prompts) {
    assert.match(prompt, /THE WORLD Portia LIVES IN/);
    assert.match(prompt, /Something Portia has noticed: Her sign says one thing on Tuesdays/);
  }
});

test('a generated character of the road: an ordinary observation at the A levels, a knowing one from B1 on, fixed by the seed', async (t) => {
  const { knowledge, curriculum, language } = it;
  const seed = 4242;
  const node = graphFor(seed, createTerrain).node(graphFor(seed, createTerrain).start);
  const pools = knowledge.regions.the_long_way.noticed;
  const seen = { plain: new Set(), knowing: new Set() };
  for (let step = 0; step < 40; step += 1) {
    const plain = roadWorld(knowledge, 'it', { seed, node, step, cefr: 'A1' });
    const knowing = roadWorld(knowledge, 'it', { seed, node, step, cefr: 'B1' });
    assert.ok(pools.plain.includes(plain.noticed));
    assert.ok(pools.knowing.includes(knowing.noticed));
    assert.deepEqual(roadWorld(knowledge, 'it', { seed, node, step, cefr: 'A1' }), plain);
    seen.plain.add(plain.noticed);
    seen.knowing.add(knowing.noticed);
  }
  assert.ok(seen.plain.size >= 5 && seen.knowing.size >= 4, 'the draw varies with the step');
  assert.ok(pools.plain.includes(roadWorld(knowledge, 'it', { seed, node, step: 0, cefr: 'A2' }).noticed));
  // The definition of a first lesson (A1) and of a lesson of the last stage (B1).
  const first = curriculum.units[0].lessons[0];
  const last = curriculum.units.at(-1).lessons[0];
  const build = (lesson) => buildRoadDefinition({ curriculum, language, seed, node, step: 3, activity: { kind: 'lesson', lessonId: lesson.id }, currentUnitId: null, knowledge });
  assert.ok(pools.plain.includes(build(first).world.noticed));
  assert.ok(pools.knowing.includes(build(last).world.noticed));
  assert.match(build(first).world.region, /this world's Tuscany/);
  assert.equal(buildRoadDefinition({ curriculum, language, seed, node, step: 3, activity: { kind: 'lesson', lessonId: first.id }, currentUnitId: null }).world, null);
  // And the narrator of a road conversation is told it.
  const { runtime, learnerId } = await roadRuntime(t);
  await startHere(runtime, learnerId);
  const prompt = systemOf(narrations(runtime)[0]);
  assert.match(prompt, /THE WORLD [\w ]+ LIVES IN/);
  assert.match(prompt, /this world's Tuscany/);
  assert.ok(pools.plain.some((line) => prompt.includes(line)));
});
