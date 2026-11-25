// Round 170: the Gemini provider (OpenAI-compatible endpoint), with a fake client; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { createLLMAdapter } from '../src/llm/index.js';
import { resolveLLMConfig } from '../src/config.js';
import { GeminiAdapter, GEMINI_BASE_URL, GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL } from '../src/llm/adapters/gemini.js';

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

test('round 182: a passing failure (5xx, timeout) is tried again, then on the fallback model; the reply is still checked', async () => {
  const outage = () => Object.assign(new Error('500 internal'), { status: 500 });
  const client = fakeClient([outage(), outage(), outage()]);
  const error = await new GeminiAdapter({ client, pausesMs: [0, 0] }).structuredChat([], schema).catch((caught) => caught);
  assert.match(error.message, /500/);
  assert.deepEqual(client.calls.map((call) => call.model), [GEMINI_DEFAULT_MODEL, GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL]);
  assert.deepEqual(error.attempts, [GEMINI_DEFAULT_MODEL, GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL]);
  const overloaded = Object.assign(new Error('503'), { status: 503 });
  const recovering = fakeClient([overloaded, '{"reply":"ciao"}']);
  assert.deepEqual(await new GeminiAdapter({ client: recovering, pausesMs: [0, 0] }).structuredChat([], schema), { reply: 'ciao' });
  assert.equal(recovering.calls.length, 2);
  const refused = Object.assign(new Error('400'), { status: 400 });
  await assert.rejects(new GeminiAdapter({ client: fakeClient([refused, '{"other":1}']) }).structuredChat([], schema));
});

test('round 182: a timeout is tried again; GEMINI_FALLBACK_MODEL=none keeps the configured model', async () => {
  const slow = () => Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError' });
  const client = fakeClient([slow(), slow(), '{"reply":"ciao"}']);
  const adapter = new GeminiAdapter({ client, fallbackModel: 'none', pausesMs: [0, 0] });
  assert.deepEqual(await adapter.structuredChat([], schema), { reply: 'ciao' });
  assert.deepEqual(client.calls.map((call) => call.model), [GEMINI_DEFAULT_MODEL, GEMINI_DEFAULT_MODEL, GEMINI_DEFAULT_MODEL]);
  const config = resolveLLMConfig({}, { LLM_PROVIDER: 'gemini', GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-y' });
  assert.equal(config.fallbackModel, 'gemini-y');
});

test('round 182: no attempt starts once the deadline is too close, and a spent allowance is not tried again', async () => {
  const overloaded = () => Object.assign(new Error('503'), { status: 503 });
  const client = fakeClient([overloaded(), overloaded(), overloaded()]);
  await assert.rejects(new GeminiAdapter({ client, deadlineMs: 10_000, pausesMs: [0, 0] }).structuredChat([], schema), /503/);
  assert.equal(client.calls.length, 1);
  const quota = fakeClient([Object.assign(new Error('429'), { status: 429 })]);
  await assert.rejects(new GeminiAdapter({ client: quota, fallbackModel: 'none', pausesMs: [0, 0] }).structuredChat([], schema), { code: 'MODEL_QUOTA_EXHAUSTED' });
  assert.equal(quota.calls.length, 1);
  const spent = () => Object.assign(new Error('429'), { status: 429 });
  const other = fakeClient([spent(), '{"reply":"ciao"}']);
  assert.deepEqual(await new GeminiAdapter({ client: other, pausesMs: [0, 0] }).structuredChat([], schema), { reply: 'ciao' });
  assert.deepEqual(other.calls.map((call) => call.model), [GEMINI_DEFAULT_MODEL, GEMINI_FALLBACK_MODEL]);
  const both = fakeClient([spent(), spent()]);
  await assert.rejects(new GeminiAdapter({ client: both, pausesMs: [0, 0] }).structuredChat([], schema), { code: 'MODEL_QUOTA_EXHAUSTED' });
  assert.equal(both.calls.length, 2);
  const thenBusy = fakeClient([spent(), Object.assign(new Error('503'), { status: 503 })]);
  const error = await new GeminiAdapter({ client: thenBusy, pausesMs: [0, 0] }).structuredChat([], schema).catch((caught) => caught);
  assert.deepEqual(error.attempts, [`${GEMINI_DEFAULT_MODEL} (allowance spent)`, GEMINI_FALLBACK_MODEL]);
});

test('round 171: a spent allowance and a refused key become the codes the page answers with the key steps', async () => {
  const quota = Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { status: 429 });
  await assert.rejects(new GeminiAdapter({ client: fakeClient([quota]), fallbackModel: 'none' }).structuredChat([], schema), { code: 'MODEL_QUOTA_EXHAUSTED' });
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
