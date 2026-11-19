// Round 129: beginner mode. A beginner who tries to say the right thing and gets the Italian wrong is understood,
// shown the correct sentence, and moves on, at the cost of one heart. The grader here is scripted: it returns what
// the beginner prompt asks a model for. The first case is the owner's own answer to Portia.
import assert from 'node:assert/strict';
import test from 'node:test';
import { FixtureProvider, createRuntime } from './helpers.js';
import { BEGINNER_HEARTS, CORRECTION_MAX_LENGTH } from '../src/learning-service.js';
import { beginnerGradingResponseSchema, gradingResponseSchema } from '../src/llm/schemas.js';
import { buildGradingMessages } from '../src/llm/prompt-builder.js';
import { loadGameContent } from '../src/content-loader.js';

const TUTORIAL = 'market_entrance_tutorial';
const OWNERS = 'Bungiorno! Me chiamo Luigione. Come te chiame?';
const CORRECT = 'Buongiorno! Mi chiamo Luigione. Come ti chiami?';

// Grading replies from a queue, each a function of nothing; narration is the fixture's.
class ScriptedGrader extends FixtureProvider {
  constructor(queue) { super(); this.queue = [...queue]; }
  grade() { return this.queue.shift(); }
}
const result = (id, { passed = false, attempted = passed, evidence = [] } = {}) => ({
  objective_id: id, passed, attempted, feedback: passed ? 'Yes.' : attempted ? 'Nearly: check the spelling.' : 'Still wanted.',
  vocabulary_evidence: evidence.map(([vocabulary_id, text]) => ({ vocabulary_id, evidence: text, quality: 4 })),
});
const graded = (results, correction = null, translation = null) => ({ objective_results: results, overall_feedback: 'You got your meaning across.', correction, correction_translation: translation });
// The scripted verdicts.
const ALL_TRIED = graded([result('greet', { attempted: true }), result('introduce', { attempted: true }), result('ask_back', { attempted: true })], CORRECT, 'Good morning! My name is Luigione. What is your name?');
const GREET_TRIED = graded([result('greet', { attempted: true }), result('introduce'), result('ask_back')], 'Buongiorno!', 'Good morning!');
const NOTHING = graded([result('greet'), result('introduce'), result('ask_back')]);
const GREET_RIGHT = graded([result('greet', { passed: true, evidence: [['ciao', 'Ciao']] }), result('introduce'), result('ask_back')]);

async function open(t, queue) {
  const runtime = await createRuntime({ language: 'it', provider: new ScriptedGrader(queue) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL });
  let n = 0;
  const say = (message, session, { beginner = true, attemptId = `attempt-${n += 1}` } = {}) => runtime.service.submitDialogue(learnerId, { encounterId: session.id, version: session.version, attemptId, message, ...(beginner ? { beginner } : {}) });
  return { runtime, learnerId, encounter, say };
}
const gradingCalls = (runtime) => runtime.provider.calls.filter((call) => call.options.schemaName === 'dialogue_assessment');
const narrationCalls = (runtime) => runtime.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');

test("the owner's answer to Portia: understood, corrected, one heart, and the conversation moves on", async (t) => {
  const { runtime, encounter, say } = await open(t, [ALL_TRIED]);
  assert.deepEqual(encounter.hearts, { used: 0, limit: BEGINNER_HEARTS });
  const turn = await say(OWNERS, encounter);
  // The grader was asked as a teacher of beginners.
  assert.match(gradingCalls(runtime)[0].messages[0].content, /marking the answer of a complete beginner/);
  // All three objectives close for one heart.
  assert.equal(turn.encounter.state, 'resolved');
  assert.deepEqual(turn.encounter.hearts, { used: 1, limit: BEGINNER_HEARTS });
  assert.deepEqual(turn.assessment.correction, { text: CORRECT, translation: 'Good morning! My name is Luigione. What is your name?', heartLost: true });
  assert.deepEqual(turn.assessment.objectiveResults.map(({ objectiveId, passed, corrected }) => [objectiveId, passed, corrected]), [['greet', true, true], ['introduce', true, true], ['ask_back', true, true]]);
  // The character is told they were corrected, and how to take it.
  const told = JSON.parse(narrationCalls(runtime).at(-1).messages.at(-1).content.split('TURN DATA: ').at(-1)).authoritative_decision;
  assert.equal(told.encounterState, 'resolved');
  assert.deepEqual(told.objectiveResults, [{ objectiveId: 'greet', passed: true, corrected: true }, { objectiveId: 'introduce', passed: true, corrected: true }, { objectiveId: 'ask_back', passed: true, corrected: true }]);
  assert.match(told.corrected_note, /Answer what the player meant\. Do not mock the slips/);
  // Experience for three objectives and the resolve; no review schedule moved on words written wrongly.
  assert.equal(turn.xpGained, 3 * 10 + 25);
  assert.ok(turn.spellbook.cards.every((card) => card.repetitions === 0));
});

