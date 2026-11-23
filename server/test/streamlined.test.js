// Round 173: streamlined mode. On by default: each unit of the curriculum is one conversation, every site ahead
// offers the current unit's, finishing it completes the unit (whatever the score) and the next conversation is the
// next unit's. Switching it on completes a unit that an earlier conversation covered; switching it off gives the
// full pacing back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { composeUnit, emptyProgress, plan, record, streamlineProgress } from '../src/road/pacing.js';
import { moveTo, road, roadRuntime, setMode, talkHere } from './road-helpers.js';

test('streamlined, the plan offers only the current unit, in one conversation of the first objective of each lesson', () => {
  const { curriculum } = loadGameContent({ language: 'it' });
  const options = plan(curriculum, emptyProgress(), 0, { streamlined: true });
  assert.deepEqual(options.map(({ kind, unitId }) => [kind, unitId]), [['unit', 'greetings']]);
  assert.deepEqual(composeUnit(curriculum, 'greetings'), [['greetings_hello', 'greetings_hello__greet'], ['greetings_name', 'greetings_name__my_name'], ['greetings_fine', 'greetings_fine__i_am_fine']]);
  // A poor score still completes the unit.
  const after = record(emptyProgress(), { kind: 'unit', unitId: 'greetings', picks: composeUnit(curriculum, 'greetings') }, 0.2, 1);
  assert.equal(after.checkpoints.greetings.passed, true);
  assert.deepEqual(Object.keys(after.lessons), ['greetings_hello', 'greetings_name', 'greetings_fine']);
  assert.equal(plan(curriculum, after, 1, { streamlined: true })[0].unitId, 'origins');
  // Not streamlined, the plan is the full pacing.
  assert.equal(plan(curriculum, emptyProgress(), 0)[0].kind, 'lesson');
  // A unit with one lesson finished counts as complete when streamlined.
  const one = record(emptyProgress(), { kind: 'lesson', lessonId: 'greetings_hello', unitId: 'greetings' }, 1, 1);
  assert.equal(streamlineProgress(curriculum, one, 1).checkpoints.greetings.passed, true);
  assert.equal(streamlineProgress(curriculum, emptyProgress(), 0).checkpoints.greetings, undefined);
});

test('by default the road is streamlined: one conversation a unit, and the next one is the next unit at every site', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t, { streamlined: true });
  let view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.streamlined, true);
  assert.deepEqual([view.road.current.kind, view.road.current.unitTitle, view.road.current.title], ['unit', 'Hello and goodbye', 'Hello and goodbye']);
  assert.equal(view.road.gate.dungeon, null, 'no gates');
  const units = ['greetings', 'origins', 'courtesy', 'numbers'];
  for (const [index, unitId] of units.entries()) {
    assert.equal(view.road.current.unitId, unitId);
    const turn = await talkHere(runtime, learnerId);
    assert.equal(turn.encounter.state, 'resolved');
    view = (await road(runtime, learnerId)).data;
    assert.equal(view.curriculum.totals.unitsDone, index + 1);
    const next = units[index + 1];
    if (!next) break;
    assert.ok(view.road.frontier.every((site) => site.offer.kind === 'unit' && site.offer.unitId === next), 'every site ahead offers the next unit');
    view = (await moveTo(runtime, learnerId, view.road.frontier.at(-1).id)).data;
  }
});

test('switching streamlined on completes a unit begun, and switching it off gives the full pacing back', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t); // streamlined off
  let view = (await road(runtime, learnerId)).data;
  assert.equal(view.road.streamlined, false);
  assert.equal(view.road.current.kind, 'lesson');
  await talkHere(runtime, learnerId); // the first lesson of "Hello and goodbye"
  view = (await road(runtime, learnerId)).data;
  assert.equal(view.curriculum.position.unitId, 'greetings', 'the full pacing keeps the learner in the unit');
  view = (await setMode(runtime, learnerId, true)).data;
  assert.equal(view.road.streamlined, true);
  assert.equal(view.curriculum.position.unitId, 'origins', 'the unit one conversation covered is complete');
  assert.ok(view.road.frontier.every((site) => site.offer.kind === 'unit' && site.offer.unitId === 'origins'));
  view = (await moveTo(runtime, learnerId, view.road.rails)).data;
  assert.equal(view.road.current.unitId, 'origins');
  view = (await setMode(runtime, learnerId, false)).data;
  assert.equal(view.road.current.kind, 'lesson', 'the waiting unit conversation becomes the pacing\'s choice');
  assert.equal(view.road.current.unitId, 'origins');
  assert.equal((await setMode(runtime, learnerId, 'yes')).status, 400);
});
