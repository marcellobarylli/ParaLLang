// Round 021: party recruitment (backlog A8a) and the start route's encounterId.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { api, createRuntime } from './helpers.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { retryableError } from '../src/errors.js';

const gerald = { characterId: 'imp_coffee_001', name: 'Gerald', encounterId: 'imp_coffee_greeting', locationId: 'coffee_cart', locationName: 'The Coffee Cart', joinedAt: '2026-01-15T12:00:00.000Z', conversations: 0, conversationId: 'gerald_coffee_break', conversationTier: 0, nextStoryAt: 3, storiesTold: 0 };

async function newLearner(runtime) {
  return (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
}

// Walks to The Coffee Cart and wins Gerald over through the HTTP API, naming the encounter as the app does.
async function defeatGerald(runtime, learnerId) {
  assert.equal((await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'coffee_cart' } })).status, 200);
  const started = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'imp_coffee_greeting' } });
  assert.equal(started.status, 200);
  const { encounter } = started.data;
  const turn = await api(runtime, '/api/encounter/dialogue', {
    learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.' },
  });
  assert.equal(turn.data.encounter.state, 'resolved');
  return turn.data.encounter;
}

const recruit = (runtime, learnerId, encounterId) => api(runtime, '/api/party/recruit', { learnerId, method: 'POST', body: { encounterId } });
const savePath = (runtime, learnerId) => join(runtime.saveDir, `${learnerId}.json`);

test('the start route passes encounterId: the named encounter at its place, NOT_HERE elsewhere, 400 for a malformed id, default without one', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  const start = (body) => api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body });

  const wrong = await start({ encounterId: 'imp_coffee_greeting' });
  assert.equal(wrong.status, 409);
  assert.equal(wrong.data.error.code, 'NOT_HERE');
  assert.equal((await start({ encounterId: 42 })).status, 400);
  assert.equal((await start({ encounterId: 'no_such_encounter' })).status, 400);

  const portia = await start({ encounterId: 'market_entrance_tutorial' });
  assert.equal(portia.status, 200);
  assert.equal(portia.data.encounter.encounterId, 'market_entrance_tutorial');
  assert.deepEqual(portia.data.encounter.character, { id: 'archway_portia_001', name: 'Portia', saveable: false, voice: { kind: 'female', pitch: 1, rate: 0.9 } });

  const fallback = await start({});
  assert.equal(fallback.status, 200);
  assert.equal(fallback.data.encounter.encounterId, 'imp_coffee_greeting', 'the frozen web client still starts the default anywhere');
});

test('a defeated Gerald can be saved to the party once; Portia cannot; nobody joins before the encounter is won', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  assert.deepEqual((await api(runtime, '/api/party', { learnerId })).data, { party: [] });

  const early = await recruit(runtime, learnerId, 'imp_coffee_greeting');
  assert.equal(early.status, 409);
  assert.equal(early.data.error.code, 'NOT_DEFEATED');
  const portia = await recruit(runtime, learnerId, 'market_entrance_tutorial');
  assert.equal(portia.status, 409);
  assert.equal(portia.data.error.code, 'NOT_SAVEABLE');
  for (const encounterId of ['no_such_encounter', 7, null]) {
    assert.equal((await recruit(runtime, learnerId, encounterId)).status, 400);
  }

  const resolved = await defeatGerald(runtime, learnerId);
  assert.deepEqual(resolved.character, { id: 'imp_coffee_001', name: 'Gerald', saveable: true, voice: { kind: 'creature', pitch: 1.7, rate: 1.15 } });
  const world = await api(runtime, '/api/world', { learnerId });
  assert.deepEqual(world.data.world.locations.find((l) => l.id === 'coffee_cart').encounter,
    { id: 'imp_coffee_greeting', completed: true, characterName: 'Gerald', characterId: 'imp_coffee_001', saveable: true });

  const joined = await recruit(runtime, learnerId, 'imp_coffee_greeting');
  assert.equal(joined.status, 200);
  assert.deepEqual(joined.data, { party: [gerald], joined: true });
  const again = await recruit(runtime, learnerId, 'imp_coffee_greeting');
  assert.deepEqual(again.data, { party: [gerald], joined: false });
  assert.deepEqual((await api(runtime, '/api/party', { learnerId })).data, { party: [gerald] });

  const saved = JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8'));
  assert.equal(saved.schemaVersion, 3);
  assert.deepEqual(saved.party, [{ characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: gerald.joinedAt }]);

  const restarted = await createRuntime({ saveDir: runtime.saveDir });
  t.after(restarted.close);
  assert.deepEqual((await api(restarted, '/api/party', { learnerId })).data, { party: [gerald] }, 'the party survives a server restart');
});

