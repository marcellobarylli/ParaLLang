// Round 103: the frozen web client (client/, round 004) played against today's server: its own store and API module,
// unmodified, through an in-process server with the fixture provider. The fields its components read are asserted,
// so a server rename shows up here. zustand (and the react it imports) resolve from the root node_modules.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, createRuntime } from './helpers.js';
import { createGameStore } from '../../client/src/stores/gameStore.js';

let runtime;
const realFetch = globalThis.fetch;
// The browser reaches the server through Vite's /api proxy; here the wrapper prefixes the base URL. The web client
// sends no token, so the wrapper adds it (the sandbox allows only token-protected servers; see the 401 test).
const wrapper = { token: true };
before(async () => {
  runtime = await createRuntime();
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

test('the web client plays an encounter, a help, the Spellbook, reviews, a restart and a recovery', async () => {
  const storage = memoryStorage();
  const store = createGameStore({ storage });
  const s = () => store.getState();
  await s().initialize();
  assert.equal(s().error, null);
  has(s().language, ['tag', 'name'], 'language');
  const encounter = s().encounter;
  assert.equal(encounter.encounterId, 'imp_coffee_greeting');
  assert.equal(encounter.state, 'ongoing');
  has(encounter, ['id', 'version', 'difficulty', 'hints', 'hints_available', 'transcript', 'currentObjective'], 'encounter');
  has(encounter.currentObjective, ['prompt'], 'currentObjective');
  has(encounter.hints, ['remaining', 'limit', 'used'], 'hints');
  const npc = encounter.transcript.findLast((message) => message.role !== 'player');
  has(npc, ['id', 'protected', 'narrative', 'dialogue'], 'npc line');
  // A protected line's translation and word meanings come only with a help (round 001).
  has(npc.dialogue, ['native', 'words'], 'dialogue');
  assert.equal(npc.dialogue.translation, undefined);
  assert.ok(npc.dialogue.words.length > 0);
  for (const word of npc.dialogue.words) has(word, ['vocabularyId', 'canonicalTarget'], 'word');

  // Reviews wait while the encounter is under way (round 017).
  await s().startReview(null);
  assert.match(s().error, /Reviews wait until the encounter is over/);
  assert.equal(s().reviewChallenge, null);
  assert.equal(s().spellbook.inEncounter, true);

  await s().revealHelp({ kind: 'word', messageId: npc.id, vocabularyId: npc.dialogue.words[0].vocabularyId });
  assert.equal(s().error, null);
  assert.equal(s().encounter.hints.used, 1);
  assert.equal(s().encounter.hints.remaining, s().encounter.hints.limit - 1);
  const helped = s().encounter.transcript.find((message) => message.id === npc.id).dialogue.words[0];
  has(helped, ['meaning', 'partOfSpeech'], 'helped word');

  await s().sendMessage('Quiero un café negro.');
  assert.equal(s().error, null);
  assert.equal(s().encounter.state, 'resolved');
  has(s().assessment, ['overallFeedback', 'objectiveResults'], 'assessment');
  for (const result of s().assessment.objectiveResults) has(result, ['objectiveId', 'passed', 'feedback'], 'objectiveResult');
  const player = s().encounter.transcript.find((message) => message.role === 'player');
  assert.equal(player.text, 'Quiero un café negro.');

  s().openSpellbook();
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
  const resolvedId = s().encounter.id;
  await s().restartEncounter();
  assert.equal(s().error, null);
  assert.equal(s().encounter.state, 'ongoing');
  assert.notEqual(s().encounter.id, resolvedId);

  // A reload of the page: the stored learner is recovered and the conversation under way resumed, not replaced.
  const again = createGameStore({ storage });
  await again.getState().initialize();
  assert.equal(again.getState().error, null);
  assert.equal(again.getState().learnerId, s().learnerId);
  assert.equal(again.getState().encounter.id, s().encounter.id);
});

test('a send on a version another tab moved shows the stale message and keeps the answer', async () => {
  const store = createGameStore({ storage: memoryStorage() });
  const s = () => store.getState();
  await s().initialize();
  const { encounter, learnerId } = s();
  const npc = encounter.transcript.findLast((message) => message.role !== 'player');
  const moved = await api(runtime, '/api/encounter/help', {
    learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, kind: 'sentence', messageId: npc.id },
  });
  assert.equal(moved.status, 200);
  // The sentence help the other tab paid for carries the translation the web line shows.
  assert.equal(typeof moved.data.encounter.transcript.find((message) => message.id === npc.id).dialogue.translation, 'string');
  await s().sendMessage('Quiero un café.');
  assert.match(s().error, /changed in another tab/);
  assert.equal(s().draft, 'Quiero un café.');
  assert.equal(s().pendingInput, 'Quiero un café.');
});

test('the web client sends no token: a token-protected server refuses it (open item)', async () => {
  wrapper.token = false;
  try {
    const store = createGameStore({ storage: memoryStorage() });
    await store.getState().initialize();
    assert.ok(store.getState().error);
    assert.equal(store.getState().learnerId, null);
  } finally { wrapper.token = true; }
});

// Round 114: with the access token in its settings (the settings sheet), the web client reaches a token-protected
// server itself; the test's fetch wrapper adds nothing.
test('the web client sends the token from its settings', async () => {
  wrapper.token = false;
  try {
    const storage = memoryStorage();
    storage.setItem('parallang.settings', JSON.stringify({ serverUrl: '', token: runtime.token }));
    const store = createGameStore({ storage });
    await store.getState().initialize();
    assert.equal(store.getState().error, null);
    assert.equal(store.getState().encounter.state, 'ongoing');
    await store.getState().saveSettings({ serverUrl: '', token: 'wrong-token' });
    assert.match(store.getState().error, /refused the access token/);
  } finally { wrapper.token = true; }
});
