// Round 039: removing a save in the app deletes it on the server too (DELETE /api/learner, X-Learner-Id).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { FixtureProvider, api, createLearnerAndEncounter, createRuntime, makeTempDir } from './helpers.js';

test('storage.remove deletes the file, is idempotent, and reports other failures as STORAGE_FAILURE', async () => {
  const saveDir = await makeTempDir('parallang-delete-');
  const storage = new JsonLearningStorage({ saveDir });
  const id = '11111111-1111-4111-8111-111111111111';
  await storage.save((await import('../src/learning-storage.js')).createLearnerEnvelope(id));
  assert.equal(existsSync(join(saveDir, `${id}.json`)), true);
  assert.equal(await storage.remove(id), true);
  assert.equal(existsSync(join(saveDir, `${id}.json`)), false);
  assert.equal(await storage.remove(id), false);
  // Critique 1.1: a temporary copy left by a failed write goes too; another learner's files stay.
  const other = '22222222-2222-4222-8222-222222222222';
  await storage.save((await import('../src/learning-storage.js')).createLearnerEnvelope(other));
  await writeFile(join(saveDir, `.${id}.0000.tmp`), '{"answers":"secret"}');
  await writeFile(join(saveDir, `.${other}.0000.tmp`), '{}');
  assert.equal(await storage.remove(id), false);
  assert.deepEqual((await readdir(saveDir)).sort(), [`.${other}.0000.tmp`, `${other}.json`]);
  const failing = new JsonLearningStorage({ saveDir, io: { unlink: async () => { throw Object.assign(new Error('read-only'), { code: 'EROFS' }); } } });
  await assert.rejects(() => failing.remove(id), (error) => error.code === 'STORAGE_FAILURE' && error.retryable === true);
  await assert.rejects(() => storage.remove('../etc/passwd'), /valid learner ID/);
});

test('DELETE /api/learner removes the save and its encounter; again is fine; unknown afterwards', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { learnerId } = await createLearnerAndEncounter(runtime);
  assert.ok((await api(runtime, '/api/encounter/current', { learnerId })).data.encounter, 'an encounter is under way');
  const first = await api(runtime, '/api/learner', { learnerId, method: 'DELETE' });
  assert.deepEqual([first.status, first.data], [200, { deleted: true, existed: true }]);
  assert.deepEqual(await readdir(runtime.saveDir), [], 'no file and no temp file left');
  assert.equal(runtime.service.encounters.has(learnerId), false);
  const world = await api(runtime, '/api/world', { learnerId });
  assert.equal(world.status, 400);
  assert.match(world.data.error.message, /Unknown learner ID/);
  const again = await api(runtime, '/api/learner', { learnerId, method: 'DELETE' });
  assert.deepEqual([again.status, again.data], [200, { deleted: true, existed: false }]);
});

test('DELETE /api/learner needs a valid learner header and the token', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  assert.equal((await api(runtime, '/api/learner', { method: 'DELETE' })).status, 400);
  assert.equal((await api(runtime, '/api/learner', { learnerId: 'nope', method: 'DELETE' })).status, 400);
  const unauthorized = await api(runtime, '/api/learner', { learnerId, method: 'DELETE', token: null });
  assert.equal(unauthorized.status, 401);
  assert.equal(existsSync(join(runtime.saveDir, `${learnerId}.json`)), true, 'nothing deleted without the token');
});

// A turn in flight finishes (and saves) before the delete runs; nothing writes the file back afterwards.
class SlowProvider extends FixtureProvider {
  async structuredChat(messages, schema, options) {
    if (options.schemaName === 'dialogue_assessment') await new Promise((resolve) => setTimeout(resolve, 50));
    return super.structuredChat(messages, schema, options);
  }
}
test('a delete waits for a turn in flight for the same learner, and the file stays gone', async (t) => {
  const runtime = await createRuntime({ provider: new SlowProvider() });
  t.after(() => runtime.close());
  const { learnerId, started: { encounter } } = await createLearnerAndEncounter(runtime);
  const turn = api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: crypto.randomUUID(), message: 'Quiero un café negro.' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const removed = api(runtime, '/api/learner', { learnerId, method: 'DELETE' });
  const [turned, deleted] = await Promise.all([turn, removed]);
  assert.equal(turned.status, 200, JSON.stringify(turned.data));
  assert.deepEqual(deleted.data, { deleted: true, existed: true });
  assert.deepEqual(await readdir(runtime.saveDir), []);
});

// Critique 1.3: only POST /api/learner recreates a file; a request queued behind the delete gets 400 and writes nothing.
test('a request queued behind a delete fails as for an unknown learner and writes nothing', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const [deleted, started, moved] = await Promise.all([
    api(runtime, '/api/learner', { learnerId, method: 'DELETE' }),
    api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} }),
    api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'coffee_cart' } }),
  ]);
  assert.equal(deleted.status, 200);
  assert.deepEqual([started.status, moved.status], [400, 400]);
  assert.deepEqual(await readdir(runtime.saveDir), []);
});

test('a failed delete keeps the learner\'s session in memory', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const { learnerId } = await createLearnerAndEncounter(runtime);
  runtime.storage.io.unlink = async () => { throw Object.assign(new Error('read-only'), { code: 'EROFS' }); };
  const failed = await api(runtime, '/api/learner', { learnerId, method: 'DELETE' });
  assert.equal(failed.data.error.code, 'STORAGE_FAILURE');
  assert.equal(runtime.service.encounters.has(learnerId), true);
});
