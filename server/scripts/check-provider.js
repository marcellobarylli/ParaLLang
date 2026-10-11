import { pathToFileURL } from 'node:url';
import { CLI_PROVIDERS, loadRootEnv } from '../src/config.js';
import { createLLMAdapter } from '../src/llm/index.js';
import { ProviderError } from '../src/llm/provider-error.js';

export function providerArgument(args) {
  const equals = args.find((argument) => argument.startsWith('--provider='));
  if (equals) return equals.slice('--provider='.length);
  const index = args.indexOf('--provider');
  return index >= 0 ? args[index + 1] : undefined;
}

export async function checkProvider({ args = process.argv.slice(2), env = process.env, output = console.log } = {}) {
  loadRootEnv({ env });
  const providerOverride = providerArgument(args);
  if (providerOverride) env.LLM_PROVIDER = providerOverride;
  const adapter = createLLMAdapter({}, env);
  try {
    const result = await adapter.preflight();
    const safe = {
      provider: result.provider,
      ...(result.version ? { version: result.version } : {}),
      authentication: result.authentication,
      requestedModel: result.requestedModel ?? adapter.model ?? 'CLI default',
      isolation: result.isolation,
      inferenceRequests: 0,
    };
    output(JSON.stringify(safe, null, 2));
    return safe;
  } finally {
    await adapter.shutdown();
  }
}

export async function main() {
  try { await checkProvider(); }
  catch (error) {
    const safe = error instanceof ProviderError
      ? { error: { code: error.code, message: error.message, provider: error.provider, category: error.category } }
      : { error: { code: 'CONFIGURATION_ERROR', message: error.message } };
    console.error(JSON.stringify(safe, null, 2));
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
