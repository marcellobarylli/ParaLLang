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
  // Round 126: the Claude CLI gets Sonnet when no model is named; a named model and the account's default still pass.
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'claude-cli' }).model, 'sonnet');
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'claude-cli', LLM_MODEL: '  ' }).model, 'sonnet');
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'claude-cli', LLM_MODEL: 'haiku' }).model, 'haiku');
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'claude-cli', LLM_MODEL: 'default' }).model, 'default');
  assert.equal(resolveLLMConfig({}, { LLM_PROVIDER: 'claude-cli', OPENAI_MODEL: 'must-not-cross' }).model, 'sonnet');
  assert.equal(createLLMAdapter({ provider: 'codex-cli', executable: paths['codex-cli'], childEnv: process.env }).provider.constructor.name, 'CodexCLIAdapter');
  assert.equal(createLLMAdapter({ provider: 'claude-cli', executable: paths['claude-cli'], childEnv: process.env }).provider.constructor.name, 'ClaudeCLIAdapter');
});

test('both CLI adapters preflight native auth and extract schema-valid native structured results', async (t) => {
  for (const provider of Object.keys(paths)) {
    await t.test(provider, async (t) => {
      const runtime = await fixtureAdapter(t, provider);
      const preflight = await runtime.adapter.preflight();
      assert.match(preflight.authentication, /subscription/);
      assert.equal(preflight.requestedModel, provider === 'claude-cli' ? 'sonnet' : 'CLI default'); // round 126
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

// Round 018: a Claude subscription OAuth token in the environment.
const SYNTHETIC_TOKEN = 'sk-ant-oat01-synthetic-round-018-token';

async function tokenAdapter(t, { auth = 'oauth-env', token = SYNTHETIC_TOKEN, extraEnv = {}, control = {} } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'parallang-token-test-'));
  const state = join(root, 'state.json');
  const controlPath = join(root, 'control.json');
  const capture = join(root, 'capture.jsonl');
  await writeFile(controlPath, JSON.stringify(control), 'utf8');
  const source = { ...process.env, ...(token ? { CLAUDE_CODE_OAUTH_TOKEN: token } : {}) };
  delete source.ANTHROPIC_API_KEY;
  if (!token) delete source.CLAUDE_CODE_OAUTH_TOKEN;
  const childEnv = {
    ...createCLIEnvironment(source, { provider: 'claude-cli' }),
    ...extraEnv,
    FAKE_PROVIDER: 'claude-cli', FAKE_AUTH: auth, FAKE_STATE_FILE: state, FAKE_CONTROL_FILE: controlPath, FAKE_CAPTURE_FILE: capture,
  };
  const adapter = createLLMAdapter({ provider: 'claude-cli', executable: paths['claude-cli'], childEnv, timeoutMs: 2_000 });
  t.after(async () => {
    await adapter.shutdown();
    await rm(root, { recursive: true, force: true });
  });
  return { adapter, capture };
}

test('the OAuth token reaches claude-cli children only, including adapters built without a child environment', async (t) => {
  const source = { PATH: '/usr/bin', CLAUDE_CODE_OAUTH_TOKEN: SYNTHETIC_TOKEN, ANTHROPIC_API_KEY: 'strip-me' };
  assert.equal(createCLIEnvironment(source, { provider: 'claude-cli' }).CLAUDE_CODE_OAUTH_TOKEN, SYNTHETIC_TOKEN);
  assert.equal(createCLIEnvironment(source, { provider: 'claude-cli' }).ANTHROPIC_API_KEY, undefined);
  assert.equal(createCLIEnvironment(source, { provider: 'codex-cli' }).CLAUDE_CODE_OAUTH_TOKEN, undefined);
  assert.equal(createCLIEnvironment(source).CLAUDE_CODE_OAUTH_TOKEN, undefined);
  assert.equal(createCLIEnvironment({ ...source, CLAUDE_CODE_OAUTH_TOKEN: '' }, { provider: 'claude-cli' }).CLAUDE_CODE_OAUTH_TOKEN, undefined);
  assert.equal(createLLMAdapter({ provider: 'codex-cli', executable: paths['codex-cli'] }, source).provider.childEnv.CLAUDE_CODE_OAUTH_TOKEN, undefined);
  assert.equal(createLLMAdapter({ provider: 'claude-cli', executable: paths['claude-cli'] }, source).provider.childEnv.CLAUDE_CODE_OAUTH_TOKEN, SYNTHETIC_TOKEN);

  const previous = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  process.env.CLAUDE_CODE_OAUTH_TOKEN = SYNTHETIC_TOKEN;
  t.after(() => { if (previous === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN; else process.env.CLAUDE_CODE_OAUTH_TOKEN = previous; });
  const { ClaudeCLIAdapter } = await import('../src/llm/adapters/claude-cli.js');
  const { CodexCLIAdapter } = await import('../src/llm/adapters/codex-cli.js');
  assert.equal(new ClaudeCLIAdapter({ executable: paths['claude-cli'] }).childEnv.CLAUDE_CODE_OAUTH_TOKEN, SYNTHETIC_TOKEN);
  assert.equal(new CodexCLIAdapter({ executable: paths['codex-cli'] }).childEnv.CLAUDE_CODE_OAUTH_TOKEN, undefined);
});

test('a token with a logged-out or OAuth status passes preflight, and generation runs with the token', async (t) => {
  for (const auth of ['oauth-env', 'oauth-method']) {
    const { adapter, capture } = await tokenAdapter(t, { auth, control: { requireToken: true } });
    const result = await adapter.preflight();
    assert.equal(result.authentication, 'claude.ai-subscription-oauth-token');
    assert.equal(adapter.generationCount, 0);
    assert.doesNotMatch(JSON.stringify(result), /synthetic-round-018/);
    const output = await adapter.structuredChat([
      { role: 'system', content: 'Narrate.' },
      { role: 'user', content: 'TURN DATA: {"task":"greeting"}' },
    ], encounterResponseSchema);
    assert.equal(output.dialogue.speaker, 'Gerald');
    const captured = await readFile(capture, 'utf8');
    assert.doesNotMatch(captured, /synthetic-round-018/);
    const generation = captured.trim().split('\n').map((line) => JSON.parse(line)).at(-1);
    assert.equal(generation.tokenPresent, true);
  }
});

test('the token route refuses missing tokens, API-key, unknown and third-party statuses', async (t) => {
  const rejected = [
    { auth: 'oauth-env', token: null },
    { auth: 'api' },
    { auth: 'unknown-method' },
    { auth: 'missing-method' },
    { auth: 'third-party' },
    { auth: 'third-party', token: null },
  ];
  for (const options of rejected) {
    const { adapter } = await tokenAdapter(t, options);
    await assert.rejects(adapter.preflight(), (error) => error.code === 'CLI_AUTH_REQUIRED', JSON.stringify(options));
    assert.equal(adapter.generationCount, 0);
  }
});

test('API keys, auth tokens, base URLs and Bedrock or Vertex switches are refused on both routes', async (t) => {
  const { FORBIDDEN_ENV_KEYS } = await import('../src/llm/adapters/claude-cli.js');
  assert.equal(FORBIDDEN_ENV_KEYS.length, 5);
  for (const key of FORBIDDEN_ENV_KEYS) {
    for (const route of [{ auth: 'native', token: null }, { auth: 'oauth-env' }]) {
      const { adapter } = await tokenAdapter(t, { ...route, extraEnv: { [key]: '1' } });
      await assert.rejects(adapter.preflight(), (error) => error.code === 'CLI_AUTH_REQUIRED', `${key} ${route.auth}`);
    }
    const empty = await tokenAdapter(t, { extraEnv: { [key]: '' } });
    assert.equal((await empty.adapter.preflight()).authentication, 'claude.ai-subscription-oauth-token');
  }
  const native = await tokenAdapter(t, { auth: 'native', token: null });
  assert.equal((await native.adapter.preflight()).authentication, 'claude.ai-subscription');
});

test('a failing CLI that echoes the token does not expose it in the error', async (t) => {
  const { adapter } = await tokenAdapter(t, { control: { echoToken: true } });
  await adapter.preflight();
  const error = await adapter.structuredChat([
    { role: 'system', content: 'Narrate.' },
    { role: 'user', content: 'TURN DATA: {"task":"greeting"}' },
  ], encounterResponseSchema).then(() => null, (failure) => failure);
  assert.ok(error);
  assert.doesNotMatch(`${error.message} ${JSON.stringify(error)} ${JSON.stringify(error.logFields ?? {})}`, /synthetic-round-018/);
});
