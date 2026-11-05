// Live playthrough of the Crumbling Market through a CLI provider, in-process (no port is opened).
//   node server/scripts/play-market.js --provider codex-cli [--location coffee_cart|market_entrance|butchers_stall|cracked_fountain] [--out <file.json>]
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

// Scripted player lines per location and language (round 009 added the Market Entrance tutorial).
const scripts = {
  coffee_cart: {
    it: ['Vorrei un caffè, per favore.', 'Senza latte, per favore.'],
    es: ['Quiero un café, por favor.', 'Sin leche, por favor.'],
  },
  // Round 010: ham and a bare unit first (both should fail), then a passing meat and quantity.
  butchers_stall: {
    it: ['Vorrei del prosciutto, per favore.', 'Vorrei del salame, per favore.', 'Chilo.', 'Due etti, per favore.'],
    es: ['Quiero jamón, por favor.', 'Quiero chorizo, por favor.', 'Kilo.', 'Medio kilo, por favor.'],
  },
  // Round 011: a wrong command, an English direction and agreeing to later first (all should fail).
  cracked_fountain: {
    it: ['Guarda!', 'Fermati!', 'Left.', 'A sinistra!', 'Domani.', 'No, adesso!'],
    es: ['¡Mira!', '¡Quieto!', 'Left.', '¡A la izquierda!', 'Mañana.', '¡No, ahora!'],
  },
  market_entrance: {
    it: ['Ciao!', 'Mi chiamo Sam.', 'E tu?'],
    es: ['¡Hola!', 'Me llamo Sam.', '¿Y tú?'],
  },
};

// The shortest walk from one location to another over the map's paths (round 011: the fountain is two steps away).
export function route(world, from, to) {
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const here = queue.shift();
    if (here === to) break;
    for (const next of world.neighbours.get(here) ?? []) if (!previous.has(next)) { previous.set(next, here); queue.push(next); }
  }
  if (!previous.has(to)) throw new Error(`No path from ${from} to ${to}.`);
  const path = [];
  for (let at = to; at !== from; at = previous.get(at)) path.unshift(at);
  return path;
}

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
  const locationIndex = args.indexOf('--location');
  const locationId = locationIndex >= 0 ? args[locationIndex + 1] : 'coffee_cart';
  if (!scripts[locationId]) throw new Error(`play-market has no script for --location ${locationId}; use ${Object.keys(scripts).join(' or ')}.`);
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
    for (const next of route(content.world, content.world.start, locationId)) {
      await step(`move to ${next}`, async () => summary((await service.moveTo(learnerId, { locationId: next })).world));
    }
    const encounterId = content.world.locationsById.get(locationId).encounter;
    const definition = content.encounters.get(encounterId);
    let encounter = (await step(`start ${definition.character.name}`, async () => ({ encounter: (await service.startEncounter(learnerId, { encounterId })).encounter })))?.encounter;
    const companionBriefing = encounter?.companionBriefing ?? null;
    for (const message of scripts[locationId][content.language.code]) {
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
      locationEncounter: finalWorld.locations.find((l) => l.id === locationId)?.encounter ?? null,
    }));

    const lines = raw.filter((item) => item.schema === 'encounter_narration').map((item, turn) => ({
      turn,
      requestedRatio: service.ratioFor(turn, definition),
      native: item.output.dialogue.native,
      translation: item.output.dialogue.translation,
      narrative: item.output.narrative,
      share: languageShare(item.output.dialogue.native, item.output.dialogue.translation, definition.narrationEntries),
      durationMs: item.durationMs,
    }));
    for (const s of steps) delete s.encounter;
    return {
      provider: preflight,
      language: content.language.code,
      location: locationId,
      encounterId,
      companionBriefing,
      resolved: encounter?.state === 'resolved',
      completedOnMap: finalWorld.locations.find((l) => l.id === locationId)?.encounter?.completed === true,
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
