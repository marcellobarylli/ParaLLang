#!/usr/bin/env node
// Round 044 (backlog G2): scans live reports for NPC lines that give away an open objective's answer.
//   exact: the line holds a whole surface form of a target of an objective still open at that line;
//   word:  it holds a content word from inside a multi-word form ("más" from "un poco más"), not the whole form.
// Each hit is also marked `echo` (the player said it earlier in the scene) or `quoted` (the objective's own
// authored intent holds it, e.g. a passage read aloud). A line is `leak` (a fresh exact hit), `near` (fresh word
// hits only), `quoted` or `echo`. Hits are flags for reading, not verdicts. Reports are read against today's
// content, and the word scan is a lower bound (no inflection: "chiamo" never hits "chiami").
// Round 049 (backlog G7): `foreign` lines, counted apart from the four kinds, hold a whole surface form of a target that
// a party conversation teaches and the scene's own encounter does not (Flick saying Marginalia's "eccomi").
// Round 100 (round 097 review R1.5): `extras`, counted apart from all of the above, are the line's English
// `narrative` and the grader's feedback holding a whole form of an objective still open when the player reads them.
// Round 101 (round 044 open item 2): a fifth kind, `soft`: an NPC line whose only fresh whole-form hits are listed
// optional frame words (FRAME_TARGETS) or the English *espresso* (NPC_ENGLISH_FORMS). `leak` counts only the others
// since round 101; the printed line keeps the old sum (leak + soft) beside it.
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
      found.push({ encounterId: node.encounterId ?? null, inferred: typeof node.encounterId !== 'string', lines: node.lines, grading: node.grading });
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
    .map((step) => ({ message: step.name.slice(5, -1), verdicts: Array.isArray(step.verdicts) ? step.verdicts : [], feedback: typeof step.feedback === 'string' ? step.feedback : null }));
}

// Objectives still open at line k, replayed as the server advances (critique 1.1). Round 097 (review R1.3): as
// `submitDialogue` closes them. Ordered: each turn closes the leading run of still-open objectives, in authored
// order, that passed in that turn (verdicts by id, so the grader's order does not matter; a held early pass stays
// open). Unordered: every objective that passed in an earlier turn is closed.
export function openObjectives(objectives, turns, k, { unordered = false } = {}) {
  const closed = new Set();
  for (const { verdicts } of turns.slice(0, k)) {
    const passed = new Set(verdicts.filter((verdict) => verdict.passed).map((verdict) => verdict.objective));
    if (unordered) { for (const id of passed) closed.add(id); continue; }
    for (const objective of objectives.filter((candidate) => !closed.has(candidate.id))) {
      if (!passed.has(objective.id)) break;
      closed.add(objective.id);
    }
  }
  return objectives.filter((objective) => !closed.has(objective.id));
}

// forms: [{ objective, form }]. A whole form is an exact hit; a word of a multi-word form, absent as a whole, a word hit.
// Round 101 (critique 1.6): `soft(hit)` names exact hits (frame words) that do not stop word hits of their objective.
export function scanLine(native, forms, language, { english = false, soft = () => false } = {}) {
  const line = fold(native);
  const stop = FUNCTION_WORDS[language] ?? new Set();
  const exact = [];
  const words = [];
  for (const { objective, form, id } of forms) {
    const folded = fold(form).trim();
    if (holds(line, folded)) { exact.push({ objective, form, ...(id !== undefined ? { id } : {}) }); continue; }
    const parts = folded.split(' ');
    if (parts.length < 2) continue;
    for (const word of parts) {
      if (word.length < 3 || stop.has(word) || (english && ENGLISH_COLLISIONS.has(word))) continue;
      if (holds(line, word)) words.push({ objective, form, word });
    }
  }
  const exactObjectives = new Set(exact.filter((hit) => !soft(hit)).map((hit) => hit.objective));
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
    return [...new Set([entry?.target, ...(entry?.surface_variants ?? [])].filter(Boolean))].map((form) => ({ objective: objective.id, form, id }));
  }));
}

