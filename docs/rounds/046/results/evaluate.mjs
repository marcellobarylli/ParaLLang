// Round 046: both share estimates against the 20 greetings hand-counted in iteration 12
// (docs/rounds/026/results/hand-count.md: Errata's 8 Amendment 2 replays and the 12 after-build tour greetings).
//   node docs/rounds/046/results/evaluate.mjs [--held-out]
import { readFileSync } from 'node:fs';
import { languageShare } from '../../../../server/scripts/play-market.js';

const r026 = (file) => JSON.parse(readFileSync(new URL(`../../026/results/${file}`, import.meta.url), 'utf8'));
// [label, report, pick(report) → { native, translation }, hand count]
const replay = (file, variant, rep) => (report) => report.results.find((x) => x.encounterId === 'the_rift_errata' && x.variant === variant && x.rep === rep);
const greeting = (id) => (report) => report.encounters.find((e) => e.encounterId === id).lines[0];
// Hand counts as [target words, words], names left out (hand-count.md). Critique 1.5: the estimate counts names as
// tokens (English, being in the translation), so the names in the line are added to the hand count's words.
const NAMES = new Set(['errata', 'rift', 'portia', 'gerald', 'mortimer', 'flick', 'marginalia', 'journathan']);
const CASES = [
  ['es Errata old 0', 'replay2-es.json', replay('es', 'old', 0), [4, 10]],
  ['es Errata old 1', 'replay2-es.json', replay('es', 'old', 1), [5, 15]],
  ['es Errata new 0', 'replay2-es.json', replay('es', 'new', 0), [5, 11]],
  ['es Errata new 1', 'replay2-es.json', replay('es', 'new', 1), [7, 15]],
  ['it Errata old 0', 'replay2-it.json', replay('it', 'old', 0), [12, 18]],
  ['it Errata old 1', 'replay2-it.json', replay('it', 'old', 1), [6, 12]],
  ['it Errata new 0', 'replay2-it.json', replay('it', 'new', 0), [9, 19]],
  ['it Errata new 1', 'replay2-it.json', replay('it', 'new', 1), [7, 14]],
  ...[['market_entrance_tutorial', [3, 16], [3, 17]], ['imp_coffee_greeting', [4, 16], [3, 16]], ['butchers_stall_charcutier', [6, 18], [6, 20]],
    ['cracked_fountain_letharger', [6, 20], [7, 24]], ['old_bookshop_bookworm', [18, 43], [19, 47]], ['the_rift_errata', [5, 10], [5, 11]]]
    .flatMap(([id, it, es]) => [[`it tour ${id}`, 'after-tour-it.json', greeting(id), it], [`es tour ${id}`, 'after-tour-es.json', greeting(id), es]]),
];

// Held out: the 9 lines hand-counted for Amendment 1 in iteration 8 (hand-count.md, "Greeting replays: the cells
// the keep/revert bar flagged"), not looked at while the folding was designed.
const anyReplay = (id, variant, rep) => (report) => report.results.find((x) => x.encounterId === id && x.variant === variant && x.rep === rep);
const HELD_OUT = [
  ['held it Errata old 0', 'replay-it.json', anyReplay('the_rift_errata', 'old', 0), [4, 12]],
  ['held it Errata old 1', 'replay-it.json', anyReplay('the_rift_errata', 'old', 1), [5, 15]],
  ['held it Errata new 0', 'replay-it.json', anyReplay('the_rift_errata', 'new', 0), [5, 12]],
  ['held it Errata new 1', 'replay-it.json', anyReplay('the_rift_errata', 'new', 1), [8, 14]],
  ['held es Errata old 0', 'replay-es.json', anyReplay('the_rift_errata', 'old', 0), [6, 15]],
  ['held es Errata old 1', 'replay-es.json', anyReplay('the_rift_errata', 'old', 1), [7, 15]],
  ['held es Errata new 0', 'replay-es.json', anyReplay('the_rift_errata', 'new', 0), [5, 11]],
  ['held es Errata new 1', 'replay-es.json', anyReplay('the_rift_errata', 'new', 1), [5, 11]],
  ['held es Marginalia new 0', 'replay-es.json', anyReplay('old_bookshop_bookworm', 'new', 0), [20, 54]],
];
const set = process.argv.includes('--held-out') ? HELD_OUT : CASES;

const rows = set.map(([label, file, pick, [target, words]]) => {
  const line = pick(r026(file));
  const names = (line.native.toLowerCase().match(/[\p{L}']+/gu) ?? []).filter((t) => NAMES.has(t)).length;
  const hand = target / (words + names);
  const share = languageShare(line.native, line.translation, []);
  return { label, hand, counts: `${target}/${words + names}`, old: share.notInTranslation, folded: share.folded, short: share.translationShort, errata: /Errata|the_rift_errata/.test(label) };
});
const err = (x, hand) => (x === null ? null : Math.abs(x - hand));
for (const r of rows) console.log(`${r.label.padEnd(40)} hand ${r.counts.padStart(5)} = ${r.hand.toFixed(2)}  old ${r.old.toFixed(2)} (${err(r.old, r.hand).toFixed(2)})  folded ${r.folded === null ? ' null' : r.folded.toFixed(2)}${r.folded === null ? '' : ` (${err(r.folded, r.hand).toFixed(2)})`}${r.short ? '  translationShort' : ''}`);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const covered = rows.filter((r) => r.folded !== null);
const line = (label, group) => `${label} (${group.length} lines): old ${mean(group.map((r) => err(r.old, r.hand))).toFixed(3)}, folded ${mean(group.map((r) => err(r.folded, r.hand))).toFixed(3)}`;
console.log(`\nlines ${rows.length}; folded covers ${covered.length}, abstains on ${rows.length - covered.length} (${rows.filter((r) => r.short).map((r) => r.label + ": old error " + err(r.old, r.hand).toFixed(2)).join('; ')})`);
console.log(`mean |error| on the same covered lines (critique 1.4): ${line('all', covered)}`);
console.log(`  ${line('Errata', covered.filter((r) => r.errata))}`);
console.log(`  ${line('others', covered.filter((r) => !r.errata))}`);
console.log(`folded worse than old by more than 0.10: ${covered.filter((r) => err(r.folded, r.hand) - err(r.old, r.hand) > 0.1).map((r) => r.label).join(', ') || 'none'}`);
