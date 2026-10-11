import dotenv from 'dotenv';
import { resolve } from 'node:path';

export const ROOT_DIR = resolve(import.meta.dirname, '..', '..');
export const ROOT_ENV_PATH = resolve(ROOT_DIR, '.env');
export const CLI_PROVIDERS = new Set(['codex-cli', 'claude-cli']);
export const PROVIDERS = new Set(['openai', 'ollama', ...CLI_PROVIDERS]);

export function loadRootEnv({ env = process.env, override = false, path = ROOT_ENV_PATH } = {}) {
  return dotenv.config({ path, processEnv: env, override });
}

function nonBlank(value) {
  const normalized = typeof value === 'string' ? value.trim() : value;
  return normalized || undefined;
}

export function parseCliTimeout(value) {
  if (value === undefined || value === null || value === '') return 120_000;
  const number = Number(value);
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < 1_000 || number > 300_000) {
    throw new Error('LLM_CLI_TIMEOUT_MS must be an integer from 1000 through 300000.');
  }
  return number;
}

export function resolveLLMConfig(overrides = {}, env = process.env) {
  const provider = nonBlank(overrides.provider) ?? nonBlank(env.LLM_PROVIDER) ?? 'openai';
  if (!PROVIDERS.has(provider)) {
    throw new Error(`Unknown LLM provider: ${provider}. Available: ${[...PROVIDERS].join(', ')}`);
  }

  const sharedModel = nonBlank(overrides.model) ?? nonBlank(env.LLM_MODEL);
  if (provider === 'codex-cli') {
    return {
      provider,
      model: sharedModel,
      executable: nonBlank(overrides.executable) ?? nonBlank(env.CODEX_CLI_PATH) ?? 'codex',
      timeoutMs: parseCliTimeout(overrides.timeoutMs ?? env.LLM_CLI_TIMEOUT_MS),
      runner: overrides.runner,
      childEnv: overrides.childEnv,
    };
  }
  if (provider === 'claude-cli') {
    return {
      provider,
      model: sharedModel,
      executable: nonBlank(overrides.executable) ?? nonBlank(env.CLAUDE_CLI_PATH) ?? 'claude',
      timeoutMs: parseCliTimeout(overrides.timeoutMs ?? env.LLM_CLI_TIMEOUT_MS),
      runner: overrides.runner,
      childEnv: overrides.childEnv,
    };
  }
  if (provider === 'ollama') {
    return {
      provider,
      model: sharedModel ?? nonBlank(env.OLLAMA_MODEL) ?? 'llama3.1',
      baseUrl: overrides.baseUrl ?? env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      timeoutMs: overrides.timeoutMs,
      maxRetries: overrides.maxRetries,
      fetch: overrides.fetch,
    };
  }
  return {
    provider,
    model: sharedModel ?? nonBlank(env.OPENAI_MODEL) ?? 'gpt-4o-mini',
    apiKey: overrides.apiKey ?? env.OPENAI_API_KEY,
    timeoutMs: overrides.timeoutMs,
    maxRetries: overrides.maxRetries,
    client: overrides.client,
  };
}

export function listenHostForProvider(provider, env = process.env) {
  return CLI_PROVIDERS.has(provider) ? '127.0.0.1' : (nonBlank(env.HOST) ?? '0.0.0.0');
}
