// Round 086: how many English words of live narration would each footnote stem rule drop, per encounter.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { loadGameContent, foldWords } from '/work/ParaLLang/server/src/content-loader.js';
const root = '/work/ParaLLang/docs/rounds';
const english = new Map();
const walk = (v) => { if (!v || typeof v !== 'object') return; for (const [k, x] of Object.entries(v)) {
  if ((k === 'narrative' || k === 'translation' || k === 'footnote') && typeof x === 'string') { for (const w of foldWords(x).trim().split(' ')) { if (/^[a-z]{3,}$/.test(w)) english.set(w, (english.get(w) ?? 0) + 1); } }
  else walk(x); } };
for (const r of readdirSync(root)) { const d = `${root}/${r}/results`; if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) if (f.endsWith('.json')) { try { walk(JSON.parse(readFileSync(`${d}/${f}`, 'utf8'))); } catch {} } }
const total = [...english.values()].reduce((a, b) => a + b, 0);
console.log('corpus: distinct', english.size, 'tokens', total);
const rules = {
  'v1: all words of all forms, 4-prefix': { single: false, n: 4, open: false },
  'single-word forms, 4-prefix': { single: true, n: 4 },
  'single-word forms, 5-prefix (len>=5)': { single: true, n: 5 },
  'single-word forms, 6-prefix (len>=6)': { single: true, n: 6 },
};
for (const code of ['it', 'es']) {
  const content = loadGameContent({ language: code });
  for (const [name, rule] of Object.entries(rules)) {
    let worst = 0, sum = 0, n = 0; const examples = new Set();
    for (const [id, { encounter }] of content.encounters) {
      const forms = encounter.objectives.flatMap((o) => o.target_vocabulary_ids).flatMap((v) => content.vocabularyById.get(v).surface_variants).map((f) => foldWords(f).trim());
      const words = [...new Set((rule.single ? forms.filter((f) => !f.includes(' ')) : forms.flatMap((f) => f.split(' '))).filter((w) => w.length >= rule.n))];
      const stems = new Set(words.map((w) => w.slice(0, rule.n)));
      let hit = 0; for (const [w, c] of english) if (w.length >= rule.n && stems.has(w.slice(0, rule.n)) && !words.includes(w)) { hit += c; if (examples.size < 14) examples.add(w); }
      sum += hit; n += 1; worst = Math.max(worst, hit);
    }
    console.log(code, name, '| mean colliding tokens per encounter', (sum / n).toFixed(1), '| worst', worst, '| e.g.', [...examples].join(' '));
  }
}