test('a correct answer costs no heart and brings no correction', async (t) => {
  const { encounter, say } = await open(t, [GREET_RIGHT]);
  const turn = await say('Ciao!', encounter);
  assert.equal(turn.assessment.correction, undefined);
  assert.deepEqual(turn.encounter.hearts, { used: 0, limit: BEGINNER_HEARTS });
  assert.deepEqual(turn.assessment.objectiveResults.map(({ passed, corrected }) => [passed, corrected]), [[true, undefined], [false, undefined], [false, undefined]]);
  assert.equal(turn.encounter.currentObjective.id, 'introduce');
});

test('an answer that tries nothing closes nothing and costs nothing, even if the grader writes a correction', async (t) => {
  const { encounter, say } = await open(t, [NOTHING, graded(NOTHING.objective_results, 'Ciao!', 'Hello!')]);
  const first = await say('Hello there, I am Sam.', encounter);
  assert.equal(first.assessment.correction, undefined);
  assert.deepEqual(first.encounter.hearts, { used: 0, limit: BEGINNER_HEARTS });
  assert.equal(first.encounter.currentObjective.id, 'greet');
  const second = await say('Good day to you.', first.encounter);
  assert.equal(second.assessment.correction, undefined); // nothing was attempted: there is nothing of the player's to correct
  assert.equal(second.encounter.hearts.used, 0);
  assert.equal(second.encounter.currentObjective.id, 'greet');
});

test('one heart at most for an answer; a slip beside a correct objective still costs it', async (t) => {
  // The greeting is right, the name is tried with a slip: both close, one heart.
  const mixed = graded([result('greet', { passed: true, evidence: [['ciao', 'Ciao']] }), result('introduce', { attempted: true }), result('ask_back')], 'Ciao! Mi chiamo Luigione.', 'Hello! My name is Luigione.');
  const { encounter, say } = await open(t, [mixed]);
  const turn = await say('Ciao! Me chiamo Luigione.', encounter);
  assert.equal(turn.encounter.hearts.used, 1);
  assert.equal(turn.assessment.correction.heartLost, true);
  assert.deepEqual(turn.assessment.objectiveResults.map(({ passed, corrected }) => [passed, corrected]), [[true, undefined], [true, true], [false, undefined]]);
  assert.equal(turn.encounter.currentObjective.id, 'ask_back');
  assert.equal(turn.xpGained, 20);
});

test('in order: an objective tried after one not tried waits; the tried greeting alone moves on', async (t) => {
  const skipped = graded([result('greet'), result('introduce', { attempted: true }), result('ask_back')], 'Mi chiamo Luigione.', 'My name is Luigione.');
  const { encounter, say } = await open(t, [skipped, GREET_TRIED]);
  const first = await say('Me chiamo Luigione.', encounter);
  // A correction was shown and paid for, but the greeting is still first in line.
  assert.equal(first.encounter.currentObjective.id, 'greet');
  assert.equal(first.assessment.correction.text, 'Mi chiamo Luigione.');
  assert.deepEqual(first.assessment.objectiveResults.map(({ passed }) => passed), [false, false, false]);
  const second = await say('Bungiorno!', first.encounter);
  assert.equal(second.encounter.currentObjective.id, 'introduce');
});

test('three slips in three answers spend the three hearts, one each, and still finish the conversation', async (t) => {
  // The grader marks only the objectives still open.
  const tried = (open, id, text) => graded(open.map((each) => result(each, { attempted: each === id })), text, 'x');
  const { encounter, say } = await open(t, [GREET_TRIED, tried(['introduce', 'ask_back'], 'introduce', 'Mi chiamo Sam.'), tried(['ask_back'], 'ask_back', 'Come ti chiami?')]);
  let turn = await say('Bungiorno!', encounter);
  assert.equal(turn.encounter.hearts.used, 1);
  turn = await say('Me chiamo Sam.', turn.encounter);
  assert.equal(turn.encounter.hearts.used, 2);
  assert.equal(turn.encounter.currentObjective.id, 'ask_back');
  turn = await say('Come te chiame?', turn.encounter);
  assert.equal(turn.encounter.hearts.used, 3);
  assert.equal(turn.encounter.state, 'resolved');
});