// Round 101 (decision 1, critique 1.2, 1.5): optional frame words by encounter, objective and entry id. Each is
// outside every required group and its objective's grammar constraints do not need it (a content test checks the
// groups). Mortimer's numbers are outside the groups too, but "a number, un/una or a half" is required: not listed.
export const FRAME_TARGETS = Object.freeze({
  imp_coffee_greeting: { order_coffee: ['vorrei', 'quiero'] }, // "Un caffè, per favore." passes
  the_rift_errata: { order: ['vorrei', 'quiero'], nobody: ['nome', 'nombre'] }, // the key is nessuno / nadie
  market_entrance_tutorial: { introduce: ['io', 'yo'] }, // sono / soy or mi chiamo / me llamo carry it
});
export const isFrame = (encounterId, objective, id) => (FRAME_TARGETS[encounterId]?.[objective] ?? []).includes(id);
// Round 101 (decision 2, critique 1.1): English words among whole target forms in NPC lines. Only *espresso*
// (Gerald's "five espresso shots"): round 100's ENGLISH_FORMS, for English texts, would hide real leaks here (*basta*,
// *ciao*, *hola*). Errata's ENGLISH_COLLISIONS cover word hits inside multi-word forms only.
// Round 104 (review R1.1): English only in an English phrase ("espresso shots"); "Vuoi un espresso?" is a leak.
export const NPC_ENGLISH_FORMS = Object.freeze({ it: [{ form: 'espresso', context: /\bespresso shots?\b/ }], es: [] });
export const npcEnglish = (language, form, line) => (NPC_ENGLISH_FORMS[language] ?? [])
  .some((entry) => entry.form === fold(form).trim() && entry.context.test(fold(line)));

// Passages an objective's intent quotes for the NPC to read (five words or more between quotes): a form inside one is
// quoted, not leaked. Short quoted forms are prohibitions ("He does not say "me gusta"") and do not count.
export function passagesOf(objectives, id) {
  const intent = objectives.find((objective) => objective.id === id)?.intent ?? '';
  return [...intent.matchAll(/"([^"]+)"|«([^»]+)»|“([^”]+)”/g)].map((m) => fold(m[1] ?? m[2] ?? m[3])).filter((passage) => passage.trim().split(' ').length >= 5);
}

// Round 049: the whole forms of every entry a party conversation targets, minus the entries the scene's own encounter
// targets, each with the conversation that teaches it.
// Critique 1.3: a form that folds like one of the scene's own forms is the scene's word, not another conversation's.
export function foreignFormsFor(content, encounterId) {
  const objectives = content.encounters.get(encounterId)?.encounter.objectives ?? [];
  const own = new Set(objectives.flatMap((objective) => objective.target_vocabulary_ids));
  const ownForms = new Set(formsFor(objectives, content.vocabularyById).map(({ form }) => fold(form).trim()));
  const forms = [];
  for (const { encounter } of content.encounters.values()) {
    if (!encounter.party_of) continue;
    for (const id of new Set(encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids))) {
      if (own.has(id)) continue;
      const entry = content.vocabularyById.get(id);
      for (const form of new Set([entry?.target, ...(entry?.surface_variants ?? [])].filter(Boolean))) {
        if (!ownForms.has(fold(form).trim())) forms.push({ owner: encounter.id, id, form });
      }
    }
  }
  return forms;
}

// Round 100 (critique 1.2): single-word pack forms that are also English words. In English text a hit on one is
// marked `english` and its text counted apart (it may still give the answer away: "Gerald pours an espresso").
export const ENGLISH_FORMS = Object.freeze({
  es: new Set('once kilo kilos cafe chorizo hola amigo amigos yo dos'.split(' ')),
  it: new Set('due espresso salami salame prosciutto ciao basta otto chilo'.split(' ')),
});

