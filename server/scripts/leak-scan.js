#!/usr/bin/env node
// Round 044 (backlog G2): scans live reports for NPC lines that give away an open objective's answer.
//   exact: the line holds a whole surface form of a target of an objective still open at that line;
//   word:  it holds a content word from inside a multi-word form ("más" from "un poco más"), not the whole form.
// Each hit is also marked `echo` (the player said it earlier in the scene) or `quoted` (the objective's own
// authored intent holds it, e.g. a passage read aloud). A line is `leak` (a fresh exact hit), `near` (fresh word
// hits only), `quoted` or `echo`. Hits are flags for reading, not verdicts. Reports are read against today's
// content, and the word scan is a lower bound (no inflection: "chiamo" never hits "chiami").
//   node server/scripts/leak-scan.js <report.json ...> [--json <out.json>]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGameContent } from '../src/content-loader.js';

// Function words that never count as a word hit (articles, prepositions, conjunctions, clitics, a few auxiliaries).
export const FUNCTION_WORDS = Object.freeze({
  it: new Set('il lo la i gli le un una uno l di del della dello dei degli delle da dal dalla in nel nella con su sul sulla per tra fra e ed o a al alla ai che non mi ti si ci vi ne me te se ce ve è sono ho ha'.split(' ')),
  es: new Set('el la lo los las un una unos unas de del a al en con por para y e o u que no me te se nos os le les es son soy he ha'.split(' ')),
});
// Critique 1.6: Errata speaks glitched English; these English words are not word hits in its lines.
export const ENGLISH_COLLISIONS = new Set('come solo sin no me he son dia mas more'.split(' '));
const ENGLISH_SPEAKERS = new Set(['the_rift_errata']);

