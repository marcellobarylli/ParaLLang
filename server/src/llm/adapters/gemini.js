import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { OpenAIAdapter } from './openai.js';
import { ProviderError } from '../provider-error.js';

// Round 170/171: Google Gemini through its OpenAI-compatible endpoint (ai.google.dev/gemini-api/docs/openai), with a
// key from Google AI Studio. Requests are the OpenAI adapter's. Forum reports say that layer rejects or ignores some
// strict JSON schemas, so a structured request the endpoint refuses is asked again in plain JSON mode, with the schema
// in the prompt, and the reply is checked against the schema here as every provider's is. A refused key and a spent
// allowance become ProviderErrors the page answers with the steps for a key of the player's own.
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';
// Gemini's Flash models think before answering, and the thinking counts against max_tokens, so the caps are higher
// than the OpenAI adapter's. A cap is a ceiling, not a charge.
const MIN_MAX_TOKENS = 8192;
// Round 182: Google's Flash models are often overloaded (503 "high demand") or slow. A turn that fails for such a
// passing reason is tried again after a pause, then on a second Flash model, all within one deadline, so a player
// waits at most about two and a half minutes. A refused key is not tried again; a spent allowance (429) goes
// straight to the fallback model, whose allowance is its own.
export const GEMINI_FALLBACK_MODEL = 'gemini-3.5-flash';
const ATTEMPT_TIMEOUT_MS = 90_000;
const DEADLINE_MS = 150_000;
const MIN_ATTEMPT_MS = 15_000;
const PAUSES_MS = [2_000, 3_000];
const sleep = (ms, signal) => new Promise((resolve) => {
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
});

export function isPassing(error) {
  if (error instanceof ProviderError) return false;
  const status = error?.status;
  if (Number.isInteger(status)) return status === 408 || status >= 500;
  return ['APIConnectionTimeoutError', 'APIConnectionError'].includes(error?.name) || /timed? ?out/i.test(String(error?.message ?? ''));
}

// Round 182: Google sends an error as a list ([{ error: {...} }]), which the OpenAI library cannot read, so its reason
// was lost ("503 status code (no body)"). The list is unwrapped here, before the library reads it, so the error keeps
// Google's own message and status (error.error), for the player to see in the character's excuse.
export async function unwrapGoogleErrors(url, init, fetchImpl = fetch) {
  const response = await fetchImpl(url, init);
  if (response.ok) return response;
  const text = await response.text();
  let body = text;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length && parsed[0]?.error) body = JSON.stringify(parsed[0]);
  } catch { /* not JSON: passed on as it came */ }
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
}

function tagged(error) {
  if (error && typeof error === 'object' && !error.provider) {
    try { error.provider = 'gemini'; } catch { /* a frozen error keeps its own fields */ }
  }
  return error;
}

export function geminiFailure(error) {
  const status = error?.status;
  if (status === 429) return new ProviderError('model-quota', { provider: 'gemini' });
  if (status === 401 || status === 403 || /api[ _-]?key/i.test(String(error?.message ?? ''))) {
    return new ProviderError('model-key-invalid', { provider: 'gemini' });
  }
  return null;
}

