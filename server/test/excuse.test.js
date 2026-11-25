// Round 182: a failed turn tells the player what went wrong, after the character's convenient excuse.
import test from 'node:test';
import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { z } from 'zod';
import { characterExcuse, describeFailure } from '../src/llm/excuse.js';
import { GeminiAdapter, unwrapGoogleErrors } from '../src/llm/adapters/gemini.js';

const overloaded = [{ error: { code: 503, message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.', status: 'UNAVAILABLE' } }];

function googleReplying(status, body) {
  return async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

test('the excuse names the character, then the reason, and says progress is kept', () => {
  const error = Object.assign(new Error('503 status code (no body)'), { status: 503, provider: 'gemini' });
  assert.equal(characterExcuse('Osbert Nettlebed', error),
    "Osbert Nettlebed isn't feeling it right now. His convenient excuse: Gemini answered with error 503 (a fault or overload on its side). Your progress was not changed; retry in a moment.");
});

test('Google\'s error list is unwrapped, so its own words reach the excuse', async () => {
  const client = new OpenAI({ apiKey: 'k', baseURL: 'https://example.invalid/', maxRetries: 0,
    fetch: (url, init) => unwrapGoogleErrors(url, init, googleReplying(503, overloaded)) });
  const adapter = new GeminiAdapter({ client, pausesMs: [0, 0] });
  const error = await adapter.structuredChat([{ role: 'user', content: 'hi' }], z.object({ a: z.string() })).catch((caught) => caught);
  assert.equal(error.status, 503);
  assert.equal(describeFailure(error),
    'Gemini answered 503 UNAVAILABLE: "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later." (tried 3 times: gemini-3.8-flash ×2, gemini-3.5-flash).');
});

test('a refused key in Google\'s list is still the key error with its own steps', async () => {
  const client = new OpenAI({ apiKey: 'k', baseURL: 'https://example.invalid/', maxRetries: 0,
    fetch: (url, init) => unwrapGoogleErrors(url, init, googleReplying(400, [{ error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }])) });
  await assert.rejects(new GeminiAdapter({ client }).structuredChat([], z.object({ a: z.string() })), { code: 'MODEL_KEY_INVALID' });
});

test('a reply that does not fit, a timeout and an unknown failure each say so', () => {
  const zod = (() => { try { z.object({ narrative_words: z.array(z.string()) }).parse({ narrative_words: null }); } catch (error) { return error; } })();
  zod.provider = 'gemini';
  assert.match(describeFailure(zod), /^Gemini's reply did not fit the game's format \(narrative_words: Expected array, received null\)\.$/);
  assert.equal(describeFailure(Object.assign(new Error('Request timed out.'), { name: 'APIConnectionTimeoutError', provider: 'gemini' })), 'Gemini did not answer in time.');
  assert.equal(describeFailure(new Error('boom'), 'openai'), 'OpenAI failed: boom');
  assert.equal(describeFailure(new Error('boom')), 'the AI model failed: boom');
});

test('a successful reply passes through the unwrapping untouched', async () => {
  const response = await unwrapGoogleErrors('u', {}, googleReplying(200, { ok: true }));
  assert.deepEqual(await response.json(), { ok: true });
});
