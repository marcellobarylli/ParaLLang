// Round 170: the Gemini provider (OpenAI-compatible endpoint), with a fake client; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createLLMAdapter } from '../src/llm/index.js';
import { resolveLLMConfig } from '../src/config.js';
import { GeminiAdapter, GEMINI_BASE_URL, GEMINI_DEFAULT_MODEL } from '../src/llm/adapters/gemini.js';

const schema = z.object({ reply: z.string() });

function fakeClient(replies) {
  const calls = [];
  return {
    calls,
    chat: { completions: { create: async (body) => {
      calls.push(body);
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return { choices: [{ message: { content: next } }], usage: {} };
    } } },
  };
}

test('gemini is a provider, reads GEMINI_API_KEY and GEMINI_MODEL, and defaults to the stable Flash model', () => {
  const config = resolveLLMConfig({}, { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-x' });
  assert.equal(config.provider, 'gemini');
  assert.equal(config.apiKey, 'k');
  assert.equal(config.model, 'gemini-x');
  const adapter = createLLMAdapter({}, { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'k' });
  assert.equal(adapter.providerName, 'gemini');
  assert.equal(adapter.model, GEMINI_DEFAULT_MODEL);
  assert.equal(adapter.provider.client.baseURL, GEMINI_BASE_URL);
});

test('gemini without a key stops with a message naming GEMINI_API_KEY', () => {
  assert.throws(() => createLLMAdapter({}, { LLM_PROVIDER: 'gemini' }), /GEMINI_API_KEY/);
});

test('gemini asks for the strict JSON schema first, with room for thinking', async () => {
  const client = fakeClient(['{"reply":"ciao"}']);
  const adapter = new GeminiAdapter({ client });
  assert.deepEqual(await adapter.structuredChat([{ role: 'user', content: 'hi' }], schema), { reply: 'ciao' });
  assert.equal(client.calls[0].response_format.type, 'json_schema');
  assert.ok(client.calls[0].max_tokens >= 8192);
});

test('gemini falls back to JSON mode with the schema in the prompt when the schema is refused', async () => {
  const refused = Object.assign(new Error('400 INVALID_ARGUMENT'), { status: 400 });
  const client = fakeClient([refused, '```json\n{"reply":"ciao"}\n```']);
  const adapter = new GeminiAdapter({ client });
  assert.deepEqual(await adapter.structuredChat([{ role: 'user', content: 'hi' }], schema), { reply: 'ciao' });
  assert.equal(client.calls[1].response_format.type, 'json_object');
  assert.match(client.calls[1].messages.at(-1).content, /"reply"/);
});

test('gemini does not retry other errors, and still checks the reply against the schema', async () => {
  const denied = Object.assign(new Error('401'), { status: 401 });
  await assert.rejects(new GeminiAdapter({ client: fakeClient([denied]) }).structuredChat([], schema), /401/);
  const refused = Object.assign(new Error('400'), { status: 400 });
  await assert.rejects(new GeminiAdapter({ client: fakeClient([refused, '{"other":1}']) }).structuredChat([], schema));
});
