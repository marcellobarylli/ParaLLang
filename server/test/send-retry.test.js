// Round 071: what the app's resend relies on. A committed turn sent again with the same attempt id, version and text
// replays over HTTP and changes nothing; the same attempt id with another text is refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { api, createLearnerAndEncounter, createRuntime } from './helpers.js';

test('a resent committed turn replays without a second turn; another text under the same id is ATTEMPT_REUSE', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId, started } = await createLearnerAndEncounter(runtime);
  const body = { encounterId: started.encounter.id, version: started.encounter.version, attemptId: randomUUID(), message: 'Quiero un café.' };
  const first = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body });
  assert.equal(first.status, 200);
  assert.equal(first.data.replayed, false);
  const saved = await readFile(runtime.storage.filePath(learnerId), 'utf8');
  const calls = runtime.provider.calls.length;

  // The response was "lost": the app resends the same request.
  const again = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body });
  assert.equal(again.status, 200);
  assert.equal(again.data.replayed, true);
  assert.deepEqual(again.data.encounter, first.data.encounter);
  assert.deepEqual(again.data.assessment, first.data.assessment);
  assert.equal(runtime.provider.calls.length, calls);
  assert.equal(await readFile(runtime.storage.filePath(learnerId), 'utf8'), saved);
  assert.equal((await api(runtime, '/api/encounter/current', { learnerId })).data.encounter.version, first.data.encounter.version);

  const reused = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { ...body, message: 'Sin leche.' } });
  assert.equal(reused.status, 409);
  assert.equal(reused.data.error.code, 'ATTEMPT_REUSE');

  // A new attempt at the old version is the stale case the app now reloads from.
  const stale = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { ...body, attemptId: randomUUID() } });
  assert.equal(stale.status, 409);
  assert.equal(stale.data.error.code, 'STALE_VERSION');
});
