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
        maxRetries: config.maxRetries ?? 1,
      }),
    });
    this.providerName = 'gemini';
  }

  async chat(messages, options = {}) {
    try { return await super.chat(messages, { ...options, maxTokens: Math.max(options.maxTokens ?? 0, MIN_MAX_TOKENS) }); }
    catch (error) { throw geminiFailure(error) ?? error; }
  }

  async structuredChat(messages, schema, options = {}) {
    const raised = { ...options, maxTokens: Math.max(options.maxTokens ?? 0, MIN_MAX_TOKENS) };
    try {
      return await super.structuredChat(messages, schema, raised);
    } catch (error) {
      const failure = geminiFailure(error);
      if (failure) throw failure;
      if (options.signal?.aborted || !(error?.status === 400 || /malformed JSON|no structured/.test(error?.message))) throw error;
    }
    const { $schema: _ignored, ...jsonSchema } = zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' });
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        messages: [...messages, { role: 'system', content: `Respond with JSON only, matching this schema exactly: ${JSON.stringify(jsonSchema)}` }],
        temperature: options.temperature ?? 0.2,
        max_tokens: raised.maxTokens,
        response_format: { type: 'json_object' },
      }, options.signal ? { signal: options.signal } : undefined);
    } catch (error) {
      // Google sends its errors as a list the OpenAI library cannot read ("400 status code (no body)"), so a refused
      // key is often a bare 400. A 400 here, on a request with no schema, is not the schema's.
      throw geminiFailure(error) ?? (error?.status === 400 ? new ProviderError('model-key-invalid', { provider: 'gemini' }) : error);
    }
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Gemini returned no structured response content.');
    let parsed;
    try { parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, '')); }
    catch { throw new Error('Gemini returned malformed JSON.'); }
    return schema.parse(parsed);
  }
}
