// Round 114: the Ta Prohm dungeon. Its file loads in both packs; a bad site or level is refused; a dungeon start skips
// the market's location check but not the order of the sites; resolving a site clears it in the run; a reset starts a
// new run; an older save gains empty dungeon progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { listenHostForProvider, productionTokenProblem } from '../src/config.js';
import { PassingProvider, api, createRuntime, makeTempDir, passingAnswers } from './helpers.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');
const SITES = ['market_entrance_tutorial', 'imp_coffee_greeting', 'high_gate_bambieshart'];

async function dungeonRuntime(t, language = 'it') {
  const content = loadGameContent({ language });
  const runtime = await createRuntime({ language, content, provider: new PassingProvider(content) });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  return { runtime, content, learnerId };
}

async function play(runtime, learnerId, encounter, answers) {
  let current = encounter;
  for (const message of answers) {
    const turn = await runtime.service.submitDialogue(learnerId, { encounterId: current.id, version: current.version, attemptId: randomUUID(), message });
    current = turn.encounter;
  }
  return current;
}

const start = (runtime, learnerId, body) => api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body });

test('the Ta Prohm dungeon loads in both packs: three location encounters on the taprohm level, each on the route', () => {
  for (const language of ['it', 'es']) {
    const { dungeons, encounters } = loadGameContent({ language });
    const dungeon = dungeons.get('ta_prohm');
    assert.equal(dungeon.level, 'taprohm');
    assert.deepEqual(dungeon.sites.map((site) => site.encounter), SITES);
    for (const site of dungeon.sites) {
      assert.equal(encounters.get(site.encounter).encounter.party_of, undefined);
      assert.ok(dungeon.route.some(([x, z]) => x === site.at[0] && z === site.at[1]), `${site.encounter} is on the route`);
    }
    assert.ok(Object.isFrozen(dungeon.route[0]));
  }
});

test('the loader refuses an unknown encounter, a party conversation, an unknown level, a site off the route and a site one pack lacks', async (t) => {
  const cases = [
    ['unknown encounter', (d) => { d.sites[1].encounter = 'dragon_lair'; }, /ta_prohm names unknown encounter dragon_lair/],
    ['party conversation', (d) => { d.sites[1].encounter = 'gerald_confidence'; }, /site gerald_confidence is a party conversation/],
    ['unknown level', (d) => { d.level = 'atlantis'; }, /ta_prohm names unknown level atlantis/],
    ['off the route', (d) => { d.sites[2].at = [40, 40]; }, /high_gate_bambieshart at \[40,40\] is not a later point of the route/],
    ['out of route order', (d) => { [d.sites[0].at, d.sites[1].at] = [d.sites[1].at, d.sites[0].at]; }, /is not a later point of the route/],
    ['repeated site', (d) => { d.sites[2].encounter = d.sites[0].encounter; }, /sites contains duplicate IDs: market_entrance_tutorial/],
  ];
  for (const [name, change, error] of cases) {
    const dir = await makeTempDir('parallang-dungeon-');
    await cp(contentRoot, dir, { recursive: true });
    const path = join(dir, 'world/dungeons/ta_prohm.yaml');
    const value = yaml.load(await readFile(path, 'utf8'));
    change(value);
    await writeFile(path, yaml.dump(value));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), error, name);
  }
  // A site the other pack lacks: the Spanish pack loses Bambieshart's encounter (an Italian load reads the es files).
  const dir = await makeTempDir('parallang-dungeon-');
  await cp(contentRoot, dir, { recursive: true });
  await rm(join(dir, 'languages/es/encounters/high_gate_bambieshart.yaml'));
  assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), /site high_gate_bambieshart is missing from the es pack/);
});

