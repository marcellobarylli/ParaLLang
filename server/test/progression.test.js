// Round 121: experience and levels. The level curve; what earns XP (an objective a turn closes, a conversation that
// resolves, a correct due review) and what does not (a held pass, a replayed attempt, a wrong, revealed or practice
// review); the level's addition to a conversation's target ratio; a save without experience.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { calculateTargetRatio, levelFor, levelStartsAt, progressionView, ratioBonusFor } from '../src/language-engine.js';
import { XP } from '../src/learning-service.js';
import { PassingProvider, api, createRuntime, passingAnswers } from './helpers.js';

async function levelRuntime(t, language = 'it', clock) {
  const content = loadGameContent({ language });
  const runtime = await createRuntime({ language, content, provider: new PassingProvider(content), ...(clock ? { clock } : {}) });
  t.after(runtime.close);
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  return { runtime, content, learnerId };
}
const start = (runtime, learnerId, body) => api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: body.dungeonId ? { client: 121, ...body } : body });
const say = (runtime, learnerId, encounter, message, attemptId = randomUUID()) => api(runtime, '/api/encounter/dialogue', {
  learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId, message },
});
const map = async (runtime, learnerId) => (await api(runtime, '/api/dungeons/ta_prohm/map?client=121', { learnerId })).data;
// Sets the learner's experience in the save, as if earned.
async function setXp(runtime, learnerId, xp) {
  const file = join(runtime.saveDir, `${learnerId}.json`);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  await writeFile(file, JSON.stringify({ ...saved, progression: { xp } }));
}

test('the level curve: levels 1 to 6 start at 0, 60, 140, 240, 360 and 500 XP', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(levelStartsAt), [0, 60, 140, 240, 360, 500]);
  assert.deepEqual([0, 59, 60, 139, 140, 239, 240, 359, 360, 499, 500, 100000].map(levelFor), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 98]);
  // Review R1.5: no loop over the levels, whatever the number; and nothing but a positive number has a level above 1.
  assert.deepEqual([-5, NaN, undefined, Infinity, 1e308].map(levelFor).slice(0, 3), [1, 1, 1]);
  assert.ok(levelFor(1e308) === levelFor(Number.MAX_SAFE_INTEGER) && levelFor(Infinity) === levelFor(1e308));
  for (let level = 1; level < 400; level += 1) { assert.equal(levelFor(levelStartsAt(level)), level); assert.equal(levelFor(levelStartsAt(level + 1) - 1), level); }
  assert.deepEqual(progressionView(0), { xp: 0, level: 1, levelStartsAt: 0, nextLevelAt: 60 });
  assert.deepEqual(progressionView(300), { xp: 300, level: 4, levelStartsAt: 240, nextLevelAt: 360 });
  assert.deepEqual([1, 2, 3, 5, 0].map(ratioBonusFor), [0, 0.03, 0.06, 0.12, 0]);
  assert.deepEqual(XP, { objective: 10, resolve: 25, review: 5 });
});

test('a turn earns 10 XP for each objective it closes and 25 for the resolve; a held pass and a replayed attempt earn nothing', async (t) => {
  const { runtime, content, learnerId } = await levelRuntime(t);
  const answers = passingAnswers(content, 'market_entrance_tutorial'); // Portia: three objectives, in order
  let encounter = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;

  // The second objective's answer first: a pass that is held closes nothing.
  const held = (await say(runtime, learnerId, encounter, answers[1])).data;
  assert.ok(held.assessment.objectiveResults.some((result) => result.held), 'the pass is held');
  assert.equal(held.xpGained, 0);
  assert.deepEqual(held.progression, { xp: 0, level: 1, levelStartsAt: 0, nextLevelAt: 60 });
  encounter = held.encounter;

  const attemptId = randomUUID();
  const first = (await say(runtime, learnerId, encounter, answers[0], attemptId)).data;
  assert.equal(first.xpGained, 10);
  assert.equal(first.progression.xp, 10);
  const second = (await say(runtime, learnerId, first.encounter, answers[1])).data;
  assert.deepEqual([second.xpGained, second.progression.xp], [10, 20]);
  // The first attempt sent again: the receipt, with what it earned then and the experience as it is now (critique 1.5).
  const replayed = (await say(runtime, learnerId, encounter, answers[0], attemptId)).data;
  assert.equal(replayed.replayed, true);
  assert.deepEqual([replayed.xpGained, replayed.progression.xp], [10, 20]);
  assert.equal((await map(runtime, learnerId)).progression.xp, 20, 'nothing was earned twice');

  const last = (await say(runtime, learnerId, second.encounter, answers[2])).data;
  assert.equal(last.encounter.state, 'resolved');
  assert.deepEqual([last.xpGained, last.progression], [35, { xp: 55, level: 1, levelStartsAt: 0, nextLevelAt: 60 }]);
  // The receipt in the save holds what the attempt earned, not the progression.
  const saved = await runtime.storage.load(learnerId);
  assert.deepEqual(saved.progression, { xp: 55 });
  const receipts = Object.values(saved.spellbook.processedAssessments).map((receipt) => receipt.response);
  assert.ok(receipts.every((response) => 'xpGained' in response && !('progression' in response)));
});

