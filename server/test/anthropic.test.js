// Round 183: friends' turns on the Claude API, with a fake client; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { AnthropicAdapter, CLAUDE_DEFAULT_MODEL, toClaudeRequest } from '../src/llm/adapters/anthropic.js';
import { FriendRouter } from '../src/llm/friend-router.js';
import { requestContext } from '../src/request-context.js';
import { describeFailure } from '../src/llm/excuse.js';

const schema = z.object({ reply: z.string(), note: z.string().optional() }).strict();

function fakeClient(replies) {
  const calls = [];
  return {
    calls,
    messages: { create: async (body) => {
      calls.push(body);
      const next = replies.shift();
      if (next instanceof Error) throw next;
      return { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: next }], usage: {} };
    } },
  };
}

test('the game\'s messages become a system prompt and alternating turns that open on the player', () => {
  const request = toClaudeRequest([
    { role: 'system', content: 'lore' }, { role: 'system', content: 'rules' },
    { role: 'assistant', content: 'Ciao!' }, { role: 'user', content: 'hi' }, { role: 'user', content: 'turn' },
  ]);
  assert.equal(request.system, 'lore\n\nrules');
  assert.deepEqual(request.messages.map((m) => m.role), ['user', 'assistant', 'user']);
  assert.equal(request.messages[2].content, 'hi\n\nturn');
});

test('a structured reply on Sonnet 5.5: strict schema, low effort, no temperature; nulls for absent fields pass', async () => {
  const client = fakeClient(['{"reply":"ciao","note":null}']);
  const adapter = new AnthropicAdapter({ client });
  assert.deepEqual(await adapter.structuredChat([{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], schema, { temperature: 0.2 }), { reply: 'ciao' });
  const body = client.calls[0];
  assert.equal(body.model, CLAUDE_DEFAULT_MODEL);
  assert.equal(body.output_config.effort, 'low');
  assert.equal(body.output_config.format.type, 'json_schema');
  assert.equal(body.temperature, undefined);
});

test('length limits are not sent, but a property named like one is kept, and zod still checks them', async () => {
  const limited = z.object({ minLength: z.string().min(1), words: z.array(z.string()).max(3) }).strict();
  const client = fakeClient(['{"minLength":"","words":[]}']);
  await assert.rejects(new AnthropicAdapter({ client }).structuredChat([], limited));
  const sent = JSON.stringify(client.calls[0].output_config.format.schema);
  assert.doesNotMatch(sent, /"minLength":1|maxItems/);
  assert.ok(client.calls[0].output_config.format.schema.properties.minLength);
});

test('a refusal and a reply that does not fit are errors the excuse can name', async () => {
  const refusing = { messages: { create: async () => ({ stop_reason: 'refusal', stop_details: { category: 'cyber' }, content: [] }) } };
  const refused = await new AnthropicAdapter({ client: refusing }).structuredChat([], schema).catch((e) => e);
  assert.equal(describeFailure(refused), 'Claude failed: Claude declined to answer (cyber).');
  const wrong = await new AnthropicAdapter({ client: fakeClient(['{"other":1}']) }).structuredChat([], schema).catch((e) => e);
  assert.match(describeFailure(wrong), /^Claude's reply did not fit the game's format/);
  const overloaded = Object.assign(new Error('529'), { status: 529, apiMessage: 'Overloaded', type: 'overloaded_error' });
  const busy = await new AnthropicAdapter({ client: fakeClient([overloaded]) }).structuredChat([], schema).catch((e) => e);
  assert.equal(describeFailure(busy), 'Claude answered 529 overloaded_error: "Overloaded"');
});

function routed(router, access, geminiKey = null) {
  return requestContext.run({ access, geminiKey }, () => router.structuredChat([], schema, {}));
}

test('friends play on Claude, a friend\'s own Gemini key wins, the owner stays on the primary', async () => {
  const fake = (name) => ({ name, structuredChat: async () => ({ reply: name }) });
  const router = new FriendRouter({
    primary: fake('owner'), geminiKey: 'server-gemini', claudeKey: 'claude-key',
    createClaude: () => fake('claude'), createGemini: ({ apiKey }) => fake(`gemini:${apiKey}`),
  });
  assert.deepEqual(await routed(router, 'friend'), { reply: 'claude' });
  assert.deepEqual(await routed(router, 'friend', 'own-key'), { reply: 'gemini:own-key' });
  assert.deepEqual(await routed(router, 'owner'), { reply: 'owner' });
});

test('a failed Claude turn is tried on the server\'s Gemini; if that fails too, Claude\'s reason is kept', async () => {
  const claudeDown = Object.assign(new Error('529'), { status: 529 });
  const router = new FriendRouter({
    primary: null, geminiKey: 'server-gemini', claudeKey: 'k',
    createClaude: () => ({ structuredChat: async () => { throw claudeDown; } }),
    createGemini: () => ({ structuredChat: async () => ({ reply: 'gemini' }) }),
  });
  assert.deepEqual(await routed(router, 'friend'), { reply: 'gemini' });
  const both = new FriendRouter({
    primary: null, geminiKey: 'server-gemini', claudeKey: 'k',
    createClaude: () => ({ structuredChat: async () => { throw claudeDown; } }),
    createGemini: () => ({ structuredChat: async () => { throw new Error('gemini down'); } }),
  });
  await assert.rejects(routed(both, 'friend'), (error) => error === claudeDown);
  const alone = new FriendRouter({ primary: null, claudeKey: 'k', createClaude: () => ({ structuredChat: async () => { throw claudeDown; } }) });
  await assert.rejects(routed(alone, 'friend'), (error) => error === claudeDown);
});
