// Round 049: other-target exposure over every live report, by cohort (report round), language, scene and owner.
//   node docs/rounds/049/results/measure.mjs > docs/rounds/049/results/measure.txt
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { scanReport } from '../../../../server/scripts/leak-scan.js';

const rounds = resolve(import.meta.dirname, '..', '..');
const contents = {};
const rows = [];
for (const round of readdirSync(rounds).sort()) {
  let files = [];
  try { files = readdirSync(join(rounds, round, 'results')).filter((f) => f.endsWith('.json')); } catch { continue; }
  for (const file of files) {
    let report;
    try { report = JSON.parse(readFileSync(join(rounds, round, 'results', file), 'utf8')); } catch { continue; }
    if (!report.language) continue;
    contents[report.language] ??= loadGameContent({ language: report.language });
    for (const scene of scanReport(report, contents[report.language]).scenes) rows.push({ round, file, language: report.language, ...scene });
  }
}
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(0)}%` : '—');
const table = (title, key, filter = () => true) => {
  const groups = {};
  for (const r of rows.filter(filter)) {
    const g = (groups[key(r)] ??= { lines: 0, foreign: 0, scenes: 0 });
    g.lines += r.lines; g.foreign += r.foreignLines; g.scenes += 1;
  }
  console.log(`\n## ${title}\n\n| group | scenes | lines | foreign lines | share |\n|---|---|---|---|---|`);
  for (const [name, g] of Object.entries(groups).sort()) console.log(`| ${name} | ${g.scenes} | ${g.lines} | ${g.foreign} | ${pct(g.foreign, g.lines)} |`);
};
table('Party conversations by cohort and language', (r) => `${r.round} ${r.language}`, (r) => r.party);
table('Home encounters by cohort and language', (r) => `${r.round} ${r.language}`, (r) => !r.party && !r.replay);
table('Party conversations by scene (all cohorts)', (r) => `${r.language} ${r.encounterId}`, (r) => r.party);
// Owners and words: counted per fresh, non-English hit (not additive over lines).
const words = {};
for (const r of rows) for (const f of r.foreign) for (const h of f.hits) {
  if (h.echo || h.english) continue;
  const w = (words[`${r.language} ${h.owner} ${h.form}`] ??= { party: 0, home: 0, cohort048: 0 });
  w[r.party ? 'party' : 'home'] += 1;
  if (r.round === '048') w.cohort048 += 1;
}
console.log('\n## Words (fresh, non-English hits; a line can hold several)\n\n| language owner form | in party lines | in home lines | round 048 |\n|---|---|---|---|');
for (const [name, w] of Object.entries(words).sort((a, b) => (b[1].party + b[1].home) - (a[1].party + a[1].home))) console.log(`| ${name} | ${w.party} | ${w.home} | ${w.cohort048} |`);
