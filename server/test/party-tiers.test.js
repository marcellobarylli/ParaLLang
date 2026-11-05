// Round 047 (backlog G4): relationship tiers. A party conversation with `after_conversations` is offered instead of
// the first one once the member has finished that many conversations; Gerald's confidence at 3 is the first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { FixtureProvider, api, createRuntime, makeTempDir } from './helpers.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');

// Grades both of Gerald's party conversations (es) by keyword; everything else goes to the shared fixture.
const RULES = {
  praise_coffee: [/buen[ií]simo|bueno|buen|delicioso/i, 'bueno'],
  thank_gerald: [/muchas gracias|gracias/i, 'gracias'],
  call_friend: [/amigos?|amiga/i, 'amigo'],
  raise_toast: [/salud/i, 'salud'],
  // Round 048 (backlog G6): the other members' deeper tiers (es).
  calm_him: [/tranquilo/i, 'tranquilo'],
  promise: [/prometo/i, 'prometo'],
  wake_up: [/despi[eé]rta(te)?/i, 'despierta'],
  courage: [/[aá]nimo/i, 'animo'],
  here_i_am: [/aqu[ií] estoy/i, 'aqui_estoy'],
  not_alone: [/no est[aá]s sola/i, 'sola'],
};
class GeraldProvider extends FixtureProvider {
  grade(messages) {
    const objectives = Object.keys(RULES).filter((id) => messages[0].content.includes(`"${id}"`));
    if (objectives.length === 0) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    return {
      objective_results: objectives.map((id) => {
        const match = answer.match(RULES[id][0]);
        return { objective_id: id, passed: Boolean(match), feedback: match ? 'ok' : 'not yet', vocabulary_evidence: match ? [{ vocabulary_id: RULES[id][1], evidence: match[0], quality: 5 }] : [] };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

const start = (runtime, learnerId, encounterId) => api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId } });
const say = async (runtime, learnerId, encounter, message) => {
  const turn = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message } });
  assert.equal(turn.status, 200, JSON.stringify(turn.data));
  return turn.data;
};
const gerald = async (runtime, learnerId) => (await api(runtime, '/api/party', { learnerId })).data.party[0];