test('a dungeon start skips the location check, refuses an out-of-order site, and resolving clears the site', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t);
  const fresh = await api(runtime, '/api/dungeons/ta_prohm', { learnerId });
  assert.equal(fresh.status, 200);
  assert.deepEqual(fresh.data.dungeon.sites.map((site) => [site.encounterId, site.characterName]), [
    ['market_entrance_tutorial', 'Portia'], ['imp_coffee_greeting', 'Gerald'], ['high_gate_bambieshart', 'Bambieshart'],
  ]);
  assert.deepEqual(fresh.data.progress, { run: 1, clearedEncounterIds: [], nextSiteIndex: 0, nextEncounterId: 'market_entrance_tutorial', complete: false });

  // The player stands at the Market Entrance; Gerald's cart is elsewhere.
  const named = await start(runtime, learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(named.data.error.code, 'NOT_HERE', 'the market start still checks the location');
  const early = await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'imp_coffee_greeting' });
  assert.equal(early.status, 409);
  assert.equal(early.data.error.code, 'NOT_NEXT_SITE');
  assert.equal(early.data.error.details.nextEncounterId, 'market_entrance_tutorial');

  const first = await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'market_entrance_tutorial' });
  assert.equal(first.status, 200);
  assert.equal(first.data.encounter.dungeonId, 'ta_prohm');
  // A reload resumes the run's conversation under way.
  const again = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(again.data.encounter.id, first.data.encounter.id);
  const resolved = await play(runtime, learnerId, first.data.encounter, passingAnswers(content, 'market_entrance_tutorial'));
  assert.equal(resolved.state, 'resolved');
  const after = (await api(runtime, '/api/dungeons/ta_prohm', { learnerId })).data.progress;
  assert.deepEqual(after.clearedEncounterIds, ['market_entrance_tutorial']);
  assert.equal(after.nextEncounterId, 'imp_coffee_greeting');

  // Site 2 starts although the player never walked to the Coffee Cart; site 3 still waits.
  const world = (await api(runtime, '/api/world', { learnerId })).data.world;
  assert.equal(world.currentLocationId, 'market_entrance');
  assert.equal((await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'high_gate_bambieshart' })).data.error.code, 'NOT_NEXT_SITE');
  const second = await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'imp_coffee_greeting' });
  assert.equal(second.status, 200);
  await play(runtime, learnerId, second.data.encounter, passingAnswers(content, 'imp_coffee_greeting'));
  // Without encounterId, a dungeon start is the next site's.
  const third = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(third.data.encounter.encounterId, 'high_gate_bambieshart');
  assert.equal((await play(runtime, learnerId, third.data.encounter, passingAnswers(content, 'high_gate_bambieshart'))).state, 'resolved');

  const done = (await api(runtime, '/api/dungeons/ta_prohm', { learnerId })).data.progress;
  assert.deepEqual(done, { run: 1, clearedEncounterIds: SITES, nextSiteIndex: null, nextEncounterId: null, complete: true });
  const over = await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'market_entrance_tutorial' });
  assert.equal(over.data.error.code, 'NOT_NEXT_SITE');
  assert.equal(over.data.error.details.nextEncounterId, null);
  // The market keeps its record, so fragments and the Spellbook follow as before.
  const envelope = await runtime.storage.load(learnerId);
  assert.deepEqual([...envelope.world.completedEncounterIds].sort(), [...SITES].sort());
  assert.deepEqual(envelope.dungeons.ta_prohm, { run: 1, cleared: SITES });
});

test('a reset starts a new run: the first site is played again from the start, and the market keeps its record', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t, 'es');
  const first = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;
  await play(runtime, learnerId, first, passingAnswers(content, 'market_entrance_tutorial'));
  const second = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;
  assert.equal(second.encounterId, 'imp_coffee_greeting');

  const reset = await api(runtime, '/api/dungeons/ta_prohm/reset', { learnerId, method: 'POST' });
  assert.equal(reset.status, 200);
  assert.deepEqual(reset.data.progress, { run: 2, clearedEncounterIds: [], nextSiteIndex: 0, nextEncounterId: 'market_entrance_tutorial', complete: false });
  // The reset dropped Gerald's conversation, so the tutorial starts without CONVERSATION_UNDER_WAY, as a new session.
  const replay = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(replay.status, 200);
  assert.equal(replay.data.encounter.encounterId, 'market_entrance_tutorial');
  assert.equal(replay.data.encounter.state, 'ongoing');
  assert.equal(replay.data.encounter.committedPlayerTurns, 0);
  assert.notEqual(replay.data.encounter.id, first.id);
  const envelope = await runtime.storage.load(learnerId);
  assert.deepEqual(envelope.world.completedEncounterIds, ['market_entrance_tutorial']);
});

