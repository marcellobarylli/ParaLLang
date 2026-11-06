// Round 022: conversations with party members (backlog A8b): Gerald's coffee break.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { FixtureProvider, api, createRuntime } from './helpers.js';
import { gateFor } from '../src/world.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');

// Grades the coffee break's objectives itself and delegates Gerald's first encounter to the shared fixture provider.
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
        return {
          objective_id: id, passed: Boolean(match), feedback: match ? `Passed ${id}.` : `Keep working on ${id}.`,
          vocabulary_evidence: match ? [{ vocabulary_id: vocabularyId, evidence: match[0], quality: 5 }] : [],
        };
      }),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

const say = async (runtime, learnerId, encounter, message, attemptId = randomUUID()) => {
  const turn = await api(runtime, '/api/encounter/dialogue', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId, message } });
  assert.equal(turn.status, 200, JSON.stringify(turn.data));
  return turn.data;
};
const move = (runtime, learnerId, locationId) => api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId } });
const start = (runtime, learnerId, encounterId) => api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId } });
const narrationPrompts = (runtime) => runtime.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration').map((call) => call.messages);

async function recruitedGerald(t) {
  const runtime = await createRuntime({ provider: new CoffeeBreakProvider() });
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  await move(runtime, learnerId, 'coffee_cart');
  const before = await start(runtime, learnerId, 'gerald_coffee_break');
  assert.equal(before.status, 409);
  assert.equal(before.data.error.code, 'NOT_IN_PARTY');
  const first = (await start(runtime, learnerId, 'imp_coffee_greeting')).data.encounter;
  assert.equal((await say(runtime, learnerId, first, 'Quiero un café negro.')).encounter.state, 'resolved');
  assert.equal((await api(runtime, '/api/party/recruit', { learnerId, method: 'POST', body: { encounterId: 'imp_coffee_greeting' } })).data.joined, true);
  return { runtime, learnerId };
}

test('the coffee break starts anywhere once Gerald has joined, is set where the player stands, and counts per resolution', async (t) => {
  const { runtime, learnerId } = await recruitedGerald(t);
  await move(runtime, learnerId, 'market_entrance');
  const calls = narrationPrompts(runtime).length;
  const started = await start(runtime, learnerId, 'gerald_coffee_break');
  assert.equal(started.status, 200);
  let encounter = started.data.encounter;
  assert.equal(encounter.location, 'market_entrance');
  assert.equal(encounter.partyConversation, true);
  assert.deepEqual(encounter.character, { id: 'imp_coffee_001', name: 'Gerald', saveable: true });
  const greeting = narrationPrompts(runtime)[calls];
  assert.match(greeting.at(-1).content, /introduce Gerald at Market Entrance/);
  assert.match(greeting.at(-1).content, /The player approaches Gerald at Market Entrance in The Crumbling Market/);
  assert.match(JSON.stringify(greeting), /has brewed the player a coffee/, 'the scene reaches the narration through the objective intent');

  // Walking on mid-conversation does not move the scene.
  await move(runtime, learnerId, 'coffee_cart');
  let turn = await say(runtime, learnerId, encounter, 'Delicious!');
  assert.deepEqual(turn.assessment.objectiveResults.map((r) => r.passed), [false, false]);
  const turnPrompt = JSON.stringify(narrationPrompts(runtime).at(-1));
  // Turn prompts carry no location (only the greeting does), so the walk cannot move the scene.
  assert.doesNotMatch(turnPrompt, /The Coffee Cart|Market Entrance/);
  turn = await say(runtime, learnerId, turn.encounter, '¡Está buenísimo!');
  assert.equal(turn.encounter.state, 'ongoing', 'praise alone leaves the thanks open');
  assert.equal(turn.encounter.currentObjective.id, 'thank_gerald');
  const finalAttempt = randomUUID();
  const beforeFinal = turn.encounter;
  turn = await say(runtime, learnerId, beforeFinal, '¡Muchas gracias!', finalAttempt);
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.encounter.location, 'market_entrance');

  const party = async () => (await api(runtime, '/api/party', { learnerId })).data.party;
  assert.equal((await party())[0].conversations, 1);
  const replayed = await say(runtime, learnerId, beforeFinal, '¡Muchas gracias!', finalAttempt);
  assert.equal(replayed.replayed, true);
  assert.equal((await party())[0].conversations, 1, 'a replayed attempt does not count twice');

  const saved = JSON.parse(await readFile(join(runtime.saveDir, `${learnerId}.json`), 'utf8'));
  assert.deepEqual(saved.world.completedEncounterIds, ['imp_coffee_greeting'], 'the conversation is not a map encounter');
  const rift = runtime.content.world.locationsById.get('the_rift');
  assert.deepEqual(gateFor(rift, saved.world), { sealed: true, required: 5, completed: 1 });
  const world = (await api(runtime, '/api/world', { learnerId })).data.world;
  assert.ok(!JSON.stringify(world).includes('gerald_coffee_break'));

  // Talking again after a resolution starts a fresh session (critique 1.1); praise and thanks in one line resolve it.
  const again = (await start(runtime, learnerId, 'gerald_coffee_break')).data.encounter;
  assert.notEqual(again.id, encounter.id);
  assert.equal(again.state, 'ongoing');
  assert.equal(again.location, 'coffee_cart', 'the new session is set where the player now stands');
  const resumed = (await start(runtime, learnerId, 'gerald_coffee_break')).data.encounter;
  assert.equal(resumed.id, again.id, 'an ongoing conversation is resumed');
  assert.equal((await say(runtime, learnerId, again, '¡Un buen café, gracias!')).encounter.state, 'resolved');
  assert.equal((await party())[0].conversations, 2);
  assert.equal((await party())[0].conversationId, 'gerald_coffee_break');
});

