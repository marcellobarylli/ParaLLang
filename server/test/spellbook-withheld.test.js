// Round 106 (round 104 R1.7): the Spellbook payload withholds what the screens hide. During an encounter no card has
// meanings, note or an example's English; outside one, a due card has none, a card whose own form holds a due card
// waits on its meaning, one whose example holds a due card on its example (round 090's waits, at snapshot time).
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, createLearnerAndEncounter, createRuntime, finishEncounter, fixedNow } from './helpers.js';

const past = new Date(fixedNow.getTime() - 60_000).toISOString();
const future = new Date(fixedNow.getTime() + 86_400_000).toISOString();

function assertWithheld(card, { meaning, example }, label) {
  assert.deepEqual(card.withheld, { meaning, example }, label);
  if (meaning) { assert.equal(card.meanings, null, label); assert.equal(card.note, null, label); }
  else assert.ok(Array.isArray(card.meanings) && card.meanings.length, label);
  if (card.example) assert.equal(card.example.english === null, example, label);
}

// Review R1.3: no string anywhere in the payload equals, or holds as a whole word, an accepted translation of any
// entry the learner has a card for.
function assertNoMeaningInPayload(runtime, spellbook) {
  const meanings = spellbook.cards.flatMap((card) => runtime.content.vocabularyById.get(card.vocabularyId).accepted_translations.map((m) => m.toLowerCase()));
  const strings = [];
  // Ids and version strings name content files (gerald-coffee-v1), not meanings.
  const idKey = (key) => /(^id$|Id$|Ids$|^contentVersion$)/.test(key);
  (function walk(value) {
    if (typeof value === 'string') strings.push(value.toLowerCase());
    else if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) if (!idKey(key)) walk(inner);
  })(spellbook);
  const own = new Set(spellbook.cards.flatMap((card) => [card.target, card.example?.target].filter(Boolean).map((t) => t.toLowerCase())));
  for (const text of strings) {
    if (own.has(text)) continue; // a target-language form may spell like an English meaning (es "no")
    for (const meaning of meanings) {
      const escaped = meaning.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.ok(!new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, 'u').test(text), `"${meaning}" in "${text}"`);
    }
  }
}

test('during an encounter no card carries meanings, a note or an example translation, and they return after it', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const { learnerId, started } = session;
  assert.ok(started.spellbook.cards.length > 0, 'the encounter discovers cards');
  const fromRoute = (await api(runtime, '/api/spellbook', { learnerId })).data;
  for (const spellbook of [started.spellbook, fromRoute]) {
    assert.equal(spellbook.inEncounter, true);
    for (const card of spellbook.cards) {
      assertWithheld(card, { meaning: true, example: true }, card.vocabularyId);
      if (runtime.content.vocabularyById.get(card.vocabularyId).example) assert.equal(typeof card.example.target, 'string');
    }
    assertNoMeaningInPayload(runtime, spellbook);
  }

  // Review R1.2: a resumed start and a help reveal send the same withheld payload.
  const resumed = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} })).data;
  assert.equal(resumed.encounter.id, started.encounter.id);
  const encounter = resumed.encounter;
  const greeting = encounter.transcript.at(-1);
  const helped = await api(runtime, '/api/encounter/help', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, messageId: greeting.id, kind: 'word', vocabularyId: greeting.dialogue.words[0].vocabularyId } });
  const checked = [resumed.spellbook, helped.status === 200 ? helped.data.spellbook : null].filter(Boolean);
  assert.equal(checked.length, 2, `help answered ${helped.status}: ${JSON.stringify(helped.data.error ?? {})}`);
  for (const spellbook of checked) {
    assert.equal(spellbook.inEncounter, true);
    for (const card of spellbook.cards) assertWithheld(card, { meaning: true, example: true }, `${card.vocabularyId} resumed/help`);
    assertNoMeaningInPayload(runtime, spellbook);
  }

  const resolved = await finishEncounter(runtime, { ...session, started: { ...started, encounter: helped.data.encounter } });
  assert.equal(resolved.spellbook.inEncounter, false);
  const due = new Set(resolved.spellbook.cards.filter((card) => card.due).map((card) => card.vocabularyId));
  for (const card of resolved.spellbook.cards) {
    const entry = runtime.content.vocabularyById.get(card.vocabularyId);
    const meaning = card.due || card.formCardIds.some((id) => due.has(id));
    assertWithheld(card, { meaning, example: meaning || card.exampleCardIds.some((id) => due.has(id)) }, card.vocabularyId);
    if (!meaning) {
      assert.deepEqual(card.meanings, entry.accepted_translations);
      assert.equal(card.note, entry.note ?? null);
    }
  }
  assert.ok(resolved.spellbook.cards.some((card) => !card.withheld.meaning), 'some meaning is back after the encounter');
});