// Round 100: one English text against the open objectives' forms. Round 104 (review R1.4): one hit per (objective,
// folded form), so an echoed or English form found first does not hide a fresh one of the same objective.
function scanText(text, forms, language, earlier, { passages = null } = {}) {
  const folded = fold(text);
  const english = ENGLISH_FORMS[language] ?? new Set();
  const byObjective = new Map();
  for (const { objective, form } of forms) {
    const f = fold(form).trim();
    if (byObjective.has(`${objective}|${f}`) || !holds(folded, f)) continue;
    byObjective.set(`${objective}|${f}`, {
      objective, form,
      echo: earlier.some((message) => holds(message, f)),
      english: english.has(f),
      ...(passages ? { quoted: passages(objective).some((passage) => holds(passage, f)) } : {}),
    });
  }
  const hits = [...byObjective.values()];
  const fresh = hits.some((hit) => !hit.echo && !hit.english && !hit.quoted);
  const englishOnly = !fresh && hits.some((hit) => hit.english && !hit.echo && !hit.quoted);
  return { hits, fresh, englishOnly };
}

// Round 100 (decisions 4-6): the scene's narratives and feedback. `mine` are the scene's turns.
export function scanExtras(scene, mine, definition, content) {
  const objectives = definition.encounter.objectives;
  const unordered = definition.encounter.objectives_unordered === true;
  const language = content.language.code;
  const out = { texts: [], narratives: 0, feedbackTurns: 0, feedbackUnmatched: 0 };
  const folded = mine.map((turn) => fold(turn.message));
  scene.lines.forEach((line, k) => {
    if (typeof line.narrative !== 'string' || !line.narrative.trim()) return;
    out.narratives += 1;
    const forms = formsFor(openObjectives(objectives, mine, k, { unordered }), content.vocabularyById);
    const result = scanText(line.narrative, forms, language, folded.slice(0, k), { passages: (id) => passagesOf(objectives, id) });
    if (result.hits.length) out.texts.push({ field: 'narrative', line: k, ...result, text: line.narrative });
  });
  const gradings = Array.isArray(scene.grading) ? scene.grading : [];
  const used = new Set();
  mine.forEach((turn, j) => {
    if (turn.feedback === null) return;
    out.feedbackTurns += 1;
    const at = gradings.findIndex((grading, i) => !used.has(i) && grading?.output?.overall_feedback === turn.feedback);
    if (at >= 0) used.add(at); else out.feedbackUnmatched += 1;
    const parts = [turn.feedback, ...(at >= 0 ? (gradings[at].output.objective_results ?? []).map((result) => result?.feedback).filter((each) => typeof each === 'string') : [])];
    const forms = formsFor(openObjectives(objectives, mine, j + 1, { unordered }), content.vocabularyById);
    const text = parts.join(' | ');
    const result = scanText(text, forms, language, folded.slice(0, j + 1));
    if (result.hits.length) out.texts.push({ field: 'feedback', turn: j, ...result, text });
  });
  return out;
}