test('a resolved location encounter is still resumed, not restarted', async (t) => {
  const { runtime, learnerId } = await recruitedGerald(t);
  const before = (await api(runtime, '/api/encounter/current', { learnerId })).data.encounter;
  const again = (await start(runtime, learnerId, 'imp_coffee_greeting')).data.encounter;
  assert.equal(again.id, before.id);
  assert.equal(again.state, 'resolved');
  assert.equal(again.partyConversation, false);
});

test('a member conversation count must be a non-negative integer', async (t) => {
  const { runtime, learnerId } = await recruitedGerald(t);
  const path = join(runtime.saveDir, `${learnerId}.json`);
  const saved = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(saved.party[0].conversations, undefined, 'a new member has no count yet');
  assert.equal((await api(runtime, '/api/party', { learnerId })).data.party[0].conversations, 0, 'missing reads as 0');
  for (const conversations of [-1, 1.5, '2', null]) {
    const raw = JSON.stringify({ ...saved, party: [{ ...saved.party[0], conversations }] });
    await writeFile(path, raw);
    assert.equal((await api(runtime, '/api/party', { learnerId })).data.error?.code, 'SAVE_UNREADABLE', String(conversations));
    assert.equal(await readFile(path, 'utf8'), raw);
  }
});

test('both packs hold Gerald\'s coffee break as his only party conversation, off the map', () => {
  for (const code of ['it', 'es']) {
    const { encounters, world } = loadGameContent({ language: code });
    const definition = encounters.get('gerald_coffee_break');
    assert.equal(definition.encounter.party_of, 'imp_coffee_greeting');
    assert.equal(definition.encounter.location, undefined);
    assert.equal(definition.character.id, 'imp_coffee_001');
    assert.deepEqual(definition.encounter.objectives.map((o) => o.id), ['praise_coffee', 'thank_gerald']);
    assert.ok(world.locations.every((location) => location.encounter !== 'gerald_coffee_break'));
    const forms = definition.narrationEntries.flatMap((entry) => entry.surface_variants.map((form) => form.toLowerCase()));
    assert.ok(!forms.some((form) => ['rico', 'rica'].includes(form)), 'no forms that are English names (Puerto Rico, Costa Rica)');
  }
});

