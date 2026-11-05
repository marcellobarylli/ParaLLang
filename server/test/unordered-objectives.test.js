// Round 045 (backlog G3): objectives met in any order (`objectives_unordered`), tested on a copy of Gerald's coffee
// break (praise, then thanks) with the flag set; the real coffee break stays ordered.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { FixtureProvider, api, createRuntime, makeTempDir } from './helpers.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');

class CoffeeBreakProvider extends FixtureProvider {
  grade(messages) {
    if (!messages[0].content.includes('"praise_coffee"') && !messages[0].content.includes('"thank_gerald"')) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const objectives = ['praise_coffee', 'thank_gerald'].filter((id) => messages[0].content.includes(`"${id}"`));
    const praise = answer.match(/buen[ií]simo|bueno|buen|delicioso/i);
    const thanks = answer.match(/muchas gracias|gracias/i);
    return {
      objective_results: objectives.map((id) => {
        const match = id === 'praise_coffee' ? praise : thanks;
        const vocabularyId = id === 'thank_gerald' ? 'gracias' : /delicioso/i.test(match?.[0] ?? '') ? 'delicioso' : 'bueno';
        return { objective_id: id, passed: Boolean(match), feedback: match ? 'ok' : 'not yet', vocabulary_evidence: match ? [{ vocabulary_id: vocabularyId, evidence: match[0], quality: 5 }] : [] };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

async function contentWith(unordered) {
  const dir = await makeTempDir('parallang-unordered-');
  await cp(contentRoot, dir, { recursive: true });
  const file = join(dir, 'languages/es/encounters/gerald_coffee_break.yaml');
  const data = yaml.load(await readFile(file, 'utf8'));
  if (unordered === undefined) delete data.objectives_unordered; else data.objectives_unordered = unordered;
  await writeFile(file, yaml.dump(data));
  return loadGameContent({ contentDir: dir, language: 'es' });
}

const say = async (runtime, learnerId, encounter, message) => {
  const turn = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message } });
  assert.equal(turn.status, 200, JSON.stringify(turn.data));
  return turn.data;
};

async function coffeeBreak(t, content) {
  const runtime = await createRuntime({ provider: new CoffeeBreakProvider(), content });
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'coffee_cart' } });
  const first = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'imp_coffee_greeting' } })).data.encounter;
  assert.equal((await say(runtime, learnerId, first, 'Quiero un café negro.')).encounter.state, 'resolved');
  await api(runtime, '/api/party/recruit', { learnerId, method: 'POST', body: { encounterId: 'imp_coffee_greeting' } });
  const encounter = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'gerald_coffee_break' } })).data.encounter;
  const narrations = () => runtime.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');
  return { runtime, learnerId, encounter, narrations };
}

test('the loader takes objectives_unordered as a boolean; the shipped packs set it only on Mortimer\'s tasting', async () => {
  assert.equal((await contentWith(true)).encounters.get('gerald_coffee_break').encounter.objectives_unordered, true);
  await assert.rejects(contentWith('yes'), /objectives_unordered/);
  for (const language of ['it', 'es']) {
    const flagged = [...loadGameContent({ language }).encounters.values()].filter(({ encounter }) => encounter.objectives_unordered).map(({ encounter }) => encounter.id);
    assert.deepEqual(flagged, ['mortimer_tasting'], language);
  }
});

