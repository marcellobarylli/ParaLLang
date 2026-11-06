import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { api, createRuntime, FixtureProvider, fixedNow } from './helpers.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');

async function contentCopy(t, edit) {
  const dir = await mkdtemp(join(tmpdir(), 'parallang-content-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(contentRoot, dir, { recursive: true });
  await edit(dir);
  return dir;
}

async function editYaml(path, change) {
  const value = yaml.load(await readFile(path, 'utf8'));
  change(value);
  await writeFile(path, yaml.dump(value));
}

async function serviceRuntime(t, { saveDir } = {}) {
  const dir = saveDir ?? await mkdtemp(join(tmpdir(), 'parallang-world-'));
  if (!saveDir) t.after(() => rm(dir, { recursive: true, force: true }));
  const content = loadGameContent({ language: 'es' });
  const storage = new JsonLearningStorage({ saveDir: dir });
  const service = new LearningService({ provider: new FixtureProvider(), storage, content, clock: () => fixedNow });
  return { service, storage, content, saveDir: dir };
}

test('the Crumbling Market loads six connected locations with Gerald at The Coffee Cart', () => {
  for (const language of ['it', 'es']) {
    const { world, encounter } = loadGameContent({ language });
    assert.equal(world.start, 'market_entrance');
    assert.deepEqual(world.locations.map((location) => location.id).sort(), [
      'butchers_stall', 'coffee_cart', 'cracked_fountain', 'market_entrance', 'old_bookshop', 'the_rift',
    ]);
    assert.equal(world.locationsById.get('coffee_cart').encounter, encounter.id);
    assert.equal(encounter.location, 'coffee_cart');
    assert.deepEqual(world.neighbours.get('market_entrance'), ['butchers_stall', 'coffee_cart']);
  }
});

test('the world loader rejects bad paths, unreachable locations and wrong encounters', async (t) => {
  const cases = [
    ['unknown path end', (dir) => editYaml(join(dir, 'world/connections.yaml'), (c) => { c.paths.push(['coffee_cart', 'nowhere']); }), /unknown location nowhere/],
    ['self-loop', (dir) => editYaml(join(dir, 'world/connections.yaml'), (c) => { c.paths.push(['coffee_cart', 'coffee_cart']); }), /joins a location to itself/],
    ['unreachable', (dir) => editYaml(join(dir, 'world/connections.yaml'), (c) => { c.paths = c.paths.filter(([a, b]) => b !== 'the_rift' && a !== 'the_rift'); }), /unreachable from market_entrance: the_rift/],
    ['unknown start', (dir) => editYaml(join(dir, 'world/connections.yaml'), (c) => { c.start = 'atlantis'; }), /start atlantis is not a known location/],
    ['wrong encounter', (dir) => editYaml(join(dir, 'world/locations/coffee_cart.yaml'), (l) => { l.encounter = 'imp_tea'; }), /unknown encounter imp_tea/],
    ['encounter moved', (dir) => Promise.all([
      editYaml(join(dir, 'world/locations/coffee_cart.yaml'), (l) => { l.encounter = null; }),
      editYaml(join(dir, 'world/locations/butchers_stall.yaml'), (l) => { l.encounter = 'imp_coffee_greeting'; }),
    ]), /names encounter imp_coffee_greeting, which is set at coffee_cart/],
    ['id mismatch', (dir) => editYaml(join(dir, 'world/locations/the_rift.yaml'), (l) => { l.id = 'rift'; }), /must declare id the_rift/],
  ];
  for (const [name, edit, error] of cases) {
    const dir = await contentCopy(t, edit);
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), error, name);
  }
});