test('the loader rejects broken party conversations', async (t) => {
  const conversation = 'languages/it/encounters/gerald_coffee_break.yaml';
  const cases = [
    ['missing', (dir, c) => { c.party_of = 'dragon_lair'; }, /names unknown encounter dragon_lair/],
    ['self', (dir, c) => { c.party_of = 'gerald_coffee_break'; }, /must name a location encounter/],
    ['wrong character', (dir, c) => { c.party_of = 'butchers_stall_charcutier'; }, /must use the character of butchers_stall_charcutier/],
    ['not saveable', (dir, c) => { c.party_of = 'market_entrance_tutorial'; c.character = 'characters/enemies/archway_portia.yaml'; }, /needs a saveable character; Portia is not/],
    ['both', (dir, c) => { c.location = 'coffee_cart'; }, /either a location or party_of/],
    ['neither', (dir, c) => { delete c.party_of; }, /either a location or party_of/],
    ['two', async (dir, c) => {
      await writeFile(join(dir, 'languages/it/encounters/gerald_second_break.yaml'), yaml.dump({ ...c, id: 'gerald_second_break' }));
    }, /imp_coffee_greeting has more than one party conversation without after_conversations/],
    // Round 047: tiers.
    ['tier twice', async (dir, c) => {
      await writeFile(join(dir, 'languages/it/encounters/gerald_second_break.yaml'), yaml.dump({ ...c, id: 'gerald_second_break', after_conversations: 3 }));
    }, /imp_coffee_greeting has more than one party conversation at after_conversations 3/],
    ['tier without a first', (dir, c) => { c.after_conversations = 5; }, /imp_coffee_greeting has a deeper party conversation but no first one/],
    ['tier zero', (dir, c) => { c.after_conversations = 0; }, /after_conversations/],
    ['tier on the map', async (dir) => {
      const path = join(dir, 'languages/it/encounters/imp_coffee_greeting.yaml');
      await writeFile(path, yaml.dump({ ...yaml.load(await readFile(path, 'utf8')), after_conversations: 2 }));
    }, /Only a party conversation can set after_conversations/],
    ['chained', async (dir, c) => {
      await writeFile(join(dir, 'languages/it/encounters/gerald_second_break.yaml'), yaml.dump({ ...c, id: 'gerald_second_break', party_of: 'gerald_coffee_break' }));
    }, /gerald_second_break must name a location encounter, not gerald_coffee_break/],
    ['default', async (dir) => {
      const path = join(dir, 'languages/it/language.yaml');
      const language = yaml.load(await readFile(path, 'utf8'));
      await writeFile(path, yaml.dump({ ...language, default_encounter: 'gerald_coffee_break' }));
    }, /default_encounter gerald_coffee_break is a party conversation/],
    ['gate', async (dir) => {
      const path = join(dir, 'world/locations/the_rift.yaml');
      const rift = yaml.load(await readFile(path, 'utf8'));
      rift.requires_completed.push('gerald_coffee_break');
      await writeFile(path, yaml.dump(rift));
    }, /requires party conversation gerald_coffee_break/],
  ];
  for (const [name, change, error] of cases) {
    const dir = await mkdtemp(join(tmpdir(), 'parallang-party-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    await cp(contentRoot, dir, { recursive: true });
    const path = join(dir, conversation);
    const value = yaml.load(await readFile(path, 'utf8'));
    await change(dir, value);
    await writeFile(path, yaml.dump(value));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), error, name);
  }
});

// Round 023: every saveable character has one party conversation, and their words do not collide.
const fold = (form) => form.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
// Round 023: the one known overlap. Gerald's "buon" (round 022, "un buon caffè") is the same word as the "buon" of
// Portia's "buon giorno" (es: "buen" in "buen día"); a "good" chip on it is correct, and dropping it would refuse "Un buon caffè!".
const ALLOWED_OVERLAPS = new Set(['it:buono:buon:buongiorno:buon giorno', 'es:bueno:buen:buenos_dias:buen dia']);
const ENGLISH = ['mas', 'juntas', 'rico', 'rica', 'bella', 'bonito', 'lee', 'piano', 'chili', 'soy', 'due', 'media', 'more', 'go'];

