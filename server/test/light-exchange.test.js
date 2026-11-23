// Round 154 (issue #2): a light conversation is an exchange of three to five of the player's turns. Before the third
// it goes on even when every objective is met; from the third it ends once none is open; the fifth ends it whatever
// is open. The model is told where the turn stands and is asked to follow up and to invite questions back.
import assert from 'node:assert/strict';
import test from 'node:test';
import { LightProvider, createRuntime } from './helpers.js';
import { answer, road, roadRuntime, startHere } from './road-helpers.js';
import { LIGHT_EXCHANGE } from '../src/learning-service.js';
import { scoreOf } from '../src/road/pacing.js';

const TUTORIAL = 'market_entrance_tutorial';
const none = { meant: 'Something else.', target: 'Qualcos\'altro.', clean: true, objectives_met: [] };
const all = { meant: 'Hello, I am Ada. And you?', target: 'Ciao, mi chiamo Ada. E tu?', clean: true, objectives_met: ['greet', 'introduce', 'ask_back'] };
const turnData = (call) => JSON.parse(call.messages.at(-1).content.split('TURN DATA: ').at(-1).trim());
const lightCalls = (runtime) => runtime.provider.calls.filter((call) => call.options.schemaName === 'light_turn');

async function open(t, queue) {
  const runtime = await createRuntime({ language: 'it', provider: new LightProvider(queue) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL });
  let n = 0;
  const say = (message, session, extra = { light: true }) => runtime.service.submitDialogue(learnerId, { encounterId: session.id, version: session.version, attemptId: `attempt-${n += 1}`, message, ...extra });
  return { runtime, learnerId, encounter, say };
}

test('the exchange is three to five turns', () => {
  assert.deepEqual(LIGHT_EXCHANGE, { min: 3, max: 5 });
});

test('every objective met on the first turn: the conversation goes on to the third turn and ends there', async (t) => {
  const { runtime, encounter, say } = await open(t, [all, none, none]);
  assert.deepEqual(encounter.exchange, { turn: 0, min: 3, max: 5 });
  const first = await say('Ciao, mi chiamo Ada. E tu?', encounter);
  assert.equal(first.encounter.state, 'ongoing');
  assert.deepEqual(first.encounter.openObjectives, []);
  assert.equal(first.encounter.currentObjective, null);
  assert.deepEqual(first.encounter.exchange, { turn: 1, min: 3, max: 5 });
  assert.equal(first.xpGained, 30); // three objectives; the conversation is not finished
  const second = await say('E cosa fai qui?', first.encounter);
  assert.equal(second.encounter.state, 'ongoing');
  const third = await say('Grazie, a presto!', second.encounter);
  assert.equal(third.encounter.state, 'resolved');
  assert.equal(third.xpGained, 25);
  // What the model was told of each turn.
  const told = lightCalls(runtime).map((call) => turnData(call));
  assert.deepEqual(told.map((turn) => [turn.exchange.turn, turn.exchange.min, turn.exchange.max]), [[1, 3, 5], [2, 3, 5], [3, 3, 5]]);
  assert.match(told[0].exchange.ending, /^Not yet: the conversation goes on/);
  assert.match(told[1].exchange.ending, /^Not yet/);
  assert.match(told[2].exchange.ending, /^If no objective is left open after this answer, this reply is the last/);
  assert.deepEqual(told[1].open_objectives, []);
});

test('an objective still open keeps the conversation going past the third turn, and the fifth turn ends it', async (t) => {
  const partly = { ...none, objectives_met: ['greet'] };
  const { runtime, encounter, say } = await open(t, [partly, none, none, none, none]);
  let turn = await say('Ciao!', encounter);
  for (let k = 2; k <= 4; k += 1) {
    turn = await say(`chat ${k}`, turn.encounter);
    assert.equal(turn.encounter.state, 'ongoing', `turn ${k}`);
    assert.deepEqual(turn.encounter.openObjectives.map((objective) => objective.id), ['introduce', 'ask_back']);
  }
  turn = await say('chat 5', turn.encounter);
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.xpGained, 25);
  assert.match(turnData(lightCalls(runtime).at(-1)).exchange.ending, /^Now: this reply is the last of the conversation, whatever is still open/);
  assert.match(turnData(lightCalls(runtime).at(-2)).exchange.ending, /^If no objective is left open/);
});

