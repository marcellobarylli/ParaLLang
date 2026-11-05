// Round 026: measures play-market.js --tour reports per encounter: mean share (estimate notInTranslation) against
// mean requested ratio, the greeting's share, mean absolute gap, lines more than 0.10 under / over, verdicts, and
// open-objective targets used by the NPC (any surface form of a target of an objective not yet passed, folded,
// whole word).
//   node docs/rounds/026/results/tour-measure.mjs <label>=<report.json> ...
import { readFileSync } from 'node:fs';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { normalizeAnswer } from '../../../../server/src/language-engine.js';

const fold = (text) => ` ${normalizeAnswer(text, { stripAccents: true }).replace(/[^\p{L}\s']/gu, ' ').replace(/\s+/g, ' ').trim()} `;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const f2 = (x) => x.toFixed(2);

for (const arg of process.argv.slice(2)) {
  const [label, path] = arg.split('=');
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const content = loadGameContent({ language: report.language });
  console.log(`== ${label} (${report.language}): tour resolved=${report.resolved} sealedBefore=${report.riftSealedBefore} openAfter=${report.riftOpenAfter} calls=${report.generationCalls}`);
  const all = { share: [], req: [], gap: [], under: 0, over: 0, leaks: 0, n: 0 };
  for (const e of report.encounters) {
    const definition = content.encounters.get(e.encounterId);
    const objectives = definition.encounter.objectives;
    const forms = new Map(objectives.map((o) => [o.id, o.target_vocabulary_ids.flatMap((id) => definition.narrationEntries.find((x) => x.id === id)?.surface_variants ?? []).map((f) => fold(f).trim())]));
    const passed = new Set();
    const share = [], req = [], gap = [], leakLines = [];
    let under = 0, over = 0;
    e.lines.forEach((line, i) => {
      const s = line.share.notInTranslation;
      share.push(s); req.push(line.requestedRatio); gap.push(Math.abs(s - line.requestedRatio));
      if (s < line.requestedRatio - 0.1) under += 1;
      if (s > line.requestedRatio + 0.1) over += 1;
      const text = fold(line.native);
      const leaked = objectives.filter((o) => !passed.has(o.id)).flatMap((o) => forms.get(o.id).filter((f) => text.includes(` ${f} `)).map((f) => `${o.id}:${f}`));
      if (leaked.length) leakLines.push(`L${i} [${leaked.join(', ')}] ${line.native}`);
      for (const r of e.grading[i]?.output.objective_results ?? []) if (r.passed) passed.add(r.objective_id);
    });
    const verdicts = e.grading.map((g) => g.output.objective_results.map((r) => (r.passed ? 'P' : '.')).join('')).join(' ');
    console.log(`  ${e.encounterId.padEnd(28)} resolved=${e.resolved} lines=${e.lines.length} share=${f2(mean(share))} req=${f2(mean(req))} greeting=${f2(share[0])}/${f2(req[0])} gap=${f2(mean(gap))} under=${under} over=${over} leakLines=${leakLines.length} verdicts=${verdicts}`);
    for (const l of leakLines) console.log(`      leak? ${l}`);
    all.share.push(...share); all.req.push(...req); all.gap.push(...gap); all.under += under; all.over += over; all.leaks += leakLines.length; all.n += share.length;
  }
  console.log(`  TOTAL lines=${all.n} share=${f2(mean(all.share))} req=${f2(mean(all.req))} gap=${f2(mean(all.gap))} under=${all.under} over=${all.over} leakLines=${all.leaks}`);
}
