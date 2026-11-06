// Round 069: live end-to-end check of round 060's kept lines (paid sentence reveals in the save and the Spellbook).
// In-process (no server, no port). Gerald and Mortimer in one save; JSON report on stdout, exit 1 if a check fails.
//   TARGET_LANGUAGE=it node docs/rounds/069/results/kept-lines-live.mjs --provider codex-cli > out.json
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { CLI_PROVIDERS, loadRootEnv, resolveTargetLanguage } from '../../../../server/src/config.js';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { LearningService } from '../../../../server/src/learning-service.js';
import { JsonLearningStorage } from '../../../../server/src/learning-storage.js';
import { createLLMAdapter } from '../../../../server/src/llm/index.js';
import { route } from '../../../../server/scripts/play-market.js';
import { makeTempDir } from '../../../../server/test/helpers.js';

// Copied from play-market.js's script table (rounds 005, 010).
const SCRIPTS = {
  coffee_cart: {
    it: ['Vorrei un caffè, per favore.', 'Senza latte, per favore.'],
    es: ['Quiero un café, por favor.', 'Sin leche, por favor.'],
  },
  butchers_stall: {
    it: ['Vorrei del prosciutto, per favore.', 'Vorrei del salame, per favore.', 'Chilo.', 'Due etti, per favore.'],
    es: ['Quiero jamón, por favor.', 'Quiero chorizo, por favor.', 'Kilo.', 'Medio kilo, por favor.'],
  },
};
const LIMIT = 500;

const env = process.env;
loadRootEnv({ env });
const index = process.argv.indexOf('--provider');
env.LLM_PROVIDER = index >= 0 ? process.argv[index + 1] : env.LLM_PROVIDER;
if (!CLI_PROVIDERS.has(env.LLM_PROVIDER)) throw new Error('--provider codex-cli or claude-cli');
const provider = createLLMAdapter({}, env);
let calls = 0;
const chat = provider.structuredChat.bind(provider);
const outputs = []; // raw provider outputs, to compare kept text with what the provider actually returned
provider.structuredChat = async (...args) => { calls += 1; const output = await chat(...args); outputs.push(output); return output; };
const rawDialogue = (native) => outputs.map((o) => o?.dialogue).find((d) => d?.native === native);
const saveDir = await makeTempDir('parallang-kept-lines-');
const checks = [];
const check = (run, name, ok, detail = null) => { checks.push({ run, name, ok: Boolean(ok), ...(detail ? { detail } : {}) }); return ok; };
const report = { language: null, provider: null, runs: [], checks, calls: 0 };
const lineView = (line) => ({ id: line.id, speaker: line.speaker, hidden: line.hidden, translation: line.translation, vocabularyIds: line.vocabularyIds, locationName: line.locationName });

