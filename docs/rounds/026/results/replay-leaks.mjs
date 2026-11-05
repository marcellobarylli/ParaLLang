// Round 026: open-objective targets in the greeting replays (every objective is open at the greeting), old vs new.
//   node docs/rounds/026/results/replay-leaks.mjs replay-it.json replay-es.json
import { readFileSync } from 'node:fs';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { normalizeAnswer } from '../../../../server/src/language-engine.js';
const fold = (t) => ` ${normalizeAnswer(t, { stripAccents: true }).replace(/[^\p{L}\s']/gu, ' ').replace(/\s+/g, ' ').trim()} `;
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const content = loadGameContent({ language: report.language });
  const count = { old: 0, new: 0 }, n = { old: 0, new: 0 };
  for (const r of report.results) {
    if (r.error) continue;
    const d = content.encounters.get(r.encounterId);
    const hits = d.encounter.objectives.flatMap((o) => o.target_vocabulary_ids.flatMap((id) => (d.narrationEntries.find((e) => e.id === id)?.surface_variants ?? [])
      .map((f) => fold(f).trim()).filter((f) => fold(r.native).includes(` ${f} `)).map((f) => `${o.id}:${f}`)));
    n[r.variant] += 1;
    if (hits.length) { count[r.variant] += 1; console.log(`${report.language} ${r.variant} ${r.encounterId} [${[...new Set(hits)].join(', ')}] ${r.native.replace(/\n+/g, ' ').slice(0, 140)}`); }
  }
  console.log(`== ${report.language}: greetings with an open target: old ${count.old}/${n.old}, new ${count.new}/${n.new}`);
}
