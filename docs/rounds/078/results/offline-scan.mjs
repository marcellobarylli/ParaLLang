// Round 078: the no-target-language rule over every recorded live NPC line (docs/rounds/*/results/**/*.json).
//   node docs/rounds/078/results/offline-scan.mjs
// A line is flagged when every folded word of `native` also occurs in `translation` and the matcher finds no
// vocabulary entry of its encounter in `native`. The encounter is the nearest `encounterId` or `definitionId` that names
// a content definition of the line's pack (critique 1.3); lines without one are matched against the whole pack and
// counted apart. Distinct by language, encounter, native and translation.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { lacksTargetLanguage } from '../../../../server/src/language-engine.js';

const packs = { it: loadGameContent({ language: 'it' }), es: loadGameContent({ language: 'es' }) };
const files = [];
const walkDir = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walkDir(p); else if (p.endsWith('.json')) files.push(p); } };
for (const round of readdirSync('docs/rounds')) { const r = join('docs/rounds', round, 'results'); try { walkDir(r); } catch {} }
let lines = 0; let unresolved = 0; const wordsOnly = []; const flagged = []; const seen = new Set();
function* walk(o, ctx) {
  if (Array.isArray(o)) { for (const v of o) yield* walk(v, ctx); return; }
  if (!o || typeof o !== 'object') return;
  const language = typeof o.language === 'string' && packs[o.language] ? o.language : ctx.language;
  const id = [o.encounterId, o.definitionId].find((v) => typeof v === 'string' && packs[language].encounters.has(v));
  const next = { ...ctx, language, ...(id ? { encounterId: id } : {}) };
  const d = o.dialogue && typeof o.dialogue.native === 'string' ? o.dialogue : o;
  if (typeof d.native === 'string' && typeof d.translation === 'string') yield { native: d.native, translation: d.translation, ...next };
  for (const [k, v] of Object.entries(o)) if (k !== 'dialogue') yield* walk(v, next);
}
for (const f of files) {
  let data; try { data = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
  const lang = /-es[.-]|\bes\b/.test(f) ? 'es' : 'it';
  for (const line of walk(data, { language: data.language && packs[data.language] ? data.language : lang })) {
    const key = [line.language, line.encounterId ?? '', line.native, line.translation].join('\u0000');
    if (seen.has(key)) continue; seen.add(key);
    lines += 1;
    const pack = packs[line.language];
    if (!line.encounterId) unresolved += 1;
    const entries = pack.encounters.get(line.encounterId)?.narrationEntries ?? [...pack.vocabularyById.values()];
    if (lacksTargetLanguage(line.native, line.translation, entries)) flagged.push({ file: f, ...line });
    // The word rule alone (no vocabulary check): how much the vocabulary check holds back.
    if (lacksTargetLanguage(line.native, line.translation, [])) wordsOnly.push({ file: f, ...line });
  }
}
console.log(`distinct lines ${lines} (${unresolved} without an encounter, matched against the whole pack), flagged ${flagged.length}`);
console.log(`word rule alone (no vocabulary check): ${wordsOnly.length}`);
for (const l of wordsOnly.filter((w) => !flagged.includes(w) && !flagged.some((x) => x.native === w.native))) console.log(`  words only: [${l.language} ${l.encounterId ?? '?'}] ${l.native.slice(0, 100)}`);
for (const l of flagged) console.log(`- ${l.file} [${l.language} ${l.encounterId ?? '?'}] ${l.native.slice(0, 140)}`);
