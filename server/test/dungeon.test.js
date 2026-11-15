// Round 114: the Ta Prohm dungeon. Its file loads in both packs; a bad site or level is refused; a dungeon start skips
// the market's location check; resolving a site clears it in the run; a reset starts a new run; an older save gains
// empty dungeon progress. Round 119: the dungeon is a map. A move walks it under the pass rule, a start is the
// encounter of the site the player stands at, and the view carries the fog. The rules themselves are tested in
// dungeon-rules.test.js.
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
const SITES = [
  ['face_gate', 'market_entrance_tutorial', 'Portia'], ['buttress_tree', 'butchers_stall_charcutier', 'Mortimer'],
  ['root_court', 'imp_coffee_greeting', 'Gerald'], ['sunlit_court', 'cracked_fountain_letharger', 'Flick'],
  ['library', 'old_bookshop_bookworm', 'Marginalia'], ['before_sanctuary', 'high_gate_bambieshart', 'Bambieshart'],
  ['sanctuary', 'the_rift_errata', 'Errata'],
];
const ENCOUNTER = Object.fromEntries(SITES.map(([id, encounter]) => [id, encounter]));

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
const view = (runtime, learnerId) => api(runtime, '/api/dungeons/ta_prohm/map', { learnerId });
const move = (runtime, learnerId, body) => api(runtime, '/api/dungeons/ta_prohm/move', { learnerId, method: 'POST', body });
// Starts and resolves the encounter of the site the player stands at.
async function clearHere(runtime, content, learnerId, siteId) {
  const started = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(started.status, 200, JSON.stringify(started.data.error));
  assert.equal(started.data.encounter.encounterId, ENCOUNTER[siteId]);
  assert.equal(started.data.encounter.siteId, siteId);
  const resolved = await play(runtime, learnerId, started.data.encounter, passingAnswers(content, ENCOUNTER[siteId]));
  assert.equal(resolved.state, 'resolved', `${siteId} resolves`);
}

test('the Ta Prohm dungeon loads in both packs: seven location encounters on the taprohm level, joined by paths', () => {
  for (const language of ['it', 'es']) {
    const { dungeons, encounters } = loadGameContent({ language });
    const dungeon = dungeons.get('ta_prohm');
    assert.equal(dungeon.level, 'taprohm');
    assert.deepEqual(dungeon.sites.map((site) => [site.id, site.encounter]), SITES.map(([id, encounter]) => [id, encounter]));
    for (const site of dungeon.sites) assert.equal(encounters.get(site.encounter).encounter.party_of, undefined);
    assert.equal(dungeon.paths.length, 8);
    assert.ok(Object.isFrozen(dungeon.paths[0].via[0]));
    assert.ok(Object.isFrozen(dungeon.entrance));
  }
});