test('a new learner starts at the Market Entrance and sees only its neighbours through the fog', async (t) => {
  const { service } = await serviceRuntime(t);
  const { learnerId } = await service.createOrRecoverLearner();
  const { world } = await service.getWorld(learnerId);
  assert.equal(world.currentLocationId, 'market_entrance');
  assert.deepEqual(world.locations.map((l) => [l.id, l.state, l.adjacent]), [
    ['butchers_stall', 'known', true],
    ['coffee_cart', 'known', true],
    ['market_entrance', 'current', false],
  ]);
  const known = world.locations.find((l) => l.id === 'coffee_cart');
  assert.equal(known.description, undefined, 'known locations keep their description hidden');
  assert.equal(known.encounter, undefined);
  assert.deepEqual(world.locations.find((l) => l.id === 'market_entrance').encounter, { id: 'market_entrance_tutorial', completed: false, characterName: 'Portia', characterId: 'archway_portia_001', saveable: false });
  assert.deepEqual(world.paths, [['market_entrance', 'coffee_cart'], ['market_entrance', 'butchers_stall']]);
});

test('moves follow paths, reveal the map and persist; other moves are rejected', async (t) => {
  const runtime = await serviceRuntime(t);
  const { learnerId } = await runtime.service.createOrRecoverLearner();

  await assert.rejects(runtime.service.moveTo(learnerId, { locationId: 'the_rift' }), { status: 409, code: 'NOT_ADJACENT' });
  await assert.rejects(runtime.service.moveTo(learnerId, { locationId: 'atlantis' }), { status: 400 });
  await assert.rejects(runtime.service.moveTo(learnerId, {}), { status: 400 });

  const stay = await runtime.service.moveTo(learnerId, { locationId: 'market_entrance' });
  assert.equal(stay.world.currentLocationId, 'market_entrance');
  assert.deepEqual((await runtime.storage.load(learnerId)).world.visitedLocationIds, [], 'a no-op move writes nothing');

  const atCart = await runtime.service.moveTo(learnerId, { locationId: 'coffee_cart' });
  assert.equal(atCart.world.currentLocationId, 'coffee_cart');
  const cart = atCart.world.locations.find((l) => l.id === 'coffee_cart');
  assert.equal(cart.state, 'current');
  assert.match(cart.description, /imp in a tiny apron/);
  assert.deepEqual(cart.encounter, { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald', characterId: 'imp_coffee_001', saveable: true });
  assert.equal(atCart.world.locations.find((l) => l.id === 'market_entrance').state, 'visited');
  assert.equal(atCart.world.locations.find((l) => l.id === 'cracked_fountain').state, 'known');
  assert.ok(!atCart.world.locations.some((l) => l.id === 'old_bookshop'));

  const fountain = await runtime.service.moveTo(learnerId, { locationId: 'cracked_fountain' });
  assert.deepEqual(fountain.world.locations.filter((l) => l.adjacent).map((l) => l.id), ['butchers_stall', 'coffee_cart', 'old_bookshop']);

  const restarted = await serviceRuntime(t, { saveDir: runtime.saveDir });
  const recovered = await restarted.service.getWorld(learnerId);
  assert.deepEqual(recovered.world, fountain.world);
  assert.deepEqual((await restarted.storage.load(learnerId)).world.visitedLocationIds, ['market_entrance', 'coffee_cart', 'cracked_fountain']);
});

test('a version 1 save migrates with its Spellbook intact and unknown locations fall back to the start', async (t) => {
  const runtime = await serviceRuntime(t);
  const learnerId = randomUUID();
  const v1 = {
    schemaVersion: 1,
    learnerId,
    spellbook: {
      words: {
        cafe: {
          vocabularyId: 'cafe', contentVersion: runtime.content.entryVersion('cafe'), discoveredAt: fixedNow.toISOString(),
          discoverySource: 'encounter_exposure', evidence: [],
          schedule: { ease: 2.5, repetitions: 0, intervalDays: 0, dueAt: fixedNow.toISOString(), lastQuality: null },
        },
      },
      phrases: {},
      processedAssessments: {},
    },
  };
  await writeFile(join(runtime.saveDir, `${learnerId}.json`), JSON.stringify(v1));
  const before = await runtime.service.getSpellbook(learnerId);
  assert.deepEqual(before.cards.map((card) => card.vocabularyId), ['cafe']);
  assert.equal((await runtime.service.getWorld(learnerId)).world.currentLocationId, 'market_entrance');

  await runtime.service.moveTo(learnerId, { locationId: 'butchers_stall' });
  const saved = JSON.parse(await readFile(join(runtime.saveDir, `${learnerId}.json`), 'utf8'));
  assert.equal(saved.schemaVersion, 3);
  assert.deepEqual(saved.party, []);
  assert.deepEqual(saved.spellbook, v1.spellbook);
  assert.equal(saved.world.currentLocationId, 'butchers_stall');

  saved.world.currentLocationId = 'demolished_kiosk';
  await writeFile(join(runtime.saveDir, `${learnerId}.json`), JSON.stringify(saved));
  assert.equal((await runtime.service.getWorld(learnerId)).world.currentLocationId, 'market_entrance');

  saved.world = { currentLocationId: 3 };
  await writeFile(join(runtime.saveDir, `${learnerId}.json`), JSON.stringify(saved));
  await assert.rejects(runtime.service.getWorld(learnerId), { code: 'SAVE_UNREADABLE' });
});

test('resolving Gerald marks The Coffee Cart encounter completed on the map', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const moved = await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'coffee_cart' } });
  assert.equal(moved.status, 200);
  let { data: { encounter } } = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} });
  for (const message of ['Quiero un café.', 'Sin leche, por favor.']) {
    const turn = await api(runtime, '/api/encounter/dialogue', {
      learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message },
    });
    assert.equal(turn.status, 200);
    encounter = turn.data.encounter;
  }
  assert.equal(encounter.state, 'resolved');
  const world = await api(runtime, '/api/world', { learnerId });
  assert.deepEqual(world.data.world.locations.find((l) => l.id === 'coffee_cart').encounter, { id: 'imp_coffee_greeting', completed: true, characterName: 'Gerald', characterId: 'imp_coffee_001', saveable: true });
  const rejected = await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'the_rift' } });
  assert.equal(rejected.status, 409);
  assert.equal(rejected.data.error.code, 'NOT_ADJACENT');
});

