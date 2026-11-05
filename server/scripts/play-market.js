// Live playthrough of the Crumbling Market through a CLI provider, in-process (no port is opened).
//   node server/scripts/play-market.js --provider codex-cli [--out <file.json>]
// It uses a temporary learner save, removes it afterwards and prints a JSON report: each step, the LLM's raw
// outputs, grading verdicts, timings and an estimate of the target-language share of each NPC line.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CLI_PROVIDERS, loadRootEnv, resolveTargetLanguage } from '../src/config.js';
import { loadGameContent } from '../src/content-loader.js';
import { LearningService } from '../src/learning-service.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { providerArgument } from './check-provider.js';

const orders = {
  it: ['Vorrei un caffè, per favore.', 'Senza latte, per favore.'],
  es: ['Quiero un café, por favor.', 'Sin leche, por favor.'],
};

const tokens = (text) => text.toLocaleLowerCase().match(/[\p{L}']+/gu) ?? [];

// Two rough estimates of the share of target-language words in an NPC line: tokens absent from the English
// translation, and tokens covered by canonical vocabulary matches. Neither is exact; both are reported.
export function languageShare(native, translation, entries) {
  const words = tokens(native);
  if (!words.length) return { tokens: 0, notInTranslation: 0, canonical: 0 };
  const english = new Set(tokens(translation));
  const canonicalTokens = matchCanonicalVocabulary(native, entries).reduce((sum, match) => sum + tokens(match.excerpt || match.entry.target).length, 0);
  return {
    tokens: words.length,
    notInTranslation: +(words.filter((word) => !english.has(word)).length / words.length).toFixed(2),
    canonical: +(Math.min(canonicalTokens, words.length) / words.length).toFixed(2),
  };
}

export async function playMarket({ args = process.argv.slice(2), env = process.env } = {}) {
  loadRootEnv({ env });
  const providerName = providerArgument(args) ?? env.LLM_PROVIDER;
  if (!CLI_PROVIDERS.has(providerName)) throw new Error('play-market requires --provider codex-cli or --provider claude-cli.');
  env.LLM_PROVIDER = providerName;
  const provider = createLLMAdapter({}, env);
  const raw = [];
  const structuredChat = provider.structuredChat.bind(provider);
  provider.structuredChat = async (messages, schema, options) => {
    const started = performance.now();
    const output = await structuredChat(messages, schema, options);
    raw.push({ schema: options?.schemaName, durationMs: Math.round(performance.now() - started), output });
    return output;
  };
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-play-'));
  const steps = [];
  const step = async (name, run) => {
    try { const result = await run(); steps.push({ name, ok: true, ...result }); return result; }
    catch (error) { steps.push({ name, ok: false, code: error.code ?? null, message: error.message }); return null; }
  };
  try {
    const preflight = await provider.preflight();
    const content = loadGameContent({ language: resolveTargetLanguage(env) });
    const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content });
    const { learnerId } = await service.createOrRecoverLearner();
    const summary = (world) => ({ current: world.currentLocationId, visible: world.locations.map((l) => `${l.id}:${l.state}`) });

    await step('world at start', async () => summary((await service.getWorld(learnerId)).world));
    await step('move to the_rift (expect NOT_ADJACENT)', async () => summary((await service.moveTo(learnerId, { locationId: 'the_rift' })).world));
    await step('move to coffee_cart', async () => summary((await service.moveTo(learnerId, { locationId: 'coffee_cart' })).world));
    let encounter = (await step('start Gerald', async () => ({ encounter: (await service.startEncounter(learnerId)).encounter })))?.encounter;
    for (const message of orders[content.language.code]) {
      if (!encounter || encounter.state !== 'ongoing') break;
      const result = await step(`say "${message}"`, async () => {
        const response = await service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: crypto.randomUUID(), message });
        return {
          encounter: response.encounter,
          verdicts: response.assessment.objectiveResults.map((r) => ({ objective: r.objectiveId, passed: r.passed, evidence: r.vocabularyEvidence })),
          feedback: response.assessment.overallFeedback,
        };
      });
      encounter = result?.encounter ?? encounter;
    }
    const finalWorld = (await service.getWorld(learnerId)).world;
    await step('world after the encounter', async () => ({
      ...summary(finalWorld),
      coffeeCartEncounter: finalWorld.locations.find((l) => l.id === 'coffee_cart')?.encounter ?? null,
    }));

    const lines = raw.filter((item) => item.schema === 'encounter_narration').map((item, turn) => ({
      turn,
      requestedRatio: service.ratioFor(turn),
      native: item.output.dialogue.native,
      translation: item.output.dialogue.translation,
      narrative: item.output.narrative,
      share: languageShare(item.output.dialogue.native, item.output.dialogue.translation, content.vocabulary.entries),
      durationMs: item.durationMs,
    }));
    for (const s of steps) delete s.encounter;
    return {
      provider: preflight,
      language: content.language.code,
      resolved: encounter?.state === 'resolved',
      completedOnMap: finalWorld.locations.find((l) => l.id === 'coffee_cart')?.encounter?.completed === true,
      generationCalls: raw.length,
      steps,
      lines,
      grading: raw.filter((item) => item.schema === 'dialogue_assessment').map((item) => ({ durationMs: item.durationMs, output: item.output })),
    };
  } finally {
    await provider.shutdown?.();
    await rm(saveDir, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outIndex = process.argv.indexOf('--out');
  playMarket().then(async (report) => {
    const text = `${JSON.stringify(report, null, 2)}\n`;
    if (outIndex > 0) await writeFile(process.argv[outIndex + 1], text);
    process.stdout.write(text);
    process.exitCode = report.resolved && report.completedOnMap ? 0 : 1;
  }).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