test('each saveable character has exactly one first party conversation and the others none; each has a deeper one at 3', () => {
  for (const code of ['it', 'es']) {
    const { encounters } = loadGameContent({ language: code });
    const conversations = [...encounters.values()].filter(({ encounter }) => encounter.party_of);
    for (const home of [...encounters.values()].filter(({ encounter }) => !encounter.party_of)) {
      const own = conversations.filter(({ encounter }) => encounter.party_of === home.encounter.id && encounter.after_conversations === undefined);
      assert.equal(own.length, home.character.saveable ? 1 : 0, `${code} ${home.encounter.id}`);
    }
    // Round 047 (backlog G4): Gerald's deeper tier; round 048 (G6): one for every other member.
    assert.deepEqual(conversations.filter(({ encounter }) => encounter.after_conversations !== undefined)
      .map(({ encounter }) => [encounter.id, encounter.party_of, encounter.after_conversations]).sort(), [
      ['flick_lotus', 'cracked_fountain_letharger', 3], ['gerald_confidence', 'imp_coffee_greeting', 3],
      ['marginalia_folded_page', 'old_bookshop_bookworm', 3], ['mortimer_oath', 'butchers_stall_charcutier', 3]]);
    assert.deepEqual(conversations.map(({ encounter }) => encounter.id).sort(), ['flick_lotus', 'flick_slow_walk', 'gerald_coffee_break', 'gerald_confidence', 'marginalia_folded_page', 'marginalia_fragment', 'mortimer_oath', 'mortimer_tasting']);
  }
});

test('party vocabulary has no English-word forms and does not overlap other entries in its pack', () => {
  for (const code of ['it', 'es']) {
    const { encounters, vocabulary } = loadGameContent({ language: code });
    const partyIds = new Set([...encounters.values()].filter(({ encounter }) => encounter.party_of)
      .flatMap(({ encounter }) => encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids)));
    const formsOf = (entry) => entry.surface_variants.map(fold);
    const party = vocabulary.entries.filter((entry) => partyIds.has(entry.id));
    // Round 052: Flick's minutes objective adds eleven numbers (two to twelve; tre / dos, tres are Mortimer's).
    assert.equal(party.length, 28, `${code}: eight conversations' targets (3 + 2 × 7 + 11)`);
    for (const entry of party) {
      for (const form of formsOf(entry)) {
        // Whole forms: the matcher matches a phrase as a whole, so "un poco más" is safe where bare "más" is not.
        // Round 052 (Decision 3): Italian two is kept knowingly; the hours need it.
        if (`${code}:${entry.id}:${form}` !== 'it:due:due') assert.ok(!ENGLISH.includes(form), `${code} ${entry.id}: "${form}" is an English word`);
        for (const other of vocabulary.entries.filter((candidate) => candidate.id !== entry.id)) {
          for (const otherForm of formsOf(other)) {
            const clash = ` ${form} `.includes(` ${otherForm} `) || ` ${otherForm} `.includes(` ${form} `);
            if (ALLOWED_OVERLAPS.has(`${code}:${entry.id}:${form}:${other.id}:${otherForm}`)) continue;
            assert.ok(!clash, `${code}: ${entry.id} "${form}" overlaps ${other.id} "${otherForm}"`);
          }
        }
      }
    }
  }
});

test('each member\'s conversation waits until they have joined', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  for (const id of ['mortimer_tasting', 'flick_slow_walk', 'marginalia_fragment', 'gerald_coffee_break', 'gerald_confidence', 'mortimer_oath', 'flick_lotus', 'marginalia_folded_page']) {
    const refused = await start(runtime, learnerId, id);
    assert.equal(refused.status, 409, id);
    assert.equal(refused.data.error.code, 'NOT_IN_PARTY', id);
  }
});