// Gerald in the party with `conversations` finished, written into the save as the round 033 tests do.
async function withGerald(t, conversations, content) {
  const runtime = await createRuntime({ provider: new GeraldProvider(), content });
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['imp_coffee_greeting'] };
  envelope.party = [{ characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z', conversations }];
  await runtime.storage.save(envelope);
  return { runtime, learnerId };
}

test('Talk offers the coffee break until three conversations, then Gerald\'s confidence, which repeats and counts', async (t) => {
  for (const count of [0, 2]) {
    const { runtime, learnerId } = await withGerald(t, count);
    const member = await gerald(runtime, learnerId);
    assert.deepEqual([member.conversationId, member.conversationTier], ['gerald_coffee_break', 0], `count ${count}`);
    const refused = await start(runtime, learnerId, 'gerald_confidence');
    assert.equal(refused.status, 409, `count ${count}`);
    assert.equal(refused.data.error.code, 'NOT_YET');
    assert.match(refused.data.error.message, /Gerald is not ready for that conversation yet/);
  }
  const { runtime, learnerId } = await withGerald(t, 3);
  assert.deepEqual([(await gerald(runtime, learnerId)).conversationId, (await gerald(runtime, learnerId)).conversationTier], ['gerald_confidence', 3]);
  const encounter = (await start(runtime, learnerId, 'gerald_confidence')).data.encounter;
  assert.equal(encounter.currentObjective.id, 'call_friend');
  const failed = await say(runtime, learnerId, encounter, 'You are my friend, Gerald.');
  assert.equal(failed.encounter.state, 'ongoing');
  const half = await say(runtime, learnerId, failed.encounter, 'Eres mi amigo, Gerald.');
  assert.equal(half.encounter.currentObjective.id, 'raise_toast');
  const done = await say(runtime, learnerId, half.encounter, '¡Salud!');
  assert.equal(done.encounter.state, 'resolved');
  const after = await gerald(runtime, learnerId);
  assert.deepEqual([after.conversations, after.conversationId, after.conversationTier], [4, 'gerald_confidence', 3], 'counts one and repeats');
  const saved = await runtime.storage.load(learnerId);
  assert.ok(!saved.world.completedEncounterIds.includes('gerald_confidence'), 'off the map');
  // The Dead Branch fragment is still filed under the first tier.
  const spellbook = (await api(runtime, '/api/spellbook', { learnerId })).data;
  assert.deepEqual((spellbook.journeyFragments ?? spellbook.spellbook?.journeyFragments).map((f) => [f.id, f.encounterId]), [['journey_dead_branch', 'gerald_coffee_break']]);
});

test('an earlier tier started over the API at count 3 is what Talk offers while it is under way (critique 1.1)', async (t) => {
  const { runtime, learnerId } = await withGerald(t, 3);
  const encounter = (await start(runtime, learnerId, 'gerald_coffee_break')).data.encounter;
  assert.deepEqual([(await gerald(runtime, learnerId)).conversationId, (await gerald(runtime, learnerId)).conversationTier], ['gerald_coffee_break', 0]);
  const done = await say(runtime, learnerId, encounter, '¡Un buen café, gracias!');
  assert.equal(done.encounter.state, 'resolved');
  const member = await gerald(runtime, learnerId);
  assert.deepEqual([member.conversations, member.conversationId], [4, 'gerald_confidence'], 'any tier counts; once resolved, the deepest is offered');
});

test('a member met elsewhere neither unlocks nor counts another home\'s tiers (critique 1.3)', async (t) => {
  const { runtime, learnerId } = await withGerald(t, 3);
  const envelope = await runtime.storage.load(learnerId);
  envelope.party = [{ ...envelope.party[0], encounterId: 'butchers_stall_charcutier' }];
  await runtime.storage.save(envelope);
  const refused = await start(runtime, learnerId, 'gerald_confidence');
  assert.equal(refused.status, 409);
  assert.equal(refused.data.error.code, 'NOT_IN_PARTY');
});

test('the deepest unlocked tier wins whatever the file order', async (t) => {
  const dir = await makeTempDir('parallang-tiers-');
  await cp(contentRoot, dir, { recursive: true });
  const source = yaml.load(await readFile(join(dir, 'languages/es/encounters/gerald_confidence.yaml'), 'utf8'));
  // "a_" sorts before every shipped file, so the deeper tier is loaded first.
  await writeFile(join(dir, 'languages/es/encounters/a_gerald_late.yaml'), yaml.dump({ ...source, id: 'a_gerald_late', after_conversations: 5 }));
  const content = loadGameContent({ contentDir: dir, language: 'es' });
  assert.equal([...content.encounters.keys()].indexOf('a_gerald_late') < [...content.encounters.keys()].indexOf('gerald_confidence'), true);
  for (const [count, expected] of [[2, 'gerald_coffee_break'], [4, 'gerald_confidence'], [6, 'a_gerald_late']]) {
    const { runtime, learnerId } = await withGerald(t, count, content);
    assert.equal((await gerald(runtime, learnerId)).conversationId, expected, `count ${count}`);
  }
});

// Round 048 (backlog G6): every other saveable member offers a deeper tier at 3, which resolves and counts like
// Gerald's.
const MEMBERS = [
  ['charcutier_mortimer_001', 'butchers_stall_charcutier', 'mortimer_tasting', 'mortimer_oath', ['Estate tranquilo, Mortimer.', 'Te lo prometo.']],
  ['letharger_flick_001', 'cracked_fountain_letharger', 'flick_slow_walk', 'flick_lotus', ['¡Despiértate, Flick!', '¡Ánimo!']],
  ['bookworm_marginalia_001', 'old_bookshop_bookworm', 'marginalia_fragment', 'marginalia_folded_page', ['¡Aqui estoy!', 'No estás sola.']],
];
async function withMember(t, characterId, home, conversations) {
  const runtime = await createRuntime({ provider: new GeraldProvider() });
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: [home] };
  envelope.party = [{ characterId, encounterId: home, joinedAt: '2026-01-15T12:00:00.000Z', conversations }];
  await runtime.storage.save(envelope);
  return { runtime, learnerId };
}

for (const [characterId, home, first, deeper, lines] of MEMBERS) {
  test(`${deeper}: offered at 3 conversations, refused before, resolves and counts`, async (t) => {
    const early = await withMember(t, characterId, home, 2);
    assert.deepEqual([(await gerald(early.runtime, early.learnerId)).conversationId, (await gerald(early.runtime, early.learnerId)).conversationTier], [first, 0], 'count 2');
    const refused = await start(early.runtime, early.learnerId, deeper);
    assert.deepEqual([refused.status, refused.data.error.code], [409, 'NOT_YET']);
    const { runtime, learnerId } = await withMember(t, characterId, home, 3);
    const member = await gerald(runtime, learnerId);
    assert.deepEqual([member.conversationId, member.conversationTier], [deeper, 3], 'count 3');
    const encounter = (await start(runtime, learnerId, deeper)).data.encounter;
    const failed = await say(runtime, learnerId, encounter, 'Hello, old friend.');
    assert.equal(failed.encounter.state, 'ongoing');
    const half = await say(runtime, learnerId, failed.encounter, lines[0]);
    assert.equal(half.encounter.state, 'ongoing');
    const done = await say(runtime, learnerId, half.encounter, lines[1]);
    assert.equal(done.encounter.state, 'resolved');
    const after = await gerald(runtime, learnerId);
    assert.deepEqual([after.conversations, after.conversationId], [4, deeper], 'counts one and repeats');
  });
}
