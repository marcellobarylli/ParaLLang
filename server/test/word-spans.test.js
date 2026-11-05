// Round 057 (backlog C7): narration words carry every span the matcher gave their id, so the app can mark them in
// the line where the server found them, never inside a longer match (critique 1.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { FixtureProvider, fixedNow, makeTempDir } from './helpers.js';

const content = loadGameContent({ language: 'it' });
const gerald = content.encounters.get('imp_coffee_greeting');

async function service() {
  return new LearningService({ provider: new FixtureProvider(), storage: new JsonLearningStorage({ saveDir: await makeTempDir('parallang-spans-') }), content, clock: () => fixedNow });
}
const words = async (native) => (await service()).canonicalizeNarration({ narrative: '', dialogue: { native, translation: '' } }, gerald).dialogue.words;
const slices = (native, word) => word.spans.map(([start, end]) => native.slice(start, end));

test('caffè is marked only where it stands alone, never inside caffè nero, and repeats keep every span', async () => {
  const native = 'Un caffè nero? Sì, caffè nero, non un caffè.';
  const result = await words(native);
  const byId = Object.fromEntries(result.map((word) => [word.vocabularyId, word]));
  assert.deepEqual(slices(native, byId.caffe_nero), ['caffè nero', 'caffè nero']);
  assert.deepEqual(byId.caffe.spans, [[38, 43]]);
  assert.equal(byId.caffe.target, 'caffè');
  assert.deepEqual(result.map((word) => word.vocabularyId).slice(0, 1), ['caffe_nero'], 'order of first occurrence');
});

test('decomposed accents, capitals and a no-break space give spans whose slices are the excerpts', async () => {
  const native = 'Caffe\u0300?  Senza\u00a0latte, per favore.';
  for (const word of await words(native)) {
    assert.ok(word.spans.length >= 1, word.vocabularyId);
    assert.equal(native.slice(...word.spans[0]), word.target, word.vocabularyId);
  }
  assert.ok((await words(native)).some((word) => word.target === 'Caffe\u0300'));
});

test('the serialized encounter carries spans; a word saved without them has none', async () => {
  const svc = await service();
  const message = svc.canonicalizeNarration({ narrative: '', dialogue: { native: 'Un caffè?', translation: 'A coffee?' } }, gerald);
  const legacy = { ...message, id: 'old', dialogue: { ...message.dialogue, words: message.dialogue.words.map(({ spans, ...rest }) => rest) } };
  const encounter = { encounterId: 'imp_coffee_greeting', state: 'resolved', transcript: [message, legacy], objectiveIndex: 0, completedObjectiveIds: [], hintsUsed: 0, reveals: [] };
  const serialized = svc.serializeEncounter(encounter);
  assert.deepEqual(serialized.transcript[0].dialogue.words[0].spans, [[3, 8]]);
  assert.equal('spans' in serialized.transcript[1].dialogue.words[0], false);
});

// Contract (critique 1.4): the app's segmentLine over the server's real words gives back the line, and every marked
// segment is one of the server's spans. (Node loads the app's plain module with a typeless-package warning.)
test('contract: the app\'s segmentLine marks exactly the server\'s spans and loses no text', async () => {
  const { segmentLine } = await import('../../mobile/src/wordClass.js');
  for (const native of ['Un caffè nero? Sì, caffè nero, non un caffè.', 'Caffè?  Senza latte, per favore.', 'Nothing Italian here.', 'Buongiorno! Un cornetto e un caffè, grazie.']) {
    const result = await words(native);
    const segments = segmentLine(native, result);
    assert.equal(segments.map((segment) => segment.text).join(''), native, native);
    const marked = segments.filter((segment) => segment.word).map((segment) => [segment.word.vocabularyId, segment.text]);
    const expected = result.flatMap((word) => word.spans.map((span) => ({ span, id: word.vocabularyId })))
      .sort((a, b) => a.span[0] - b.span[0]).map(({ span, id }) => [id, native.slice(...span)]);
    assert.deepEqual(marked, expected, native);
  }
});
