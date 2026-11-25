// Round 173: streamlined mode. On by default: each unit of the curriculum is one conversation, every site ahead
// offers the current unit's, finishing it completes the unit (whatever the score) and the next conversation is the
// next unit's. Switching it on completes a unit that an earlier conversation covered; switching it off gives the
// full pacing back.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { composeGatePart, composeUnit, emptyProgress, gateDue, plan, record, streamlineProgress } from '../src/road/pacing.js';
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
  // Round 185: the gate of the first three units is Ta Prohm, three conversations away.
  assert.deepEqual([view.road.gate.dungeon?.name, view.road.gate.hops], ['Ta Prohm', 3]);
  const units = ['greetings', 'origins', 'courtesy'];
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

// Round 185: after every three units, their gate in a legacy dungeon: three conversations, one for each unit, at
// three of the dungeon's sites, each counted whatever the score; the next unit opens after the third.
test('streamlined, three units end at their gate: one conversation for each, then the next unit', () => {
  const { curriculum } = loadGameContent({ language: 'it' });
  let progress = emptyProgress();
  const ids = curriculum.units.slice(0, 3).map((unit) => unit.id);
  for (const [index, unitId] of ids.entries()) {
    assert.equal(gateDue(curriculum, progress), null, 'no gate before the third unit');
    progress = record(progress, { kind: 'unit', unitId, picks: composeUnit(curriculum, unitId) }, 1, index + 1);
  }
  for (let part = 0; part < 3; part += 1) {
    const [only, ...rest] = plan(curriculum, progress, 3 + part, { streamlined: true });
    assert.deepEqual(rest, []);
    assert.deepEqual([only.kind, only.gateId, only.unitIds, only.part, only.unitId], ['gate', ids[2], ids, part, ids[part]]);
    const picks = composeGatePart(curriculum, ids[part]);
    assert.equal(picks.length, curriculum.units[part].lessons.length, 'one objective of each lesson');
    assert.ok(picks.every(([, objectiveId]) => !composeUnit(curriculum, ids[part]).some(([, asked]) => asked === objectiveId)) || curriculum.units[part].lessons.some((lesson) => lesson.objectives.length < 2), 'another objective than the unit conversation asked');
    progress = record(progress, { ...only, picks }, 0.1, 4 + part); // a poor score still counts
  }
  assert.equal(progress.gates[ids[2]].parts, 3);
  assert.deepEqual(plan(curriculum, progress, 6, { streamlined: true }).map(({ kind, unitId }) => [kind, unitId]), [['unit', curriculum.units[3].id]]);
  assert.equal(gateDue(curriculum, progress), null);
});

test('on the road the gate is entered three times, at three sites of Ta Prohm, and then the fourth unit waits', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t, { streamlined: true });
  let view = (await road(runtime, learnerId)).data;
  for (let unit = 0; unit < 3; unit += 1) {
    await talkHere(runtime, learnerId);
    view = (await road(runtime, learnerId)).data;
    if (unit < 2) view = (await moveTo(runtime, learnerId, view.road.rails)).data;
  }
  assert.equal(view.road.gate.hops, 0);
  const sites = [];
  for (let part = 1; part <= 3; part += 1) {
    assert.ok(view.road.frontier.every((site) => site.offer.kind === 'gate' && site.offer.dungeon?.name === 'Ta Prohm'), 'every way leads into the gate');
    view = (await moveTo(runtime, learnerId, view.road.rails)).data;
    assert.equal(view.road.current.kind, 'gate');
    assert.match(view.road.current.title, new RegExp(`^The gate, ${part} of 3: `));
    assert.equal(view.road.here.dungeon.name, 'Ta Prohm');
    sites.push(view.road.here.dungeon.siteId);
    const turn = await talkHere(runtime, learnerId);
    assert.equal(turn.encounter.state, 'resolved');
    assert.deepEqual([turn.roadResult?.kind, turn.roadResult?.part, turn.roadResult?.of], ['gate', part, 3]);
    view = (await road(runtime, learnerId)).data;
    assert.equal(view.curriculum.totals.unitsDone, 3, 'the fourth unit waits for the gate');
  }
  assert.equal(new Set(sites).size, 3, 'three sites of the dungeon');
  assert.equal(sites[0], 'face_gate', 'the first at its start');
  assert.ok(view.road.frontier.every((site) => site.offer.kind === 'unit' && site.offer.unitId === 'numbers'));
  assert.equal(view.road.gate.hops, 3);
});
