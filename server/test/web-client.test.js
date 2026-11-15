// Round 103: the web client (client/) played against today's server: its own store and API module, unmodified,
// through an in-process server with a fixture provider. The fields its components read are asserted, so a server
// rename shows up here. zustand (and the react it imports) resolve from the root node_modules.
// Round 115: the web client plays the Ta Prohm dungeon, with the dungeon built from the content file as the client
// bundles it. Round 119: the dungeon is a map: this test walks a legal way through all seven sites to the victory
// state, which also shows that every site of the real file can be reached.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { PassingProvider, api, createRuntime, passingAnswers } from './helpers.js';
import { createGameStore, siteStatesOf } from '../../client/src/stores/gameStore.js';
import { toClientDungeon } from '../../client/src/dungeonModel.js';

let runtime;
let dungeon;
const realFetch = globalThis.fetch;
// The browser reaches the server through Vite's /api proxy; here the wrapper prefixes the base URL. With
// wrapper.token the wrapper adds the access token, as the dev proxy does (round 105).
const wrapper = { token: true };
before(async () => {
  // Spanish, because the fixture provider narrates in Spanish: its line carries vocabulary of Gerald's encounter.
  const content = loadGameContent({ language: 'es' });
  runtime = await createRuntime({ language: 'es', content, provider: new PassingProvider(content) });
  dungeon = toClientDungeon(content.dungeons.get('ta_prohm'));
  globalThis.fetch = async (path, init = {}) => {
    if (typeof path !== 'string' || !path.startsWith('/')) return realFetch(path, init);
    const headers = { ...init.headers, ...(wrapper.token ? { 'X-ParaLLang-Token': runtime.token } : {}) };
    return realFetch(`${runtime.baseUrl}${path}`, { ...init, headers });
  };
});
after(async () => { globalThis.fetch = realFetch; await runtime.close(); });

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}
const has = (object, keys, where) => { for (const key of keys) assert.ok(Object.hasOwn(object ?? {}, key), `${where}.${key}`); };
const ENCOUNTER = { face_gate: 'market_entrance_tutorial', buttress_tree: 'butchers_stall_charcutier', root_court: 'imp_coffee_greeting', sunlit_court: 'cracked_fountain_letharger', library: 'old_bookshop_bookworm', before_sanctuary: 'high_gate_bambieshart', sanctuary: 'the_rift_errata' };
const indexOf = (siteId) => dungeon.sites.findIndex((site) => site.id === siteId);

function newStore(storage = memoryStorage()) {
  const store = createGameStore({ storage, dungeon });
  return { store, storage, s: () => store.getState() };
}

// From the title screen (or the temple map) to the open dialogue of the site the player stands at.
async function openSite(s) {
  if (s().phase === 'attract') s().enter();
  if (s().phase === 'world') s().enterPlace('ta_prohm');
  if (s().phase === 'overview') await s().start();
  assert.equal(s().siteError, null);
  s().onCameraArrived();
  assert.equal(s().phase, 'encounter');
}

// A walk to a neighbouring site: to its open dialogue, or to its card when the site is cleared.
async function walkTo(s, siteId, opens = 'encounter') {
  const from = s().siteIndex;
  await s().travel(siteId);
  assert.equal(s().error, null);
  assert.equal(s().phase, 'walk', `the walk to ${siteId} starts`);
  assert.deepEqual([s().walkFrom, s().siteIndex], [from, indexOf(siteId)]);
  assert.equal(s().progress.at, siteId);
  assert.equal(s().siteError, null);
  s().onCameraArrived();
  assert.equal(s().phase, opens);
  if (opens === 'encounter') assert.equal(s().encounter.encounterId, ENCOUNTER[siteId]);
}

async function answerSite(s) {
  for (const message of passingAnswers(runtime.content, s().encounter.encounterId)) {
    assert.equal(s().encounter.state, 'ongoing');
    await s().sendMessage(message);
    assert.equal(s().error, null);
  }
  assert.equal(s().encounter.state, 'resolved');
}