// The game's own folding (matchCanonicalVocabulary: NFD, marks stripped, lowercase), then everything but letters
// and digits to spaces, so whole words can be found by padding (critique 1.8, 1.12: "po’" and "po'" fold alike).
export const fold = (text) => ` ${String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
const holds = (haystack, needle) => needle.trim() !== '' && haystack.includes(` ${needle.trim()} `);

// Played scenes: objects with `lines` and `grading` arrays (an `encounterId`, or none in rounds 005–008, where the
// scene is the default encounter), and round 026's greeting replays (`results[]` with `encounterId` and `native`).
export function scenesOf(report) {
  const found = [];
  const walk = (node, top) => {
    if (Array.isArray(node)) { node.forEach((each) => walk(each, false)); return; }
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.lines) && Array.isArray(node.grading) && (typeof node.encounterId === 'string' || top)) {
      found.push({ encounterId: node.encounterId ?? null, inferred: typeof node.encounterId !== 'string', lines: node.lines });
      return;
    }
    for (const [key, value] of Object.entries(node)) if (key !== 'steps') walk(value, false);
  };
  walk(report, true);
  if (!found.length && Array.isArray(report.results)) {
    for (const r of report.results) {
      if (typeof r?.encounterId === 'string' && typeof r.native === 'string') found.push({ encounterId: r.encounterId, inferred: false, replay: true, lines: [{ native: r.native }] });
    }
  }
  return found;
}

// The validated verdicts of every successful `say "..."` step, in order (critique 1.2: a grading whose step failed
// moved nothing and was answered by no line). Each step that succeeded is answered by exactly one line.
export function playerTurns(report) {
  return (report.steps ?? []).filter((step) => step.ok && typeof step.name === 'string' && step.name.startsWith('say "'))
    .map((step) => ({ message: step.name.slice(5, -1), verdicts: Array.isArray(step.verdicts) ? step.verdicts : [] }));
}

// Objectives still open at line k, replayed as the server advances (critique 1.1): after each turn the index moves
// over the leading passes of that turn's verdicts and stops at the first fail.
export function openObjectives(objectives, turns, k) {
  let index = 0;
  for (const { verdicts } of turns.slice(0, k)) {
    for (const verdict of verdicts) {
      if (verdict.objective !== objectives[index]?.id || !verdict.passed) break;
      index += 1;
    }
  }
  return objectives.slice(index);
}

// forms: [{ objective, form }]. A whole form is an exact hit; a word of a multi-word form, absent as a whole, a word hit.
export function scanLine(native, forms, language, { english = false } = {}) {
  const line = fold(native);
  const stop = FUNCTION_WORDS[language] ?? new Set();
  const exact = [];
  const words = [];
  for (const { objective, form } of forms) {
    const folded = fold(form).trim();
    if (holds(line, folded)) { exact.push({ objective, form }); continue; }
    const parts = folded.split(' ');
    if (parts.length < 2) continue;
    for (const word of parts) {
      if (word.length < 3 || stop.has(word) || (english && ENGLISH_COLLISIONS.has(word))) continue;
      if (holds(line, word)) words.push({ objective, form, word });
    }
  }
  const exactObjectives = new Set(exact.map((hit) => hit.objective));
  const seen = new Set();
  return {
    exact,
    // One word hit per (objective, word); none for an objective that already hit exactly.
    words: words.filter((hit) => !exactObjectives.has(hit.objective) && !seen.has(`${hit.objective}:${hit.word}`) && seen.add(`${hit.objective}:${hit.word}`)),
  };
}

export function formsFor(objectives, vocabularyById) {
  return objectives.flatMap((objective) => objective.target_vocabulary_ids.flatMap((id) => {
    const entry = vocabularyById.get(id);
    return [...new Set([entry?.target, ...(entry?.surface_variants ?? [])].filter(Boolean))].map((form) => ({ objective: objective.id, form }));
  }));
}

// Passages an objective's intent quotes for the NPC to read (five words or more between quotes): a form inside one is
// quoted, not leaked. Short quoted forms are prohibitions ("He does not say "me gusta"") and do not count.
export function passagesOf(objectives, id) {
  const intent = objectives.find((objective) => objective.id === id)?.intent ?? '';
  return [...intent.matchAll(/"([^"]+)"|«([^»]+)»|“([^”]+)”/g)].map((m) => fold(m[1] ?? m[2] ?? m[3])).filter((passage) => passage.trim().split(' ').length >= 5);
}

export function scanReport(report, content) {
  const found = scenesOf(report);
  const turns = playerTurns(report);
  const skipped = [];
  const scenes = [];
  // Scenes take their turns in order: lines − 1 each (critique 1.2); a report whose counts do not add up is skipped.
  const needed = found.reduce((sum, scene) => sum + Math.max(0, scene.lines.length - 1), 0);
  if (needed !== turns.length) {
    skipped.push({ reason: `turns do not match lines (${turns.length} successful says, ${needed} replies)`, scenes: found.length });
    return { scenes, skipped };
  }
  let at = 0;
  for (const scene of found) {
    const mine = turns.slice(at, at + Math.max(0, scene.lines.length - 1));
    at += mine.length;
    const encounterId = scene.encounterId ?? content.defaultEncounterId; // critique 1.3: rounds 005–008
    const definition = content.encounters.get(encounterId);
    if (!definition) { skipped.push({ reason: `unknown encounter ${encounterId}`, scenes: 1 }); continue; }
    const objectives = definition.encounter.objectives;
    const ids = new Set(objectives.map((objective) => objective.id));
    if (mine.some(({ verdicts }) => verdicts.some((verdict) => !ids.has(verdict.objective)))) {
      skipped.push({ reason: `${encounterId}: verdicts name objectives today's content lacks`, scenes: 1 }); // critique 1.11
      continue;
    }
    const english = ENGLISH_SPEAKERS.has(encounterId);
    const hits = [];
    scene.lines.forEach((line, k) => {
      const open = openObjectives(objectives, mine, k);
      const closed = objectives.filter((objective) => !open.includes(objective));
      // Critique 1.5: a word that is a whole form of a closed objective's target is not a hit (already passed).
      const closedForms = new Set(formsFor(closed, content.vocabularyById).map(({ form }) => fold(form).trim()));
      const { exact, words } = scanLine(line.native ?? '', formsFor(open, content.vocabularyById), content.language.code, { english });
      const before = fold(mine.slice(0, k).map((turn) => turn.message).join(' '));
      const mark = (hit, text) => ({ ...hit, echo: holds(before, fold(text)), quoted: passagesOf(objectives, hit.objective).some((passage) => holds(passage, fold(text))) });
      const marked = {
        exact: exact.map((hit) => mark(hit, hit.form)),
        words: words.filter((hit) => !closedForms.has(hit.word)).map((hit) => mark(hit, hit.word)),
      };
      if (!marked.exact.length && !marked.words.length) return;
      const fresh = (hit) => !hit.echo && !hit.quoted;
      const kind = marked.exact.some(fresh) ? 'leak'
        : !marked.exact.length && marked.words.some(fresh) ? 'near'
          : [...marked.exact, ...marked.words].some((hit) => hit.quoted) ? 'quoted' : 'echo';
      hits.push({ line: k, kind, ...marked, native: line.native });
    });
    const count = (kind) => hits.filter((hit) => hit.kind === kind).length;
    scenes.push({
      encounterId, inferred: scene.inferred, replay: Boolean(scene.replay), lines: scene.lines.length,
      leakLines: count('leak'), nearLines: count('near'), quotedLines: count('quoted'), echoLines: count('echo'), hits,
    });
  }
  return { scenes, skipped };
}

