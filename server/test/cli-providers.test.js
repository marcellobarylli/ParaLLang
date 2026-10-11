import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createCLIEnvironment } from '../src/llm/cli-environment.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { schemaForCLI } from '../src/llm/cli-adapter.js';
import { encounterResponseSchema, gradingResponseSchema } from '../src/llm/schemas.js';
import { loadRootEnv, parseCliTimeout, resolveLLMConfig } from '../src/config.js';
import { checkProvider } from '../scripts/check-provider.js';

const paths = {
  'codex-cli': resolve(import.meta.dirname, 'fixtures', 'fake-codex-cli.mjs'),
  'claude-cli': resolve(import.meta.dirname, 'fixtures', 'fake-claude-cli.mjs'),
};
const messages = [
  { role: 'system', content: 'SYSTEM-ONLY' },
  { role: 'assistant', content: 'Earlier message' },
  { role: 'user', content: JSON.stringify({ player_answer: 'Un café.' }) },
];
const narration = {
  narrative: 'English narration.',
  dialogue: { speaker: 'Gerald', native: 'Un café.', translation: 'A coffee.', words: [{ word: 'café', pos: 'noun', meaning: 'coffee' }] },
  must_translate: true, difficulty: 1, hints_available: true, encounter_state: 'ongoing',
};

async function fixtureAdapter(t, provider, control = {}) {
  const root = await mkdtemp(join(tmpdir(), 'parallang-provider-test-'));
  const state = join(root, 'state.json');
  const controlPath = join(root, 'control.json');
  const capture = join(root, 'capture.jsonl');
  await writeFile(controlPath, JSON.stringify(control), 'utf8');
  const childEnv = {
    ...createCLIEnvironment({ ...process.env, OPENAI_API_KEY: 'strip-me', ANTHROPIC_API_KEY: 'strip-me', ANTHROPIC_BASE_URL: 'https://wrong.invalid' }),
    FAKE_PROVIDER: provider,
    FAKE_STATE_FILE: state,
    FAKE_CONTROL_FILE: controlPath,
    FAKE_CAPTURE_FILE: capture,
  };
  const adapter = createLLMAdapter({ provider, executable: paths[provider], childEnv, timeoutMs: 2_000 });
  t.after(async () => {
    await adapter.shutdown();
    await rm(root, { recursive: true, force: true });
  });
  return { adapter, root, state, controlPath, capture };
}

test('registry keeps API defaults and gives CLI providers no API model default unless explicitly overridden', () => {
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'openai' }).model, 'gpt-4o-mini');
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'ollama' }).model, 'llama3.1');
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'codex-cli', OPENAI_MODEL: 'must-not-cross' }).model, undefined);
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'claude-cli', LLM_MODEL: 'sonnet' }).model, 'sonnet');
  assert.equal(createLLMAdapter({ provider: 'codex-cli', executable: paths['codex-cli'], childEnv: process.env }).provider.constructor.name, 'CodexCLIAdapter');
  assert.equal(createLLMAdapter({ provider: 'claude-cli', executable: paths['claude-cli'], childEnv: process.env }).provider.constructor.name, 'ClaudeCLIAdapter');
});

test('both CLI adapters preflight native auth and extract schema-valid native structured results', async (t) => {
  for (const provider of Object.keys(paths)) {
    await t.test(provider, async (t) => {
      const runtime = await fixtureAdapter(t, provider);
      const preflight = await runtime.adapter.preflight();
      assert.match(preflight.authentication, /subscription/);
      assert.equal(preflight.requestedModel, 'CLI default');
      const result = await runtime.adapter.structuredChat([
        { role: 'system', content: 'Narrate.' },
        { role: 'user', content: 'TURN DATA: {"task":"greeting"}' },
      ], encounterResponseSchema, { schemaName: 'encounter_narration' });
      assert.equal(result.dialogue.speaker, narration.dialogue.speaker);
      assert.equal(runtime.adapter.generationCount, 1);
      const capture = JSON.parse((await readFile(runtime.capture, 'utf8')).trim());
      assert.equal(capture.stdin.includes('TURN DATA'), true);
      assert.equal(capture.args.some((argument) => argument.includes('TURN DATA')), false);
      assert.equal('OPENAI_API_KEY' in capture.env, false);
      assert.equal('ANTHROPIC_API_KEY' in capture.env, false);
      if (provider === 'codex-cli') {
        assert.ok(capture.args.includes('--ignore-user-config'));
        assert.ok(capture.args.includes('--ephemeral'));
        assert.ok(capture.args.includes('shell_tool'));
      } else {
        assert.ok(capture.args.includes('--safe-mode'));
        assert.ok(capture.args.includes('--restricted'));
        assert.ok(capture.args.includes('--strict-mcp-config'));
        assert.equal(capture.args[capture.args.indexOf('--tools') + 1], '');
      }
    });
  }
});

test('both schemas work and explicit model selection reaches each CLI invocation', async (t) => {
  for (const provider of Object.keys(paths)) {
    await t.test(provider, async (t) => {
      const runtime = await fixtureAdapter(t, provider);
      runtime.adapter.provider.model = 'explicit-test-model';
      const grade = await runtime.adapter.structuredChat([
        { role: 'system', content: 'AUTHORED RUBRIC: [{"id":"order_coffee","targets":[{"id":"cafe"}]}]\nReturn only structured JSON.' },
        { role: 'user', content: JSON.stringify({ player_answer: 'Un café.' }) },
      ], gradingResponseSchema, { schemaName: 'dialogue_assessment' });
      assert.equal(grade.objective_results[0].passed, true);
      const capture = JSON.parse((await readFile(runtime.capture, 'utf8')).trim());
      assert.equal(capture.args[capture.args.indexOf('--model') + 1], 'explicit-test-model');
    });
  }
});

