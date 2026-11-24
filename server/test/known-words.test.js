// Round 177: the owner's rule: a character says an objective's words first only when the learner has never met them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { roadRuntime, startHere } from './road-helpers.js';

const narrations = (provider) => provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');
const learningData = (call) => {
  const system = call.messages[0].content;
  const start = system.indexOf('ACTIVE LEARNING DATA: ') + 'ACTIVE LEARNING DATA: '.length;
  return JSON.parse(system.slice(start, system.indexOf('\n', start)));
};
const turnData = (call) => JSON.parse(call.messages.at(-1).content.split('TURN DATA: ').at(-1).trim());

test('a first lesson whose words are new models them, with the teaching note', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  await startHere(runtime, learnerId);
  const call = narrations(provider).at(-1);
  assert.ok(learningData(call).every((objective) => /are new to the player/.test(objective.intent)));
  assert.match(turnData(call).teaching_note ?? '', /never seen/);
  assert.equal(runtime.service.encounters.get(learnerId).known, undefined);
});

test('an objective whose words the learner has met is asked for as recall; with none new there is no teaching note', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  // The lesson waiting at the start, and every word of its objectives put in the Spellbook beforehand.
  const envelope = await runtime.storage.load(learnerId);
  const definition = runtime.service.roadDefinition(runtime.service.roadSession(runtime.service.roadOf(envelope), runtime.service.curriculum()));
  const [first, ...rest] = definition.encounter.objectives;
  runtime.service.discover(envelope, first.target_vocabulary_ids, new Date().toISOString(), 'test');
  await runtime.storage.save(envelope);
  await startHere(runtime, learnerId);
  let data = learningData(narrations(provider).at(-1));
  assert.match(data.find((objective) => objective.id === first.id).intent, /has met the words for it before\. .* never says them/);
  for (const other of rest) assert.match(data.find((objective) => objective.id === other.id).intent, /are new to the player/);
  assert.ok(turnData(narrations(provider).at(-1)).teaching_note, 'some words are still new');
  assert.deepEqual(runtime.service.encounters.get(learnerId).known, [first.id]);

  // All of them met: recall throughout, no note.
  const again = await runtime.storage.load(learnerId);
  for (const objective of definition.encounter.objectives) runtime.service.discover(again, objective.target_vocabulary_ids, new Date().toISOString(), 'test');
  await runtime.storage.save(again);
  await startHere(runtime, learnerId, { restart: true });
  const call = narrations(provider).at(-1);
  data = learningData(call);
  assert.ok(data.every((objective) => /has met the words for it before/.test(objective.intent)));
  assert.equal(turnData(call).teaching_note, undefined);
});
