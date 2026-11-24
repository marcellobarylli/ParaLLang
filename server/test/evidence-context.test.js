// Round 092 (review R1.2 and R1.6 of the core server paths): grader evidence must stand in the answer at word
// boundaries; a reveal in an ordered encounter caps every objective the turn grades.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { atWordBoundaries } from '../src/learning-service.js';
import { createRuntime } from './helpers.js';

test('atWordBoundaries: inside a longer word is not; around the form, apostrophes and repeats are', () => {
  assert.equal(atWordBoundaries('vorrei un panettone', 'pane'), false);
  assert.equal(atWordBoundaries('quiero una cafetera', 'cafe'), false);
  assert.equal(atWordBoundaries('un caffè nero', 'caffè'), true);
  assert.equal(atWordBoundaries('no estás sola.', 'no estás sola'), true);
  assert.equal(atWordBoundaries("vorrei l'acqua", 'acqua'), true);
  assert.equal(atWordBoundaries('panettone e pane', 'pane'), true, 'a later occurrence counts');
  assert.equal(atWordBoundaries('pane', ''), false);
});

async function started(t) {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  return { runtime, service: runtime.service, learnerId, encounter };
}
const say = (service, learnerId, encounter, message) => service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });

// Round 177: the quote is dropped and nothing is recorded for it; the turn is no longer refused.
test('a form quoted from inside a longer word is never evidence; nothing is recorded for it', async (t) => {
  const { service, learnerId, encounter, runtime } = await started(t);
  const turn = await say(service, learnerId, encounter, 'Quiero una cafetera, por favor.');
  assert.equal(turn.assessment.objectiveResults[0].corrected, true, 'understood, closed as corrected');
  assert.deepEqual(turn.assessment.objectiveResults[0].vocabularyEvidence, []);
  const card = (await runtime.storage.load(learnerId)).spellbook.words.cafe;
  assert.ok(!card || card.evidence.length === 0, 'no evidence for café from "cafetera"');
});

test('ordered: a sentence reveal on the first objective caps the second closed in the same turn', async (t) => {
  const { service, learnerId, encounter } = await started(t);
  const active = encounter.transcript.at(-1);
  const help = await service.revealEncounterHelp(learnerId, { encounterId: encounter.id, version: encounter.version, messageId: active.id, kind: 'sentence' });
  const graded = await say(service, learnerId, help.encounter, 'Quiero un café sin leche.');
  const results = graded.assessment.objectiveResults;
  assert.deepEqual(results.map((r) => [r.objectiveId, r.passed]), [['order_coffee', true], ['no_milk', true]]);
  for (const result of results) for (const evidence of result.vocabularyEvidence) assert.equal(evidence.effectiveQuality, 2, `${result.objectiveId} ${evidence.vocabularyId}`);
});
