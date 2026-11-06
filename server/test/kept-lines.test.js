// Round 060 (backlog C9): NPC lines the player paid to translate are kept in the save and shown in the Spellbook.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRuntime, finishEncounter, fixedNow } from './helpers.js';
import { LearningService } from '../src/learning-service.js';
import { LINE_LIMIT, LINE_TEXT_LIMIT } from '../src/learning-storage.js';

async function start(runtime, service = runtime.service) {
  const learner = await service.createOrRecoverLearner();
  const started = await service.startEncounter(learner.learnerId);
  return { learnerId: learner.learnerId, encounter: started.encounter, message: started.encounter.transcript.at(-1) };
}
const reveal = (service, session, kind = 'sentence', extra = {}) => service.revealEncounterHelp(session.learnerId, {
  encounterId: session.encounter.id, version: session.encounter.version, kind, messageId: session.message.id, ...extra,
});
const saved = async (runtime, learnerId) => JSON.parse(await readFile(runtime.storage.filePath(learnerId), 'utf8'));

test('a paid sentence reveal keeps the line, hidden during the encounter and while its cards are due, shown after review', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await start(runtime);
  const helped = await reveal(runtime.service, session);
  assert.equal(helped.charged, true);
  assert.deepEqual(helped.spellbook.lines, [{
    id: session.message.id, speaker: 'Gerald', native: session.message.dialogue.native, translation: null,
    locationName: 'The Coffee Cart', vocabularyIds: ['cafe', 'sin_leche'], savedAt: fixedNow.toISOString(), hidden: true,
  }]);
  const [kept] = (await saved(runtime, session.learnerId)).lines;
  assert.equal(kept.translation, 'Do you want a coffee? Without milk is the only civilized option.');
  assert.equal(kept.locationId, 'coffee_cart');
  // Already revealed: not charged, not stored again.
  const again = await reveal(runtime.service, { ...session, encounter: helped.encounter });
  assert.equal(again.charged, false);
  assert.equal((await saved(runtime, session.learnerId)).lines.length, 1);

  const finished = await finishEncounter(runtime, { learnerId: session.learnerId, started: { encounter: helped.encounter } });
  // The encounter is over, but cafe and sin_leche are new cards, due now: the line is their answer (decision 2).
  assert.equal(finished.spellbook.inEncounter, false);
  assert.deepEqual(finished.spellbook.lines.map((line) => [line.hidden, line.translation]), [[true, null]]);
  for (const [id, answer] of [['cafe', 'coffee'], ['sin_leche', 'without milk']]) {
    const { challenge } = await runtime.service.createReviewChallenge(session.learnerId, id);
    await runtime.service.submitReview(session.learnerId, { challengeId: challenge.id, attemptId: randomUUID(), action: 'answer', answer });
  }
  const book = await runtime.service.getSpellbook(session.learnerId);
  assert.deepEqual(book.lines.map((line) => [line.hidden, line.translation]), [[false, kept.translation]]);
});

test('a word reveal keeps no line', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await start(runtime);
  const helped = await reveal(runtime.service, session, 'word', { vocabularyId: 'cafe' });
  assert.deepEqual(helped.spellbook.lines, []);
  assert.equal((await saved(runtime, session.learnerId)).lines, undefined);
});

test('a failed save keeps no line and charges no hint; the retry keeps it once (critique 1.6)', async (t) => {
  const base = await createRuntime();
  t.after(base.close);
  const wrapper = {
    failNext: false,
    load: (...args) => base.storage.load(...args),
    save: async (...args) => {
      if (wrapper.failNext) { wrapper.failNext = false; throw Object.assign(new Error('simulated full disk'), { retryable: true, status: 503, code: 'STORAGE_FAILURE' }); }
      return base.storage.save(...args);
    },
    remove: (...args) => base.storage.remove(...args),
  };
  const service = new LearningService({ provider: base.provider, storage: wrapper, content: base.content, clock: () => fixedNow });
  const session = await start(base, service);
  wrapper.failNext = true;
  await assert.rejects(reveal(service, session), /simulated full disk/);
  const current = await service.currentEncounter(session.learnerId);
  assert.equal(current.encounter.version, session.encounter.version);
  assert.deepEqual(current.spellbook.lines, []);
  const retried = await reveal(service, session);
  assert.equal(retried.charged, true);
  assert.equal((await saved(base, session.learnerId)).lines.length, 1);
});

