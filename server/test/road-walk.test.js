// Round 144: the whole curriculum, walked on rails in each language with every objective said cleanly. Every lesson
// is played and passes the engine's own evidence check, every gate opens the next unit, and when the last unit is
// done the road goes on as review. About ten seconds a language.
import test from 'node:test';
import assert from 'node:assert/strict';
import { moveTo, road, roadRuntime, talkHere } from './road-helpers.js';

for (const language of ['it', 'es']) {
  test(`the whole curriculum can be walked in ${language}: every lesson, every gate, then review without end`, async (t) => {
    const { runtime, content, learnerId } = await roadRuntime(t, { language });
    const { curriculum } = content;
    let view = (await road(runtime, learnerId)).data;
    const played = [];
    const sites = new Set([view.road.at]);
    const walk = async () => {
      const turn = await talkHere(runtime, learnerId);
      played.push(turn.roadResult);
      view = (await road(runtime, learnerId)).data;
      const next = view.road.frontier.find((site) => site.recommended);
      assert.ok(next, 'the road always goes on');
      assert.ok(!sites.has(next.id), 'to a site not yet visited');
      sites.add(next.id);
      assert.equal((await moveTo(runtime, learnerId, next.id)).status, 200);
    };
    // Five conversations a unit when all is said cleanly (three lessons, a review, the gate), and some to spare.
    const limit = curriculum.units.length * 6;
    while (!view.curriculum.complete && played.length < limit) await walk();
    assert.equal(view.curriculum.complete, true, `finished within ${limit} conversations (played ${played.length})`);
    assert.deepEqual(view.curriculum.totals, { lessonsDone: curriculum.lessonsById.size, lessonsTotal: curriculum.lessonsById.size, unitsDone: curriculum.units.length, unitsTotal: curriculum.units.length });
    assert.equal(played.filter((result) => result.kind === 'lesson').length, curriculum.lessonsById.size, 'every lesson once');
    assert.equal(played.filter((result) => result.kind === 'checkpoint' && result.passed).length, curriculum.units.length, 'every gate passed');
    assert.ok(played.filter((result) => result.kind === 'review').length >= curriculum.units.length, 'a review in every unit');
    assert.ok(played.every((result) => result.score === 1));
    assert.deepEqual(played.at(-1).opened, { complete: true });
    assert.equal(view.curriculum.position, null);
    assert.ok(view.curriculum.stages.every((stage) => stage.units.every((unit) => unit.state === 'done')));
    // After the last gate the road does not end: review, and old lessons for the asking.
    for (let n = 0; n < 4; n += 1) await walk();
    assert.deepEqual(played.slice(-4).map((result) => result.kind), ['review', 'review', 'review', 'review']);
    assert.ok(view.road.frontier.some((site) => site.offer.kind === 'repair'), 'an old lesson is on offer beside the review');
    // The save stays bounded however long the walk: the trail, the cleared sites and the journal are capped.
    const save = await runtime.storage.load(learnerId);
    assert.ok(save.road.trail.length <= 300 && save.road.cleared.length <= 300 && save.road.log.length === 30);
    assert.ok(JSON.stringify(save).length < 400_000, `${JSON.stringify(save).length} bytes`);
  });
}
