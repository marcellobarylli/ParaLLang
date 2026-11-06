// Round 076: live timing of the greeting prefetch. Per arm (off / on) a fresh learner walks entrance → coffee cart →
// cracked fountain → butcher's stall, stays DWELL_MS at each, then starts the encounter there and times the start.
// Arms run in the order off, on, on, off. In-process (no port).
//   TARGET_LANGUAGE=it node docs/rounds/076/results/prefetch-live.mjs --provider codex-cli --out <report.json>
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLI_PROVIDERS, loadRootEnv, resolveTargetLanguage } from '../../../../server/src/config.js';
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { LearningService } from '../../../../server/src/learning-service.js';
import { JsonLearningStorage } from '../../../../server/src/learning-storage.js';
import { createLLMAdapter } from '../../../../server/src/llm/index.js';
import { providerArgument } from '../../../../server/scripts/check-provider.js';

const DWELL_MS = 10_000;
const WALK = [['coffee_cart', 'imp_coffee_greeting'], ['cracked_fountain', 'cracked_fountain_letharger'], ['butchers_stall', 'butchers_stall_charcutier']];
const ARMS = ['off', 'on', 'on', 'off'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const env = process.env;
loadRootEnv({ env });
env.LLM_PROVIDER = providerArgument(process.argv.slice(2)) ?? env.LLM_PROVIDER;
if (!CLI_PROVIDERS.has(env.LLM_PROVIDER)) throw new Error('needs --provider codex-cli or claude-cli');
const content = loadGameContent({ language: resolveTargetLanguage(env) });
const report = { language: content.language.code, provider: env.LLM_PROVIDER, dwellMs: DWELL_MS, startedAt: new Date().toISOString(), arms: [] };

for (const [index, arm] of ARMS.entries()) {
  const provider = createLLMAdapter({}, env);
  const calls = [];
  const structuredChat = provider.structuredChat.bind(provider);
  provider.structuredChat = async (messages, schema, options) => {
    const call = { schema: options?.schemaName, speaker: messages[0].content.match(/Gerald|Flick|Mortimer|Portia/)?.[0] ?? null, startedMs: performance.now() };
    calls.push(call);
    try { return await structuredChat(messages, schema, options); }
    finally { call.durationMs = Math.round(performance.now() - call.startedMs); }
  };
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-prefetch-'));
  const service = new LearningService({ provider, storage: new JsonLearningStorage({ saveDir }), content, prefetch: arm === 'on' });
  const run = { index, arm, starts: [], calls, stats: null };
  try {
    if (index === 0) report.preflight = await provider.preflight();
    const { learnerId } = await service.createOrRecoverLearner();
    for (const [locationId, encounterId] of WALK) {
      await service.moveTo(learnerId, { locationId });
      const arrivedMs = performance.now();
      await sleep(DWELL_MS);
      const before = calls.length;
      const t0 = performance.now();
      const entry = { locationId, encounterId };
      try {
        const { encounter } = await service.startEncounter(learnerId, { encounterId });
        entry.ok = true;
        entry.greeting = encounter.transcript[0]?.dialogue?.native ?? null;
      } catch (error) { entry.ok = false; entry.error = `${error.code ?? ''} ${error.message}`; }
      entry.startMs = Math.round(performance.now() - t0);
      entry.callsDuringStart = calls.length - before;
      const prefetch = calls.slice(0, before).filter((c) => c.schema === 'encounter_narration' && c.startedMs >= arrivedMs).at(-1);
      if (prefetch) {
        entry.prefetchDelayMs = Math.round(prefetch.startedMs - arrivedMs);
        entry.prefetchGenerationMs = prefetch.durationMs ?? null;
        entry.allowedResidualMs = Math.max(0, (prefetch.durationMs ?? 0) - (DWELL_MS - entry.prefetchDelayMs)) + 1000;
      }
      run.starts.push(entry);
      console.error(`${arm} #${index} ${locationId}: start ${entry.startMs} ms, ok=${entry.ok}, calls in start ${entry.callsDuringStart}${prefetch ? `, prefetch ${entry.prefetchGenerationMs} ms after ${entry.prefetchDelayMs} ms` : ''}`);
    }
    run.stats = { ...service.prefetchStats };
    run.heldAtEnd = service.greetings.size;
  } finally {
    await service.shutdown();
    await rm(saveDir, { recursive: true, force: true });
  }
  run.calls = calls.map(({ schema, speaker, durationMs }) => ({ schema, speaker, durationMs }));
  report.arms.push(run);
}
report.finishedAt = new Date().toISOString();
const text = `${JSON.stringify(report, null, 2)}\n`;
const out = process.argv.indexOf('--out');
if (out > 0) await writeFile(process.argv[out + 1], text);
process.stdout.write(text);