export class GeminiAdapter extends OpenAIAdapter {
  constructor(config = {}) {
    if (!config.client && !config.apiKey) {
      throw new Error('LLM_PROVIDER=gemini needs GEMINI_API_KEY in .env (a key from https://aistudio.google.com/apikey).');
    }
    super({
      ...config,
      model: config.model || GEMINI_DEFAULT_MODEL,
      client: config.client || new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || GEMINI_BASE_URL,
        timeout: config.timeoutMs ?? 60_000,
        maxRetries: config.maxRetries ?? 0,
        fetch: (url, init) => unwrapGoogleErrors(url, init),
      }),
    });
    this.providerName = 'gemini';
    const fallback = config.fallbackModel === undefined ? GEMINI_FALLBACK_MODEL : config.fallbackModel;
    this.fallbackModel = fallback && fallback !== 'none' && fallback !== this.model ? fallback : null;
    this.attemptTimeoutMs = config.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS;
    this.deadlineMs = config.deadlineMs ?? DEADLINE_MS;
    this.pausesMs = config.pausesMs ?? PAUSES_MS;
  }

  // The models tried in turn: the configured one twice, then the fallback (or the configured one a third time).
  async withRetries(run, options = {}) {
    const plan = [this.model, this.model, this.fallbackModel ?? this.model];
    const started = Date.now();
    const tried = [];
    for (let attempt = 0; ; attempt += 1) {
      const model = plan[attempt];
      const left = this.deadlineMs - (Date.now() - started);
      tried.push(model);
      try {
        return await run({ ...options, model, timeoutMs: Math.max(1, Math.min(this.attemptTimeoutMs, left)) });
      } catch (error) {
        // A spent allowance is counted per model: the fallback model, if any is left to try, may still have some.
        if (error?.category === 'model-quota') tried[tried.length - 1] = `${model} (allowance spent)`;
        if (error?.category === 'model-quota' && this.fallbackModel && model !== this.fallbackModel && !options.signal?.aborted
          && this.deadlineMs - (Date.now() - started) >= MIN_ATTEMPT_MS) {
          attempt = plan.length - 2;
          continue;
        }
        const next = attempt + 1 < plan.length && isPassing(error) && !options.signal?.aborted;
        const pause = this.pausesMs[attempt] ?? 0;
        if (!next || this.deadlineMs - (Date.now() - started) - pause < MIN_ATTEMPT_MS) {
          if (tried.length > 1 && error && typeof error === 'object' && !(error instanceof ProviderError)) {
            try { error.attempts = tried; } catch { /* a frozen error keeps its own fields */ }
          }
          throw error;
        }
        await sleep(pause, options.signal);
      }
    }
  }

  chat(messages, options = {}) { return this.withRetries((attempt) => this.chatOnce(messages, attempt), options); }
  structuredChat(messages, schema, options = {}) { return this.withRetries((attempt) => this.structuredOnce(messages, schema, attempt), options); }

  async chatOnce(messages, options = {}) {
    try { return await super.chat(messages, { ...options, maxTokens: Math.max(options.maxTokens ?? 0, MIN_MAX_TOKENS) }); }
    catch (error) { throw geminiFailure(error) ?? tagged(error); }
  }

  async structuredOnce(messages, schema, options = {}) {
    const raised = { ...options, maxTokens: Math.max(options.maxTokens ?? 0, MIN_MAX_TOKENS) };
    try {
      return await super.structuredChat(messages, schema, raised);
    } catch (error) {
      const failure = geminiFailure(error);
      if (failure) throw failure;
      if (options.signal?.aborted || !(error?.status === 400 || /malformed JSON|no structured/.test(error?.message))) throw tagged(error);
    }
    const { $schema: _ignored, ...jsonSchema } = zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' });
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: options.model ?? this.model,
        messages: [...messages, { role: 'system', content: `Respond with JSON only, matching this schema exactly: ${JSON.stringify(jsonSchema)}` }],
        temperature: options.temperature ?? 0.2,
        max_tokens: raised.maxTokens,
        response_format: { type: 'json_object' },
      }, { ...(options.signal ? { signal: options.signal } : {}), ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}) });
    } catch (error) {
      // Google sends its errors as a list the OpenAI library cannot read ("400 status code (no body)"), so a refused
      // key is often a bare 400. A 400 here, on a request with no schema, is not the schema's.
      throw geminiFailure(error) ?? (error?.status === 400 && !error?.error?.message ? new ProviderError('model-key-invalid', { provider: 'gemini' }) : tagged(error));
    }
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw tagged(new Error('Gemini returned no structured response content.'));
    let parsed;
    try { parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, '')); }
    catch { throw tagged(new Error('Gemini returned malformed JSON.')); }
    try { return schema.parse(parsed); }
    catch (error) { throw tagged(error); }
  }
}