test('the web client plays the dungeon: seven sites by a walk over the map, a help, the Spellbook, reviews, a new run and a reload', async () => {
  const { storage, s } = newStore();
  await s().initialize();
  assert.equal(s().serverProblem, null);
  assert.equal(s().connection, 'ready');
  assert.equal(s().phase, 'attract');
  has(s().language, ['tag', 'name'], 'language');
  has(s().progress, ['run', 'at', 'complete', 'clearedSiteIds', 'visitedSiteIds', 'sites'], 'progress');
  for (const site of dungeon.sites) has(s().progress.sites[site.id], ['state', 'cleared', 'reachable'], `progress.sites.${site.id}`);
  // The fog: the gate and the two sites a path leads to are named.
  assert.deepEqual(s().dungeon.sites.map((site) => [site.id, site.characterName]), [
    ['face_gate', 'Portia'], ['buttress_tree', 'Mortimer'], ['root_court', 'Gerald'], ['sunlit_court', null], ['library', null], ['before_sanctuary', null], ['sanctuary', null],
  ]);
  // The bundled file and the server's copy agree on where the sites stand and how the paths run.
  const served = (await api(runtime, '/api/dungeons/ta_prohm/map', { learnerId: s().learnerId })).data.dungeon;
  assert.deepEqual(served.sites.map((site) => [site.id, site.encounterId, site.at]), dungeon.sites.map((site) => [site.id, site.encounterId, site.at]));
  assert.deepEqual(served.paths, dungeon.paths.map(({ between, via }) => ({ between, via })));
  assert.deepEqual([served.start, served.goal], [dungeon.start, dungeon.goal]);

  await openSite(s);
  const encounter = s().encounter;
  assert.equal(encounter.encounterId, ENCOUNTER.face_gate);
  assert.equal(encounter.dungeonId, 'ta_prohm');
  assert.equal(encounter.siteId, 'face_gate');
  assert.equal(encounter.state, 'ongoing');
  has(encounter, ['id', 'version', 'difficulty', 'hints', 'hints_available', 'transcript', 'currentObjective', 'character', 'resolvedMessage', 'companionBriefing', 'committedPlayerTurns'], 'encounter');
  assert.equal(encounter.character.name, 'Portia');
  assert.ok(encounter.companionBriefing.length > 0, 'the tutorial carries the companion briefing');
  has(encounter.currentObjective, ['prompt'], 'currentObjective');
  has(encounter.hints, ['remaining', 'limit', 'used'], 'hints');
  const npc = encounter.transcript.findLast((message) => message.role !== 'player');
  has(npc, ['id', 'protected', 'narrative', 'dialogue'], 'npc line');
  // A protected line's translation and word meanings come only with a help (round 001).
  has(npc.dialogue, ['native', 'words', 'speaker'], 'dialogue');
  assert.equal(npc.dialogue.translation, undefined);
  assert.ok(Array.isArray(npc.dialogue.words));

  // Reviews wait while the encounter is under way (round 017).
  await s().startReview(null);
  assert.match(s().error, /Reviews wait until the encounter is over/);
  assert.equal(s().reviewChallenge, null);
  assert.equal(s().spellbook.inEncounter, true);

  // Before Portia is answered no walk is offered, and the server refuses one all the same.
  assert.equal(siteStatesOf(s()).root_court.reachable, false);
  const early = await api(runtime, '/api/dungeons/ta_prohm/move', { learnerId: s().learnerId, method: 'POST', body: { siteId: 'root_court', leave: true } });
  assert.equal(early.data.error.code, 'BLOCKED');

  await answerSite(s);
  has(s().assessment, ['overallFeedback', 'objectiveResults'], 'assessment');
  for (const result of s().assessment.objectiveResults) has(result, ['objectiveId', 'passed', 'feedback'], 'objectiveResult');
  assert.equal(typeof s().encounter.resolvedMessage, 'string');
  assert.ok(s().encounter.transcript.some((message) => message.role === 'player'));
  assert.deepEqual(s().progress.clearedSiteIds, ['face_gate']);
  assert.deepEqual(Object.entries(siteStatesOf(s())).filter(([, site]) => site.reachable).map(([id]) => id), ['buttress_tree', 'root_court']);

  await walkTo(s, 'buttress_tree');
  assert.equal(s().encounter.character.name, 'Mortimer');
  assert.equal(s().encounter.companionBriefing, null);
  // The player leaves Mortimer for later: the way on is shut, the ways back are open.
  s().leaveConversation();
  assert.equal(s().phase, 'site');
  assert.deepEqual(Object.entries(siteStatesOf(s())).filter(([, site]) => site.reachable).map(([id]) => id), ['face_gate']);
  await s().talk();
  assert.equal(s().phase, 'encounter');
  await answerSite(s);

  await walkTo(s, 'root_court');
  assert.equal(s().encounter.character.name, 'Gerald');
  // A word help on Gerald's newest line: it costs a hint and brings the meaning.
  const line = s().encounter.transcript.findLast((message) => message.role !== 'player');
  assert.ok(line.dialogue.words.length > 0);
  for (const word of line.dialogue.words) has(word, ['vocabularyId', 'canonicalTarget'], 'word');
  await s().revealHelp({ kind: 'word', messageId: line.id, vocabularyId: line.dialogue.words[0].vocabularyId });
  assert.equal(s().error, null);
  assert.equal(s().encounter.hints.used, 1);
  assert.equal(s().encounter.hints.remaining, s().encounter.hints.limit - 1);
  const helped = s().encounter.transcript.find((message) => message.id === line.id).dialogue.words[0];
  has(helped, ['meaning', 'partOfSpeech'], 'helped word');
  await answerSite(s);

  await walkTo(s, 'sunlit_court');
  await answerSite(s);
  await walkTo(s, 'library');
  await answerSite(s);
  await walkTo(s, 'sunlit_court', 'site'); // cleared: its card, and no conversation
  assert.equal(s().encounter, null);
  await walkTo(s, 'before_sanctuary');
  // The Sanctuary is in sight and sealed until Bambieshart, the sixth, is answered.
  has(siteStatesOf(s()).sanctuary.gate, ['sealed', 'required', 'completed'], 'gate');
  assert.deepEqual(siteStatesOf(s()).sanctuary.gate, { sealed: true, required: 6, completed: 5 });
  await answerSite(s);
  assert.equal(siteStatesOf(s()).sanctuary.gate.sealed, false);
  assert.equal(s().progress.complete, false);
  await walkTo(s, 'sanctuary');
  assert.equal(s().encounter.character.name, 'Errata');
  await answerSite(s);
  assert.equal(s().progress.complete, true);
  assert.deepEqual(s().progress.clearedSiteIds, dungeon.sites.map((site) => site.id));
  assert.ok(s().dungeon.sites.every((site) => site.characterName), 'no fog is left');
  s().leaveTemple();
  assert.equal(s().phase, 'victory');

  // The Spellbook and its reviews, now that no conversation is under way.
  s().openSpellbook();
  await new Promise((resolve) => setTimeout(resolve, 50)); // the refresh behind the snapshot
  const { spellbook } = s();
  assert.equal(spellbook.inEncounter, false);
  assert.equal(typeof spellbook.dueCount, 'number');
  assert.ok(spellbook.cards.length >= 2);
  for (const card of spellbook.cards) has(card, ['vocabularyId', 'target', 'meanings', 'partOfSpeech', 'mastery', 'due', 'nextReviewAt'], 'card');
  const [first, second] = spellbook.cards;
  await s().startReview(first.vocabularyId);
  assert.equal(s().error, null);
  assert.equal(s().view, 'review');
  has(s().reviewChallenge, ['id', 'target', 'practice'], 'challenge');
  assert.equal(s().reviewChallenge.vocabularyId, first.vocabularyId);
  assert.equal(s().reviewChallenge.practice, !first.due);
  await s().submitReview('definitely wrong');
  assert.equal(s().error, null);
  has(s().reviewResult, ['correct', 'feedback', 'canonicalAnswer', 'effectiveQuality', 'nextReviewAt'], 'review result');
  assert.equal(s().reviewResult.correct, false);
  await s().startReview(second.vocabularyId);
  await s().revealReviewAnswer();
  assert.equal(s().error, null);
  has(s().reviewResult, ['canonicalAnswer'], 'reveal result');
  s().returnToDialogue();

  // A reload of the page on a finished run: the stored learner is recovered, on the victory screen, and may stay.
  const reloaded = newStore(storage);
  await reloaded.s().initialize();
  assert.equal(reloaded.s().learnerId, s().learnerId);
  assert.equal(reloaded.s().phase, 'victory');
  reloaded.s().stay();
  await reloaded.s().start();
  reloaded.s().onCameraArrived();
  assert.equal(reloaded.s().phase, 'site');
  assert.equal(reloaded.s().siteIndex, indexOf('sanctuary'));

  // A new run starts at the gate again, under the fog, with a new conversation.
  await s().playAgain();
  assert.equal(s().error, null);
  assert.equal(s().phase, 'world');
  assert.deepEqual(s().progress.clearedSiteIds, []);
  assert.equal(s().progress.run, 2);
  assert.equal(siteStatesOf(s()).library.state, 'hidden');
  await openSite(s);
  assert.equal(s().encounter.encounterId, ENCOUNTER.face_gate);
  assert.equal(s().encounter.committedPlayerTurns, 0);
  assert.notEqual(s().encounter.id, encounter.id);
});

