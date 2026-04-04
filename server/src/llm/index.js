import { LLMAdapter } from './adapter.js';

export function createLLMAdapter(overrides = {}) {
  const provider = overrides.provider || process.env.LLM_PROVIDER || 'openai';

  const config = {
    apiKey: overrides.apiKey || process.env.OPENAI_API_KEY,
    model: overrides.model || process.env.LLM_MODEL || 'gpt-4o-mini',
    baseUrl: overrides.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  };

  return new LLMAdapter(provider, config);
}

export { encounterResponseSchema } from './schemas.js';
