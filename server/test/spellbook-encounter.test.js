// Round 017: while an encounter is under way the Spellbook snapshot says so and reviews are closed (create and
// submit, including a challenge issued before the encounter); cards carry the entry's note.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { api, createLearnerAndEncounter, createRuntime, finishEncounter } from './helpers.js';

const closed = (error) => error.code === 'IN_ENCOUNTER';

test('reviews are closed while an encounter is under way and open again after it', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const { learnerId, started } = session;
  assert.equal(started.spellbook.inEncounter, true);
  assert.equal((await runtime.service.getSpellbook(learnerId)).inEncounter, true);
  await assert.rejects(runtime.service.createReviewChallenge(learnerId), closed);
  await assert.rejects(runtime.service.createReviewChallenge(learnerId, 'sin_leche'), closed);
  const http = await api(runtime, '/api/spellbook/review', { learnerId, method: 'POST', body: { vocabularyId: 'cafe' } });
  assert.equal(http.status, 409);
  assert.equal(http.data.error.code, 'IN_ENCOUNTER');

  const resolved = await finishEncounter(runtime, session);
  assert.equal(resolved.spellbook.inEncounter, false);
  const review = await runtime.service.createReviewChallenge(learnerId, 'cafe');
  assert.equal(review.challenge.vocabularyId, 'cafe');
  assert.equal(review.spellbook.inEncounter, false);

  // A challenge issued between encounters cannot be submitted (or replayed) once the next one is under way.
  const answered = await runtime.service.submitReview(learnerId, { challengeId: review.challenge.id, attemptId: randomUUID(), action: 'answer', answer: 'coffee' });
  const pending = await runtime.service.createReviewChallenge(learnerId, 'sin_leche');
  const restarted = await runtime.service.startEncounter(learnerId, { restart: true });
  assert.equal(restarted.spellbook.inEncounter, true);
  await assert.rejects(runtime.service.submitReview(learnerId, { challengeId: pending.challenge.id, attemptId: randomUUID(), action: 'reveal', answer: '' }), closed);
  await assert.rejects(runtime.service.submitReview(learnerId, { challengeId: pending.challenge.id, attemptId: randomUUID(), action: 'answer', answer: 'no milk' }), closed);
  assert.ok(answered.result);
});

test('cards carry the authored note', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId, started } = await createLearnerAndEncounter(runtime);
  for (const card of started.spellbook.cards) assert.equal(card.note, runtime.content.vocabularyById.get(card.vocabularyId).note ?? null);
  const noted = [...runtime.content.vocabularyById.values()].find((entry) => entry.note);
  assert.ok(noted, 'the pack has an entry with a note');
  const envelope = structuredClone(await runtime.service.loadEnvelope(learnerId));
  runtime.service.discover(envelope, [noted.id], new Date().toISOString(), 'test');
  assert.equal(runtime.service.spellbookSnapshot(envelope).cards.find((card) => card.vocabularyId === noted.id).note, noted.note);
});