test('a correct review of a due card earns 5 XP; a wrong one, a revealed one and a practice one earn nothing', async (t) => {
  const time = { now: Date.parse('2026-01-15T12:00:00Z') };
  const { runtime, content, learnerId } = await levelRuntime(t, 'it', () => new Date(time.now));
  let encounter = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;
  let reply;
  for (const answer of passingAnswers(content, 'market_entrance_tutorial')) { reply = (await say(runtime, learnerId, encounter, answer)).data; encounter = reply.encounter; }
  assert.equal(reply.progression.xp, 55);
  const review = async (card, action, answer) => {
    const { data: { challenge } } = await api(runtime, '/api/spellbook/review', { learnerId, method: 'POST', body: { vocabularyId: card.vocabularyId } });
    return { practice: challenge.practice, ...(await api(runtime, '/api/spellbook/review/submit', { learnerId, method: 'POST', body: { challengeId: challenge.id, attemptId: randomUUID(), action, answer } })).data };
  };
  const meaning = (card) => content.vocabularyById.get(card.vocabularyId).accepted_translations[0];
  // The words the player used well are scheduled for later. Three days on they are due.
  time.now += 3 * 24 * 3600 * 1000;
  const due = (await api(runtime, '/api/spellbook', { learnerId })).data.cards.filter((card) => card.due);
  assert.ok(due.length >= 3, `the tutorial's words are due (${due.length})`);

  const wrong = await review(due[0], 'answer', 'definitely not this');
  assert.deepEqual([wrong.practice, wrong.result.correct, wrong.xpGained, wrong.progression.xp], [false, false, 0, 55]);
  const shown = await review(due[1], 'reveal', '');
  assert.deepEqual([shown.xpGained, shown.progression.xp], [0, 55]);
  const right = await review(due[2], 'answer', meaning(due[2]));
  assert.deepEqual([right.result.correct, right.result.scheduleChanged, right.xpGained], [true, true, 5]);
  assert.deepEqual(right.progression, { xp: 60, level: 2, levelStartsAt: 60, nextLevelAt: 140 });
  // The same card again is no longer due: it is practice, right, and worth nothing.
  const practice = await review(due[2], 'answer', meaning(due[2]));
  assert.deepEqual([practice.practice, practice.result.correct, practice.xpGained, practice.progression.xp], [true, true, 0, 60]);
  assert.equal((await map(runtime, learnerId)).progression.xp, 60);
});

test('a party conversation earns as a site does', async (t) => {
  const { runtime, content, learnerId } = await levelRuntime(t);
  for (const [siteId, encounterId] of [['face_gate', 'market_entrance_tutorial'], ['root_court', 'imp_coffee_greeting']]) {
    if (siteId !== 'face_gate') await api(runtime, '/api/dungeons/ta_prohm/move', { learnerId, method: 'POST', body: { siteId, client: 121 } });
    let encounter = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;
    for (const answer of passingAnswers(content, encounterId)) encounter = (await say(runtime, learnerId, encounter, answer)).data.encounter;
  }
  assert.equal((await map(runtime, learnerId)).progression.xp, 100);
  await api(runtime, '/api/party/recruit', { learnerId, method: 'POST', body: { encounterId: 'imp_coffee_greeting' } });
  let talk = (await start(runtime, learnerId, { encounterId: 'gerald_coffee_break' })).data.encounter;
  // Review R1.1: at level 2 a party member's conversation still speaks at the content's ratio.
  const gerald = content.encounters.get('gerald_coffee_break');
  assert.equal(talk.difficulty, calculateTargetRatio(gerald.character.language_profile.base_target_ratio, gerald.encounter.escalation.target_ratio_increase_per_turn, 0));
  let reply;
  const objectives = content.encounters.get('gerald_coffee_break').encounter.objectives.length;
  for (const answer of passingAnswers(content, 'gerald_coffee_break')) { reply = (await say(runtime, learnerId, talk, answer)).data; talk = reply.encounter; }
  assert.equal(talk.state, 'resolved');
  assert.equal(reply.progression.xp, 100 + 10 * objectives + 25);
});

