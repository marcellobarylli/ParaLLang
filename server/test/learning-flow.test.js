import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { api, createLearnerAndEncounter, createRuntime } from './helpers.js';

async function submit(runtime, learnerId, encounter, message, attemptId = crypto.randomUUID()) {
  return api(runtime, '/api/encounter/dialogue', {
    learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId, message },
  });
}

test('staged and one-turn contextual orders resolve from assessment, never narrator flags', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const first = await createLearnerAndEncounter(runtime);
  assert.equal(first.started.encounter.difficulty, .25);
  let response = await submit(runtime, first.learnerId, first.started.encounter, 'Un café, please.');
  assert.equal(response.status, 200);
  assert.equal(response.data.encounter.state, 'ongoing');
  assert.equal(response.data.encounter.currentObjective.id, 'no_milk');
  assert.equal(response.data.encounter.difficulty, .30);
  response = await submit(runtime, first.learnerId, response.data.encounter, 'Sin leche, please.');
  assert.equal(response.data.encounter.state, 'resolved');
  assert.equal(response.data.encounter.encounter_state, 'resolved');

  const second = await createLearnerAndEncounter(runtime);
  const complete = await submit(runtime, second.learnerId, second.started.encounter, 'I would like un café sin leche, please.');
  assert.equal(complete.data.encounter.state, 'resolved');
  assert.equal(complete.data.assessment.objectiveResults.every((result) => result.passed), true);
  assert.equal(runtime.provider.narrativeState, 'failed', 'fixture generator deliberately disagrees');
});

test('English-only, negated, quoted and off-topic target occurrences cannot resolve', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const cases = [
    ['I would like coffee without milk.', 'order_coffee'],
    ['Un café, but no sin leche, con leche.', 'no_milk'],
    ['Gerald said, "un café sin leche".', 'order_coffee'],
    ['Sin leche is two words near café.', 'order_coffee'],
    ['My friend takes café negro.', 'order_coffee'],
  ];
  for (const [message, expectedObjective] of cases) {
    const session = await createLearnerAndEncounter(runtime);
    const response = await submit(runtime, session.learnerId, session.started.encounter, message);
    assert.equal(response.status, 200, message);
    assert.equal(response.data.encounter.state, 'ongoing', message);
    assert.equal(response.data.encounter.currentObjective.id, expectedObjective, message);
    if (message.includes('no sin leche')) {
      const phrase = response.data.spellbook.cards.find((card) => card.vocabularyId === 'sin_leche');
      assert.equal(phrase.lastOutcome, null, 'failed/incidental phrase evidence must not advance its schedule');
      assert.equal(phrase.mastery, 'discovered');
    }
  }
});

test('invalid or failed grading is retryable and leaves encounter state unchanged', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  runtime.provider.invalidNextGrade = {
    objective_results: [{ objective_id: 'invented', passed: true, feedback: 'wrong', vocabulary_evidence: [] }],
    overall_feedback: 'wrong',
  };
  let response = await submit(runtime, session.learnerId, session.started.encounter, 'Un café.');
  assert.equal(response.status, 503);
  assert.equal(response.data.error.retryable, true);
  let current = await api(runtime, '/api/encounter/current', { learnerId: session.learnerId });
  assert.equal(current.data.encounter.version, session.started.encounter.version);
  assert.equal(current.data.encounter.committedPlayerTurns, 0);

  runtime.provider.invalidNextGrade = {
    objective_results: [
      { objective_id: 'order_coffee', passed: true, feedback: 'wrong evidence', vocabulary_evidence: [{ vocabulary_id: 'cafe', evidence: 'Un', quality: 5 }] },
      { objective_id: 'no_milk', passed: false, feedback: 'not passed', vocabulary_evidence: [] },
    ],
    overall_feedback: 'wrong',
  };
  response = await submit(runtime, session.learnerId, session.started.encounter, 'Un café.', crypto.randomUUID());
  assert.equal(response.status, 503);
  assert.equal(response.data.error.code, 'INVALID_GRADING');

  runtime.provider.failNextGrade = true;
  response = await submit(runtime, session.learnerId, session.started.encounter, 'Un café.', crypto.randomUUID());
  assert.equal(response.status, 503);
  current = await api(runtime, '/api/encounter/current', { learnerId: session.learnerId });
  assert.equal(current.data.encounter.committedPlayerTurns, 0);
});

