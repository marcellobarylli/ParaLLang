import dotenv from 'dotenv';
import { resolve } from 'node:path';

export const ROOT_DIR = resolve(import.meta.dirname, '..', '..');
export const ROOT_ENV_PATH = resolve(ROOT_DIR, '.env');
export const CLI_PROVIDERS = new Set(['codex-cli', 'claude-cli']);
export const PROVIDERS = new Set(['openai', 'gemini', 'ollama', ...CLI_PROVIDERS]);

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
      // Round 126: Sonnet unless LLM_MODEL says otherwise. Before, a blank LLM_MODEL left the choice to the account's
      // default, which may be a slower model. LLM_MODEL=default gives that back.
      model: sharedModel ?? 'sonnet',
      executable: nonBlank(overrides.executable) ?? nonBlank(env.CLAUDE_CLI_PATH) ?? 'claude',
      timeoutMs: parseCliTimeout(overrides.timeoutMs ?? env.LLM_CLI_TIMEOUT_MS),
      runner: overrides.runner,
      childEnv: overrides.childEnv,
    };
  }
  // Round 170: Google Gemini through its OpenAI-compatible endpoint.
  if (provider === 'gemini') {
    return {
      provider,
      model: sharedModel ?? nonBlank(env.GEMINI_MODEL),
      apiKey: overrides.apiKey ?? nonBlank(env.GEMINI_API_KEY),
      baseUrl: overrides.baseUrl,
      timeoutMs: overrides.timeoutMs,
      maxRetries: overrides.maxRetries,
      client: overrides.client,
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

// A CLI provider spends the owner's subscription, so its server stays on 127.0.0.1. Round 114: the hosted server (a
// container on Render, NODE_ENV=production) must listen on every interface, and may, because production refuses to
// start without PARALLANG_TOKEN (productionTokenProblem).
export function listenHostForProvider(provider, env = process.env) {
  const hosted = nonBlank(env.NODE_ENV) === 'production' && Boolean(nonBlank(env.PARALLANG_TOKEN));
  if (CLI_PROVIDERS.has(provider) && !hosted) return '127.0.0.1';
  return nonBlank(env.HOST) ?? '0.0.0.0';
}

// Round 114: in production every route but the health check needs the token, so a public URL never serves the
// subscription to whoever reaches it. Returns the reason the server must not start, or null.
export const MIN_PRODUCTION_TOKEN_LENGTH = 16;
export function productionTokenProblem(env = process.env) {
  if (nonBlank(env.NODE_ENV) !== 'production') return null;
  const token = nonBlank(env.PARALLANG_TOKEN);
  if (!token) return 'NODE_ENV=production requires PARALLANG_TOKEN. Set it in the host\'s secrets.';
  if (token.length < MIN_PRODUCTION_TOKEN_LENGTH) return `PARALLANG_TOKEN must be at least ${MIN_PRODUCTION_TOKEN_LENGTH} characters in production.`;
  if (!/^[\x21-\x7e]+$/.test(token)) return 'PARALLANG_TOKEN holds characters a header cannot carry (spaces or control characters).';
  return null;
}

export function resolveTargetLanguage(env = process.env) {
  return nonBlank(env.TARGET_LANGUAGE) ?? 'it';
}

// Round 181: the languages one server plays, default first. TARGET_LANGUAGES is a comma list (`it,fr,es`); without it
// the server plays TARGET_LANGUAGE alone, as before. TARGET_LANGUAGE, when it is in the list, is the default: the
// language of a request that names none.
export function resolveTargetLanguages(env = process.env) {
  const single = resolveTargetLanguage(env);
  const listed = [...new Set(String(env.TARGET_LANGUAGES ?? '').split(',').map((code) => code.trim().toLowerCase()).filter(Boolean))];
  if (!listed.length) return [single];
  return listed.includes(single) ? [single, ...listed.filter((code) => code !== single)] : listed;
}

// Spanish saves predate language packs and stay at the top of the save directory.
export function saveDirForLanguage(saveDir, code) {
  return code === 'es' ? saveDir : resolve(saveDir, code);
}
