import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { gateFor } from '../src/world.js';
import { api, createRuntime } from './helpers.js';

// Round 014: The Rift is sealed until the other five encounters are complete (round 113: The High Gate is optional).
const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');
const others = ['market_entrance_tutorial', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm'];

// Puts a fresh learner at `at`, having visited the whole route and completed `completed`.
async function seed(runtime, learnerId, { at = 'old_bookshop', completed = [], visited } = {}) {
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = {
    currentLocationId: at,
    visitedLocationIds: visited ?? ['market_entrance', 'coffee_cart', 'cracked_fountain', 'old_bookshop'],
    completedEncounterIds: completed,
  };
  await runtime.storage.save(envelope);
}

test('both packs gate The Rift on the other five encounters', () => {
  for (const language of ['it', 'es']) {
    const { world, encounters } = loadGameContent({ language });
    const rift = world.locationsById.get('the_rift');
    assert.deepEqual([...rift.requires_completed].sort(), [...encounters.values()].filter(({ encounter }) => encounter.id !== 'the_rift_errata' && encounter.id !== 'high_gate_bambieshart' && encounter.id !== 'micromort_eduardo' && !encounter.party_of).map(({ encounter }) => encounter.id).sort());
    assert.deepEqual(world.locationsById.get('coffee_cart').requires_completed, []);
    assert.equal(gateFor(world.locationsById.get('coffee_cart'), {}), null);
    assert.deepEqual(gateFor(rift, { completedEncounterIds: ['imp_coffee_greeting', 'unrelated'] }), { sealed: true, required: 5, completed: 1 });
    assert.deepEqual(gateFor(rift, { completedEncounterIds: others }), { sealed: false, required: 5, completed: 5 });
  }
});

test('the world loader rejects a gate naming an unknown, repeated or own encounter', async (t) => {
  const cases = [
    ['unknown', (l) => { l.requires_completed.push('dragon_lair'); }, /the_rift requires unknown encounter dragon_lair/],
    ['repeated', (l) => { l.requires_completed.push('imp_coffee_greeting'); }, /the_rift lists an encounter twice/],
  ];
  for (const [name, change, error] of cases) {
    const dir = await mkdtemp(join(tmpdir(), 'parallang-gate-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    await cp(contentRoot, dir, { recursive: true });
    const path = join(dir, 'world/locations/the_rift.yaml');
    const value = yaml.load(await readFile(path, 'utf8'));
    change(value);
    await writeFile(path, yaml.dump(value));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), error, name);
  }
  const dir = await mkdtemp(join(tmpdir(), 'parallang-gate-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(contentRoot, dir, { recursive: true });
  const path = join(dir, 'world/locations/coffee_cart.yaml');
  const cart = yaml.load(await readFile(path, 'utf8'));
  cart.requires_completed = ['imp_coffee_greeting'];
  await writeFile(path, yaml.dump(cart));
  assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), /coffee_cart requires its own encounter imp_coffee_greeting/);
});

test('the map shows The Rift sealed with progress, the server refuses the move, and it opens after the fifth encounter', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });

  const start = await api(runtime, '/api/world', { learnerId });
  assert.ok(!start.data.world.locations.some((l) => l.id === 'the_rift'), 'the fog still hides The Rift at the start');
  assert.equal(start.data.world.locations.find((l) => l.id === 'coffee_cart').gate, undefined, 'open locations carry no gate');
  const far = await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'the_rift' } });
  assert.equal(far.data.error.code, 'NOT_ADJACENT', 'adjacency is checked before the seal');

  await seed(runtime, learnerId, { completed: others.slice(0, 4) });
  const sealed = (await api(runtime, '/api/world', { learnerId })).data.world.locations.find((l) => l.id === 'the_rift');
  assert.equal(sealed.state, 'known');
  assert.equal(sealed.adjacent, true);
  assert.deepEqual(sealed.gate, { sealed: true, required: 5, completed: 4 });
  const refused = await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'the_rift' } });
  assert.equal(refused.status, 409);
  assert.equal(refused.data.error.code, 'SEALED');
  assert.equal(refused.data.error.message, 'The Rift is sealed. Finish the other encounters first (4 of 5 done).');
  assert.equal((await runtime.storage.load(learnerId)).world.currentLocationId, 'old_bookshop', 'a refused move writes nothing');

  await seed(runtime, learnerId, { completed: others });
  const moved = await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'the_rift' } });
  assert.equal(moved.status, 200);
  const rift = moved.data.world.locations.find((l) => l.id === 'the_rift');
  assert.equal(rift.state, 'current');
  assert.deepEqual(rift.gate, { sealed: false, required: 5, completed: 5 });
  assert.deepEqual(rift.encounter, { id: 'the_rift_errata', completed: false, characterName: 'Errata', characterId: 'rift_errata_001', saveable: false }, 'round 015: the boss waits inside');
});

test('a learner already standing in The Rift from an older save is not thrown out, but cannot walk back in', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  await seed(runtime, learnerId, { at: 'the_rift', completed: ['imp_coffee_greeting'], visited: ['market_entrance', 'coffee_cart', 'cracked_fountain', 'old_bookshop', 'the_rift'] });

  const stay = await runtime.service.moveTo(learnerId, { locationId: 'the_rift' });
  assert.equal(stay.world.currentLocationId, 'the_rift');
  assert.deepEqual(stay.world.locations.find((l) => l.id === 'the_rift').gate, { sealed: true, required: 5, completed: 1 });
  await runtime.service.moveTo(learnerId, { locationId: 'old_bookshop' });
  await assert.rejects(runtime.service.moveTo(learnerId, { locationId: 'the_rift' }), { status: 409, code: 'SEALED' });
});

test('each of the five encounters is required: leaving out any one keeps The Rift sealed', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  for (const missing of others) {
    await seed(runtime, learnerId, { completed: others.filter((id) => id !== missing) });
    await assert.rejects(runtime.service.moveTo(learnerId, { locationId: 'the_rift' }), { status: 409, code: 'SEALED' }, missing);
  }
});
