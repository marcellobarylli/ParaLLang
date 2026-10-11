import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createApp } from '../src/app.js';
import { listenHostForProvider } from '../src/config.js';
import { loadGameContent } from '../src/content-loader.js';
import { LearningService } from '../src/learning-service.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { createCLIEnvironment } from '../src/llm/cli-environment.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { api, createLearnerAndEncounter, createRuntime, fixedNow } from './helpers.js';

const paths = {
  'codex-cli': resolve(import.meta.dirname, 'fixtures', 'fake-codex-cli.mjs'),
  'claude-cli': resolve(import.meta.dirname, 'fixtures', 'fake-claude-cli.mjs'),
};

async function cliRuntime(t, providerName, control = {}) {
  const root = await mkdtemp(join(tmpdir(), 'parallang-cli-flow-'));
  const statePath = join(root, 'calls.json');
  const controlPath = join(root, 'control.json');
  const capturePath = join(root, 'capture.jsonl');
  await writeFile(controlPath, JSON.stringify(control), 'utf8');
  const childEnv = {
    ...createCLIEnvironment(process.env),
    FAKE_PROVIDER: providerName,
    FAKE_STATE_FILE: statePath,
    FAKE_CONTROL_FILE: controlPath,
    FAKE_CAPTURE_FILE: capturePath,
  };
  const provider = createLLMAdapter({
    provider: providerName,
    executable: paths[providerName],
    childEnv,
    timeoutMs: 2_000,
  });
  const logs = [];
  const saveDir = join(root, 'saves');
  const storage = new JsonLearningStorage({ saveDir });
  const service = new LearningService({ provider, storage, content: loadGameContent(), clock: () => fixedNow });
  const app = createApp({ service, logger: { error: (line) => logs.push(line) } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolveListen) => server.once('listening', resolveListen));
  const runtime = {
    provider, service, storage, server, saveDir, logs, statePath, controlPath, capturePath,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      await new Promise((resolveClose) => server.close(resolveClose));
      await service.shutdown();
      await rm(root, { recursive: true, force: true });
    },
  };
  t.after(runtime.close);
  return runtime;
}

async function submit(runtime, learnerId, encounter, message, attemptId = crypto.randomUUID()) {
  return api(runtime, '/api/encounter/dialogue', {
    learnerId,
    method: 'POST',
    body: { encounterId: encounter.id, version: encounter.version, attemptId, message },
  });
}

test('each real CLI adapter drives greeting, staged learning, receipts, learner isolation, and stale-version protection through HTTP', async (t) => {
  for (const providerName of Object.keys(paths)) {
    await t.test(providerName, async (t) => {
      const runtime = await cliRuntime(t, providerName);
      const session = await createLearnerAndEncounter(runtime);
      assert.equal(session.started.encounter.state, 'ongoing');
      assert.equal(runtime.provider.generationCount, 1);

      const firstAttempt = crypto.randomUUID();
      const firstBody = {
        encounterId: session.started.encounter.id,
        version: session.started.encounter.version,
        attemptId: firstAttempt,
        message: 'Quiero un café.',
      };
      const first = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: firstBody });
      assert.equal(first.status, 200);
      assert.equal(first.data.encounter.currentObjective.id, 'no_milk');
      assert.equal(first.data.assessment.objectiveResults[0].passed, true);
      assert.equal(first.data.encounter.encounter_state, 'ongoing', 'narrator flags remain non-authoritative');

      const staleCalls = runtime.provider.generationCount;
      const stale = await submit(runtime, session.learnerId, session.started.encounter, 'Sin leche.');
      assert.equal(stale.status, 409);
      assert.equal(runtime.provider.generationCount, staleCalls);

      const secondAttempt = crypto.randomUUID();
      const secondBody = {
        encounterId: first.data.encounter.id,
        version: first.data.encounter.version,
        attemptId: secondAttempt,
        message: 'Sin leche, por favor.',
      };
      const second = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: secondBody });
      assert.equal(second.status, 200);
      assert.equal(second.data.encounter.state, 'resolved');
      const committedCalls = runtime.provider.generationCount;
      const replay = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body: secondBody });
      assert.equal(replay.data.replayed, true);
      assert.equal(runtime.provider.generationCount, committedCalls);

      const other = await createLearnerAndEncounter(runtime);
      assert.notEqual(other.learnerId, session.learnerId);
      const original = await api(runtime, '/api/encounter/current', { learnerId: session.learnerId });
      assert.equal(original.data.encounter.state, 'resolved');
      assert.equal(other.started.encounter.committedPlayerTurns, 0);
    });
  }
});