test('unexpected server errors include their message only in the sanitized log', async (t) => {
  const logs = [];
  const app = createApp({
    service: { getSpellbook: async () => { throw new Error('storage read failed'); } },
    logger: { error: (line) => logs.push(line) },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/spellbook`);
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error.message, 'An unexpected server error occurred.');
  assert.match(logs[0], /^\[[0-9a-f-]+\] INTERNAL_ERROR storage read failed$/);
});

test('protected answers use one server hint budget and help makes no provider call', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  let encounter = session.started.encounter;
  const active = encounter.transcript.at(-1);
  assert.equal(Object.hasOwn(active.dialogue, 'translation'), false);
  assert.equal(active.dialogue.words.every((word) => !Object.hasOwn(word, 'meaning')), true);
  const providerCalls = runtime.provider.calls.length;

  let help = await api(runtime, '/api/encounter/help', {
    learnerId: session.learnerId, method: 'POST',
    body: { encounterId: encounter.id, version: encounter.version, messageId: active.id, kind: 'word', vocabularyId: 'cafe' },
  });
  assert.equal(help.data.charged, true);
  assert.equal(help.data.reveal.value, 'coffee');
  assert.equal(runtime.provider.calls.length, providerCalls);
  encounter = help.data.encounter;

  help = await api(runtime, '/api/encounter/help', {
    learnerId: session.learnerId, method: 'POST',
    body: { encounterId: encounter.id, version: encounter.version, messageId: active.id, kind: 'word', vocabularyId: 'cafe' },
  });
  assert.equal(help.data.charged, false);
  assert.equal(help.data.encounter.hints.remaining, 1);
  encounter = help.data.encounter;

  help = await api(runtime, '/api/encounter/help', {
    learnerId: session.learnerId, method: 'POST',
    body: { encounterId: encounter.id, version: encounter.version, messageId: active.id, kind: 'sentence' },
  });
  assert.equal(help.data.encounter.hints.remaining, 0);
  encounter = help.data.encounter;
  const exhausted = await api(runtime, '/api/encounter/help', {
    learnerId: session.learnerId, method: 'POST',
    body: { encounterId: encounter.id, version: encounter.version, messageId: active.id, kind: 'word', vocabularyId: 'sin_leche' },
  });
  assert.equal(exhausted.status, 409);
  assert.equal(exhausted.data.error.code, 'HINTS_EXHAUSTED');

  const graded = await submit(runtime, session.learnerId, encounter, 'Un café.');
  const cafeEvidence = graded.data.assessment.objectiveResults[0].vocabularyEvidence.find((item) => item.vocabularyId === 'cafe');
  assert.equal(cafeEvidence.quality, 5);
  assert.equal(cafeEvidence.effectiveQuality, 2);
});

test('due-review answer stays protected and Show answer commits quality 0 exactly once', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const challenge = await api(runtime, '/api/spellbook/review', { learnerId: session.learnerId, method: 'POST', body: { vocabularyId: 'cafe' } });
  assert.equal(Object.hasOwn(challenge.data.challenge, 'acceptedAnswers'), false);
  assert.equal(Object.hasOwn(challenge.data.challenge, 'answer'), false);
  const attemptId = crypto.randomUUID();
  const body = { challengeId: challenge.data.challenge.id, attemptId, action: 'reveal', answer: '' };
  const revealed = await api(runtime, '/api/spellbook/review/submit', { learnerId: session.learnerId, method: 'POST', body });
  assert.equal(revealed.data.result.effectiveQuality, 0);
  assert.equal(revealed.data.result.canonicalAnswer, 'coffee');
  assert.equal(revealed.data.spellbook.cards.find((card) => card.vocabularyId === 'cafe').lastOutcome, 0);
  const replayed = await api(runtime, '/api/spellbook/review/submit', { learnerId: session.learnerId, method: 'POST', body });
  assert.equal(replayed.data.replayed, true);
  assert.equal(replayed.data.result.nextReviewAt, revealed.data.result.nextReviewAt);
});