try {
  report.provider = (await provider.preflight()).provider;
  const content = loadGameContent({ language: resolveTargetLanguage(env) });
  const language = content.language.code;
  report.language = language;
  const storage = new JsonLearningStorage({ saveDir });
  let service = new LearningService({ provider, storage, content });
  const { learnerId } = await service.createOrRecoverLearner();
  const rawSave = async () => JSON.parse(await readFile(join(saveDir, `${learnerId}.json`), 'utf8'));
  let at = content.world.start;
  const kept = []; // NPC messages revealed and charged, newest last

  for (const locationId of ['coffee_cart', 'butchers_stall']) {
    for (const next of route(content.world, at, locationId)) await service.moveTo(learnerId, { locationId: next });
    at = locationId;
    const encounterId = content.world.locationsById.get(locationId).encounter;
    const locationName = content.world.locationsById.get(locationId).name;
    const run = `${language}:${locationId}`;
    const log = { run, revealed: [], refused: [], turns: [] };
    report.runs.push(log);
    let { encounter } = await service.startEncounter(learnerId, { encounterId });
    const newest = () => [...encounter.transcript].reverse().find((m) => m.role === 'npc');
    // Step 1: lines kept earlier are hidden while this encounter runs.
    const atStart = await service.getSpellbook(learnerId);
    log.atStart = atStart.lines.map(lineView);
    if (atStart.lines.length) check(run, 'at the start: every earlier line hidden', atStart.inEncounter && atStart.lines.every((l) => l.hidden && l.translation === null));

    const revealSentence = async (message) => {
      try {
        const helped = await service.revealEncounterHelp(learnerId, { encounterId: encounter.id, version: encounter.version, messageId: message.id, kind: 'sentence' });
        encounter = helped.encounter;
        return helped;
      } catch (error) {
        if (error.code === 'HINTS_EXHAUSTED') {
          log.refused.push({ messageId: message.id, code: error.code });
          check(run, 'a refused reveal leaves the save unchanged', JSON.stringify(((await rawSave()).lines ?? []).map((l) => l.id)) === JSON.stringify([...kept].reverse().map((m) => m.id)));
          return null;
        }
        throw error;
      }
    };

    // Steps 2–5 on the greeting.
    const greeting = newest();
    const helped = await revealSentence(greeting);
    check(run, 'greeting reveal charged', helped?.charged === true);
    if (helped?.charged) kept.push(greeting);
    const top = helped?.spellbook.lines[0];
    check(run, 'response line matches the greeting, hidden', top && top.id === greeting.id && top.speaker === greeting.dialogue.speaker
      && top.native === greeting.dialogue.native.slice(0, LIMIT) && top.translation === null && top.hidden === true
      && top.locationName === locationName
      && JSON.stringify(top.vocabularyIds) === JSON.stringify(greeting.dialogue.words.map((w) => w.vocabularyId)), top && lineView(top));
    let save = await rawSave();
    const stored = save.lines?.find((line) => line.id === greeting.id);
    check(run, 'save holds the provider text unchanged', stored && stored.native === greeting.dialogue.native.slice(0, LIMIT)
      && stored.translation === rawDialogue(greeting.dialogue.native)?.translation.slice(0, LIMIT)
      && stored.translation === helped.reveal.value.slice(0, LIMIT) && stored.locationId === locationId,
    stored && { nativeLength: stored.native.length, translationLength: stored.translation.length });
    const count = save.lines.length;
    const again = await revealSentence(greeting);
    check(run, 'second reveal not charged, not stored again', again?.charged === false && (await rawSave()).lines.length === count);
    const word = greeting.dialogue.words[0];
    if (word) {
      const wordHelp = await service.revealEncounterHelp(learnerId, { encounterId: encounter.id, version: encounter.version, messageId: greeting.id, kind: 'word', vocabularyId: word.vocabularyId })
        .catch((error) => { if (error.code === 'HINTS_EXHAUSTED') return null; throw error; });
      if (wordHelp) encounter = wordHelp.encounter;
      check(run, 'word reveal keeps no line', (await rawSave()).lines.length === count, { word: word.vocabularyId, charged: wordHelp?.charged ?? 'refused' });
    }
    log.revealed.push({ id: greeting.id, native: greeting.dialogue.native, translation: helped?.reveal.value ?? null, vocabularyIds: greeting.dialogue.words.map((w) => w.vocabularyId) });

    // Step 6: play until resolved, trying a sentence reveal on each new NPC line.
    for (const message of SCRIPTS[locationId][language]) {
      if (encounter.state !== 'ongoing') break;
      const response = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message });
      encounter = response.encounter;
      log.turns.push({ say: message, passed: response.assessment.objectiveResults.map((r) => `${r.objectiveId}:${r.passed}`), state: encounter.state });
      if (encounter.state !== 'ongoing') break;
      const npc = newest();
      const result = await revealSentence(npc);
      if (result?.charged) {
        kept.push(npc);
        log.revealed.push({ id: npc.id, native: npc.dialogue.native, translation: result.reveal.value, vocabularyIds: npc.dialogue.words.map((w) => w.vocabularyId) });
        check(run, 'a later reveal is newest first, its text as the provider returned it', result.spellbook.lines[0]?.id === npc.id
          && (await rawSave()).lines[0].translation === rawDialogue(npc.dialogue.native)?.translation.slice(0, LIMIT));
      }
    }
    check(run, 'encounter resolved', encounter.state === 'resolved', { state: encounter.state });

    // Step 7: after the resolve.
    let book = await service.getSpellbook(learnerId);
    const due = new Set(book.cards.filter((card) => card.due).map((card) => card.vocabularyId));
    log.afterResolve = book.lines.map(lineView);
    check(run, 'after resolve: not in encounter', book.inEncounter === false);
    check(run, 'after resolve: a line is hidden exactly when one of its cards is due', book.lines.every((line) =>
      line.hidden === line.vocabularyIds.some((id) => due.has(id)) && (line.hidden ? line.translation === null : line.translation !== null)));

    // Step 8: review the due cards the kept lines name, then every line shows its saved translation.
    const named = [...new Set(book.lines.flatMap((line) => line.vocabularyIds))].filter((id) => due.has(id));
    log.reviewed = [];
    for (const id of named) {
      const entry = content.vocabularyById.get(id);
      const { challenge } = await service.createReviewChallenge(learnerId, id);
      const result = await service.submitReview(learnerId, { challengeId: challenge.id, attemptId: randomUUID(), action: 'answer', answer: entry.accepted_translations[0] });
      const card = result.spellbook.cards.find((c) => c.vocabularyId === id);
      log.reviewed.push({ id, answer: entry.accepted_translations[0], correct: result.result.correct, dueAfter: card?.due ?? null });
      check(run, `review of ${id} correct and no longer due`, result.result.correct === true && card?.due === false);
    }
    book = await service.getSpellbook(learnerId);
    save = await rawSave();
    log.afterReview = book.lines.map(lineView);
    check(run, 'after review: every line shown with its saved translation', book.lines.every((line) =>
      line.hidden === false && line.translation === save.lines.find((s) => s.id === line.id)?.translation), book.lines.filter((l) => l.hidden).map((l) => l.id));
    log.hiddenThenShown = log.afterResolve.filter((l) => l.hidden && log.afterReview.find((r) => r.id === l.id)?.hidden === false).map((l) => l.id);
    log.noCard = log.afterResolve.filter((l) => !l.vocabularyIds.some((id) => book.cards.some((c) => c.vocabularyId === id))).map((l) => l.id);
    check(run, 'kept lines are newest first and none lost', JSON.stringify(book.lines.map((l) => l.id)) === JSON.stringify([...kept].reverse().map((m) => m.id)));
  }

  // Step 9: a restart keeps the lines.
  const before = await service.getSpellbook(learnerId);
  service = new LearningService({ provider, storage, content });
  const after = await service.getSpellbook(learnerId);
  check(`${language}:restart`, 'a new service returns the same lines', JSON.stringify(after.lines) === JSON.stringify(before.lines), { lines: after.lines.length });
  // Coverage (critique 1.3, 1.4): a later line kept and a hidden line opened by review, in this pack.
  const greetings = new Set(report.runs.map((r) => r.revealed[0]?.id));
  report.coverage = {
    laterLinesKept: report.runs.flatMap((r) => r.revealed).filter((l) => !greetings.has(l.id)).length,
    hiddenThenShown: report.runs.flatMap((r) => r.hiddenThenShown ?? []).length,
  };
  check(`${language}:coverage`, 'at least one later line kept', report.coverage.laterLinesKept >= 1);
  check(`${language}:coverage`, 'at least one line hidden after the resolve and shown after review', report.coverage.hiddenThenShown >= 1);
  report.kept = (await rawSave()).lines.map((line) => ({ ...line, nativeLength: line.native.length, translationLength: line.translation.length }));
} catch (error) {
  report.error = { code: error.code ?? null, message: error.message };
} finally {
  report.calls = calls;
  await provider.shutdown?.();
  await rm(saveDir, { recursive: true, force: true });
}
report.passed = !report.error && checks.length > 0 && checks.every((c) => c.ok);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
