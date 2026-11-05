// Round 046 (critique 1.1, 1.3): over every NPC line in the repo's live reports, the tokens that only folding turns
// into English (to read by hand: glitched English, or a target word lost?) and the lines the length warning flags.
//   node docs/rounds/046/results/collisions.mjs $(ls docs/rounds/*/results/*.json)
import { readFileSync } from 'node:fs';
import { glitchFold, languageShare } from '../../../../server/scripts/play-market.js';
import { scenesOf } from '../../../../server/scripts/leak-scan.js';

const tokens = (text) => String(text).normalize('NFC').toLocaleLowerCase().match(/[\p{L}']+/gu) ?? [];
const gained = new Map();
let lines = 0;
const short = [];
for (const path of process.argv.slice(2)) {
  let report;
  try { report = JSON.parse(readFileSync(path, 'utf8')); } catch { continue; }
  for (const scene of scenesOf(report)) {
    for (const line of scene.lines) {
      if (typeof line.native !== 'string' || typeof line.translation !== 'string') continue;
      lines += 1;
      const raw = new Set(tokens(line.translation));
      const folded = new Set([...raw].map(glitchFold));
      for (const word of tokens(line.native)) {
        if (!raw.has(word) && folded.has(glitchFold(word))) gained.set(word, (gained.get(word) ?? 0) + 1);
      }
      if (languageShare(line.native, line.translation, []).translationShort) short.push(`${path.split('/').slice(-3).join('/')} ${scene.encounterId ?? '(default)'}: ${line.translation.replace(/\s+/g, ' ').slice(0, 90)}`);
    }
  }
}
console.log(`lines with a translation: ${lines}`);
console.log(`tokens English only after folding (${gained.size} distinct):`);
console.log([...gained].sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}×${n}`).join(' '));
console.log(`\nlength warnings: ${short.length}`);
for (const s of short) console.log(`  ${s}`);