test('a reload in the middle of a run resumes the conversation under way at the site the player stands at', async () => {
  const { storage, s } = newStore();
  await s().initialize();
  await openSite(s);
  await answerSite(s);
  await walkTo(s, 'root_court');
  const [answer] = passingAnswers(runtime.content, ENCOUNTER.root_court);
  const conversation = s().encounter.id;

  const again = newStore(storage);
  await again.s().initialize();
  assert.equal(again.s().learnerId, s().learnerId);
  assert.equal(again.s().phase, 'approach');
  assert.equal(again.s().siteIndex, indexOf('root_court'));
  assert.equal(again.s().encounter.id, conversation, 'resumed, not replaced');
  again.s().onCameraArrived();
  assert.equal(again.s().phase, 'encounter');
  await again.s().sendMessage(answer);
  assert.equal(again.s().error, null);

  // A third tab leaves the conversation and walks back to the gate: the server drops the conversation at the court.
  const third = newStore(storage);
  await third.s().initialize();
  third.s().onCameraArrived();
  third.s().leaveConversation();
  await third.s().travel('face_gate');
  assert.equal(third.s().error, null);
  assert.equal(third.s().phase, 'walk');
  assert.equal(third.s().progress.at, 'face_gate');
  const current = await api(runtime, '/api/encounter/current', { learnerId: s().learnerId });
  assert.equal(current.data.encounter, null, 'the conversation at the court was left behind');
});

