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
  const outage = Object.assign(new Error('500 internal'), { status: 500 });
  const client = fakeClient([outage]);
  await assert.rejects(new GeminiAdapter({ client }).structuredChat([], schema), /500/);
  assert.equal(client.calls.length, 1);
  const refused = Object.assign(new Error('400'), { status: 400 });
  await assert.rejects(new GeminiAdapter({ client: fakeClient([refused, '{"other":1}']) }).structuredChat([], schema));
});

test('round 171: a spent allowance and a refused key become the codes the page answers with the key steps', async () => {
  const quota = Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 });
  await assert.rejects(new GeminiAdapter({ client: fakeClient([quota]) }).structuredChat([], schema), { code: 'MODEL_QUOTA_EXHAUSTED' });
  const badKey = Object.assign(new Error('400 API key not valid. Please pass a valid API key.'), { status: 400 });
  const client = fakeClient([badKey]);
  await assert.rejects(new GeminiAdapter({ client }).structuredChat([], schema), { code: 'MODEL_KEY_INVALID' });
  assert.equal(client.calls.length, 1); // no JSON-mode retry for a refused key
});

test('round 171: a bare 400 on both attempts (Google\'s error body unread) is a refused key', async () => {
  const bare = () => Object.assign(new Error('400 status code (no body)'), { status: 400 });
  const client = fakeClient([bare(), bare()]);
  await assert.rejects(new GeminiAdapter({ client }).structuredChat([], schema), { code: 'MODEL_KEY_INVALID' });
  assert.equal(client.calls.length, 2);
});
