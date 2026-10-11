import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../src/app.js';
import { CLI_PROVIDERS, loadRootEnv } from '../src/config.js';
import { loadGameContent } from '../src/content-loader.js';
import { LearningService } from '../src/learning-service.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { buildGradingMessages } from '../src/llm/prompt-builder.js';
import { gradingResponseSchema } from '../src/llm/schemas.js';
import { ProviderError } from '../src/llm/provider-error.js';
import { providerArgument } from './check-provider.js';

const cases = [
  { name: 'positive', answer: 'Quiero un café.', expected: [true, false] },
  { name: 'complete', answer: 'Quiero un café sin leche.', expected: [true, true] },
  { name: 'mixed-language', answer: 'I would like un café sin leche, please.', expected: [true, true] },
  { name: 'English-only', answer: 'I want black coffee without milk.', expected: [false, false] },
  { name: 'contextual', answer: 'Sin leche, por favor.', context: ['Quiero un café.'], objectiveIndex: 1, expected: [true] },
  { name: 'negated', answer: 'No sin leche, con leche.', context: ['Quiero un café.'], objectiveIndex: 1, expected: [false] },
  { name: 'quoted', answer: "The sign says 'sin leche'.", expected: [false, false] },
  { name: 'metalinguistic', answer: 'Sin leche is two words.', expected: [false, false] },
  { name: 'third-person', answer: 'My friend takes café negro.', expected: [false, false] },
];

async function request(baseUrl, path, { learnerId, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(learnerId ? { 'X-Learner-Id': learnerId } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${data.error?.code ?? 'HTTP_ERROR'}: ${data.error?.message ?? response.status}`);
  return data;
}

function timed(clock = performance) {
  const start = clock.now();
  return () => Math.round(clock.now() - start);
}

export async function verifyCLI({ args = process.argv.slice(2), env = process.env } = {}) {
  loadRootEnv({ env });
  const providerName = providerArgument(args) ?? env.LLM_PROVIDER;
  if (!CLI_PROVIDERS.has(providerName)) throw new Error('verify:cli requires --provider codex-cli or --provider claude-cli.');
  env.LLM_PROVIDER = providerName;
  const provider = createLLMAdapter({}, env);
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-live-'));
  let server;
  let preflight;
  const grading = [];
  try {
    preflight = await provider.preflight();
    const content = loadGameContent();
    const storage = new JsonLearningStorage({ saveDir });
    const service = new LearningService({ provider, storage, content });
    for (const item of cases) {
      if (provider.generationCount >= 14) throw new Error('Live verification stopped at the 14-call scripted provider budget.');
      const objectives = content.encounter.objectives.slice(item.objectiveIndex ?? 0);
      const stop = timed();
      const raw = await provider.structuredChat(buildGradingMessages({
        objectives,
        vocabularyById: content.vocabularyById,
        conversationContext: item.context ?? [],
        playerInput: item.answer,
      }), gradingResponseSchema, { schemaName: 'dialogue_assessment' });
      const validated = service.validateAssessment(raw, objectives, item.answer);
      const observed = validated.objective_results.map((result) => result.passed);
      grading.push({
        case: item.name,
        expected: item.expected,
        observed,
        matched: JSON.stringify(observed) === JSON.stringify(item.expected),
        schemaValid: true,
        durationMs: stop(),
        feedback: validated.overall_feedback,
      });
    }

    const app = createApp({ service, logger: { error() {} } });
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const routeStop = timed();
    const learner = await request(baseUrl, '/api/learner');
    const greetingStop = timed();
    const started = await request(baseUrl, '/api/encounter/start', { learnerId: learner.learnerId });
    const greetingMs = greetingStop();
    const firstStop = timed();
    const first = await request(baseUrl, '/api/encounter/dialogue', {
      learnerId: learner.learnerId,
      body: {
        encounterId: started.encounter.id,
        version: started.encounter.version,
        attemptId: randomUUID(),
        message: 'Quiero un café.',
      },
    });
    const firstTurnMs = firstStop();
    const secondStop = timed();
    const second = await request(baseUrl, '/api/encounter/dialogue', {
      learnerId: learner.learnerId,
      body: {
        encounterId: first.encounter.id,
        version: first.encounter.version,
        attemptId: randomUUID(),
        message: 'Sin leche, por favor.',
      },
    });
    const secondTurnMs = secondStop();
    const review = await request(baseUrl, '/api/spellbook/review', { learnerId: learner.learnerId });
    if (provider.generationCount > 14) throw new Error('Live verification exceeded the 14-call scripted provider budget.');
    return {
      title: 'Playtest ParaLLang through Codex and Claude Code subscriptions',
      verifiedAt: new Date().toISOString(),
      provider: providerName,
      cliVersion: preflight.version,
      authentication: preflight.authentication,
      requestedModel: preflight.requestedModel,
      resolvedModel: provider.lastResolvedModel ?? 'not reported by CLI',
      isolation: preflight.isolation,
      grading,
      encounter: {
        greetingMs,
        firstTurnMs,
        secondTurnMs,
        totalMs: routeStop(),
        finalState: second.encounter.state,
        objectiveResults: [first.assessment.objectiveResults, second.assessment.objectiveResults],
        canonicalVocabulary: second.spellbook.cards.map((card) => card.vocabularyId),
        dueReviewAvailable: Boolean(review.challenge),
      },
      generationCalls: provider.generationCount,
      budget: 14,
    };
  } catch (error) {
    Object.defineProperty(error, 'verification', {
      enumerable: false,
      value: {
        provider: providerName,
        ...(preflight?.version ? { cliVersion: preflight.version } : {}),
        ...(preflight?.authentication ? { authentication: preflight.authentication } : {}),
        requestedModel: preflight?.requestedModel ?? provider.model ?? 'CLI default',
        resolvedModel: provider.lastResolvedModel ?? 'not reported by CLI',
        generationCalls: provider.generationCount,
        budget: 14,
        grading,
      },
    });
    throw error;
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await provider.shutdown();
    await rm(saveDir, { recursive: true, force: true });
  }
}

export async function main() {
  try { console.log(JSON.stringify(await verifyCLI(), null, 2)); }
  catch (error) {
    const safe = error instanceof ProviderError
      ? { ...error.verification, error: { code: error.code, message: error.message, provider: error.provider, category: error.category } }
      : { ...error.verification, error: { code: 'VERIFICATION_FAILED', message: error.message } };
    console.error(JSON.stringify(safe, null, 2));
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