test('a level adds 0.03 to a conversation\'s target ratio, taken at its start and kept to its end', async (t) => {
  const { runtime, content, learnerId } = await levelRuntime(t);
  const portia = content.encounters.get('market_entrance_tutorial');
  const [base, step] = [portia.character.language_profile.base_target_ratio, portia.encounter.escalation.target_ratio_increase_per_turn];
  // Level 1: the ratio is the content's.
  const plain = (await start(runtime, learnerId, { dungeonId: 'ta_prohm' })).data.encounter;
  assert.equal(plain.difficulty, base);

  // Level 3 (140 XP): 0.06 more, in the greeting's prompt and on the sheet.
  await setXp(runtime, learnerId, 140);
  const calls = runtime.provider.calls.length;
  const raised = (await start(runtime, learnerId, { dungeonId: 'ta_prohm', restart: true })).data.encounter;
  assert.equal(raised.difficulty, calculateTargetRatio(base + 0.06, step, 0));
  assert.match(runtime.provider.calls[calls].messages.map((message) => message.content).join('\n'), new RegExp(`${Math.round((base + 0.06) * 100)}%`));
  const turn = (await say(runtime, learnerId, raised, passingAnswers(content, 'market_entrance_tutorial')[0])).data;
  assert.equal(turn.encounter.difficulty, calculateTargetRatio(base + 0.06, step, 1));
  // Review R1.6: the reply to that turn was asked for at the raised ratio too, not only shown at it.
  const prompt = () => runtime.provider.calls.at(-1).messages.map((message) => message.content).join('\n');
  const percent = (ratio) => new RegExp(`\\b${Math.round(ratio * 100)}%`);
  assert.match(prompt(), percent(calculateTargetRatio(base + 0.06, step, 1)));
  assert.doesNotMatch(prompt(), percent(calculateTargetRatio(base, step, 1)));
  // Review R1.1: the level raises a dungeon site's conversation only. The same encounter started on the market's map
  // (the iPhone app) keeps the content's ratio, in its prompt and on its sheet.
  const market = (await start(runtime, learnerId, { encounterId: 'market_entrance_tutorial', restart: true })).data.encounter;
  assert.equal(market.dungeonId, undefined);
  assert.equal(market.difficulty, base);
  assert.match(prompt(), percent(base));

  // A conversation started at level 1 that crosses into level 2 keeps its ratio.
  await setXp(runtime, learnerId, 55);
  let crossing = (await start(runtime, learnerId, { dungeonId: 'ta_prohm', restart: true })).data.encounter;
  assert.equal(crossing.difficulty, base);
  const crossed = (await say(runtime, learnerId, crossing, passingAnswers(content, 'market_entrance_tutorial')[0])).data;
  assert.deepEqual([crossed.progression.xp, crossed.progression.level], [65, 2]);
  assert.equal(crossed.encounter.difficulty, calculateTargetRatio(base, step, 1));
  assert.match(prompt(), percent(calculateTargetRatio(base, step, 1)));
  // The next conversation starts at level 2.
  crossing = (await start(runtime, learnerId, { dungeonId: 'ta_prohm', restart: true })).data.encounter;
  assert.equal(crossing.difficulty, calculateTargetRatio(base + 0.03, step, 0));
  // The cap is the existing one: at a very high level the ratio is 1, not more.
  await setXp(runtime, learnerId, 100000);
  assert.equal((await start(runtime, learnerId, { dungeonId: 'ta_prohm', restart: true })).data.encounter.difficulty, 1);
});

test('a save without experience, or with anything but a whole number of XP, has none', async (t) => {
  const { runtime, learnerId } = await levelRuntime(t);
  const file = join(runtime.saveDir, `${learnerId}.json`);
  const saved = JSON.parse(await readFile(file, 'utf8'));
  assert.deepEqual(saved.progression, { xp: 0 });
  for (const progression of [undefined, null, { xp: -5 }, { xp: 1.5 }, { xp: '40' }, 'lots', { level: 9 }, { xp: 1e308 }]) {
    const { progression: _gone, ...rest } = saved;
    await writeFile(file, JSON.stringify(progression === undefined ? rest : { ...rest, progression }));
    assert.deepEqual((await runtime.storage.load(learnerId)).progression, { xp: 0 }, JSON.stringify(progression));
    assert.equal((await map(runtime, learnerId)).progression.level, 1);
  }
  await writeFile(file, JSON.stringify({ ...saved, progression: { xp: 240, level: 99 } }));
  assert.deepEqual((await runtime.storage.load(learnerId)).progression, { xp: 240 }, 'the level is derived, never read');
  assert.equal((await map(runtime, learnerId)).progression.level, 4);
});
