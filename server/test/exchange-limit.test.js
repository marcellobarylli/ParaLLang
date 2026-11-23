// Round 174: every conversation is complete on the player's third reply (strict: sooner when every objective is
// met), and after that the player may keep chatting: such a turn is answered, keeps the conversation complete and
// changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EXCHANGE_LIMIT } from '../src/learning-service.js';
import { answer, fullAnswer, road, roadRuntime, startHere } from './road-helpers.js';

const limited = (t, extra = {}) => roadRuntime(t, { serviceOptions: { exchangeLimit: EXCHANGE_LIMIT }, ...extra });

test('the game\'s limit is three replies, and light mode\'s exchange is held to it', async (t) => {
  assert.equal(EXCHANGE_LIMIT, 3);
  const { runtime } = await limited(t);
  assert.deepEqual(runtime.service.lightExchange(), { min: 3, max: 3 });
});

test('a strict conversation with nothing said right is complete on the third reply, and counts as played', async (t) => {
  const { runtime, learnerId } = await limited(t);
  let { encounter } = (await startHere(runtime, learnerId)).data;
  assert.deepEqual(encounter.exchange.limit, 3);
  for (const turn of [1, 2, 3]) {
    const result = await answer(runtime, learnerId, encounter, 'Non lo so.');
    encounter = result.encounter;
    assert.equal(encounter.exchange.turn, turn);
    assert.equal(encounter.state, turn < 3 ? 'ongoing' : 'resolved', `reply ${turn}`);
    if (turn === 3) {
      assert.equal(result.roadResult.score, 0, 'nothing met counts nothing, but the conversation is over');
      assert.deepEqual([encounter.currentObjective, encounter.openObjectives], [null, []], 'nothing is left to do');
    }
  }
  const view = (await road(runtime, learnerId)).data;
  assert.deepEqual([view.road.step, view.road.current], [1, null]);
});

test('every objective met ends it at once; then the player may keep chatting, which changes nothing', async (t) => {
  const { runtime, learnerId } = await limited(t, { streamlined: true });
  let { encounter } = (await startHere(runtime, learnerId)).data;
  const done = await answer(runtime, learnerId, encounter, fullAnswer(runtime, learnerId));
  assert.equal(done.encounter.state, 'resolved');
  assert.equal(done.encounter.exchange.turn, 1);
  const before = (await road(runtime, learnerId)).data;
  assert.equal(before.curriculum.position.unitId, 'origins');
  // Without asking to chat, a complete conversation takes no answer.
  await assert.rejects(answer(runtime, learnerId, done.encounter, 'Ciao ancora.'), /already complete/);
  encounter = done.encounter;
  for (const message of ['Come va?', 'Ciao, a presto!']) {
    const chat = await answer(runtime, learnerId, encounter, message, { chat: true });
    assert.equal(chat.encounter.state, 'resolved');
    assert.equal(chat.encounter.transcript.length, encounter.transcript.length + 2, 'the reply is in the conversation');
    assert.deepEqual([chat.xpGained, chat.assessment, chat.roadResult], [0, null, undefined]);
    encounter = chat.encounter;
  }
  const after = (await road(runtime, learnerId)).data;
  assert.deepEqual([after.road.step, after.curriculum.totals], [before.road.step, before.curriculum.totals]);
});
