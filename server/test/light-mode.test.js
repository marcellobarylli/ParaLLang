// Round 153 (issue #1): light mode beside strict mode. In light mode nothing is checked: one call to the model returns
// what the player meant, the same in correct target language, the open objectives that meaning fulfils, and the
// character's reply. The model here is scripted: it returns what light_turn.txt asks a model for.
import assert from 'node:assert/strict';
import test from 'node:test';
import { LightProvider, createRuntime } from './helpers.js';
import { answer, moveTo, road, roadRuntime, startHere } from './road-helpers.js';
import { lightTurnSchema } from '../src/llm/schemas.js';
import { LIGHT_QUALITY } from '../src/learning-service.js';

const TUTORIAL = 'market_entrance_tutorial';

const calls = (runtime, name) => runtime.provider.calls.filter((call) => call.options.schemaName === name);
const turnData = (call) => JSON.parse(call.messages.at(-1).content.split('TURN DATA: ').at(-1).trim());

async function open(t, queue) {
  const runtime = await createRuntime({ language: 'it', provider: new LightProvider(queue) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL });
  let n = 0;
  const say = (message, session, extra = { light: true }) => runtime.service.submitDialogue(learnerId, { encounterId: session.id, version: session.version, attemptId: `attempt-${n += 1}`, message, ...extra });
  return { runtime, learnerId, encounter, say };
}

test('a light answer is one call to the model: no grader, and the reply holds what the player meant', async (t) => {
  const { runtime, encounter, say } = await open(t, [{ meant: 'Good morning! My name is Luigione.', target: 'Buongiorno! Mi chiamo Luigione.', clean: false, objectives_met: ['greet', 'introduce'] }]);
  const before = runtime.provider.calls.length;
  const turn = await say('Good morning! Me chiamo Luigione.', encounter);
  assert.equal(runtime.provider.calls.length, before + 1);
  assert.equal(calls(runtime, 'dialogue_assessment').length, 0);
  const [call] = calls(runtime, 'light_turn');
  assert.equal(call.options.schemaName, 'light_turn');
  // The model is told nothing is marked, is given the answer and the open objectives, and is asked for the four fields.
  const told = turnData(call);
  assert.equal(told.task, 'light_turn');
  assert.equal(told.player_answer, 'Good morning! Me chiamo Luigione.');
  assert.deepEqual(told.open_objectives.map((objective) => objective.id), ['greet', 'introduce', 'ask_back']);
  assert.match(call.messages.at(-1).content, /Nothing is marked right or wrong/);
  assert.match(call.messages.at(-1).content, /`meant`.*`target`.*`clean`.*`objectives_met`/s);
  assert.match(call.messages.at(-1).content, /Do not correct the player/);
  // The two objectives close on the model's word; the third stays open.
  assert.equal(turn.encounter.state, 'ongoing');
  assert.deepEqual(turn.encounter.openObjectives.map((objective) => objective.id), ['ask_back']);
  assert.equal(turn.assessment.light, true);
  assert.equal(turn.assessment.overallFeedback, 'Good morning! My name is Luigione.');
  assert.deepEqual(turn.assessment.correction, { text: 'Buongiorno! Mi chiamo Luigione.', translation: 'Good morning! My name is Luigione.', heartLost: false, light: true });
  assert.deepEqual(turn.assessment.objectiveResults.map(({ objectiveId, passed }) => [objectiveId, passed]), [['greet', true], ['introduce', true], ['ask_back', false]]);
  // No heart is spent, and experience is earned as in strict mode.
  assert.deepEqual(turn.encounter.hearts, { used: 0, limit: 3 });
  assert.equal(turn.xpGained, 20);
  // The character's reply is in the conversation.
  assert.equal(turn.encounter.transcript.at(-1).role, 'npc');
  assert.equal(turn.encounter.transcript.at(-2).text, 'Good morning! Me chiamo Luigione.');
});

test('objectives close in any order, and an unknown id is ignored', async (t) => {
  const { encounter, say } = await open(t, [
    { meant: 'What is your name?', target: 'Come ti chiami?', clean: true, objectives_met: ['ask_back', 'no_such_objective'] },
    { meant: 'Hello, I am Ada.', target: 'Ciao, mi chiamo Ada.', clean: true, objectives_met: ['greet', 'introduce'] },
  ]);
  const first = await say('Come ti chiami?', encounter);
  assert.deepEqual(first.encounter.openObjectives.map((objective) => objective.id), ['greet', 'introduce']);
  assert.equal(first.assessment.correction, undefined); // a clean answer brings no corrected sentence
  const second = await say('Ciao, mi chiamo Ada.', first.encounter);
  assert.deepEqual(second.encounter.openObjectives, []);
  assert.equal(second.xpGained, 2 * 10);
});

test('an answer that fulfils nothing closes nothing and still gets a reply', async (t) => {
  const { encounter, say } = await open(t, [{ meant: 'The weather is nice.', target: 'Fa bel tempo.', clean: false, objectives_met: [] }]);
  const turn = await say('nice weather', encounter);
  assert.equal(turn.encounter.state, 'ongoing');
  assert.equal(turn.encounter.openObjectives.length, 3);
  assert.equal(turn.encounter.committedPlayerTurns, 1);
  assert.equal(turn.xpGained, 0);
});

