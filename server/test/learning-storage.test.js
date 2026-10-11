import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { api, createLearnerAndEncounter, createRuntime, FixtureProvider, fixedNow } from './helpers.js';

test('discovery is deduplicated, unmastered, durable, and isolated per learner', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const first = await createLearnerAndEncounter(runtime);
  const duplicateStart = await api(runtime, '/api/encounter/start', { learnerId: first.learnerId, method: 'POST', body: {} });
  assert.equal(duplicateStart.data.encounter.id, first.started.encounter.id);
  assert.equal(duplicateStart.data.spellbook.cards.filter((card) => card.vocabularyId === 'cafe').length, 1);
  assert.equal(duplicateStart.data.spellbook.cards.find((card) => card.vocabularyId === 'cafe').mastery, 'discovered');
  const secondIdentity = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const secondBook = await api(runtime, '/api/spellbook', { learnerId: secondIdentity.data.learnerId });
  assert.deepEqual(secondBook.data.cards, []);

  const recoveredStorage = new JsonLearningStorage({ saveDir: runtime.saveDir });
  const recoveredService = new LearningService({ provider: new FixtureProvider(), storage: recoveredStorage, content: runtime.content, clock: () => fixedNow });
  const recovered = await recoveredService.getSpellbook(first.learnerId);
  assert.deepEqual(recovered, duplicateStart.data.spellbook);
});

test('same-learner mutations serialize, stale tabs conflict, and duplicate delivery replays once', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const baseBody = { encounterId: session.started.encounter.id, version: session.started.encounter.version, message: 'Un café.' };
  const [first, second] = await Promise.all([
    api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: { ...baseBody, attemptId: randomUUID() } }),
    api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: { ...baseBody, attemptId: randomUUID() } }),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [200, 409]);
  const committed = first.status === 200 ? first : second;
  const attemptId = randomUUID();
  const nextBody = { encounterId: committed.data.encounter.id, version: committed.data.encounter.version, message: 'Sin leche.', attemptId };
  const success = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: nextBody });
  const replay = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: nextBody });
  assert.equal(success.status, 200);
  assert.equal(replay.data.replayed, true);
  assert.equal(replay.data.encounter.version, success.data.encounter.version);
  const conflict = await api(runtime, '/api/encounter/dialogue', {
    learnerId: session.learnerId, method: 'POST', body: { ...nextBody, message: 'different input' },
  });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.data.error.code, 'ATTEMPT_REUSE');
});

test('dialogue and review receipts replay after service restart; old uncommitted challenges do not', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const attemptId = randomUUID();
  const request = { encounterId: session.started.encounter.id, version: session.started.encounter.version, message: 'Un café sin leche.', attemptId };
  const committed = await runtime.service.submitDialogue(session.learnerId, request);
  const service2 = new LearningService({ provider: new FixtureProvider(), storage: new JsonLearningStorage({ saveDir: runtime.saveDir }), content: runtime.content, clock: () => fixedNow });
  const replay = await service2.submitDialogue(session.learnerId, request);
  assert.equal(replay.replayed, true);
  assert.equal(replay.encounter.version, committed.encounter.version);

  const challenge = await runtime.service.createReviewChallenge(session.learnerId, 'cafe');
  await assert.rejects(
    service2.submitReview(session.learnerId, { challengeId: challenge.challenge.id, attemptId: randomUUID(), action: 'answer', answer: 'coffee' }),
    (error) => error.code === 'STALE_CHALLENGE',
  );
});

test('premature practice gives feedback without advancing the stored schedule', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const due = await runtime.service.createReviewChallenge(session.learnerId, 'cafe');
  const reviewed = await runtime.service.submitReview(session.learnerId, {
    challengeId: due.challenge.id, attemptId: randomUUID(), action: 'answer', answer: 'coffee',
  });
  const before = reviewed.spellbook.cards.find((card) => card.vocabularyId === 'cafe').nextReviewAt;
  const practice = await runtime.service.createReviewChallenge(session.learnerId, 'cafe');
  assert.equal(practice.challenge.practice, true);
  const result = await runtime.service.submitReview(session.learnerId, {
    challengeId: practice.challenge.id, attemptId: randomUUID(), action: 'answer', answer: 'coffee',
  });
  assert.equal(result.result.scheduleChanged, false);
  assert.equal(result.result.nextReviewAt, before);
});

test('an atomic save failure returns no success and leaves encounter/review state uncommitted', async (t) => {
  const base = await createRuntime();
  t.after(base.close);
  const wrapper = {
    failNext: false,
    load: (...args) => base.storage.load(...args),
    save: async (...args) => {
      if (wrapper.failNext) { wrapper.failNext = false; throw Object.assign(new Error('simulated full disk'), { retryable: true, status: 503, code: 'STORAGE_FAILURE' }); }
      return base.storage.save(...args);
    },
  };
  const service = new LearningService({ provider: base.provider, storage: wrapper, content: base.content, clock: () => fixedNow });
  const learner = await service.createOrRecoverLearner();
  const started = await service.startEncounter(learner.learnerId);
  wrapper.failNext = true;
  await assert.rejects(
    service.submitDialogue(learner.learnerId, { encounterId: started.encounter.id, version: started.encounter.version, attemptId: randomUUID(), message: 'Un café.' }),
    /simulated full disk/,
  );
  const current = await service.currentEncounter(learner.learnerId);
  assert.equal(current.encounter.version, started.encounter.version);
  assert.equal(current.encounter.committedPlayerTurns, 0);
});

test('corrupt and unsupported saves are preserved and reported', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  for (const raw of ['{not-json', JSON.stringify({ schemaVersion: 999, learnerId: randomUUID(), spellbook: {} })]) {
    const learnerId = randomUUID();
    const filePath = runtime.storage.filePath(learnerId);
    const actual = raw.includes('999') ? raw.replace(/"learnerId":"[^"]+"/, `"learnerId":"${learnerId}"`) : raw;
    await writeFile(filePath, actual, 'utf8');
    const response = await api(runtime, '/api/learner', { method: 'POST', body: { learnerId } });
    assert.equal(response.status, 503);
    assert.equal(response.data.error.code, 'SAVE_UNREADABLE');
    assert.equal(await readFile(filePath, 'utf8'), actual);
  }
});

test('persisted full-flow simulation recovers the exact review schedule', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  let encounter = session.started.encounter;
  const messageId = encounter.transcript.at(-1).id;
  const helped = await runtime.service.revealEncounterHelp(session.learnerId, {
    encounterId: encounter.id, version: encounter.version, messageId, kind: 'word', vocabularyId: 'cafe',
  });
  encounter = helped.encounter;
  const passed = await runtime.service.submitDialogue(session.learnerId, {
    encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.',
  });
  assert.equal(passed.encounter.state, 'resolved');
  const review = await runtime.service.createReviewChallenge(session.learnerId, 'sin_leche');
  const answered = await runtime.service.submitReview(session.learnerId, {
    challengeId: review.challenge.id, attemptId: randomUUID(), action: 'answer', answer: 'no milk',
  });
  assert.equal(answered.result.effectiveQuality, 5);
  const expected = answered.spellbook.cards.find((card) => card.vocabularyId === 'sin_leche').nextReviewAt;
  const recreated = new LearningService({ provider: new FixtureProvider(), storage: new JsonLearningStorage({ saveDir: runtime.saveDir }), content: runtime.content, clock: () => fixedNow });
  const recovered = await recreated.getSpellbook(session.learnerId);
  assert.equal(recovered.cards.find((card) => card.vocabularyId === 'sin_leche').nextReviewAt, expected);
});
