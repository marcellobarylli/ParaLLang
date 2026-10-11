import { LLMAdapter } from './adapter.js';

export function createLLMAdapter(overrides = {}) {
  const provider = overrides.provider || process.env.LLM_PROVIDER || 'openai';

  const config = {
    apiKey: overrides.apiKey ?? process.env.OPENAI_API_KEY,
    model: overrides.model ?? process.env.LLM_MODEL ?? (provider === 'ollama'
      ? (process.env.OLLAMA_MODEL || 'llama3.1')
      : (process.env.OPENAI_MODEL || 'gpt-4o-mini')),
    baseUrl: overrides.baseUrl ?? process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    timeoutMs: overrides.timeoutMs,
    maxRetries: overrides.maxRetries,
    client: overrides.client,
    fetch: overrides.fetch,
  };

  return new LLMAdapter(provider, config);
}

export { encounterResponseSchema, gradingResponseSchema } from './schemas.js';