test('unordered: thanks first closes thanks, the current objective stays praise, and praise then resolves', async (t) => {
  const { runtime, learnerId, encounter, narrations } = await coffeeBreak(t, await contentWith(true));
  assert.equal(encounter.currentObjective.id, 'praise_coffee');
  let turn = await say(runtime, learnerId, encounter, '¡Gracias!');
  assert.deepEqual(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed]), [['praise_coffee', false], ['thank_gerald', true]]);
  assert.ok(turn.assessment.objectiveResults.every((r) => !('held' in r)), 'round 051: unordered encounters never hold');
  assert.doesNotMatch(JSON.stringify(narrations().at(-1).messages), /held_note/);
  assert.equal(turn.encounter.state, 'ongoing');
  assert.equal(turn.encounter.currentObjective.id, 'praise_coffee');
  const prompt = JSON.stringify(narrations().at(-1).messages);
  assert.match(prompt, /praise_coffee|has brewed/);
  assert.doesNotMatch(prompt, /"thank_gerald"/, 'the closed objective leaves the narration prompt');
  // The next grading sees only the open objective.
  turn = await say(runtime, learnerId, turn.encounter, 'Nada.');
  assert.deepEqual(turn.assessment.objectiveResults.map((r) => r.objectiveId), ['praise_coffee']);
  assert.equal(turn.encounter.state, 'ongoing', 'a failed turn changes nothing');
  turn = await say(runtime, learnerId, turn.encounter, '¡Está buenísimo!');
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.encounter.currentObjective, null);
  assert.equal((await api(runtime, '/api/party', { learnerId })).data.party[0].conversations, 1);
});

test('unordered: both in one line resolve at once; ordered (the shipped flag absent): thanks first closes nothing', async (t) => {
  const both = await coffeeBreak(t, await contentWith(true));
  assert.equal((await say(both.runtime, both.learnerId, both.encounter, '¡Buenísimo, gracias!')).encounter.state, 'resolved');
  const ordered = await coffeeBreak(t, await contentWith(undefined));
  const turn = await say(ordered.runtime, ordered.learnerId, ordered.encounter, '¡Gracias!');
  assert.equal(turn.encounter.currentObjective.id, 'praise_coffee');
  // Round 051: in order, the early thanks is held (passed, not closed).
  assert.deepEqual(turn.assessment.objectiveResults.map((r) => [r.objectiveId, r.passed, r.held ?? false]), [['praise_coffee', false, false], ['thank_gerald', true, true]]);
  const next = await say(ordered.runtime, ordered.learnerId, turn.encounter, '¡Está buenísimo!');
  assert.equal(next.encounter.state, 'ongoing', 'in order, the earlier thanks did not count');
  assert.equal(next.encounter.currentObjective.id, 'thank_gerald');
});

test('unordered: a replayed attempt returns the stored response and changes nothing (critique 1.8); help caps every open objective (critique 1.5)', async (t) => {
  const { runtime, learnerId, encounter, narrations } = await coffeeBreak(t, await contentWith(true));
  const attemptId = randomUUID();
  const body = { encounterId: encounter.id, version: encounter.version, attemptId, message: '¡Gracias!' };
  const first = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body });
  const calls = runtime.provider.calls.length;
  const again = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body });
  assert.equal(again.data.replayed, true);
  assert.deepEqual(again.data.encounter, first.data.encounter);
  assert.equal(runtime.provider.calls.length, calls, 'no provider call for a replay');
  const changed = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { ...body, message: 'Otra cosa.' } });
  assert.equal(changed.status, 409);
  assert.equal(narrations().length >= 2, true);

  // Help on the current objective (praise), then the open thanks and praise in one line: both qualities capped.
  const help = await coffeeBreak(t, await contentWith(true));
  const message = help.encounter.transcript.at(-1);
  const revealed = await api(help.runtime, '/api/encounter/help', { learnerId: help.learnerId, method: 'POST', body: { encounterId: help.encounter.id, version: help.encounter.version, messageId: message.id, kind: 'sentence' } });
  assert.equal(revealed.status, 200, JSON.stringify(revealed.data));
  await say(help.runtime, help.learnerId, revealed.data.encounter, '¡Buenísimo, gracias!');
  const saved = await help.runtime.storage.load(help.learnerId);
  const evidence = [...Object.values(saved.spellbook.words), ...Object.values(saved.spellbook.phrases)].flatMap((item) => item.evidence ?? []).filter((e) => ['praise_coffee', 'thank_gerald'].includes(e.objectiveId));
  assert.deepEqual(evidence.map((e) => [e.objectiveId, e.quality]).sort(), [['praise_coffee', 2], ['thank_gerald', 2]], 'capped at 2 (fixture quality 5)');
});
