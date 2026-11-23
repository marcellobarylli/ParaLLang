// Round 171: the friend code. The owner's requests run on the owner's provider, a friend's on Gemini (their own key
// when they send one, else the server's), and a friend with neither is told to connect a key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app.js';
import { LearningService } from '../src/learning-service.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { loadGameContent } from '../src/content-loader.js';
import { FriendRouter } from '../src/llm/friend-router.js';
import { FixtureProvider, fixedNow, makeTempDir } from './helpers.js';

async function friendRuntime(t, { serverKey = 'server-key' } = {}) {
  const owner = new FixtureProvider();
  const gemini = new Map();
  const router = new FriendRouter({
    primary: owner, geminiKey: serverKey,
    createGemini: ({ apiKey }) => { const fixture = new FixtureProvider(); gemini.set(apiKey, fixture); return fixture; },
  });
  const service = new LearningService({ provider: router, storage: new JsonLearningStorage({ saveDir: await makeTempDir('parallang-friend-') }), content: loadGameContent({ language: 'es' }), clock: () => fixedNow });
  const token = randomUUID();
  const friendCode = 'friends-of-the-road';
  const server = createApp({ service, logger: { error() {} }, token, friendCode }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await service.shutdown(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, { code, geminiKey, learnerId, body } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(code ? { 'X-ParaLLang-Token': code } : {}), ...(geminiKey ? { 'X-Gemini-Key': geminiKey } : {}), ...(learnerId ? { 'X-Learner-Id': learnerId } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };
  const start = async (code, geminiKey) => {
    const learner = await call('/api/learner', { code, geminiKey, body: {} });
    return call('/api/encounter/start', { code, geminiKey, learnerId: learner.data.learnerId, body: {} });
  };
  return { owner, gemini, token, friendCode, call, start };
}

test('the owner plays on the owner\'s provider and a friend on the server\'s Gemini key', async (t) => {
  const runtime = await friendRuntime(t);
  assert.equal((await runtime.start(runtime.token)).status, 200);
  assert.ok(runtime.owner.calls.length > 0);
  assert.equal(runtime.gemini.size, 0);
  const ownerCalls = runtime.owner.calls.length;
  assert.equal((await runtime.start(runtime.friendCode)).status, 200);
  assert.equal(runtime.owner.calls.length, ownerCalls);
  assert.ok(runtime.gemini.get('server-key').calls.length > 0);
});

test('a friend who sends their own Gemini key plays on it', async (t) => {
  const runtime = await friendRuntime(t);
  assert.equal((await runtime.start(runtime.friendCode, 'my-own-key')).status, 200);
  assert.ok(runtime.gemini.get('my-own-key').calls.length > 0);
  assert.equal(runtime.gemini.has('server-key'), false);
});

test('a friend with no key anywhere is told to connect one; a wrong code is refused', async (t) => {
  const runtime = await friendRuntime(t, { serverKey: null });
  const started = await runtime.start(runtime.friendCode);
  assert.equal(started.status, 503);
  assert.equal(started.data.error.code, 'MODEL_SETUP_REQUIRED');
  const refused = await runtime.call('/api/learner', { code: 'not-the-code', body: {} });
  assert.equal(refused.status, 401);
  assert.equal(refused.data.error.code, 'UNAUTHORIZED');
});