// Round 032: Gerald's Dead Branch fragment is unlocked by his third resolved coffee break, and noted on it.
test('the third coffee break files Gerald\'s fragment; it is withheld during the fourth', async (t) => {
  const { runtime, learnerId } = await recruitedGerald(t);
  const filed = [];
  let turn;
  let last;
  for (let n = 1; n <= 3; n += 1) {
    last = { encounter: (await start(runtime, learnerId, 'gerald_coffee_break')).data.encounter, attemptId: randomUUID() };
    turn = await say(runtime, learnerId, last.encounter, '¡Un buen café, gracias!', last.attemptId);
    assert.equal(turn.encounter.state, 'resolved');
    filed.push(turn.spellbook.journeyFragments.map((f) => f.id));
  }
  // Round 109: Gerald's defeat files Journathan today (last in story order); his own fragment waits for the breaks.
  const today = 'journey_still_on_his_way';
  assert.deepEqual(filed, [[today], [today], ['journey_dead_branch', today]], 'Dead Branch: not on Gerald\'s defeat, nor the first two breaks');
  const [fragment] = turn.spellbook.journeyFragments;
  assert.deepEqual([fragment.encounterId, fragment.locationName, fragment.hidden, fragment.unlockedAt, fragment.conversations, fragment.toldBy],
    ['gerald_coffee_break', 'The Coffee Cart', false, 3, 3, 'Gerald']);
  const replayed = await say(runtime, learnerId, last.encounter, '¡Un buen café, gracias!', last.attemptId);
  assert.equal(replayed.replayed, true);
  assert.deepEqual(replayed.spellbook.journeyFragments.map((f) => [f.id, f.conversations]), [['journey_dead_branch', 3], [today, undefined]], 'a replay does not count again');
  const fourth = await start(runtime, learnerId, 'gerald_coffee_break');
  assert.deepEqual(fourth.data.spellbook.journeyFragments.map((f) => [f.id, f.hidden, f.translation, f.toldBy]), [['journey_dead_branch', true, null, 'Gerald'], [today, true, null, undefined]], 'round 036: the teller stays shown');
});

// Round 033 (critique 1.4): Mortimer's fragment through real resolved tastings, counted by the service itself.
class TastingProvider extends FixtureProvider {
  grade(messages) {
    const objectives = ['like_it', 'ask_more'].filter((id) => messages[0].content.includes(`"${id}"`));
    if (objectives.length === 0) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const found = { like_it: answer.match(/me gusta/i), ask_more: answer.match(/un poco m[aá]s/i) };
    return {
      objective_results: objectives.map((id) => ({
        objective_id: id, passed: Boolean(found[id]), feedback: found[id] ? `Passed ${id}.` : `Keep working on ${id}.`,
        vocabulary_evidence: found[id] ? [{ vocabulary_id: id === 'like_it' ? 'me_gusta' : 'un_poco_mas', evidence: found[id][0], quality: 5 }] : [],
      })),
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

test('the third tasting files Mortimer\'s fragment under his party conversation; Gerald\'s stays locked', async (t) => {
  const runtime = await createRuntime({ provider: new TastingProvider() });
  t.after(runtime.close);
  const learnerId = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data.learnerId;
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['butchers_stall_charcutier'] };
  envelope.party = [{ characterId: 'charcutier_mortimer_001', encounterId: 'butchers_stall_charcutier', joinedAt: '2026-01-15T12:00:00.000Z', conversations: 0 }];
  await runtime.storage.save(envelope);
  const filed = [];
  let turn;
  for (let n = 1; n <= 3; n += 1) {
    const encounter = (await start(runtime, learnerId, 'mortimer_tasting')).data.encounter;
    turn = await say(runtime, learnerId, encounter, 'Me gusta mucho. ¿Un poco más?');
    assert.equal(turn.encounter.state, 'resolved', `tasting ${n}`);
    filed.push(turn.spellbook.journeyFragments.map((f) => f.id));
  }
  assert.deepEqual(filed, [[], [], ['journey_forbidden_herd']]);
  const [fragment] = turn.spellbook.journeyFragments;
  assert.deepEqual([fragment.encounterId, fragment.locationName, fragment.unlockedAt, fragment.conversations, fragment.toldBy],
    ['mortimer_tasting', "The Butcher's Stall", 3, 3, 'Mortimer']);
});