test('the loader refuses a bad site, level, start, goal, seal or path, and a site one pack lacks', async (t) => {
  const cases = [
    ['unknown encounter', (d) => { d.sites[1].encounter = 'dragon_lair'; }, /ta_prohm names unknown encounter dragon_lair/],
    ['party conversation', (d) => { d.sites[1].encounter = 'gerald_confidence'; }, /site gerald_confidence is a party conversation/],
    ['unknown level', (d) => { d.level = 'atlantis'; }, /ta_prohm names unknown level atlantis/],
    ['repeated encounter', (d) => { d.sites[2].encounter = d.sites[0].encounter; }, /sites contains duplicate IDs: market_entrance_tutorial/],
    ['repeated site id', (d) => { d.sites[2].id = d.sites[0].id; }, /site ids contains duplicate IDs: face_gate/],
    ['unknown start', (d) => { d.start = 'the_moon'; }, /names unknown start site the_moon/],
    ['unknown goal', (d) => { d.goal = 'the_moon'; }, /names unknown goal site the_moon/],
    ['seal on an unknown site', (d) => { d.sites[6].requires = ['the_moon']; }, /site sanctuary requires the_moon, which is not another site/],
    ['seal on itself', (d) => { d.sites[6].requires = ['sanctuary']; }, /site sanctuary requires sanctuary, which is not another site/],
    ['path to an unknown site', (d) => { d.paths[0].between = ['face_gate', 'the_moon']; }, /a path between face_gate and the_moon, which are not two sites/],
    ['path from a site to itself', (d) => { d.paths[0].between = ['face_gate', 'face_gate']; }, /a path between face_gate and face_gate/],
    ['the same path twice', (d) => { d.paths[1].between = ['buttress_tree', 'face_gate']; }, /paths contains duplicate IDs: buttress_tree and face_gate/],
    ['the old route', (d) => { d.route = [[0, 96], [3.5, 63]]; }, /route/],
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

test('a new run: the view carries the map and the fog, a start is the gate\'s encounter, and resolving clears the site', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t);
  const fresh = await view(runtime, learnerId);
  assert.equal(fresh.status, 200);
  assert.deepEqual(Object.keys(fresh.data.dungeon).sort(), ['goal', 'id', 'level', 'name', 'paths', 'sites', 'start']);
  // A hidden site keeps its place but not its character's name.
  assert.deepEqual(fresh.data.dungeon.sites.map((site) => [site.id, site.encounterId, site.characterName]), SITES.map(([id, encounter, name]) => [id, encounter, ['face_gate', 'buttress_tree', 'root_court'].includes(id) ? name : null]));
  assert.deepEqual(fresh.data.dungeon.sites[0].at, [3.5, 63]);
  // Round 120: whether a site's character can be saved to the party, as far as the fog allows.
  assert.deepEqual(fresh.data.dungeon.sites.map((site) => site.saveable), [false, true, true, null, null, null, null]);
  assert.deepEqual(fresh.data.dungeon.paths[0], { between: ['face_gate', 'buttress_tree'], via: [[0.3, 60.5], [0.3, 52], [0.3, 46]] });
  const { sites, ...progress } = fresh.data.progress;
  assert.deepEqual(progress, { run: 1, at: 'face_gate', complete: false, clearedSiteIds: [], visitedSiteIds: ['face_gate'] });
  assert.deepEqual(sites.face_gate, { state: 'current', cleared: false, reachable: false });
  assert.deepEqual(sites.root_court, { state: 'known', cleared: false, reachable: false });
  assert.deepEqual(sites.sanctuary, { state: 'hidden', cleared: false, reachable: false, gate: { sealed: true, required: 6, completed: 0 } });

  // The player stands at the Market Entrance; Gerald's cart is elsewhere.
  const named = await start(runtime, learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(named.data.error.code, 'NOT_HERE', 'the market start still checks the location');
  const elsewhere = await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'imp_coffee_greeting' });
  assert.equal(elsewhere.status, 409);
  assert.equal(elsewhere.data.error.code, 'NOT_AT_SITE');
  assert.deepEqual(elsewhere.data.error.details, { siteId: 'face_gate', encounterId: 'market_entrance_tutorial' });

  const first = await start(runtime, learnerId, { dungeonId: 'ta_prohm', encounterId: 'market_entrance_tutorial' });
  assert.equal(first.status, 200);
  assert.equal(first.data.encounter.dungeonId, 'ta_prohm');
  assert.equal(first.data.encounter.siteId, 'face_gate');
  // A reload resumes the run's conversation under way.
  const again = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(again.data.encounter.id, first.data.encounter.id);
  const resolved = await play(runtime, learnerId, first.data.encounter, passingAnswers(content, 'market_entrance_tutorial'));
  assert.equal(resolved.state, 'resolved');
  const after = (await view(runtime, learnerId)).data.progress;
  assert.deepEqual(after.clearedSiteIds, ['face_gate']);
  assert.deepEqual(after.sites.face_gate, { state: 'current', cleared: true, reachable: false });
  assert.equal(after.sites.root_court.reachable, true);
  assert.equal(after.sites.buttress_tree.reachable, true);
  // A cleared site is played again from the start.
  const replay = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(replay.data.encounter.state, 'ongoing');
  assert.notEqual(replay.data.encounter.id, first.data.encounter.id);
  // The market keeps its record, and the market's map has not moved.
  const envelope = await runtime.storage.load(learnerId);
  assert.deepEqual(envelope.world.completedEncounterIds, ['market_entrance_tutorial']);
  assert.deepEqual(envelope.dungeons.ta_prohm, { run: 1, at: 'face_gate', cleared: ['face_gate'], visited: ['face_gate'] });
  assert.equal((await api(runtime, '/api/world', { learnerId })).data.world.currentLocationId, 'market_entrance');
});

