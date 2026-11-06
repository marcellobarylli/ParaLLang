// Round 091 (review R1.1 of rounds 017–028): a named start never replaces another conversation under way; leaving it
// is a restart start; the web client's default start still replaces; a restart of the held one works anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime } from './helpers.js';

async function withGerald(t) {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { service } = runtime;
  const { learnerId } = await service.createOrRecoverLearner();
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['imp_coffee_greeting'] };
  envelope.party = [{ characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z', conversations: 0 }];
  await runtime.storage.save(envelope);
  return { runtime, service, learnerId };
}

test('a party conversation under way blocks a named start here; restart leaves it; the same one resumes', async (t) => {
  const { service, learnerId } = await withGerald(t);
  const coffee = (await service.startEncounter(learnerId, { encounterId: 'gerald_coffee_break' })).encounter;
  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' }),
    { status: 409, code: 'CONVERSATION_UNDER_WAY', message: 'Finish your conversation with Gerald first.' });
  assert.equal(service.encounters.get(learnerId).id, coffee.id, 'kept');
  assert.equal((await service.startEncounter(learnerId, { encounterId: 'gerald_coffee_break' })).encounter.id, coffee.id, 'resumes');
  const portia = (await service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial', restart: true })).encounter;
  assert.equal(portia.encounterId, 'market_entrance_tutorial');
  assert.equal(service.encounters.get(learnerId).id, portia.id, 'left Gerald');
});

test('a resolved conversation elsewhere does not block; the default start (web client) still replaces', async (t) => {
  const { service, learnerId } = await withGerald(t);
  await service.startEncounter(learnerId, { encounterId: 'gerald_coffee_break' });
  service.encounters.get(learnerId).state = 'resolved';
  assert.equal((await service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' })).encounter.encounterId, 'market_entrance_tutorial');
  const replaced = await service.startEncounter(learnerId);
  assert.equal(replaced.encounter.encounterId, 'imp_coffee_greeting', 'no id: the default encounter, replacing Portia');
});

test('a restart of the held conversation works away from its place; of another, NOT_HERE still applies', async (t) => {
  const { service, learnerId } = await withGerald(t);
  const portia = (await service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' })).encounter;
  await service.moveTo(learnerId, { locationId: 'coffee_cart' });
  const again = (await service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial', restart: true })).encounter;
  assert.notEqual(again.id, portia.id);
  assert.equal(again.encounterId, 'market_entrance_tutorial');
  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'butchers_stall_charcutier', restart: true }), { code: 'NOT_HERE' });
});
