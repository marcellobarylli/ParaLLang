// Round 058: old (HEAD before the build) and new matcher over every NPC line in saved live reports, both packs.
// Usage: node docs/rounds/058/results/compare-matchers.mjs <old-engine.js>
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { matchCanonicalVocabulary as next } from '../../../../server/src/language-engine.js';

const { matchCanonicalVocabulary: old } = await import(resolve(process.argv[2]));
const lines = new Set();
const walk = (dir) => readdirSync(dir).forEach((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) return walk(path);
  if (!name.endsWith('.json')) return;
  let data; try { data = JSON.parse(readFileSync(path, 'utf8')); } catch { return; }
  const visit = (node) => { if (!node || typeof node !== 'object') return; if (typeof node.native === 'string') lines.add(node.native); Object.values(node).forEach(visit); };
  visit(data);
});
walk('docs/rounds');
let differ = 0;
for (const code of ['it', 'es']) {
  const { vocabulary } = loadGameContent({ language: code });
  for (const line of lines) {
    const a = JSON.stringify(old(line, vocabulary.entries).map((m) => [m.id, m.start, m.end]));
    const b = JSON.stringify(next(line, vocabulary.entries).map((m) => [m.id, m.start, m.end]));
    if (a !== b) { differ += 1; console.log(code, line, '\n old', a, '\n new', b); }
  }
}
console.log(`lines ${lines.size}, packs 2, comparisons ${lines.size * 2}, differing ${differ}`);