test('two simultaneous recruits add Gerald once', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  await defeatGerald(runtime, learnerId);
  const results = await Promise.all([1, 2, 3].map(() => runtime.service.recruit(learnerId, { encounterId: 'imp_coffee_greeting' })));
  assert.equal(results.filter((result) => result.joined).length, 1);
  const saved = JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8'));
  assert.equal(saved.party.length, 1);
});

test('a failed save leaves the party as it was', async (t) => {
  class FailingPartyStorage extends JsonLearningStorage {
    async save(envelope) {
      if (envelope.party.length) throw retryableError('Progress could not be saved: disk full', 'STORAGE_FAILURE');
      return super.save(envelope);
    }
  }
  const base = await createRuntime();
  t.after(base.close);
  const runtime = await createRuntime({ storage: new FailingPartyStorage({ saveDir: base.saveDir }), saveDir: base.saveDir });
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  await defeatGerald(runtime, learnerId);
  const failed = await recruit(runtime, learnerId, 'imp_coffee_greeting');
  assert.equal(failed.status, 503);
  assert.equal(failed.data.error.code, 'STORAGE_FAILURE');
  assert.deepEqual((await api(runtime, '/api/party', { learnerId })).data, { party: [] });
});

test('recruiting during another encounter changes nothing in it and calls no provider', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  await defeatGerald(runtime, learnerId);
  await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'market_entrance' } });
  const before = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'market_entrance_tutorial' } })).data.encounter;
  assert.equal(before.state, 'ongoing');
  const calls = runtime.provider.calls.length;
  assert.equal((await recruit(runtime, learnerId, 'imp_coffee_greeting')).data.joined, true);
  assert.equal(runtime.provider.calls.length, calls);
  assert.deepEqual((await api(runtime, '/api/encounter/current', { learnerId })).data.encounter, before);
});

test('a version 2 save migrates to version 3 with an empty party, keeping Spellbook, receipts and world', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  await defeatGerald(runtime, learnerId);
  const v3 = JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8'));
  const { party: _party, ...rest } = v3;
  const v2 = { ...rest, schemaVersion: 2 };
  await writeFile(savePath(runtime, learnerId), JSON.stringify(v2));

  assert.deepEqual((await api(runtime, '/api/party', { learnerId })).data, { party: [] });
  assert.equal((await recruit(runtime, learnerId, 'imp_coffee_greeting')).data.joined, true);
  const migrated = JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8'));
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.spellbook, v2.spellbook);
  assert.deepEqual(migrated.world, v2.world);
  assert.equal(migrated.party.length, 1);
});

test('an invalid party makes the save unreadable and leaves the file unchanged', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  const fresh = JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8'));
  assert.deepEqual(fresh.party, [], 'a new save has an empty party');
  const member = { characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z', conversations: 0, conversationId: 'gerald_coffee_break' };
  for (const party of [{}, null, [null], [member, { ...member }], [{ ...member, joinedAt: 'yesterday' }], [{ ...member, characterId: 3 }]]) {
    const raw = JSON.stringify({ ...fresh, party });
    await writeFile(savePath(runtime, learnerId), raw);
    const result = await api(runtime, '/api/party', { learnerId });
    assert.equal(result.data.error?.code, 'SAVE_UNREADABLE', JSON.stringify(party));
    assert.equal(await readFile(savePath(runtime, learnerId), 'utf8'), raw);
  }
});

test('members whose encounter is gone or now names another character stay saved but are not shown', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = await newLearner(runtime);
  const fresh = JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8'));
  const party = [
    { characterId: 'someone_else_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z' },
    { characterId: 'ghost_001', encounterId: 'demolished_kiosk_ghost', joinedAt: '2026-01-15T12:00:00.000Z' },
  ];
  await writeFile(savePath(runtime, learnerId), JSON.stringify({ ...fresh, party }));
  assert.deepEqual((await api(runtime, '/api/party', { learnerId })).data, { party: [] });
  await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'coffee_cart' } });
  assert.deepEqual(JSON.parse(await readFile(savePath(runtime, learnerId), 'utf8')).party, party);
});
