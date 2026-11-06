// Round 081: footnotes in play-market reports. Usage: node footnotes.mjs <report.json>...
// Offered = the model's raw footnote (lines[].footnote); kept = footnotes in the serialized transcripts (steps).
import { readFileSync } from 'node:fs';
for (const file of process.argv.slice(2)) {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const encounters = report.encounters ?? [report];
  const kept = new Map();
  for (const step of report.steps ?? []) {
    for (const message of step.encounter?.transcript ?? []) if (message.footnote) kept.set(message.id, message.footnote);
  }
  const keptTexts = new Set(kept.values());
  let lines = 0; let offered = 0;
  console.log(`\n${file} (${report.language})`);
  for (const encounter of encounters) {
    for (const line of encounter.lines ?? []) {
      lines += 1;
      const note = typeof line.footnote === 'string' && line.footnote.trim() ? line.footnote.trim().replace(/\s+/g, ' ') : null;
      if (note) offered += 1;
      console.log(`${encounter.encounterId ?? '?'} t${line.turn} folded=${line.share?.folded?.toFixed(2)} ${note ? (keptTexts.has(note) ? 'KEPT' : 'DROPPED') : '-'}${note ? `: ${note}` : ''}`);
    }
  }
  console.log(`lines ${lines}, offered ${offered} (${(offered / Math.max(lines, 1)).toFixed(2)}), kept ${kept.size}, steps without transcripts are not counted`);
}
