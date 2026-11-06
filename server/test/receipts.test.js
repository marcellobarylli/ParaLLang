// Round 093 (backlog F13): a save keeps only its newest assessment receipts, without Spellbook snapshots, and a
// resend whose receipt was pruned is refused as stale, never applied twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRuntime, fixedNow } from './helpers.js';
import { JsonLearningStorage, RECEIPT_LIMIT, pruneReceipts } from '../src/learning-storage.js';

const at = (minutes) => new Date(fixedNow.getTime() + minutes * 60000).toISOString();
const receipt = (committedAt) => ({ kind: 'dialogue', payloadHash: 'x', committedAt, response: {} });
const saved = async (runtime, learnerId) => JSON.parse(await readFile(runtime.storage.filePath(learnerId), 'utf8'));
const cards = (envelope) => JSON.stringify({ words: envelope.spellbook.words, phrases: envelope.spellbook.phrases });
const WRONG = 'Hola amigo, no sé.';
const RIGHT = 'Quiero un café negro.';

test('pruneReceipts keeps the newest by committedAt, out of entry order; under the limit nothing changes', () => {
  assert.equal(RECEIPT_LIMIT, 20);
  const processed = {};
  const order = Array.from({ length: 25 }, (_, i) => (i * 7) % 25); // a permutation of 0..24
  for (const minute of order) processed[`id-${minute}`] = receipt(at(minute));
  pruneReceipts(processed);
  assert.deepEqual(Object.keys(processed).sort(), Array.from({ length: 20 }, (_, i) => `id-${i + 5}`).sort());
  const small = { a: receipt(at(1)), b: receipt(at(0)) };
  pruneReceipts(small);
  assert.deepEqual(Object.keys(small), ['a', 'b']);
});

test('pruneReceipts always keeps the receipt just written: equal times with integer-like ids, a clock that stepped back', () => {
  // Integer-like keys enumerate first ("3", "10"), so entry order is not write order (critique 1.3).
  const tied = { a: receipt(at(0)), 3: receipt(at(0)), 10: receipt(at(0)) };
  pruneReceipts(tied, { keepId: 'a', limit: 2 });
  assert.equal(Object.keys(tied).length, 2);
  assert.ok(Object.hasOwn(tied, 'a'));
  const numeric = { a: receipt(at(0)), 3: receipt(at(0)), 10: receipt(at(0)) };
  pruneReceipts(numeric, { keepId: 10, limit: 1 }); // a numeric attempt id from a JSON body
  assert.deepEqual(Object.keys(numeric), ['10']);
  // The newest receipt has the oldest time (critique 1.2).
  const back = { old1: receipt(at(5)), old2: receipt(at(6)), fresh: receipt(at(-60)) };
  pruneReceipts(back, { keepId: 'fresh', limit: 2 });
  assert.deepEqual(Object.keys(back).sort(), ['fresh', 'old2']);
  // An unreadable committedAt counts as the oldest.
  const odd = { bad: receipt('not a date'), x: receipt(at(0)), y: receipt(at(1)) };
  pruneReceipts(odd, { limit: 2 });
  assert.deepEqual(Object.keys(odd).sort(), ['x', 'y']);
});

async function playCycles(service, learnerId, cycles, first = false) {
  const requests = [];
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    let { encounter } = await service.startEncounter(learnerId, { restart: !(first && cycle === 0) });
    for (const message of [WRONG, WRONG, WRONG, WRONG, RIGHT]) {
      const request = { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message };
      ({ encounter } = await service.submitDialogue(learnerId, request));
      requests.push(request);
    }
    assert.equal(encounter.state, 'resolved');
  }
  return requests;
}

test('25 turns keep 20 receipts without a Spellbook; the newest replays, a pruned one is stale and changes nothing', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  const requests = await playCycles(service, learnerId, 5, true);
  const before = await saved(runtime, learnerId);
  const receipts = before.spellbook.processedAssessments;
  assert.equal(Object.keys(receipts).length, RECEIPT_LIMIT);
  assert.ok(Object.values(receipts).every((item) => !('spellbook' in item.response)));
  assert.ok(Object.hasOwn(receipts, requests.at(-1).attemptId));
  assert.ok(!Object.hasOwn(receipts, requests[0].attemptId));

  const replay = await service.submitDialogue(learnerId, requests.at(-1));
  assert.equal(replay.replayed, true);
  assert.equal(replay.encounter.state, 'resolved');
  // The replay's Spellbook is rebuilt from the save as it is now.
  assert.deepEqual(replay.spellbook, runtime.service.spellbookSnapshot(before));

  await assert.rejects(service.submitDialogue(learnerId, requests[0]), { code: 'STALE_ENCOUNTER' });
  const after = await saved(runtime, learnerId);
  assert.equal(cards(after), cards(before));
  assert.deepEqual(Object.keys(after.spellbook.processedAssessments).sort(), Object.keys(receipts).sort());
});