test('grading failure and grading-success/narration-failure roll back completely; retry commits once with safe errors and logs', async (t) => {
  for (const providerName of Object.keys(paths)) {
    await t.test(providerName, async (t) => {
      const runtime = await cliRuntime(t, providerName, { failOn: [3], failMode: 'process-fail', stderr: 'raw secret account@example.test token-123' });
      const session = await createLearnerAndEncounter(runtime);
      const activeMessage = session.started.encounter.transcript.at(-1);
      const helped = await api(runtime, '/api/encounter/help', {
        learnerId: session.learnerId,
        method: 'POST',
        body: {
          encounterId: session.started.encounter.id,
          version: session.started.encounter.version,
          messageId: activeMessage.id,
          kind: 'word',
          vocabularyId: 'cafe',
        },
      });
      assert.equal(helped.status, 200);
      const beforeSave = await readFile(runtime.storage.filePath(session.learnerId), 'utf8');
      const attemptId = crypto.randomUUID();
      const body = {
        encounterId: helped.data.encounter.id,
        version: helped.data.encounter.version,
        attemptId,
        message: 'Quiero un café.',
      };
      const failed = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body });
      assert.equal(failed.status, 503);
      assert.equal(failed.data.error.code, 'CLI_PROCESS_FAILURE');
      assert.doesNotMatch(JSON.stringify(failed.data), /account@example|token-123|raw secret/);
      assert.doesNotMatch(runtime.logs.join('\n'), /account@example|token-123|raw secret/);
      const current = await api(runtime, '/api/encounter/current', { learnerId: session.learnerId });
      assert.equal(current.data.encounter.version, helped.data.encounter.version);
      assert.equal(current.data.encounter.committedPlayerTurns, 0);
      assert.equal(current.data.encounter.hints.used, 1, 'already-recorded assistance survives provider rollback');
      assert.equal(await readFile(runtime.storage.filePath(session.learnerId), 'utf8'), beforeSave);

      await writeFile(runtime.controlPath, '{}', 'utf8');
      const retried = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body });
      assert.equal(retried.status, 200);
      assert.equal(retried.data.encounter.committedPlayerTurns, 1);
      const committedCalls = runtime.provider.generationCount;
      const replay = await api(runtime, '/api/encounter/dialogue', { learnerId: session.learnerId, method: 'POST', body });
      assert.equal(replay.data.replayed, true);
      assert.equal(runtime.provider.generationCount, committedCalls);

      const secondRuntime = await cliRuntime(t, providerName, { failOn: [2], failMode: 'process-fail' });
      const second = await createLearnerAndEncounter(secondRuntime);
      const gradeFailed = await submit(secondRuntime, second.learnerId, second.started.encounter, 'Quiero un café.');
      assert.equal(gradeFailed.status, 503);
      const secondCurrent = await api(secondRuntime, '/api/encounter/current', { learnerId: second.learnerId });
      assert.equal(secondCurrent.data.encounter.committedPlayerTurns, 0);
    });
  }
});

test('CLI service hosts are loopback-only and the Vite proxy targets the same backend address', async () => {
  assert.equal(listenHostForProvider('codex-cli', { HOST: '192.0.2.1' }), '127.0.0.1');
  assert.equal(listenHostForProvider('claude-cli', { HOST: '192.0.2.1' }), '127.0.0.1');
  assert.equal(listenHostForProvider('openai', { HOST: '192.0.2.1' }), '192.0.2.1');
  const vite = await readFile(resolve(import.meta.dirname, '..', '..', 'client', 'vite.config.js'), 'utf8');
  assert.match(vite, /http:\/\/127\.0\.0\.1:3001/);
});