test('PARALLANG_TOKEN guards every API route except health', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const health = await fetch(`${runtime.baseUrl}/api/health`);
  assert.equal(health.status, 200);
  for (const token of [null, 'wrong']) {
    const learner = await api(runtime, '/api/learner', { method: 'POST', body: {}, token });
    assert.equal(learner.status, 401);
    assert.equal(learner.data.error.code, 'UNAUTHORIZED');
  }
  const ok = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  assert.equal(ok.status, 201);
});

// Round 092 (review R1.1): Express 5 routes case-insensitively and ignores a trailing slash, so the check is an
// allowlist of the health check alone, compared the same way.
test('PARALLANG_TOKEN: other spellings of a route need it too; only the health check is open', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  const bare = (path, init = {}) => fetch(`${runtime.baseUrl}${path}`, { ...init, headers: { 'X-Learner-Id': learnerId, ...(init.headers ?? {}) } });
  for (const path of ['/API/world', '/Api/onboarding', '/api/world/', '/API/WORLD/', '/nope']) {
    const response = await bare(path);
    assert.equal(response.status, 401, path);
    assert.equal((await response.json()).error.code, 'UNAUTHORIZED', path);
  }
  assert.equal((await bare('/API/world', { method: 'HEAD' })).status, 401, 'HEAD');
  for (const path of ['/api/health', '/api/health/', '/API/HEALTH/']) assert.equal((await bare(path)).status, 200, path);
  const preflight = await bare('/API/world', { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5173', 'Access-Control-Request-Method': 'GET' } });
  assert.equal(preflight.status, 204, 'cors answers preflights first');
  const withToken = await bare('/API/world', { headers: { 'X-ParaLLang-Token': runtime.token } });
  assert.equal(withToken.status, 200, 'with the token the same spelling passes');
});
