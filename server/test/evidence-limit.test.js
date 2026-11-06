// Round 094 (backlog F15): each card keeps its 20 last-written evidence entries, trimmed on every save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRuntime, fixedNow } from './helpers.js';
import { EVIDENCE_LIMIT, trimEvidence } from '../src/learning-storage.js';

const saved = async (runtime, learnerId) => JSON.parse(await readFile(runtime.storage.filePath(learnerId), 'utf8'));
const entries = (count) => Array.from({ length: count }, (_, i) => ({ at: fixedNow.toISOString(), kind: 'review', n: i + 1 }));
const card = (count) => ({ evidence: entries(count) });
const RIGHT = 'Quiero un café negro.';

test('trimEvidence keeps the last 20 entries in order, in words and phrases; 20 is untouched, 21 drops the first', () => {
  assert.equal(EVIDENCE_LIMIT, 20);
  const spellbook = { words: { a: card(25), b: card(20), c: card(21) }, phrases: { p: card(30) } };
  trimEvidence(spellbook);
  assert.deepEqual(spellbook.words.a.evidence.map((e) => e.n), Array.from({ length: 20 }, (_, i) => i + 6));
  assert.deepEqual(spellbook.words.b.evidence.map((e) => e.n), Array.from({ length: 20 }, (_, i) => i + 1));
  assert.deepEqual(spellbook.words.c.evidence.map((e) => e.n), Array.from({ length: 20 }, (_, i) => i + 2));
  assert.deepEqual(spellbook.phrases.p.evidence.map((e) => e.n), Array.from({ length: 20 }, (_, i) => i + 11));
});

// One right answer per encounter; each turn adds evidence to the same cards. Returns the last request.
async function rightTurns(service, learnerId, count, tick = () => {}) {
  let request;
  for (let turn = 0; turn < count; turn += 1) {
    const { encounter } = await service.startEncounter(learnerId, { restart: turn > 0 });
    tick();
    request = { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: RIGHT };
    const result = await service.submitDialogue(learnerId, request);
    assert.equal(result.encounter.state, 'resolved');
  }
  return request;
}
const busiest = (envelope) => [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)]
  .sort((a, b) => b.evidence.length - a.evidence.length)[0];

test('after 25 graded turns the busiest card holds 20 entries, the last being the last turn; a replay changes nothing', async (t) => {
  let now = fixedNow.getTime();
  const runtime = await createRuntime({ clock: () => new Date(now) });
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  const last = await rightTurns(service, learnerId, 25, () => { now += 60000; });
  const envelope = await saved(runtime, learnerId);
  const item = busiest(envelope);
  assert.equal(item.evidence.length, EVIDENCE_LIMIT);
  assert.equal(item.evidence.at(-1).at, new Date(now).toISOString());
  assert.equal(item.evidence.at(-1).kind, 'dialogue');
  const replay = await service.submitDialogue(learnerId, last);
  assert.equal(replay.replayed, true);
  const after = await saved(runtime, learnerId);
  assert.deepEqual(after.spellbook.words, envelope.spellbook.words);
  assert.deepEqual(after.spellbook.phrases, envelope.spellbook.phrases);
});

test('with a clock stepping back each turn, the last 20 written are kept, not the 20 latest by time', async (t) => {
  let now = fixedNow.getTime();
  const runtime = await createRuntime({ clock: () => new Date(now) });
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  await rightTurns(service, learnerId, 25, () => { now -= 60000; });
  const item = busiest(await saved(runtime, learnerId));
  assert.equal(item.evidence.length, EVIDENCE_LIMIT);
  // The newest written has the earliest time; the kept times run backwards to the end.
  assert.equal(item.evidence.at(-1).at, new Date(now).toISOString());
  const times = item.evidence.map((e) => Date.parse(e.at));
  assert.deepEqual(times, [...times].sort((a, b) => b - a));
});

test('an old save with 100 entries on a card keeps them until a write (recovering is no write), then 20; it loads again', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  await rightTurns(service, learnerId, 1);
  const envelope = await saved(runtime, learnerId);
  const id = busiest(envelope).vocabularyId;
  const bucket = envelope.spellbook.words[id] ? 'words' : 'phrases';
  envelope.spellbook[bucket][id].evidence = entries(100);
  await writeFile(runtime.storage.filePath(learnerId), JSON.stringify(envelope), 'utf8');
  await service.createOrRecoverLearner(learnerId);
  assert.equal((await saved(runtime, learnerId)).spellbook[bucket][id].evidence.length, 100);
  await service.startEncounter(learnerId, { restart: true });
  const trimmed = (await saved(runtime, learnerId)).spellbook[bucket][id].evidence;
  assert.deepEqual(trimmed.map((e) => e.n), Array.from({ length: 20 }, (_, i) => i + 81));
  const loaded = await runtime.storage.load(learnerId);
  assert.equal(loaded.spellbook[bucket][id].evidence.length, EVIDENCE_LIMIT);
});