test('the fourth mistake of a conversation is shown its correction and stays where it is; Start over restores the hearts', async (t) => {
  const { runtime, learnerId, encounter } = await open(t, []);
  // A conversation with every heart spent.
  runtime.service.encounters.get(learnerId).heartsUsed = BEGINNER_HEARTS;
  runtime.provider.queue.push(GREET_TRIED);
  const turn = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'spent', message: 'Bungiorno!', beginner: true });
  assert.deepEqual(turn.assessment.correction, { text: 'Buongiorno!', translation: 'Good morning!', heartLost: false });
  assert.deepEqual(turn.encounter.hearts, { used: BEGINNER_HEARTS, limit: BEGINNER_HEARTS });
  assert.equal(turn.encounter.currentObjective.id, 'greet');
  assert.deepEqual(turn.assessment.objectiveResults.map(({ passed, corrected }) => [passed, corrected]), [[false, undefined], [false, undefined], [false, undefined]]);
  assert.equal(turn.xpGained, 0);
  const again = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL, restart: true });
  assert.deepEqual(again.encounter.hearts, { used: 0, limit: BEGINNER_HEARTS });
});

test('a resent answer replays its response and costs no second heart', async (t) => {
  const { runtime, encounter, say } = await open(t, [GREET_TRIED]);
  const first = await say('Bungiorno!', encounter, { attemptId: 'same' });
  const replay = await say('Bungiorno!', encounter, { attemptId: 'same' });
  assert.equal(replay.replayed, true);
  assert.equal(replay.encounter.hearts.used, 1);
  assert.deepEqual(replay.assessment.correction, first.assessment.correction);
  assert.equal(gradingCalls(runtime).length, 1);
});

test('a correction is trimmed to one line and a length; a blank one is none', async (t) => {
  const long = `  Buongiorno!\n\n${'a'.repeat(CORRECTION_MAX_LENGTH + 50)}`;
  const { encounter, say } = await open(t, [graded(GREET_TRIED.objective_results, long, 'x'), graded([result('introduce', { attempted: true }), result('ask_back')], '   ', null)]);
  const turn = await say('Bungiorno!', encounter);
  assert.equal(turn.assessment.correction.text.length, CORRECTION_MAX_LENGTH);
  assert.ok(turn.assessment.correction.text.startsWith('Buongiorno! aaa'));
  // Tried, but the grader wrote no correction: nothing to show, nothing forgiven, no heart.
  const blank = await say('Me chiamo Sam.', turn.encounter);
  assert.equal(blank.assessment.correction, undefined);
  assert.equal(blank.encounter.hearts.used, 1);
  assert.equal(blank.encounter.currentObjective.id, 'introduce');
});

test('without the flag the strict grader is asked exactly as before, and its verdict stands', async (t) => {
  const content = loadGameContent({ language: 'it' });
  const { objectives } = content.encounters.get(TUTORIAL).encounter;
  const base = { language: content.language, objectives, vocabularyById: content.vocabularyById, conversationContext: ['Benvenuto!'], playerInput: OWNERS, ordered: true };
  const strict = buildGradingMessages(base);
  assert.deepEqual(buildGradingMessages({ ...base, beginner: false }), strict);
  assert.match(strict[0].content, /You are a strict contextual Italian-learning assessor/);
  assert.match(strict[0].content, /never write a Italian expression that would satisfy it/);
  const kind = buildGradingMessages({ ...base, beginner: true });
  assert.match(kind[0].content, /kind and exact Italian teacher/);
  assert.match(kind[0].content, /`correction`: when at least one objective is attempted/);
  assert.match(kind[0].content, /Never scold/);
  assert.match(kind[0].content, /ORDER: these objectives are met in the order given/);
  assert.deepEqual(kind[1], strict[1]);
  // The strict schema refuses the beginner's fields and the beginner schema requires them.
  assert.equal(gradingResponseSchema.safeParse(ALL_TRIED).success, false);
  assert.equal(beginnerGradingResponseSchema.safeParse(ALL_TRIED).success, true);
  assert.equal(beginnerGradingResponseSchema.safeParse({ objective_results: [{ objective_id: 'greet', passed: false, feedback: 'x', vocabulary_evidence: [] }], overall_feedback: 'x' }).success, false);
  // A strict turn: the old shape in, no correction out, no heart spent.
  const strictVerdict = { objective_results: ['greet', 'introduce', 'ask_back'].map((id) => ({ objective_id: id, passed: false, feedback: 'Not yet.', vocabulary_evidence: [] })), overall_feedback: 'Not yet.' };
  const { runtime, encounter, say } = await open(t, [strictVerdict]);
  const turn = await say(OWNERS, encounter, { beginner: false });
  assert.match(gradingCalls(runtime)[0].messages[0].content, /strict contextual/);
  assert.equal(turn.assessment.correction, undefined);
  assert.equal(turn.encounter.hearts.used, 0);
  assert.equal(turn.encounter.currentObjective.id, 'greet');
});
