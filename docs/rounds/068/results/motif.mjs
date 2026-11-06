// Round 068 (critique 1.4): the bureaucratic-motif count over atmosphere-live.mjs reports, whole words only
// (round 053's substring scan also hit "apparently" and "feet"). Prints one row per line, then the total.
//   node docs/rounds/068/results/motif.mjs <report.json ...>
import { readFileSync } from 'node:fs';

export const MOTIF = /\b(?:dis)?(?:approv\w*|complain\w*|applications?|paperwork|filed|filing|subscriptions?|fees?|budgets?|exempt\w*|administrative|rejected|rejections?|declined|appeals?|appealed|processing|rent|restrictions?|responsibility|forms?|suggestions?|bureaucra\w*)\b/i;

let total = 0;
let hits = 0;
for (const path of process.argv.slice(2)) {
  const report = JSON.parse(readFileSync(path, 'utf8'));
  for (const row of report.rows) {
    total += 1;
    const match = row.text?.match(MOTIF);
    if (match) hits += 1;
    const state = row.completed ? 'complete' : 'open';
    console.log([report.language, row.locationId, state, row.detail ?? '-', match ? match[0] : '-', row.text ?? `(dropped: ${row.drop?.reason})`].join('\t'));
  }
}
console.log(`motif ${hits} of ${total}`);