// Round 120: the party from the dungeon, against the real server.
test('the web client saves Gerald after his site, talks to him as a party member and finishes the conversation', async () => {
  const { storage, s } = newStore();
  await s().initialize();
  await openSite(s);
  await answerSite(s);
  // Nobody is in the party, and the map says who could be: Mortimer and Gerald, not Portia.
  assert.deepEqual(s().party, []);
  assert.deepEqual(s().dungeon.sites.slice(0, 3).map((site) => site.saveable), [false, true, true]);
  await s().recruit(ENCOUNTER.root_court);
  assert.match(s().error, /Gerald has not been won over yet/);
  await walkTo(s, 'root_court');
  assert.equal(s().encounter.character.saveable, true);
  await answerSite(s);

  await s().recruit(ENCOUNTER.root_court);
  assert.equal(s().error, null);
  assert.equal(s().party.length, 1);
  const [gerald] = s().party;
  has(gerald, ['characterId', 'name', 'encounterId', 'locationName', 'conversations', 'conversationId', 'conversationTier'], 'party member');
  assert.deepEqual([gerald.name, gerald.encounterId, gerald.conversations, gerald.conversationId], ['Gerald', ENCOUNTER.root_court, 0, 'gerald_coffee_break']);

  await s().talkTo(gerald);
  assert.equal(s().error, null);
  assert.equal(s().phase, 'party');
  assert.equal(s().partyReturn, 'site');
  assert.equal(s().encounter.partyConversation, true);
  assert.equal(s().encounter.dungeonId, undefined);
  assert.equal(s().encounter.character.name, 'Gerald');
  // Left for now, it is resumed by the next Talk.
  const conversation = s().encounter.id;
  s().leaveParty();
  assert.equal(s().phase, 'site');
  await s().talkTo(gerald);
  assert.equal(s().encounter.id, conversation);
  await answerSite(s);
  assert.equal(s().encounter.state, 'resolved');
  assert.deepEqual(s().party.map((member) => [member.name, member.conversations]), [['Gerald', 1]]);
  assert.deepEqual(s().progress.clearedSiteIds, ['face_gate', 'root_court'], 'a party conversation clears no site');
  s().leaveParty();
  assert.equal(s().phase, 'site');

  // A reload: the party comes back with the map, and the walk on is open as before.
  const reloaded = newStore(storage);
  await reloaded.s().initialize();
  reloaded.s().onCameraArrived();
  assert.equal(reloaded.s().phase, 'site');
  for (let i = 0; i < 50 && reloaded.s().party.length === 0; i += 1) await new Promise((resolve) => setTimeout(resolve, 10));
  assert.deepEqual(reloaded.s().party.map((member) => [member.name, member.conversations]), [['Gerald', 1]]);
  await walkTo(reloaded.s, 'sunlit_court');
});