// Critique 1.2: party forms that English has borrowed ("amigo", round 047 critique 1.4); marked, never counted.
export const FOREIGN_ENGLISH = new Set(['amigo', 'amigos']);

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
    const foreignForms = foreignFormsFor(content, encounterId);
    const foreign = [];
    scene.lines.forEach((line, k) => {
      const open = openObjectives(objectives, mine, k, { unordered: definition.encounter.objectives_unordered === true });
      const closed = objectives.filter((objective) => !open.includes(objective));
      // Critique 1.5: a word that is a whole form of a closed objective's target is not a hit (already passed).
      const closedForms = new Set(formsFor(closed, content.vocabularyById).map(({ form }) => fold(form).trim()));
      // Round 104 (review R1.5): an English *espresso* stops no word hits either, like a frame word.
      const isEnglish = (hit) => npcEnglish(content.language.code, hit.form, line.native ?? '');
      const { exact, words } = scanLine(line.native ?? '', formsFor(open, content.vocabularyById), content.language.code, { english, soft: (hit) => isFrame(encounterId, hit.objective, hit.id) || isEnglish(hit) });
      // Critique 1.7: echo only if one earlier message holds the whole form by itself (round 097, review R1.9: for
      // the objectives' own hits too, not the messages joined).
      const messages = mine.slice(0, k).map((turn) => fold(turn.message));
      const strange = foreignForms.filter(({ form }) => holds(fold(line.native ?? ''), fold(form).trim()))
        .map((hit) => ({ ...hit, echo: messages.some((message) => holds(message, fold(hit.form))), english: FOREIGN_ENGLISH.has(fold(hit.form).trim()) }));
      if (strange.length) foreign.push({ line: k, hits: strange, native: line.native });
      const mark = (hit, text) => ({ ...hit, echo: messages.some((message) => holds(message, fold(text))), quoted: passagesOf(objectives, hit.objective).some((passage) => holds(passage, fold(text))) });
      const soften = (hit) => ({ ...hit, frame: isFrame(encounterId, hit.objective, hit.id), english: isEnglish(hit) });
      const marked = {
        exact: exact.map((hit) => soften(mark(hit, hit.form))),
        words: words.filter((hit) => !closedForms.has(hit.word)).map((hit) => mark(hit, hit.word)),
      };
      if (!marked.exact.length && !marked.words.length) return;
      const fresh = (hit) => !hit.echo && !hit.quoted;
      // Round 101 (decision 3): leak > near > soft > quoted > echo. Round 104 (review R1.3): any fresh word hit is near.
      const key = (hit) => fresh(hit) && !hit.frame && !hit.english;
      const kind = marked.exact.some(key) ? 'leak'
        : marked.words.some(fresh) ? 'near'
          : marked.exact.some(fresh) ? 'soft'
            : [...marked.exact, ...marked.words].some((hit) => hit.quoted) ? 'quoted' : 'echo';
      // Round 104 (review R1.2): the pre-101 rule, for comparison with earlier rounds: any fresh exact hit.
      hits.push({ line: k, kind, oldLeak: marked.exact.some(fresh), ...marked, native: line.native });
    });
    const count = (kind) => hits.filter((hit) => hit.kind === kind).length;
    const extras = scanExtras(scene, mine, definition, content); // round 100
    scenes.push({
      extras,
      encounterId, inferred: scene.inferred, replay: Boolean(scene.replay), lines: scene.lines.length,
      leakLines: count('leak'), nearLines: count('near'), softLines: count('soft'), oldLeakLines: hits.filter((hit) => hit.oldLeak).length, quotedLines: count('quoted'), echoLines: count('echo'), hits,
      party: Boolean(definition.encounter.party_of),
      foreignLines: foreign.filter((entry) => entry.hits.some((hit) => !hit.echo && !hit.english)).length, foreign,
    });
  }
  return { scenes, skipped };
}

const KINDS = ['leak', 'near', 'soft', 'quoted', 'echo'];

// Round 100 (critique 1.5): the round folder a report sits in, before or from round 051 (the grader's order rule).
export function eraOf(path) {
  const m = /docs\/rounds\/(\d{3})\//.exec(String(path ?? ''));
  if (!m) return 'other';
  return Number(m[1]) < 51 ? 'before 051' : 'from 051';
}