test('a review whose receipt was pruned is STALE_CHALLENGE when resent, and its card is not graded again', async (t) => {
  let now = fixedNow.getTime();
  const runtime = await createRuntime({ clock: () => new Date(now) });
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  await playCycles(service, learnerId, 1, true);
  now += 3 * 24 * 3600 * 1000;
  const { challenge } = await service.createReviewChallenge(learnerId);
  assert.ok(challenge);
  const request = { challengeId: challenge.id, attemptId: randomUUID(), action: 'reveal' };
  const reviewed = await service.submitReview(learnerId, request);
  assert.equal('spellbook' in (await saved(runtime, learnerId)).spellbook.processedAssessments[request.attemptId].response, false);
  assert.ok(reviewed.spellbook);
  assert.equal((await service.submitReview(learnerId, request)).replayed, true); // still kept: replays
  now += 60000;
  await playCycles(service, learnerId, 4);
  const before = await saved(runtime, learnerId);
  assert.ok(!Object.hasOwn(before.spellbook.processedAssessments, request.attemptId));
  await assert.rejects(service.submitReview(learnerId, request), { code: 'STALE_CHALLENGE' });
  assert.equal(cards(await saved(runtime, learnerId)), cards(before));
});

test('with a clock that steps back every turn, the newest attempt still replays', async (t) => {
  let now = fixedNow.getTime();
  const runtime = await createRuntime({ clock: () => new Date(now) });
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  let { encounter } = await service.startEncounter(learnerId);
  let request;
  for (let turn = 0; turn < RECEIPT_LIMIT + 3; turn += 1) {
    now -= 60000;
    request = { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: WRONG };
    ({ encounter } = await service.submitDialogue(learnerId, request));
  }
  assert.equal(Object.keys((await saved(runtime, learnerId)).spellbook.processedAssessments).length, RECEIPT_LIMIT);
  const replay = await service.submitDialogue(learnerId, request);
  assert.equal(replay.replayed, true);
  assert.equal(replay.encounter.version, encounter.version);
});

test('an old save with 60 receipts (Spellbook snapshots included) shrinks to 20 on its next save, a start', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  await playCycles(service, learnerId, 1, true);
  const envelope = await saved(runtime, learnerId);
  const old = {};
  for (let i = 0; i < 60; i += 1) {
    old[randomUUID()] = { kind: 'dialogue', payloadHash: 'x', committedAt: at(i - 100), response: { spellbook: { words: [] }, replayed: false } };
  }
  envelope.spellbook.processedAssessments = { ...old, ...envelope.spellbook.processedAssessments };
  await writeFile(runtime.storage.filePath(learnerId), JSON.stringify(envelope), 'utf8');
  await service.startEncounter(learnerId, { restart: true });
  const after = await saved(runtime, learnerId);
  const kept = Object.keys(after.spellbook.processedAssessments);
  assert.equal(kept.length, RECEIPT_LIMIT);
  // The five newest are this play's own turns; the oldest of the 60 are gone.
  assert.equal(kept.filter((id) => Object.hasOwn(old, id)).length, RECEIPT_LIMIT - 5);
});

test('a failed save leaves the receipts on disk as they were', async (t) => {
  let failWrites = false;
  const base = await createRuntime();
  const saveDir = base.saveDir;
  await base.close();
  const storage = new JsonLearningStorage({
    saveDir,
    io: { writeFile: async (...args) => { if (failWrites) throw new Error('disk full'); return (await import('node:fs/promises')).writeFile(...args); } },
  });
  const runtime = await createRuntime({ storage, saveDir });
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  await playCycles(service, learnerId, 5, true);
  const envelope = await saved(runtime, learnerId);
  const extra = {};
  for (let i = 0; i < 10; i += 1) extra[randomUUID()] = receipt(at(i - 100));
  envelope.spellbook.processedAssessments = { ...extra, ...envelope.spellbook.processedAssessments };
  const raw = JSON.stringify(envelope);
  await writeFile(storage.filePath(learnerId), raw, 'utf8');
  failWrites = true;
  await assert.rejects(service.startEncounter(learnerId, { restart: true }), { code: 'STORAGE_FAILURE' });
  assert.equal(await readFile(storage.filePath(learnerId), 'utf8'), raw);
});

test('an attempt id named like an Object property ("constructor") is a new attempt, not a receipt', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  const { encounter } = await service.startEncounter(learnerId);
  const result = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: 'constructor', message: WRONG });
  assert.equal(result.replayed, false);
  assert.equal(result.encounter.version, encounter.version + 1);
});

test('a review written under a clock that stepped back is kept and replays', async (t) => {
  let now = fixedNow.getTime() + 10 * 24 * 3600 * 1000;
  const runtime = await createRuntime({ clock: () => new Date(now) });
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  await playCycles(service, learnerId, 4, true);
  now = fixedNow.getTime(); // ten days back: older than every receipt in the save
  const { challenge } = await service.createReviewChallenge(learnerId, 'cafe');
  const request = { challengeId: challenge.id, attemptId: randomUUID(), action: 'reveal' };
  await service.submitReview(learnerId, request);
  assert.ok(Object.hasOwn((await saved(runtime, learnerId)).spellbook.processedAssessments, request.attemptId));
  assert.equal((await service.submitReview(learnerId, request)).replayed, true);
});
