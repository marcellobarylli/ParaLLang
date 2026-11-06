// Round 089: which live atmosphere lines (rounds 053, 068) used an ATMOSPHERE_ENGLISH word, and which of those words
// are forms of an objective's target in the pack. Offline: reads saved reports, loads the packs.
import { readFileSync } from 'node:fs';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { matchCanonicalVocabulary } from '../../../../server/src/language-engine.js';
// The list as it stood at 8adf0b9 (round 053), removed by this round.
const ATMOSPHERE_ENGLISH = new Set(['once', 'kilo', 'kilos', 'cafe', 'sola', 'pollo', 'basta', 'io', 'due', 'otto', 'nove', 'sei',
  'salami', 'chorizo', 'chorizos', 'mezzo', 'cento', 'soy', 'media', 'piano', 'chili']);

const fold = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const files = { it: ['053/results/live-it.json', '068/results/live-it-1.json', '068/results/live-it-2.json'],
  es: ['053/results/live-es.json', '068/results/live-es-1.json', '068/results/live-es-2.json'] };
for (const [code, list] of Object.entries(files)) {
  const content = loadGameContent({ language: code });
  const answers = new Set();
  for (const { encounter } of content.encounters.values()) {
    for (const o of encounter.objectives) for (const id of o.target_vocabulary_ids) {
      for (const v of content.vocabularyById.get(id)?.surface_variants ?? []) answers.add(fold(v));
    }
  }
  console.log(code, 'exempt words that are answers:', [...ATMOSPHERE_ENGLISH].filter((w) => answers.has(w)).join(' '));
  let lines = 0;
  for (const file of list) {
    for (const row of JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url))).rows) {
      if (!row.text) continue;
      lines += 1;
      const hits = matchCanonicalVocabulary(row.text, content.vocabulary.entries).map((m) => fold(m.excerpt)).filter((w) => ATMOSPHERE_ENGLISH.has(w));
      if (hits.length) console.log(' ', file, row.locationId, hits.join(','), hits.some((w) => answers.has(w)) ? 'ANSWER' : '', '|', row.text);
    }
  }
  console.log(code, 'lines', lines);
}
