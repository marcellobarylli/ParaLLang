// Round 090 (review R1.2 of rounds 029–039): a readable card must not answer a due one through its example or its own
// form. The snapshot lists, per card, the learner's other cards found in its target (`formCardIds`) and in its
// example (`exampleCardIds`); the app holds the meaning or the example's English back while one of them is due.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, fixedNow } from './helpers.js';

async function learnerWith(t, ids) {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const envelope = await runtime.storage.load(learnerId);
  runtime.service.discover(envelope, ids, fixedNow.toISOString(), 'test');
  await runtime.storage.save(envelope);
  const book = await runtime.service.getSpellbook(learnerId);
  return new Map(book.cards.map((card) => [card.vocabularyId, card]));
}

test('an example holding another card lists it; a phrase lists the words of its own form; never itself', async (t) => {
  const cards = await learnerWith(t, ['cento', 'prosciutto', 'caffe', 'caffe_nero']);
  assert.deepEqual(cards.get('cento').exampleCardIds, ['prosciutto'], '"Cento grammi di prosciutto."');
  assert.deepEqual(cards.get('cento').formCardIds, []);
  assert.deepEqual(cards.get('caffe_nero').formCardIds, ['caffe'], '"caffè nero" holds caffè');
  assert.ok(cards.get('caffe_nero').exampleCardIds.includes('caffe'), '"Prendo il caffè nero."');
  for (const card of cards.values()) {
    assert.ok(!card.formCardIds.includes(card.vocabularyId) && !card.exampleCardIds.includes(card.vocabularyId), card.vocabularyId);
  }
});

test('only the learner\'s own cards are listed', async (t) => {
  const cards = await learnerWith(t, ['cento', 'caffe_nero']);
  assert.deepEqual(cards.get('cento').exampleCardIds, [], 'no prosciutto card yet');
  assert.deepEqual(cards.get('caffe_nero').formCardIds, [], 'no caffe card yet');
});
