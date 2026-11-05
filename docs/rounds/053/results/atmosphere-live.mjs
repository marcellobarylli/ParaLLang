// Round 053 (queued live check): ask the atmosphere line for each of the six locations, open and complete, in one
// pack, with a real CLI provider. In-process (no server, no port). Writes JSON to stdout.
//   TARGET_LANGUAGE=it node docs/rounds/053/results/atmosphere-live.mjs --provider codex-cli > out.json
import { rm } from 'node:fs/promises';
import { CLI_PROVIDERS, loadRootEnv, resolveTargetLanguage } from '../../../../server/src/config.js';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { LearningService } from '../../../../server/src/learning-service.js';
import { JsonLearningStorage } from '../../../../server/src/learning-storage.js';
import { createLLMAdapter } from '../../../../server/src/llm/index.js';
import { makeTempDir } from '../../../../server/test/helpers.js';

const env = process.env;
loadRootEnv({ env });
const index = process.argv.indexOf('--provider');
env.LLM_PROVIDER = index >= 0 ? process.argv[index + 1] : env.LLM_PROVIDER;
if (!CLI_PROVIDERS.has(env.LLM_PROVIDER)) throw new Error('--provider codex-cli or claude-cli');
const provider = createLLMAdapter({}, env);
const saveDir = await makeTempDir('parallang-atmosphere-');
const rows = [];
try {
  const preflight = await provider.preflight();
  const content = loadGameContent({ language: resolveTargetLanguage(env) });
  const storage = new JsonLearningStorage({ saveDir });
  const service = new LearningService({ provider, storage, content, atmosphere: true });
  const { learnerId } = await service.createOrRecoverLearner();
  for (const location of content.world.locations) {
    for (const completed of [false, true]) {
      const envelope = await storage.load(learnerId);
      envelope.world = { ...envelope.world, currentLocationId: location.id, visitedLocationIds: content.world.locations.map((l) => l.id),
        completedEncounterIds: completed && location.encounter ? [location.encounter] : [] };
      await storage.save(envelope);
      const started = performance.now();
      const { atmosphere } = await service.getAtmosphere(learnerId);
      rows.push({ locationId: location.id, completed, text: atmosphere?.text ?? null, words: atmosphere?.text.split(/\s+/).length ?? 0,
        durationMs: Math.round(performance.now() - started), drop: atmosphere ? null : service.atmosphereStats.drops.at(-1) ?? null });
    }
  }
  console.log(JSON.stringify({ provider: preflight.provider, language: content.language.code, calls: service.atmosphereStats.calls, rows }, null, 2));
}
finally {
  await provider.shutdown?.();
  await rm(saveDir, { recursive: true, force: true });
}