test('moves follow the pass rule, a conversation under way holds the player unless they leave, and the goal completes the run', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t);
  // Before Portia is answered nothing lies open.
  const blocked = await move(runtime, learnerId, { siteId: 'root_court' });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.data.error.code, 'BLOCKED');
  assert.equal(blocked.data.error.message, 'Portia has not let you pass yet.');
  assert.equal((await move(runtime, learnerId, { siteId: 'library' })).data.error.code, 'NOT_ADJACENT');
  assert.equal((await move(runtime, learnerId, { siteId: 'the_moon' })).status, 400);
  assert.equal((await move(runtime, learnerId, {})).status, 400);
  const stay = await move(runtime, learnerId, { siteId: 'face_gate' });
  assert.equal(stay.status, 200);
  assert.equal(stay.data.progress.at, 'face_gate');

  await clearHere(runtime, content, learnerId, 'face_gate');
  // Portia's conversation is resolved: a move needs no leave, and the view is the new place.
  const toTree = await move(runtime, learnerId, { siteId: 'buttress_tree' });
  assert.equal(toTree.status, 200);
  assert.deepEqual([toTree.data.progress.at, toTree.data.progress.visitedSiteIds], ['buttress_tree', ['face_gate', 'buttress_tree']]);
  assert.equal(toTree.data.dungeon.sites[1].characterName, 'Mortimer');
  // Mortimer has not been answered: the message names him, not Portia (critique 1.2).
  const past = await move(runtime, learnerId, { siteId: 'root_court' });
  assert.equal(past.data.error.code, 'BLOCKED');
  assert.equal(past.data.error.message, 'Mortimer has not let you pass yet.');

  // A conversation under way holds the player; `leave` drops it and walks.
  const talking = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(talking.data.encounter.siteId, 'buttress_tree');
  const held = await move(runtime, learnerId, { siteId: 'face_gate' });
  assert.equal(held.data.error.code, 'CONVERSATION_UNDER_WAY');
  assert.equal((await move(runtime, learnerId, { siteId: 'buttress_tree' })).status, 200, 'a move to the same site changes nothing and keeps the conversation');
  assert.equal((await api(runtime, '/api/encounter/current', { learnerId })).data.encounter.id, talking.data.encounter.id);
  const left = await move(runtime, learnerId, { siteId: 'face_gate', leave: true });
  assert.equal(left.status, 200);
  assert.equal(left.data.progress.at, 'face_gate');
  assert.equal((await api(runtime, '/api/encounter/current', { learnerId })).data.encounter, null);
  assert.deepEqual(left.data.progress.clearedSiteIds, ['face_gate'], 'the left conversation cleared nothing');

  // Critique 1.1: from a cleared site whose conversation is replayed, `leave` also covers a move to an unvisited site.
  await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal((await move(runtime, learnerId, { siteId: 'root_court' })).data.error.code, 'CONVERSATION_UNDER_WAY');
  assert.equal((await move(runtime, learnerId, { siteId: 'root_court', leave: true })).status, 200);

  await clearHere(runtime, content, learnerId, 'root_court');
  const sealed = await move(runtime, learnerId, { siteId: 'before_sanctuary' });
  assert.equal(sealed.status, 200);
  // The seal is named before the character in the way: it is the reason that lasts.
  assert.equal((await move(runtime, learnerId, { siteId: 'sanctuary' })).data.error.code, 'SEALED');
  await clearHere(runtime, content, learnerId, 'before_sanctuary');
  const stillShut = await move(runtime, learnerId, { siteId: 'sanctuary' });
  assert.equal(stillShut.data.error.code, 'SEALED');
  assert.match(stillShut.data.error.message, /The Sanctuary is sealed.*3 of 6 done/);

  for (const [to, clear] of [['root_court', false], ['buttress_tree', true], ['root_court', false], ['sunlit_court', true], ['library', true], ['sunlit_court', false], ['before_sanctuary', false], ['sanctuary', true]]) {
    const walked = await move(runtime, learnerId, { siteId: to });
    assert.equal(walked.status, 200, `${to}: ${JSON.stringify(walked.data.error)}`);
    if (clear) await clearHere(runtime, content, learnerId, to);
  }
  const done = (await view(runtime, learnerId)).data;
  assert.equal(done.progress.complete, true);
  assert.deepEqual(done.progress.clearedSiteIds, SITES.map(([id]) => id));
  assert.ok(done.dungeon.sites.every((site) => site.characterName));
  // A complete run stays playable.
  assert.equal((await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter.encounterId, 'the_rift_errata');
  const envelope = await runtime.storage.load(learnerId);
  assert.deepEqual([...envelope.world.completedEncounterIds].sort(), SITES.map(([, encounter]) => encounter).sort());
});