test('the last objective met on the fourth turn ends the conversation there', async (t) => {
  const { encounter, say } = await open(t, [none, none, none, all]);
  let turn = await say('uno', encounter);
  turn = await say('due', turn.encounter);
  turn = await say('tre', turn.encounter);
  assert.equal(turn.encounter.state, 'ongoing');
  turn = await say('Ciao, mi chiamo Ada. E tu?', turn.encounter);
  assert.equal(turn.encounter.state, 'resolved');
});

test('the model is asked to follow up on what was said, to answer questions and to invite them', async (t) => {
  const { runtime, encounter, say } = await open(t, [none]);
  await say('Ciao', encounter);
  const prompt = lightCalls(runtime)[0].messages.at(-1).content;
  assert.match(prompt, /a real back-and-forth of `exchange\.min` to `exchange\.max` of the player's turns/);
  assert.match(prompt, /Respond first to what the player actually said, and follow up on it/);
  assert.match(prompt, /If the player asked Portia something, answer it properly, in character, before anything else/);
  assert.match(prompt, /Invite the player to ask something back/);
  assert.match(prompt, /`exchange\.ending`; follow it exactly/);
});

test('with every objective met and the exchange still going there is nothing to hint at, and a strict answer is read lightly', async (t) => {
  const { runtime, learnerId, encounter, say } = await open(t, [all, none]);
  const first = await say('Ciao, mi chiamo Ada. E tu?', encounter);
  assert.deepEqual(first.encounter.hints, { used: 0, remaining: 0, limit: 0, baseLimit: 0, strained: false });
  const line = first.encounter.transcript.at(-1);
  await assert.rejects(() => runtime.service.revealEncounterHelp(learnerId, { encounterId: first.encounter.id, version: first.encounter.version, kind: 'sentence', messageId: line.id }), (error) => error.code === 'HINTS_EXHAUSTED');
  // The player switched back to Strict: there is no objective to mark, so the turn is a light one all the same.
  const second = await say('E poi?', first.encounter, {});
  assert.equal(second.assessment.light, true);
  assert.equal(runtime.provider.calls.filter((call) => call.options.schemaName === 'dialogue_assessment').length, 0);
});

test('a strict conversation still ends when its objectives are met, on any turn', async (t) => {
  const runtime = await createRuntime({ language: 'es' });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  const turn = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'a', message: 'Quiero un café negro.' });
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.encounter.exchange.turn, 1);
});

test('the road: an objective never met counts nothing, and one met cleanly counts in full', async (t) => {
  assert.equal(scoreOf({ total: 3, missed: 1 }), 2 / 3);
  assert.equal(scoreOf({ total: 3, missed: 1, corrected: 2 }), 1 / 3);
  assert.equal(scoreOf({ total: 3, missed: 3 }), 0);
  assert.equal(scoreOf({ total: 3, corrected: 1, hinted: 1 }), 2 / 3); // as before round 154
  const { runtime, learnerId } = await roadRuntime(t);
  const provider = runtime.provider;
  const narrate = provider.narrate.bind(provider);
  let n = 0;
  provider.narrate = (messages) => {
    const reply = narrate(messages);
    const turn = JSON.parse(messages.at(-1).content.split('TURN DATA: ').at(-1).trim());
    if (turn.task !== 'light_turn') return reply;
    n += 1;
    // The first turn meets the first objective cleanly; nothing else is ever met.
    return { ...reply, player: { meant: 'm', target: 't', clean: true, objectives_met: n === 1 ? [turn.open_objectives[0].id] : [] } };
  };
  const started = await startHere(runtime, learnerId);
  const total = started.data.encounter.openObjectives.length;
  assert.ok(total >= 2);
  let turn = await answer(runtime, learnerId, started.data.encounter, 'uno', { light: true });
  for (let k = 2; k <= 5; k += 1) turn = await answer(runtime, learnerId, turn.encounter, `chat ${k}`, { light: true });
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.roadResult.score, Math.round((1 / total) * 100) / 100);
  assert.equal((await road(runtime, learnerId)).data.road.step, 1);
});
