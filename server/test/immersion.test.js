// Round 148: the share of target language in a character's lines, chosen by the player (the web client's slider).
// A start or an answer may carry `immersion`, from 0.1 to 1. It replaces the content's share for that conversation;
// at full immersion the narrator is told to speak the language only, and the line's translation comes with it, free.
// Without it nothing changes (the pinned prompts of encounters.test.js say so byte for byte).
import test from 'node:test';
import assert from 'node:assert/strict';
import { IMMERSION, immersionFrom } from '../src/language-engine.js';
import { answer, fullAnswer, roadRuntime, startHere } from './road-helpers.js';
import { api } from './helpers.js';

const narrations = (provider) => provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');
const systemOf = (call) => call.messages[0].content;
const active = (encounter) => encounter.transcript.filter((message) => message.role === 'npc').at(-1);
const FULL = /Dialogue is entirely in Italian: every word of every dialogue line/;
const MIXED = /Language mix: about (\d+)% of the words in each dialogue line are Italian/;

test('a share is a number from 0.1 to 1, kept to a hundredth; anything else is not one', () => {
  assert.equal(immersionFrom(undefined), null);
  assert.equal(immersionFrom(null), null);
  assert.equal(immersionFrom(1), 1);
  assert.equal(immersionFrom(0.1), 0.1);
  assert.equal(immersionFrom(0.6000000001), 0.6);
  for (const bad of [0, 0.05, 1.01, 100, '1', NaN, Infinity, true, {}]) assert.equal(immersionFrom(bad), undefined, String(bad));
  assert.ok(IMMERSION.full > 0.9 && IMMERSION.full <= 1);
});

test('without a share a road conversation is as before: the stage\'s mix, and the line\'s translation behind a hint', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  const started = await startHere(runtime, learnerId);
  assert.equal(started.status, 200);
  const system = systemOf(narrations(provider).at(-1));
  assert.match(system, MIXED);
  assert.doesNotMatch(system, FULL);
  assert.match(system, /Dialogue uses beginner Italian with enough English context\./);
  assert.equal(active(started.data.encounter).dialogue.translation, undefined);
  assert.equal(runtime.service.encounters.get(learnerId).immersion, undefined);
});

test('at full immersion the narrator speaks the language only, from the greeting on, and the translation comes with the line', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  const started = await startHere(runtime, learnerId, { immersion: 1 });
  assert.equal(started.status, 200);
  const greeting = systemOf(narrations(provider).at(-1));
  assert.match(greeting, FULL);
  assert.doesNotMatch(greeting, MIXED);
  assert.doesNotMatch(greeting, /enough English context|the English around them explains/);
  assert.match(greeting, /`dialogue\.translation` is the same line in English, sentence for sentence in the same order/);
  assert.match(greeting, /Keep it within a beginner's reach/);
  // The narration around the line stays English with a few words of the language (round 130's cap of 30 %).
  assert.match(greeting, /Narrative text is English prose with a few Italian words dropped in: about 30% of its words/);
  // The rest of the prompt is what it was: the conversation's rules and the learning data.
  assert.match(greeting, /Never say the phrase the player is meant to say as a model answer/); // round 177
  assert.match(greeting, /ACTIVE LEARNING DATA: \[/);

  // The translation of the line being answered is there without a hint spent.
  const line = active(started.data.encounter);
  assert.equal(typeof line.dialogue.translation, 'string');
  const session = runtime.service.encounters.get(learnerId);
  assert.equal(session.immersion, 1);
  assert.deepEqual(session.reveals, {});

  // The answer is marked in full (no help was taken), the reply is written at the same share, and its translation shows.
  const turn = await answer(runtime, learnerId, started.data.encounter, fullAnswer(runtime, learnerId), { immersion: 1 });
  assert.match(systemOf(narrations(provider).at(-1)), FULL);
  for (const result of turn.assessment.objectiveResults) for (const evidence of result.vocabularyEvidence) assert.equal(evidence.effectiveQuality, evidence.quality);
  assert.equal(turn.encounter.state, 'resolved');
});

test('a share below full keeps the mixed rules at that share, on every turn, and the translation stays behind a hint', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  const started = await startHere(runtime, learnerId, { immersion: 0.6 });
  const percent = (call) => Number(MIXED.exec(systemOf(call))[1]);
  assert.equal(percent(narrations(provider).at(-1)), 60);
  assert.match(systemOf(narrations(provider).at(-1)), /in a 20-word line, about 12 words/);
  assert.equal(active(started.data.encounter).dialogue.translation, undefined);
  // An answer that closes nothing: the conversation goes on, and the share does not climb with the turns.
  const turn = await answer(runtime, learnerId, started.data.encounter, 'Boh.', { immersion: 0.6 });
  assert.equal(turn.encounter.state, 'ongoing');
  assert.equal(percent(narrations(provider).at(-1)), 60);
  assert.equal(active(turn.encounter).dialogue.translation, undefined);
});

test('the slider may move during a conversation: the next reply follows it, and a conversation taken up again takes it', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  const started = await startHere(runtime, learnerId, { immersion: 0.3 });
  assert.equal(active(started.data.encounter).dialogue.translation, undefined);
  // Up to full with an answer: the reply is in the language only and comes with its translation.
  const turn = await answer(runtime, learnerId, started.data.encounter, 'Boh.', { immersion: 1 });
  assert.match(systemOf(narrations(provider).at(-1)), FULL);
  assert.equal(typeof active(turn.encounter).dialogue.translation, 'string');
  // The page is loaded again with the slider lower: the same conversation, no new greeting, the share taken.
  const before = narrations(provider).length;
  const again = await startHere(runtime, learnerId, { immersion: 0.5 });
  assert.equal(again.data.encounter.id, turn.encounter.id);
  assert.equal(narrations(provider).length, before);
  assert.equal(runtime.service.encounters.get(learnerId).immersion, 0.5);
  assert.equal(active(again.data.encounter).dialogue.translation, undefined);
  // An answer without a share leaves the conversation's share as it is.
  await answer(runtime, learnerId, again.data.encounter, 'Boh.');
  assert.match(systemOf(narrations(provider).at(-1)), /about 50% of the words/);
});

test('a share that is not one is refused, at a start and with an answer', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  for (const immersion of [0, 2, '1', 0.05]) {
    const refused = await startHere(runtime, learnerId, { immersion });
    assert.equal(refused.status, 400, JSON.stringify(immersion));
    assert.match(refused.data.error.message, /immersion must be a number from 0\.1 to 1/);
  }
  const started = await startHere(runtime, learnerId, { immersion: 1 });
  await assert.rejects(answer(runtime, learnerId, started.data.encounter, 'Ciao.', { immersion: 7 }), /immersion must be a number/);
});

test('the market\'s conversations take a share too, and without one their prompts are the pinned ones', async (t) => {
  const { runtime, provider, learnerId } = await roadRuntime(t);
  const plain = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} });
  assert.equal(plain.status, 200);
  assert.match(systemOf(narrations(provider).at(-1)), MIXED);
  const full = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { restart: true, immersion: 1 } });
  assert.equal(full.status, 200);
  assert.match(systemOf(narrations(provider).at(-1)), FULL);
  assert.equal(typeof active(full.data.encounter).dialogue.translation, 'string');
});
