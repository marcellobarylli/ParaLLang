// Round 074: mean folded share per encounter and over all lines (lines without a folded value left out, as in round
// 067's corrected addendum), for one or more play-market.js --tour reports.
//   node docs/rounds/074/results/folded.mjs <label>=<report.json> ...
import { readFileSync } from 'node:fs';
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
for (const arg of process.argv.slice(2)) {
  const [label, path] = arg.split('=');
  const report = JSON.parse(readFileSync(path, 'utf8'));
  const all = []; const req = [];
  console.log(`== ${label}`);
  for (const e of report.encounters) {
    const lines = e.lines.filter((l) => typeof l.share?.folded === 'number');
    all.push(...lines.map((l) => l.share.folded)); req.push(...lines.map((l) => l.requestedRatio));
    console.log(`  ${e.encounterId.padEnd(28)} folded=${mean(lines.map((l) => l.share.folded)).toFixed(2)} req=${mean(lines.map((l) => l.requestedRatio)).toFixed(2)} lines=${lines.length}/${e.lines.length}`);
  }
  console.log(`  ALL folded=${mean(all).toFixed(2)} req=${mean(req).toFixed(2)} lines=${all.length}`);
}