// Round 120: a party member's conversation is an ordinary one (no dungeonId): it starts where the player stands in the
// dungeon, does not hold a move, and gives way to a site start only with `restart`.
test('a party conversation in the dungeon: it starts at a site, a move is free, and a site start needs restart to replace it', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t);
  await clearHere(runtime, content, learnerId, 'face_gate');
  await move(runtime, learnerId, { siteId: 'root_court' });
  await clearHere(runtime, content, learnerId, 'root_court');
  const cleared = (await view(runtime, learnerId)).data;
  assert.deepEqual(cleared.dungeon.sites.map((site) => site.saveable), [false, true, true, true, null, false, null]);
  const joined = await api(runtime, '/api/party/recruit', { learnerId, method: 'POST', body: { encounterId: 'imp_coffee_greeting' } });
  assert.equal(joined.data.joined, true);
  const [gerald] = joined.data.party;
  assert.equal(gerald.conversationId, 'gerald_coffee_break');

  const talk = await start(runtime, learnerId, { encounterId: gerald.conversationId });
  assert.equal(talk.status, 200);
  assert.equal(talk.data.encounter.partyConversation, true);
  assert.equal(talk.data.encounter.dungeonId, undefined);
  // A walk is not held by it, with or without `leave`, and it stays under way.
  const walked = await move(runtime, learnerId, { siteId: 'sunlit_court' });
  assert.equal(walked.status, 200);
  assert.equal((await api(runtime, '/api/encounter/current', { learnerId })).data.encounter.id, talk.data.encounter.id);
  // Talk resumes it; the site's own start is refused until it is told to replace it.
  assert.equal((await start(runtime, learnerId, { encounterId: gerald.conversationId })).data.encounter.id, talk.data.encounter.id);
  assert.equal((await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.error.code, 'CONVERSATION_UNDER_WAY');
  const site = await start(runtime, learnerId, { dungeonId: 'ta_prohm', restart: true });
  assert.equal(site.data.encounter.siteId, 'sunlit_court');
  // A finished party conversation counts, and clears no site.
  await move(runtime, learnerId, { siteId: 'root_court', leave: true });
  const again = await start(runtime, learnerId, { encounterId: gerald.conversationId });
  assert.notEqual(again.data.encounter.id, talk.data.encounter.id);
  assert.equal((await play(runtime, learnerId, again.data.encounter, passingAnswers(content, gerald.conversationId))).state, 'resolved');
  assert.equal((await api(runtime, '/api/party', { learnerId })).data.party[0].conversations, 1);
  assert.deepEqual((await view(runtime, learnerId)).data.progress.clearedSiteIds, ['face_gate', 'root_court']);
});

test('a reset starts a new run at the gate: the fog is back, the conversation is dropped, and the market keeps its record', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t, 'es');
  await clearHere(runtime, content, learnerId, 'face_gate');
  await move(runtime, learnerId, { siteId: 'root_court' });
  const second = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;
  assert.equal(second.encounterId, 'imp_coffee_greeting');

  const reset = await api(runtime, '/api/dungeons/ta_prohm/reset', { learnerId, method: 'POST' });
  assert.equal(reset.status, 200);
  const { sites, ...progress } = reset.data.progress;
  assert.deepEqual(progress, { run: 2, at: 'face_gate', complete: false, clearedSiteIds: [], visitedSiteIds: ['face_gate'] });
  assert.equal(sites.sunlit_court.state, 'hidden');
  // The reset dropped Gerald's conversation, so the tutorial starts without CONVERSATION_UNDER_WAY, as a new session.
  const replay = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(replay.status, 200);
  assert.equal(replay.data.encounter.encounterId, 'market_entrance_tutorial');
  assert.equal(replay.data.encounter.state, 'ongoing');
  assert.equal(replay.data.encounter.committedPlayerTurns, 0);
  const envelope = await runtime.storage.load(learnerId);
  assert.deepEqual(envelope.world.completedEncounterIds, ['market_entrance_tutorial']);
});