test('the Spellbook records a target the player wrote themselves, and not one the model put in their mouth', async (t) => {
  const { runtime, learnerId, encounter, say } = await open(t, [{ meant: 'Hello! My name is Ada.', target: 'Ciao! Mi chiamo Ada.', clean: false, objectives_met: ['greet', 'introduce'] }]);
  await say('Ciao! My name is Ada.', encounter);
  const save = await runtime.storage.load(learnerId);
  const said = (id) => (save.spellbook.words[id] ?? save.spellbook.phrases[id])?.evidence.filter((item) => item.kind === 'dialogue') ?? [];
  assert.deepEqual(said('ciao').map(({ objectiveId, quality, passed }) => [objectiveId, quality, passed]), [['greet', LIGHT_QUALITY, true]]);
  assert.deepEqual(said('mi_chiamo'), []);
});

test('strict mode is unchanged: without `light` the grader is asked and the narrator after it', async (t) => {
  const { runtime, encounter, say } = await open(t, []);
  const turn = await say('Ciao!', encounter, {});
  assert.equal(calls(runtime, 'light_turn').length, 0);
  assert.equal(calls(runtime, 'dialogue_assessment').length, 1);
  assert.equal(turn.assessment.light, undefined);
});

test('a strict answer after a light one that closed out of order grades what is still open, in no fixed order', async (t) => {
  const { runtime, encounter, say } = await open(t, [{ meant: 'What is your name?', target: 'Come ti chiami?', clean: true, objectives_met: ['ask_back'] }]);
  const first = await say('Come ti chiami?', encounter);
  await say('Ciao!', first.encounter, {});
  const rubric = calls(runtime, 'dialogue_assessment')[0].messages[0].content;
  assert.match(rubric, /"id":"greet"/);
  assert.match(rubric, /"id":"introduce"/);
  assert.doesNotMatch(rubric, /"id":"ask_back"/);
  assert.doesNotMatch(rubric, /- ORDER:/);
});

test('a replayed light attempt returns its receipt and calls nobody', async (t) => {
  const { runtime, learnerId, encounter } = await open(t, [{ meant: 'Hello.', target: 'Ciao.', clean: true, objectives_met: ['greet'] }]);
  const request = { encounterId: encounter.id, version: encounter.version, attemptId: 'same', message: 'Ciao.', light: true };
  const first = await runtime.service.submitDialogue(learnerId, request);
  const count = runtime.provider.calls.length;
  const again = await runtime.service.submitDialogue(learnerId, request);
  assert.equal(again.replayed, true);
  assert.equal(runtime.provider.calls.length, count);
  assert.deepEqual(again.assessment, first.assessment);
});

test('a reply without the player block is refused as a provider failure and changes nothing', async (t) => {
  const { runtime, learnerId, encounter, say } = await open(t, [undefined]);
  await assert.rejects(() => say('Ciao', encounter), (error) => error.code === 'PROVIDER_FAILURE' && error.retryable === true);
  assert.equal(runtime.service.encounters.get(learnerId).version, encounter.version);
});

test('the light schema is the narration schema with the player block', () => {
  const narration = { narrative: 'n', dialogue: { speaker: 's', native: 'x', translation: 'y', words: [] }, must_translate: false, difficulty: 1, hints_available: false, encounter_state: 'ongoing' };
  assert.equal(lightTurnSchema.safeParse(narration).success, false);
  assert.equal(lightTurnSchema.safeParse({ ...narration, player: { meant: 'a', target: 'b', clean: true, objectives_met: [] } }).success, true);
  assert.equal(lightTurnSchema.safeParse({ ...narration, player: { meant: 'a', target: 'b', clean: true, objectives_met: [], extra: 1 } }).success, false);
});

test('on the road a light conversation counts for the curriculum: clean objectives in full, mended ones as corrected', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  const queue = [];
  const provider = runtime.provider;
  const narrate = provider.narrate.bind(provider);
  provider.narrate = (messages) => {
    const reply = narrate(messages);
    const turn = JSON.parse(messages.at(-1).content.split('TURN DATA: ').at(-1).trim());
    return turn.task === 'light_turn' ? { ...reply, player: queue.shift()(turn) } : reply;
  };
  const started = await startHere(runtime, learnerId);
  const all = (turn) => ({ meant: 'Everything at once.', target: 'Tutto insieme.', clean: false, objectives_met: turn.open_objectives.map((objective) => objective.id) });
  queue.push(all, all, all);
  let turn = await answer(runtime, learnerId, started.data.encounter, 'everything at once', { light: true });
  turn = await answer(runtime, learnerId, turn.encounter, 'and some talk', { light: true });
  turn = await answer(runtime, learnerId, turn.encounter, 'and a goodbye', { light: true });
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.roadResult.kind, 'lesson');
  assert.equal(turn.roadResult.score, 0.5); // every objective met, none cleanly
  const view = await road(runtime, learnerId);
  assert.equal(view.data.road.step, 1);
  // The way on is open as after a strict conversation.
  const next = view.data.road.frontier[0];
  assert.equal((await moveTo(runtime, learnerId, next.id)).status, 200);
});