test('lines dedupe on folded text and speaker, newest first, capped at 50 and 500 characters (critique 1.7, decision 4)', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { service } = runtime;
  const session = await start(runtime);
  const envelope = await runtime.storage.load(session.learnerId);
  const encounter = { definitionId: session.encounter.encounterId, locationId: 'coffee_cart' };
  const message = (id, native, speaker = 'Gerald', translation = 'Hello.') => ({ id, dialogue: { speaker, native, translation, words: [] } });
  service.keepLine(envelope, encounter, message('m1', 'Hola, amigo.'));
  service.keepLine(envelope, encounter, message('m2', 'Hola, amigo.', 'Portia'));
  service.keepLine(envelope, { ...encounter, locationId: 'market_entrance' }, message('m3', '  hola,   AMIGO. ', 'Gerald', 'Hi, friend.'));
  assert.deepEqual(envelope.lines.map((line) => [line.id, line.speaker, line.locationId, line.translation]), [
    ['m3', 'Gerald', 'market_entrance', 'Hi, friend.'], ['m2', 'Portia', 'coffee_cart', 'Hello.'],
  ]);
  for (let index = 0; index < LINE_LIMIT + 5; index += 1) service.keepLine(envelope, encounter, message(`n${index}`, `Línea ${index}.`));
  assert.equal(envelope.lines.length, LINE_LIMIT);
  assert.equal(envelope.lines[0].id, `n${LINE_LIMIT + 4}`);
  service.keepLine(envelope, encounter, message('long', 'x'.repeat(LINE_TEXT_LIMIT + 100)));
  assert.equal(envelope.lines[0].native.length, LINE_TEXT_LIMIT);
  await runtime.storage.save(envelope);
  assert.equal((await runtime.storage.load(session.learnerId)).lines.length, LINE_LIMIT);
});

test('saves: no lines loads; invalid entries are dropped; a non-array is SAVE_UNREADABLE (critique 1.4)', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await start(runtime);
  const path = runtime.storage.filePath(session.learnerId);
  const envelope = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(envelope.lines, undefined);
  assert.deepEqual((await runtime.service.getSpellbook(session.learnerId)).lines, []);
  const good = { id: 'm1', encounterId: 'coffee_cart_imp', locationId: null, speaker: 'Gerald', native: 'Hola.', translation: 'Hello.', vocabularyIds: [], savedAt: fixedNow.toISOString() };
  await writeFile(path, JSON.stringify({ ...envelope, lines: [good, { ...good, translation: '' }, { ...good, savedAt: 'never' }, null, { ...good, vocabularyIds: [1] }] }));
  const loaded = await runtime.storage.load(session.learnerId);
  assert.deepEqual(loaded.lines, [good]);
  const book = await runtime.service.getSpellbook(session.learnerId);
  assert.equal(book.lines[0].locationName, null);
  await writeFile(path, JSON.stringify({ ...envelope, lines: {} }));
  await assert.rejects(runtime.storage.load(session.learnerId), (error) => error.code === 'SAVE_UNREADABLE');
});

test('receipts hold no lines; a replay carries the current ones (critiques 1.2, 1.3)', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await start(runtime);
  const helped = await reveal(runtime.service, session);
  const request = { encounterId: helped.encounter.id, version: helped.encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.' };
  const result = await runtime.service.submitDialogue(session.learnerId, request);
  assert.equal(result.spellbook.lines.length, 1);
  const receipt = (await saved(runtime, session.learnerId)).spellbook.processedAssessments[request.attemptId];
  assert.equal('lines' in receipt.response.spellbook, false);
  // A new encounter is under way: the replay's lines are the current ones, hidden.
  await runtime.service.startEncounter(session.learnerId, { restart: true });
  const replay = await runtime.service.submitDialogue(session.learnerId, request);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.spellbook.lines.map((line) => [line.id, line.hidden]), [[session.message.id, true]]);
});
