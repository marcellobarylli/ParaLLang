import { AppError } from '../errors.js';

const definitions = {
  'missing-cli': {
    code: 'CLI_MISSING', status: 503, retryable: false,
    message: 'The selected provider CLI was not found. Install its official CLI or set the matching CLI path, then restart ParaLLang.',
  },
  'unsupported-configuration': {
    code: 'CLI_UNSUPPORTED', status: 503, retryable: false,
    message: 'The selected CLI cannot provide the required isolated subscription mode. Update its configuration or choose a compatible installed version.',
  },
  authentication: {
    code: 'CLI_AUTH_REQUIRED', status: 503, retryable: false,
    message: 'The selected CLI is not signed in with its native subscription. Sign in with the official CLI, run npm run check:provider, then retry.',
  },
  'model-unavailable': {
    code: 'CLI_MODEL_UNAVAILABLE', status: 503, retryable: false,
    message: 'The requested model is unavailable for this CLI subscription. Remove LLM_MODEL or choose a model available to the signed-in account.',
  },
  quota: {
    code: 'CLI_QUOTA_EXHAUSTED', status: 429, retryable: true,
    message: 'The selected CLI subscription has reached a usage limit. Wait for access to recover, then retry this unchanged response.',
  },
  busy: {
    code: 'CLI_BUSY', status: 503, retryable: true,
    message: 'The local provider queue is full. Wait for the current requests to finish, then retry.',
  },
  timeout: {
    code: 'CLI_TIMEOUT', status: 504, retryable: true,
    message: 'The selected CLI did not finish before the configured deadline. Your progress was not changed; retry when ready.',
  },
  'output-limit': {
    code: 'CLI_OUTPUT_LIMIT', status: 503, retryable: true,
    message: 'The selected CLI produced more output than ParaLLang can safely accept. Your progress was not changed.',
  },
  'invalid-response': {
    code: 'CLI_INVALID_RESPONSE', status: 503, retryable: true,
    message: 'The selected CLI returned an invalid structured response. Your progress was not changed; retry when ready.',
  },
  interrupted: {
    code: 'CLI_INTERRUPTED', status: 503, retryable: true,
    message: 'The selected CLI process was interrupted. Your progress was not changed; retry after the server is ready.',
  },
  process: {
    code: 'CLI_PROCESS_FAILURE', status: 503, retryable: true,
    message: 'The selected CLI process did not complete successfully. Check provider setup, then retry.',
  },
  provider: {
    code: 'PROVIDER_FAILURE', status: 503, retryable: true,
    message: 'The selected provider is temporarily unavailable. Your progress was not changed; retry in a moment.',
  },
};

export class ProviderError extends AppError {
  constructor(category, { provider, exitCode, signal, elapsedMs, internal } = {}) {
    const definition = definitions[category] ?? definitions.provider;
    super(definition.message, {
      status: definition.status,
      code: definition.code,
      retryable: definition.retryable,
    });
    this.name = 'ProviderError';
    this.category = definitions[category] ? category : 'provider';
    this.provider = provider;
    this.logFields = {
      ...(provider ? { provider } : {}),
      category: this.category,
      ...(Number.isInteger(exitCode) ? { exitCode } : {}),
      ...(signal ? { signal } : {}),
      ...(Number.isFinite(elapsedMs) ? { elapsedMs: Math.round(elapsedMs) } : {}),
    };
    if (internal !== undefined) Object.defineProperty(this, 'internal', { value: internal, enumerable: false });
  }
}

const categoryCodes = new Map([
  ['authentication_error', 'authentication'], ['not_logged_in', 'authentication'], ['login_required', 'authentication'],
  ['model_not_found', 'model-unavailable'], ['invalid_model', 'model-unavailable'], ['model_unavailable', 'model-unavailable'],
  ['quota_exceeded', 'quota'], ['usage_limit_reached', 'quota'],
]);

export function providerErrorFromMachineCode(code, fields = {}) {
  return new ProviderError(categoryCodes.get(String(code ?? '').toLowerCase()) ?? 'provider', fields);
}