const KINDS = ['leak', 'near', 'quoted', 'echo'];

export function summarize(results) {
  const total = {};
  const files = {};
  for (const r of results) {
    if (r.error) { files[r.error] = (files[r.error] ?? 0) + 1; continue; }
    if (!r.scenes.length && !r.skipped.length) { files['no scenes'] = (files['no scenes'] ?? 0) + 1; continue; }
    files.scanned = (files.scanned ?? 0) + 1;
    const t = (total[r.language] ??= { reports: 0, scenes: 0, inferred: 0, replays: 0, skippedScenes: 0, lines: 0, leakLines: 0, nearLines: 0, quotedLines: 0, echoLines: 0 });
    t.reports += 1;
    t.skippedScenes += r.skipped.reduce((sum, s) => sum + s.scenes, 0);
    for (const s of r.scenes) {
      t.scenes += 1; t.lines += s.lines; if (s.inferred) t.inferred += 1; if (s.replay) t.replays += 1;
      for (const kind of KINDS) t[`${kind}Lines`] += s[`${kind}Lines`];
    }
  }
  return { files, total };
}

async function main(args = process.argv.slice(2)) {
  const jsonAt = args.indexOf('--json');
  const out = jsonAt >= 0 ? args[jsonAt + 1] : null;
  const paths = args.filter((_, i) => jsonAt < 0 || (i !== jsonAt && i !== jsonAt + 1));
  const contents = new Map();
  const results = [];
  for (const path of paths) {
    let report;
    try { report = JSON.parse(readFileSync(path, 'utf8')); } catch { results.push({ path, error: 'not JSON' }); continue; }
    if (!report.language) { results.push({ path, error: 'no language' }); continue; }
    if (!contents.has(report.language)) contents.set(report.language, loadGameContent({ language: report.language }));
    results.push({ path, language: report.language, ...scanReport(report, contents.get(report.language)) });
  }
  for (const r of results.filter((x) => !x.error)) {
    for (const s of r.skipped) console.log(`skipped\t${r.path}\t${s.reason}`);
    for (const s of r.scenes) {
      for (const h of s.hits) {
        const tag = (x) => `${x.echo ? ' (echo)' : ''}${x.quoted ? ' (quoted)' : ''}`;
        const what = [...h.exact.map((x) => `${x.objective}:${x.form}${tag(x)}`), ...h.words.map((x) => `${x.objective}:${x.word}<${x.form}>${tag(x)}`)];
        console.log(`${h.kind}\t${r.path}\t${s.encounterId}\tline ${h.line}\t[${what.join(', ')}]\t${String(h.native).replace(/\s+/g, ' ').slice(0, 160)}`);
      }
    }
  }
  const { files, total } = summarize(results);
  console.log(`== files: ${Object.entries(files).map(([k, v]) => `${k} ${v}`).join(', ')} (of ${paths.length})`);
  for (const [language, t] of Object.entries(total)) {
    console.log(`== ${language}: ${t.reports} reports, ${t.scenes} scenes (${t.inferred} inferred, ${t.replays} replay greetings, ${t.skippedScenes} skipped), ${t.lines} lines; leak ${t.leakLines}, near ${t.nearLines}, quoted ${t.quotedLines}, echo ${t.echoLines}`);
  }
  if (out) writeFileSync(out, `${JSON.stringify({ files, total, results }, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