export function summarize(results) {
  const total = {};
  const files = {};
  const extras = {};
  for (const r of results) {
    if (r.error) { files[r.error] = (files[r.error] ?? 0) + 1; continue; }
    if (!r.scenes.length && !r.skipped.length) { files['no scenes'] = (files['no scenes'] ?? 0) + 1; continue; }
    files.scanned = (files.scanned ?? 0) + 1;
    const t = (total[r.language] ??= { reports: 0, scenes: 0, inferred: 0, replays: 0, skippedScenes: 0, lines: 0, leakLines: 0, nearLines: 0, softLines: 0, oldLeakLines: 0, quotedLines: 0, echoLines: 0, foreignLines: 0, partyLines: 0, partyForeignLines: 0 });
    t.reports += 1;
    t.skippedScenes += r.skipped.reduce((sum, s) => sum + s.scenes, 0);
    for (const s of r.scenes) {
      t.scenes += 1; t.lines += s.lines; if (s.inferred) t.inferred += 1; if (s.replay) t.replays += 1;
      for (const kind of KINDS) t[`${kind}Lines`] += s[`${kind}Lines`] ?? 0;
      t.oldLeakLines += s.oldLeakLines ?? 0; // round 104
      const era = ((t.byEra ??= {})[eraOf(r.path)] ??= { leakLines: 0, softLines: 0, oldLeakLines: 0 }); // round 101
      era.leakLines += s.leakLines; era.softLines += s.softLines ?? 0; era.oldLeakLines += s.oldLeakLines ?? 0;
      t.foreignLines += s.foreignLines;
      if (s.party) { t.partyLines += s.lines; t.partyForeignLines += s.foreignLines; }
      if (!s.extras) continue;
      const e = ((extras[r.language] ??= {})[eraOf(r.path)] ??= { narratives: 0, freshNarratives: 0, englishNarratives: 0, feedbackTurns: 0, freshFeedback: 0, englishFeedback: 0, feedbackUnmatched: 0 });
      e.narratives += s.extras.narratives;
      e.feedbackTurns += s.extras.feedbackTurns;
      e.feedbackUnmatched += s.extras.feedbackUnmatched;
      for (const text of s.extras.texts) {
        const field = text.field === 'narrative' ? 'Narratives' : 'Feedback';
        if (text.fresh) e[`fresh${field}`] += 1;
        else if (text.englishOnly) e[`english${field}`] += 1;
      }
    }
  }
  return { files, total, extras };
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
      for (const x of s.extras?.texts ?? []) {
        if (!x.fresh && !x.englishOnly) continue;
        const what = x.hits.map((hit) => `${hit.objective}:${hit.form}${hit.echo ? ' (echo)' : ''}${hit.english ? ' (english)' : ''}${hit.quoted ? ' (quoted)' : ''}`);
        console.log(`extra-${x.field}${x.fresh ? '' : '-english'}\t${r.path}\t${s.encounterId}\t${x.field === 'narrative' ? `line ${x.line}` : `turn ${x.turn}`}\t[${what.join(', ')}]\t${String(x.text).replace(/\s+/g, ' ').slice(0, 200)}`);
      }
      for (const f of s.foreign) {
        const what = f.hits.map((x) => `${x.owner}:${x.form}${x.echo ? ' (echo)' : ''}${x.english ? ' (english)' : ''}`);
        console.log(`foreign\t${r.path}\t${s.encounterId}\tline ${f.line}\t[${what.join(', ')}]\t${String(f.native).replace(/\s+/g, ' ').slice(0, 160)}`);
      }
    }
  }
  const { files, total, extras } = summarize(results);
  console.log(`== files: ${Object.entries(files).map(([k, v]) => `${k} ${v}`).join(', ')} (of ${paths.length})`);
  for (const [language, t] of Object.entries(total)) {
    console.log(`== ${language}: ${t.reports} reports, ${t.scenes} scenes (${t.inferred} inferred, ${t.replays} replay greetings, ${t.skippedScenes} skipped), ${t.lines} lines; leak ${t.leakLines} (+soft ${t.softLines}; old leak ${t.oldLeakLines}), near ${t.nearLines}, quoted ${t.quotedLines}, echo ${t.echoLines}; foreign ${t.foreignLines} (party conversations: ${t.partyForeignLines} of ${t.partyLines} lines)`);
  }
  for (const [language, t] of Object.entries(total)) {
    for (const [era, e] of Object.entries(t.byEra ?? {}).sort()) console.log(`== ${language} ${era}: leak ${e.leakLines}, soft ${e.softLines}, old leak ${e.oldLeakLines}`);
  }
  for (const [language, eras] of Object.entries(extras)) {
    for (const [era, e] of Object.entries(eras).sort()) {
      console.log(`== extras ${language} ${era}: narratives ${e.narratives} (fresh ${e.freshNarratives}, english ${e.englishNarratives}); feedback turns ${e.feedbackTurns} (fresh ${e.freshFeedback}, english ${e.englishFeedback}, unmatched gradings ${e.feedbackUnmatched})`);
    }
  }
  if (out) writeFileSync(out, `${JSON.stringify({ files, total, extras, results }, null, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error); process.exitCode = 1; });
