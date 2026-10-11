import { LLMAdapter } from './adapter.js';
import { CLI_PROVIDERS, resolveLLMConfig } from '../config.js';
import { createCLIEnvironment } from './cli-environment.js';

export function createLLMAdapter(overrides = {}, env = process.env) {
  const config = resolveLLMConfig(overrides, env);
  if (CLI_PROVIDERS.has(config.provider) && !config.childEnv) config.childEnv = createCLIEnvironment(env);
  return new LLMAdapter(config.provider, config);
}

export { encounterResponseSchema, gradingResponseSchema } from './schemas.js';