test('outside an encounter a due card waits, and so do the meanings and examples that would answer it', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  await finishEncounter(runtime, session);
  const envelope = structuredClone(await runtime.service.loadEnvelope(session.learnerId));
  const all = Object.keys(runtime.content.vocabularyById);
  runtime.service.discover(envelope, [...runtime.content.vocabularyById.keys()], fixedNow.toISOString(), 'test');
  const items = { ...envelope.spellbook.words, ...envelope.spellbook.phrases };
  for (const item of Object.values(items)) item.schedule.dueAt = future;
  const base = runtime.service.spellbookSnapshot(envelope, null);
  assert.equal(base.inEncounter, false);
  for (const card of base.cards) assertWithheld(card, { meaning: false, example: false }, `${card.vocabularyId} not due`);

  // A card whose form holds another card (a phrase and its word) and one whose example holds another.
  const formed = base.cards.find((card) => card.formCardIds.some((id) => id !== card.vocabularyId));
  const exampled = base.cards.find((card) => card.example && card.exampleCardIds.some((id) => id !== card.vocabularyId)
    && !card.formCardIds.some((id) => id !== card.vocabularyId));
  assert.ok(formed && exampled, `the pack has both kinds (${all.length} entries)`);

  const wordOfForm = formed.formCardIds.find((id) => id !== formed.vocabularyId);
  items[wordOfForm].schedule.dueAt = past;
  let snapshot = runtime.service.spellbookSnapshot(envelope, null);
  const byId = (id) => snapshot.cards.find((card) => card.vocabularyId === id);
  assert.equal(byId(wordOfForm).due, true);
  assertWithheld(byId(wordOfForm), { meaning: true, example: true }, 'the due card');
  assertWithheld(byId(formed.vocabularyId), { meaning: true, example: true }, 'its form holds the due card');
  items[wordOfForm].schedule.dueAt = future;

  const wordOfExample = exampled.exampleCardIds.find((id) => id !== exampled.vocabularyId);
  items[wordOfExample].schedule.dueAt = past;
  snapshot = runtime.service.spellbookSnapshot(envelope, null);
  const dueCards = new Set(snapshot.cards.filter((card) => card.due).map((card) => card.vocabularyId));
  assert.deepEqual([...dueCards], [wordOfExample]);
  const card = snapshot.cards.find((c) => c.vocabularyId === exampled.vocabularyId);
  assertWithheld(card, { meaning: false, example: true }, 'its example holds the due card');
  assert.equal(typeof card.example.target, 'string');
  // The content itself is untouched.
  assert.ok(runtime.content.vocabularyById.get(exampled.vocabularyId).example.english);
});

test('cards that are not due are withheld during an encounter too', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  await finishEncounter(runtime, session);
  await runtime.service.startEncounter(session.learnerId, { restart: true });
  const envelope = structuredClone(await runtime.service.loadEnvelope(session.learnerId));
  for (const item of [...Object.values(envelope.spellbook.words), ...Object.values(envelope.spellbook.phrases)]) item.schedule.dueAt = future;
  const during = runtime.service.spellbookSnapshot(envelope);
  assert.equal(during.inEncounter, true);
  assert.ok(during.cards.length > 0 && during.cards.every((card) => !card.due));
  for (const card of during.cards) assertWithheld(card, { meaning: true, example: true }, `${card.vocabularyId} during`);
  for (const card of runtime.service.spellbookSnapshot(envelope, null).cards) assertWithheld(card, { meaning: false, example: false }, `${card.vocabularyId} after`);
});