test('native parsers reject success-exit failures, missing or duplicate finals, malformed JSON, invalid schemas, and unsuccessful exits', async (t) => {
  const modes = ['failure-envelope', 'missing-final', 'duplicate-final', 'malformed', 'schema-invalid', 'process-fail'];
  for (const provider of Object.keys(paths)) {
    for (const mode of modes) {
      await t.test(`${provider} ${mode}`, async (t) => {
        const runtime = await fixtureAdapter(t, provider, { mode });
        await assert.rejects(runtime.adapter.structuredChat([
          { role: 'system', content: 'Narrate.' },
          { role: 'user', content: 'TURN DATA: {"task":"greeting"}' },
        ], encounterResponseSchema), (error) => {
          const expected = mode === 'failure-envelope' ? 'CLI_QUOTA_EXHAUSTED'
            : mode === 'process-fail' ? 'CLI_PROCESS_FAILURE' : 'CLI_INVALID_RESPONSE';
          assert.equal(error.code, expected);
          return true;
        });
      });
    }
  }
});

test('configuration loads a designated root env without overwrite, validates timeout, and strips alternate authentication', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'parallang-env-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const envPath = join(root, '.env');
  await writeFile(envPath, 'LLM_PROVIDER=claude-cli\nLLM_MODEL=from-root\n', 'utf8');
  const env = { LLM_MODEL: 'preserved' };
  loadRootEnv({ env, path: envPath });
  assert.equal(env.LLM_PROVIDER, 'claude-cli');
  assert.equal(env.LLM_MODEL, 'preserved');
  assert.equal(parseCliTimeout(undefined), 120_000);
  assert.equal(parseCliTimeout('1000'), 1_000);
  assert.throws(() => parseCliTimeout('999'), /1000/);
  assert.throws(() => parseCliTimeout('300001'), /300000/);
  const isolated = createCLIEnvironment({
    HOME: '/safe/home', PATH: '/safe/bin', OPENAI_API_KEY: 'secret', CODEX_API_KEY: 'secret',
    ANTHROPIC_API_KEY: 'secret', ANTHROPIC_BASE_URL: 'https://wrong.invalid', AWS_ACCESS_KEY_ID: 'secret',
  });
  assert.deepEqual(isolated, { HOME: '/safe/home', PATH: '/safe/bin', NO_COLOR: '1', TERM: 'dumb' });
});

test('check:provider uses the root-style environment, classifies subscription auth, and makes zero inference calls', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'parallang-check-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const provider of Object.keys(paths)) {
    const state = join(root, `${provider}.state.json`);
    const env = {
      ...process.env,
      LLM_PROVIDER: provider,
      CODEX_CLI_PATH: paths['codex-cli'],
      CLAUDE_CLI_PATH: paths['claude-cli'],
      FAKE_STATE_FILE: state,
    };
    const lines = [];
    const result = await checkProvider({ args: ['--provider', provider], env, output: (line) => lines.push(line) });
    assert.match(result.authentication, /subscription/);
    assert.equal(result.inferenceRequests, 0);
    assert.equal(lines.length, 1);
    await assert.rejects(access(state), /ENOENT/);
  }
});

test('unsupported capabilities and non-subscription authentication are rejected before generation', async (t) => {
  const auth = await fixtureAdapter(t, 'claude-cli');
  auth.adapter.provider.childEnv.FAKE_AUTH = 'api';
  await assert.rejects(auth.adapter.preflight(), (error) => error.code === 'CLI_AUTH_REQUIRED');
  assert.equal(auth.adapter.generationCount, 0);

  const responses = [
    { stdout: 'codex-cli 0.162.0', stderr: '' },
    { stdout: '--ask-for-approval', stderr: '' },
    { stdout: '--ignore-user-config', stderr: '' },
  ];
  const runner = { run: async () => responses.shift(), shutdown: async () => {} };
  const unsupported = createLLMAdapter({ provider: 'codex-cli', runner, executable: 'codex', childEnv: {} });
  await assert.rejects(unsupported.preflight(), (error) => error.code === 'CLI_UNSUPPORTED');
  assert.equal(unsupported.generationCount, 0);
});

test('missing executables and machine-readable model failures use typed safe categories', async (t) => {
  const missing = createLLMAdapter({
    provider: 'codex-cli', executable: '/definitely/missing/parallang-codex', childEnv: {}, timeoutMs: 1_000,
  });
  t.after(() => missing.shutdown());
  await assert.rejects(missing.preflight(), (error) => error.code === 'CLI_MISSING');

  const unavailable = await fixtureAdapter(t, 'claude-cli', { mode: 'failure-envelope', failureCode: 'model_not_found' });
  await assert.rejects(unavailable.adapter.structuredChat([
    { role: 'system', content: 'Narrate.' },
    { role: 'user', content: 'TURN DATA: {"task":"greeting"}' },
  ], encounterResponseSchema), (error) => error.code === 'CLI_MODEL_UNAVAILABLE');
});

test('CLI JSON schemas list every property as required so strict native output schemas accept them', () => {
  const words = schemaForCLI(encounterResponseSchema).properties.dialogue.properties.words.items;
  assert.deepEqual(words.required, ['word', 'pos', 'root', 'meaning']);
  assert.deepEqual(words.properties.root.type, ['string', 'null']);
  assert.equal(schemaForCLI(gradingResponseSchema).additionalProperties, false);
  assert.ok(encounterResponseSchema.safeParse({
    narrative: 'n', dialogue: { speaker: 's', native: 'n', translation: 't', words: [{ word: 'w', pos: 'p', root: null, meaning: 'm' }] },
    must_translate: true, difficulty: 1, hints_available: true, encounter_state: 'ongoing',
  }).success, 'null root from the strict schema still validates');
});
