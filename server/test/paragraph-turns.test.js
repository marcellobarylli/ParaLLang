// Round 131: a turn asks for an answer of about a paragraph. The conversation's view lists every objective still
// open, one long answer may meet several, both graders are told so, and a beginner's correction may be a paragraph.
import assert from 'node:assert/strict';
import test from 'node:test';
import { FixtureProvider, PassingProvider, createRuntime } from './helpers.js';
import { CORRECTION_MAX_LENGTH } from '../src/learning-service.js';
import { buildGradingMessages } from '../src/llm/prompt-builder.js';
import { loadGameContent } from '../src/content-loader.js';

const TUTORIAL = 'market_entrance_tutorial';
const PARAGRAPH = 'Buongiorno, Portia! Io sono Sam, and I walked here from the far side of the temple this morning. The market looks busier than I expected. E tu? I would like to know who keeps this gate.';

test('both graders are told an answer may be a paragraph that covers several objectives', () => {
  const content = loadGameContent({ language: 'it' });
  const { objectives } = content.encounters.get(TUTORIAL).encounter;
  const base = { language: content.language, objectives, vocabularyById: content.vocabularyById, conversationContext: ['Benvenuto!'], playerInput: PARAGRAPH, ordered: true };
  const line = /- The answer may be several sentences long and may cover several objectives at once, with small talk between\. Mark each objective on what the answer says for it; the rest is welcome and is not marked\./;
  assert.match(buildGradingMessages(base)[0].content, line);
  assert.match(buildGradingMessages({ ...base, beginner: true })[0].content, line);
  assert.match(buildGradingMessages({ ...base, beginner: true })[0].content, /One short paragraph at most, small talk included\./);
});

test('the view lists every open objective in order, and one answer of a paragraph meets them all', async (t) => {
  const content = loadGameContent({ language: 'it' });
  const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL });
  assert.deepEqual(encounter.openObjectives.map(({ id }) => id), ['greet', 'introduce', 'ask_back']);
  assert.deepEqual(encounter.openObjectives[0], { id: 'greet', prompt: 'Greet Portia in Italian.' });
  assert.deepEqual(encounter.currentObjective, encounter.openObjectives[0]);
  const turn = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'one', message: PARAGRAPH });
  assert.equal(turn.encounter.state, 'resolved');
  assert.deepEqual(turn.assessment.objectiveResults.map(({ passed }) => passed), [true, true, true]);
  assert.deepEqual(turn.encounter.openObjectives, []);
  assert.equal(turn.xpGained, 3 * 10 + 25);
});

test('the list shortens as objectives close, a part at a time', async (t) => {
  const content = loadGameContent({ language: 'it' });
  const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL });
  const turn = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'one', message: 'Ciao! Io sono Sam, and I came for the market.' });
  assert.deepEqual(turn.encounter.openObjectives.map(({ id }) => id), ['ask_back']);
  assert.equal(turn.encounter.currentObjective.id, 'ask_back');
});

test('a beginner\'s corrected paragraph is kept whole up to the new limit', async (t) => {
  assert.equal(CORRECTION_MAX_LENGTH, 600);
  const correction = `Buongiorno, Portia! Mi chiamo Sam. ${'Sono venuto dal tempio stamattina. '.repeat(13)}E tu, come ti chiami?`;
  assert.ok(correction.length > 450 && correction.length < CORRECTION_MAX_LENGTH);
  class Scripted extends FixtureProvider {
    grade() {
      return {
        objective_results: ['greet', 'introduce', 'ask_back'].map((id) => ({ objective_id: id, passed: false, attempted: true, feedback: 'Nearly.', vocabulary_evidence: [] })),
        overall_feedback: 'You said a good deal.', correction, correction_translation: 'Good morning, Portia! My name is Sam. …',
      };
    }
  }
  const runtime = await createRuntime({ language: 'it', provider: new Scripted() });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: TUTORIAL });
  const turn = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'one', message: 'Bungiorno Portia, me chiamo Sam, I came from the temple this morning, and you, come te chiame?', beginner: true });
  assert.equal(turn.assessment.correction.text, correction);
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.encounter.hearts.used, 1);
});