test('a market conversation under way is not replaced, a market resolve clears no site, and unknown dungeons are 404', async (t) => {
  const { runtime, content, learnerId } = await dungeonRuntime(t);
  const market = (await start(runtime, learnerId, { encounterId: 'market_entrance_tutorial' })).data.encounter;
  assert.equal(market.dungeonId, undefined);
  assert.equal((await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.error.code, 'CONVERSATION_UNDER_WAY');
  await play(runtime, learnerId, market, passingAnswers(content, 'market_entrance_tutorial'));
  const progress = (await view(runtime, learnerId)).data.progress;
  assert.deepEqual(progress.clearedSiteIds, [], 'only a dungeon start clears a site');
  // A site the learner finished on the market is played again from the start.
  const site = await start(runtime, learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(site.data.encounter.state, 'ongoing');
  assert.notEqual(site.data.encounter.id, market.id);

  assert.equal((await api(runtime, '/api/dungeons/atlantis/map', { learnerId })).status, 404);
  assert.equal((await api(runtime, '/api/dungeons/atlantis/map', { learnerId })).data.error.code, 'UNKNOWN_DUNGEON');
  assert.equal((await api(runtime, '/api/dungeons/atlantis/move', { learnerId, method: 'POST', body: { siteId: 'face_gate' } })).data.error.code, 'UNKNOWN_DUNGEON');
  assert.equal((await start(runtime, learnerId, { dungeonId: 'atlantis' })).data.error.code, 'UNKNOWN_DUNGEON');
  assert.equal((await view(runtime)).status, 400, 'a learner id is required');
  // Review 1 (R1.1): the path the client of rounds 115 to 118 read tells that page to reload, whatever the dungeon.
  const outdated = await api(runtime, '/api/dungeons/ta_prohm', { learnerId });
  assert.equal(outdated.status, 426);
  assert.deepEqual([outdated.data.error.code, outdated.data.error.message], ['CLIENT_OUTDATED', 'This page is older than the server. Open Settings and tap "Reload the page".']);
  assert.equal((await api(runtime, '/api/dungeons/ta_prohm', { learnerId, token: null })).status, 401, 'still behind the token');
  assert.equal((await api(runtime, '/api/dungeons/ta_prohm/map', { learnerId, token: null })).status, 401, 'the token is required');
  assert.equal((await api(runtime, '/api/dungeons/ta_prohm/move', { learnerId, method: 'POST', body: { siteId: 'face_gate' }, token: null })).status, 401);
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
  assert.equal((await view(runtime, learnerId)).data.progress.at, 'face_gate');
  // Round 119: a run from rounds 114 to 118 (encounter ids, no position) keeps its cleared sites.
  await writeFile(file, JSON.stringify({ ...saved, dungeons: { ta_prohm: { run: 2, cleared: ['market_entrance_tutorial', 'imp_coffee_greeting'] } } }));
  const old = (await view(runtime, learnerId)).data.progress;
  assert.deepEqual([old.run, old.at, old.clearedSiteIds, old.visitedSiteIds], [2, 'face_gate', ['face_gate', 'root_court'], ['face_gate', 'root_court']]);

  await writeFile(file, JSON.stringify({ ...saved, dungeons: { ta_prohm: { run: 0, cleared: 'x' }, other: { run: 2, cleared: ['a'] }, twice: { run: 1, cleared: [], visited: ['a', 'a'] }, nowhere: { run: 1, cleared: [], at: '' }, whole: { run: 1, at: 'a', cleared: [], visited: ['a'] } } }));
  assert.deepEqual((await runtime.storage.load(learnerId)).dungeons, { other: { run: 2, cleared: ['a'] }, whole: { run: 1, at: 'a', cleared: [], visited: ['a'] } });
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
