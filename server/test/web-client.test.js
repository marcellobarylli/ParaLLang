// Round 103: the web client (client/) played against today's server: its own store and API module, unmodified,
// through an in-process server with a fixture provider. The fields its components read are asserted, so a server
// rename shows up here. zustand (and the react it imports) resolve from the root node_modules.
// Round 115: the web client plays the Ta Prohm dungeon, so this test plays the run's three sites to the victory
// state, with the dungeon built from the content file as the client bundles it.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { PassingProvider, api, createRuntime, passingAnswers } from './helpers.js';
import { createGameStore } from '../../client/src/stores/gameStore.js';
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
const SITES = ['market_entrance_tutorial', 'imp_coffee_greeting', 'high_gate_bambieshart'];

function newStore(storage = memoryStorage()) {
  const store = createGameStore({ storage, dungeon });
  return { store, storage, s: () => store.getState() };
}

// From the title screen to the open dialogue of the run's next site.
async function openNextSite(s) {
  if (s().phase === 'attract') s().enter();
  if (s().phase === 'overview') await s().start();
  assert.equal(s().siteError, null);
  s().onCameraArrived();
  assert.equal(s().phase, 'encounter');
}

async function answerSite(s) {
  for (const message of passingAnswers(runtime.content, s().encounter.encounterId)) {
    assert.equal(s().encounter.state, 'ongoing');
    await s().sendMessage(message);
    assert.equal(s().error, null);
  }
  assert.equal(s().encounter.state, 'resolved');
}

test('the web client plays the dungeon: three sites, a help, the Spellbook, reviews, a new run and a reload', async () => {
  const { storage, s } = newStore();
  await s().initialize();
  assert.equal(s().serverProblem, null);
  assert.equal(s().connection, 'ready');
  assert.equal(s().phase, 'attract');
  has(s().language, ['tag', 'name'], 'language');
  has(s().progress, ['run', 'clearedEncounterIds', 'nextSiteIndex', 'nextEncounterId', 'complete'], 'progress');
  assert.deepEqual(s().dungeon.sites.map((site) => [site.encounterId, site.characterName]), [[SITES[0], 'Portia'], [SITES[1], 'Gerald'], [SITES[2], 'Bambieshart']]);
  // The bundled file and the server's copy agree on where the sites stand.
  const served = (await api(runtime, '/api/dungeons/ta_prohm', { learnerId: s().learnerId })).data.dungeon;
  assert.deepEqual(served.sites.map((site) => site.at), dungeon.sites.map((site) => site.at));
  assert.deepEqual(served.route, dungeon.route);

  await openNextSite(s);
  const encounter = s().encounter;
  assert.equal(encounter.encounterId, SITES[0]);
  assert.equal(encounter.dungeonId, 'ta_prohm');
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

  await answerSite(s);
  has(s().assessment, ['overallFeedback', 'objectiveResults'], 'assessment');
  for (const result of s().assessment.objectiveResults) has(result, ['objectiveId', 'passed', 'feedback'], 'objectiveResult');
  assert.equal(typeof s().encounter.resolvedMessage, 'string');
  assert.ok(s().encounter.transcript.some((message) => message.role === 'player'));
  assert.deepEqual(s().progress.clearedEncounterIds, [SITES[0]]);

  await s().walkOn();
  assert.equal(s().phase, 'walk');
  assert.deepEqual([s().walkFrom, s().siteIndex], [0, 1]);
  await openNextSite(s);
  assert.equal(s().encounter.encounterId, SITES[1]);
  assert.equal(s().encounter.character.name, 'Gerald');
  assert.equal(s().encounter.companionBriefing, null);
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
  await s().walkOn();
  await openNextSite(s);
  assert.equal(s().encounter.encounterId, SITES[2]);
  await answerSite(s);
  assert.equal(s().progress.complete, true);
  await s().walkOn();
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

  // A reload of the page on a finished run: the stored learner is recovered, on the victory screen.
  const reloaded = newStore(storage);
  await reloaded.s().initialize();
  assert.equal(reloaded.s().learnerId, s().learnerId);
  assert.equal(reloaded.s().phase, 'victory');

  // A new run starts at the first site again, with a new conversation.
  await s().playAgain();
  assert.equal(s().error, null);
  assert.equal(s().phase, 'overview');
  assert.deepEqual(s().progress.clearedEncounterIds, []);
  assert.equal(s().progress.run, 2);
  await openNextSite(s);
  assert.equal(s().encounter.encounterId, SITES[0]);
  assert.equal(s().encounter.committedPlayerTurns, 0);
  assert.notEqual(s().encounter.id, encounter.id);
});

test('a reload in the middle of a run resumes the conversation under way at the next site', async () => {
  const { storage, s } = newStore();
  await s().initialize();
  await openNextSite(s);
  await answerSite(s);
  await s().walkOn();
  await openNextSite(s);
  const [answer] = passingAnswers(runtime.content, SITES[1]);
  const conversation = s().encounter.id;

  const again = newStore(storage);
  await again.s().initialize();
  assert.equal(again.s().learnerId, s().learnerId);
  assert.equal(again.s().phase, 'approach');
  assert.equal(again.s().siteIndex, 1);
  assert.equal(again.s().encounter.id, conversation, 'resumed, not replaced');
  again.s().onCameraArrived();
  assert.equal(again.s().phase, 'encounter');
  await again.s().sendMessage(answer);
  assert.equal(again.s().error, null);
});

test('a market conversation under way is replaced by the dungeon, the web client\'s only screen', async () => {
  const { s } = newStore();
  await s().initialize();
  const market = await api(runtime, '/api/encounter/start', { learnerId: s().learnerId, method: 'POST', body: { encounterId: SITES[0] } });
  assert.equal(market.status, 200);
  assert.equal(market.data.encounter.dungeonId, undefined);
  await openNextSite(s);
  assert.equal(s().encounter.dungeonId, 'ta_prohm');
  assert.notEqual(s().encounter.id, market.data.encounter.id);
});

test('a send on a version another tab moved shows the stale message and keeps the answer', async () => {
  const { s } = newStore();
  await s().initialize();
  await openNextSite(s);
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

test('without a token a protected server refuses the web client, which stays on the title and the route', async () => {
  wrapper.token = false;
  try {
    const { s } = newStore();
    await s().initialize();
    assert.match(s().serverProblem, /refused the access token/);
    assert.equal(s().connection, 'offline');
    assert.equal(s().learnerId, null);
    s().enter();
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
    await openNextSite(s);
    assert.equal(s().encounter.state, 'ongoing');
    await s().saveSettings({ serverUrl: '', token: 'wrong-token' });
    assert.match(s().serverProblem, /refused the access token/);
    assert.equal(s().encounter, null);
  } finally { wrapper.token = true; }
});
