// Round 058 (backlog F3): every surface form of a pack, read alone, is matched as its own entry and no other, so no
// two entries share a folded form and no shorter form steals a longer one (critique 1.2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { matchCanonicalVocabulary, vocabularyFormConflicts } from '../src/language-engine.js';

const entry = (id, ...surface_variants) => ({ id, surface_variants });

for (const code of ['it', 'es']) {
  test(`${code}: every variant alone matches only its own entry, whole`, () => {
    const { vocabulary } = loadGameContent({ language: code });
    assert.deepEqual(vocabularyFormConflicts(vocabulary.entries), []);
  });

  test(`${code}: variants are trimmed and hold no runs of whitespace (critique 1.5)`, () => {
    const { vocabulary } = loadGameContent({ language: code });
    const bad = vocabulary.entries.flatMap((e) => e.surface_variants.filter((v) => v !== v.trim() || /\s{2,}/u.test(v)).map((v) => [e.id, v]));
    assert.deepEqual(bad, []);
  });
}

test('two entries with one folded form conflict; an entry repeating its own form does not', () => {
  assert.deepEqual(vocabularyFormConflicts([entry('anio', 'año'), entry('ano', 'ano')]).map((c) => [c.id, c.variant, c.got]),
    [['ano', 'ano', ['anio']]]);
  assert.deepEqual(vocabularyFormConflicts([entry('luna', "è l'una", 'è l’una', "l'una")]), []);
});

test('a short variant of an entry with one long variant no longer steals a longer entry\'s phrase', () => {
  const entries = [entry('buongiorno', 'buongiorno', 'buon giorno'), entry('buono', 'buono', 'buon', 'buonissimissimo')];
  assert.deepEqual(matchCanonicalVocabulary('Buon giorno!', entries).map((m) => [m.id, m.excerpt]), [['buongiorno', 'Buon giorno']]);
  assert.deepEqual(vocabularyFormConflicts(entries), []);
  // The shorter entry still matches on its own.
  assert.deepEqual(matchCanonicalVocabulary('Buon appetito, buono!', entries).map((m) => m.id), ['buono', 'buono']);
});