test('a market conversation under way is not replaced, a market resolve clears no site, and unknown dungeons are 404', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t);
  const market = (await start(runtime, learnerId, { encounterId: 'market_entrance_tutorial' })).data.encounter;
  assert.equal(market.dungeonId, undefined);
  assert.equal((await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.error.code, 'CONVERSATION_UNDER_WAY');
  await play(runtime, learnerId, market, passingAnswers(content, 'market_entrance_tutorial'));
  const progress = (await api(runtime, '/api/dungeons/ta_prohm', { learnerId })).data.progress;
  assert.deepEqual(progress.clearedEncounterIds, [], 'only a dungeon start clears a site');
  // A site the learner finished on the market is played again from the start.
  const site = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(site.data.encounter.state, 'ongoing');
  assert.notEqual(site.data.encounter.id, market.id);

  assert.equal((await api(runtime, '/api/dungeons/atlantis', { learnerId })).status, 404);
  assert.equal((await api(runtime, '/api/dungeons/atlantis', { learnerId })).data.error.code, 'UNKNOWN_DUNGEON');
  assert.equal((await start(runtime, learnerId, { dungeonId: 'atlantis' })).data.error.code, 'UNKNOWN_DUNGEON');
  assert.equal((await api(runtime, '/api/dungeons/ta_prohm')).status, 400, 'a learner id is required');
  assert.equal((await api(runtime, '/api/dungeons/ta_prohm', { learnerId, token: null })).status, 401, 'the token is required');
});

test('older saves gain empty dungeon progress; invalid runs are dropped and a bad container is refused', async (t) => {
  const { runtime, learnerId } = await dungeonRuntime(t);
  const file = join(runtime.saveDir, `${learnerId}.json`);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(saved.dungeons, {});
  const { dungeons: _gone, ...version3 } = saved;
  await writeFile(file, JSON.stringify(version3));
  assert.deepEqual((await runtime.storage.load(learnerId)).dungeons, {});
  const { party: _party, dungeons: _d, ...rest } = saved;
  await writeFile(file, JSON.stringify({ ...rest, schemaVersion: 2 }));
  const migrated = await runtime.storage.load(learnerId);
  assert.equal(migrated.schemaVersion, 3);
  assert.deepEqual(migrated.dungeons, {});
  const view = await api(runtime, '/api/dungeons/ta_prohm', { learnerId });
  assert.equal(view.data.progress.nextEncounterId, 'market_entrance_tutorial');

  await writeFile(file, JSON.stringify({ ...saved, dungeons: { ta_prohm: { run: 0, cleared: 'x' }, other: { run: 2, cleared: ['a'] } } }));
  assert.deepEqual((await runtime.storage.load(learnerId)).dungeons, { other: { run: 2, cleared: ['a'] } });
  await writeFile(file, JSON.stringify({ ...saved, dungeons: [] }));
  await assert.rejects(runtime.storage.load(learnerId), /invalid dungeon progress/);
});

test('production refuses to start without a usable token, and only then may a CLI provider listen beyond 127.0.0.1', () => {
  assert.equal(productionTokenProblem({}), null);
  assert.equal(productionTokenProblem({ NODE_ENV: 'development' }), null);
  assert.match(productionTokenProblem({ NODE_ENV: 'production' }), /requires PARALLANG_TOKEN/);
  assert.match(productionTokenProblem({ NODE_ENV: 'production', PARALLANG_TOKEN: '   ' }), /requires PARALLANG_TOKEN/);
  assert.match(productionTokenProblem({ NODE_ENV: 'production', PARALLANG_TOKEN: 'short' }), /at least 16/);
  assert.match(productionTokenProblem({ NODE_ENV: 'production', PARALLANG_TOKEN: 'a long token with spaces' }), /cannot carry/);
  assert.equal(productionTokenProblem({ NODE_ENV: 'production', PARALLANG_TOKEN: 'a-long-enough-token-1234' }), null);

  assert.equal(listenHostForProvider('claude-cli', { NODE_ENV: 'production' }), '127.0.0.1');
  assert.equal(listenHostForProvider('claude-cli', { PARALLANG_TOKEN: 'a-long-enough-token-1234' }), '127.0.0.1');
  assert.equal(listenHostForProvider('claude-cli', { NODE_ENV: 'production', PARALLANG_TOKEN: 'a-long-enough-token-1234' }), '0.0.0.0');
  assert.equal(listenHostForProvider('claude-cli', { NODE_ENV: 'production', PARALLANG_TOKEN: 'a-long-enough-token-1234', HOST: '192.0.2.1' }), '192.0.2.1');
});
