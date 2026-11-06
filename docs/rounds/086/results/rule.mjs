import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { loadGameContent, foldWords } from '/work/ParaLLang/server/src/content-loader.js';
const root = '/work/ParaLLang/docs/rounds'; const english = new Map();
const walk = (v) => { if (!v || typeof v !== 'object') return; for (const [k, x] of Object.entries(v)) {
  if ((k === 'narrative' || k === 'translation' || k === 'footnote') && typeof x === 'string') { for (const w of foldWords(x).trim().split(' ')) { if (/^[a-z]{3,}$/.test(w)) english.set(w, (english.get(w) ?? 0) + 1); } } else walk(x); } };
for (const r of readdirSync(root)) { const d = `${root}/${r}/results`; if (!existsSync(d)) continue;
  for (const f of readdirSync(d)) if (f.endsWith('.json')) { try { walk(JSON.parse(readFileSync(`${d}/${f}`, 'utf8'))); } catch {} } }
const rules = {
  'prefix4': (w, t) => t.length >= 4 && w.length >= 4 && w.slice(0, 4) === t.slice(0, 4),
  'prefix5': (w, t) => t.length >= 5 && w.length >= 5 && w.slice(0, 5) === t.slice(0, 5),
  'inflection: t minus last letter, len t..t+2': (w, t) => t.length >= 4 && w.length >= t.length && w.length <= t.length + 2 && w.startsWith(t.slice(0, -1)),
  'inflection: t minus last letter, len t..t+2, t>=5': (w, t) => t.length >= 5 && w.length >= t.length && w.length <= t.length + 2 && w.startsWith(t.slice(0, -1)),
};
const inflect = (t) => { const s = t.slice(0, -1); return [...['a', 'o', 'i', 'e'].map((v) => s + v), t + 's', t + 'es', s + 'as', s + 'os'].filter((x) => x !== t); };
for (const code of ['it', 'es']) {
  const content = loadGameContent({ language: code });
  for (const [name, rule] of Object.entries(rules)) {
    let fp = 0, worst = 0, caught = 0, synth = 0; const ex = new Set();
    for (const [, { encounter }] of content.encounters) {
      const forms = encounter.objectives.flatMap((o) => o.target_vocabulary_ids).flatMap((v) => content.vocabularyById.get(v).surface_variants).map((f) => foldWords(f).trim());
      const ts = [...new Set(forms.filter((f) => !f.includes(' ')))];
      let hit = 0; for (const [w, c] of english) if (!ts.includes(w) && ts.some((t) => rule(w, t))) { hit += c; if (ex.size < 12) ex.add(w); }
      fp += hit; worst = Math.max(worst, hit);
      for (const t of ts.filter((t) => t.length >= 4)) for (const i of inflect(t)) { if (ts.includes(i)) continue; synth += 1; if (ts.some((x) => rule(i, x))) caught += 1; }
    }
    console.log(code, name.padEnd(50), 'english tokens dropped/enc', (fp / content.encounters.size).toFixed(1), 'worst', worst, '| synthetic inflections caught', `${caught}/${synth}`, '|', [...ex].join(' '));
  }
}