test('a market conversation under way is replaced by the dungeon, the web client\'s only screen', async () => {
  const { s } = newStore();
  await s().initialize();
  const market = await api(runtime, '/api/encounter/start', { learnerId: s().learnerId, method: 'POST', body: { encounterId: ENCOUNTER.face_gate } });
  assert.equal(market.status, 200);
  assert.equal(market.data.encounter.dungeonId, undefined);
  await openSite(s);
  assert.equal(s().encounter.dungeonId, 'ta_prohm');
  assert.notEqual(s().encounter.id, market.data.encounter.id);
});

test('a send on a version another tab moved shows the stale message and keeps the answer', async () => {
  const { s } = newStore();
  await s().initialize();
  await openSite(s);
  const { encounter, learnerId } = s();
  const npc = encounter.transcript.findLast((message) => message.role !== 'player');
  const moved = await api(runtime, '/api/encounter/help', {
    learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, kind: 'sentence', messageId: npc.id },
  });
  assert.equal(moved.status, 200);
  // The sentence help the other tab paid for carries the translation the web line shows.
  assert.equal(typeof moved.data.encounter.transcript.find((message) => message.id === npc.id).dialogue.translation, 'string');
  await s().sendMessage('¡Hola!');
  assert.match(s().error, /changed in another tab/);
  assert.equal(s().draft, '¡Hola!');
  assert.equal(s().pendingInput, '¡Hola!');
});

test('without a token a protected server refuses the web client, which stays on the title and the maps', async () => {
  wrapper.token = false;
  try {
    const { s } = newStore();
    await s().initialize();
    assert.match(s().serverProblem, /refused the access token/);
    assert.equal(s().connection, 'offline');
    assert.equal(s().learnerId, null);
    s().enter();
    assert.equal(s().phase, 'world');
    s().enterPlace('ta_prohm');
    await s().start();
    assert.equal(s().phase, 'overview');
  } finally { wrapper.token = true; }
});

// Round 114: with the access token in its settings (the settings sheet), the web client reaches a token-protected
// server itself; the test's fetch wrapper adds nothing.
test('the web client sends the token from its settings', async () => {
  wrapper.token = false;
  try {
    const storage = memoryStorage();
    storage.setItem('parallang.settings', JSON.stringify({ serverUrl: '', token: runtime.token }));
    const { s } = newStore(storage);
    await s().initialize();
    assert.equal(s().serverProblem, null);
    await openSite(s);
    assert.equal(s().encounter.state, 'ongoing');
    await s().saveSettings({ serverUrl: '', token: 'wrong-token' });
    assert.match(s().serverProblem, /refused the access token/);
    assert.equal(s().encounter, null);
  } finally { wrapper.token = true; }
});
