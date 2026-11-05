import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { buildNarrationMessages } from '../src/llm/prompt-builder.js';
import { FixtureProvider, fixedNow } from './helpers.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');
const golden = JSON.parse(await readFile(resolve(import.meta.dirname, 'fixtures', 'gerald-prompts-r005.json'), 'utf8'));

const character = {
  id: 'charcutier_fixture', name: 'Bernard', species: 'Charcutier',
  personality: { tone: 'certain', quirks: ['calls everything jamón'], humour_style: 'deadpan' },
  appearance: 'A large apron with a man somewhere behind it.', combat_style: 'insistence', difficulty: 2,
  language_profile: { base_target_ratio: 0.4, vocabulary_focus: ['meats'], grammar_focus: ['quantities'] },
  defeat_condition: { type: 'comprehension_and_response', description: 'Buy some ham.' }, saveable: true,
};
const vocabulary = {
  version: 'fixture-meat-es-v1',
  references: [{ id: 'fixture-rae-jamon', title: 'RAE: jamón', url: 'https://dle.rae.es/jam%C3%B3n' }],
  entries: [{
    id: 'jamon', kind: 'word', target: 'jamón', part_of_speech: 'noun', accepted_translations: ['ham'],
    surface_variants: ['jamón', 'jamon'], accent_insensitive: true, example: { target: 'Quiero jamón.', english: 'I want ham.' },
    reference_ids: ['fixture-rae-jamon'],
  }],
};
const encounter = {
  id: 'fixture_butcher', character: 'characters/enemies/charcutier_fixture.yaml', location: 'butchers_stall', type: 'dialogue',
  initial_prompt_template: 'encounter/greeting.txt', turn_prompt_template: 'encounter/dialogue_turn.txt',
  defeat_condition: { type: 'comprehension_and_response', description: 'Buy ham in Spanish.' }, max_turns: 10,
  escalation: { target_ratio_increase_per_turn: 0.1 },
  objectives: [{
    id: 'buy_ham', prompt: 'Ask Bernard for ham, in Spanish.', intent: 'The player asks for ham.',
    target_vocabulary_ids: ['jamon'], required_target_groups: [['jamon']], grammar_constraints: ['Use Spanish for ham.'],
    accepted_examples: ['Quiero jamón.'], negative_examples: [{ text: 'I want ham.', reason: 'English only.' }],
    reference_meaning: 'A request for ham.', hint_limit: 1, next_objective: null, assessment_reference_ids: ['fixture-rae-jamon'],
  }],
};

const writeYaml = (path, value) => writeFile(path, yaml.dump(value));
async function editYaml(path, change) {
  const value = yaml.load(await readFile(path, 'utf8'));
  change(value);
  await writeYaml(path, value);
}

// A content copy whose Spanish pack has a second encounter at The Butcher's Stall, defined only as content.
async function fixtureContent(t, extra = async () => {}) {
  const dir = await mkdtemp(join(tmpdir(), 'parallang-encounters-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(contentRoot, dir, { recursive: true });
  await rm(join(dir, 'languages', 'it'), { recursive: true });
  await writeYaml(join(dir, 'characters/enemies/charcutier_fixture.yaml'), character);
  await writeYaml(join(dir, 'languages/es/vocabulary/fixture_meat.yaml'), vocabulary);
  await writeYaml(join(dir, 'languages/es/encounters/fixture_butcher.yaml'), encounter);
  await editYaml(join(dir, 'world/locations/butchers_stall.yaml'), (location) => { location.encounter = 'fixture_butcher'; });
  await extra(dir);
  return dir;
}

// Grades the fixture's ham objective itself and delegates everything else to the shared fixture provider.
class TwoEncounterProvider extends FixtureProvider {
  grade(messages) {
    if (!messages[0].content.includes('"buy_ham"')) return super.grade(messages);
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const match = answer.match(/jam[oó]n/i);
    return {
      objective_results: [{
        objective_id: 'buy_ham', passed: Boolean(match), feedback: match ? 'Ham requested.' : 'Ask for jamón.',
        vocabulary_evidence: match ? [{ vocabulary_id: 'jamon', evidence: match[0], quality: 4 }] : [],
      }],
      overall_feedback: 'Fixture assessment applied.',
    };
  }
}

async function runtime(t, contentDir) {
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-encounter-saves-'));
  t.after(() => rm(saveDir, { recursive: true, force: true }));
  const content = loadGameContent({ contentDir, language: 'es' });
  const provider = new TwoEncounterProvider();
  const storage = new JsonLearningStorage({ saveDir });
  return { content, provider, storage, service: new LearningService({ provider, storage, content, clock: () => fixedNow }) };
}

test("Gerald's narration prompts are unchanged from round 005", () => {
  for (const code of ['it', 'es']) {
    const c = loadGameContent({ language: code });
    const base = { language: c.language, character: c.character, locationName: 'The Coffee Cart', vocabularyById: c.vocabularyById };
    assert.deepEqual(buildNarrationMessages({ ...base, objectives: c.encounter.objectives, targetRatio: 0.25 }), golden[code].greeting);
    assert.deepEqual(buildNarrationMessages({
      ...base, objectives: c.encounter.objectives.slice(1), targetRatio: 0.3,
      conversationHistory: [{ role: 'assistant', content: 'Ciao.' }], playerInput: 'Un caffè.',
      decision: { objectiveResults: [{ objectiveId: 'order_coffee', passed: true }], encounterState: 'ongoing', nextObjectiveId: 'no_milk' },
    }), golden[code].turn);
  }
});

test('the real packs hold one encounter each, the default, with per-file vocabulary versions', () => {
  for (const code of ['it', 'es']) {
    const c = loadGameContent({ language: code });
    assert.deepEqual([...c.encounters.keys()], ['imp_coffee_greeting']);
    assert.equal(c.defaultEncounterId, 'imp_coffee_greeting');
    assert.equal(c.encounter, c.encounters.get('imp_coffee_greeting').encounter);
    assert.equal(c.entryVersion(c.vocabulary.entries[0].id), c.vocabulary.version);
    assert.equal(c.language.default_encounter, undefined, 'the default encounter is not sent to clients');
  }
});

test('a second encounter defined only as content plays at its own location, independently of Gerald', async (t) => {
  const { service, provider, content, storage } = await runtime(t, await fixtureContent(t));
  assert.equal(content.vocabulary.version, 'fixture-meat-es-v1+gerald-coffee-v1');
  const { learnerId } = await service.createOrRecoverLearner();

  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'fixture_butcher' }), { status: 409, code: 'NOT_HERE', message: /Bernard is not here\. Walk to The Butcher's Stall first\./ });
  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'nobody' }), { status: 400 });

  await service.moveTo(learnerId, { locationId: 'coffee_cart' });
  const gerald = await service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(gerald.encounter.encounterId, 'imp_coffee_greeting');
  assert.equal(gerald.encounter.character.name, 'Gerald');
  assert.equal(gerald.encounter.resolvedMessage, 'Gerald grudgingly approves. The coffee order is complete.');
  const cafeVersion = (await storage.load(learnerId)).spellbook.words.cafe.contentVersion;
  assert.equal(cafeVersion, 'gerald-coffee-v1');

  await service.moveTo(learnerId, { locationId: 'market_entrance' });
  await service.moveTo(learnerId, { locationId: 'butchers_stall' });
  const started = await service.startEncounter(learnerId, { encounterId: 'fixture_butcher' });
  const greetingPrompt = provider.calls.at(-1).messages;
  assert.match(greetingPrompt[0].content, /Speak as Bernard, a Charcutier/);
  assert.match(greetingPrompt.at(-1).content, /introduce Bernard at The Butcher's Stall/);
  assert.match(greetingPrompt.at(-1).content, /The player approaches Bernard at The Butcher's Stall in The Crumbling Market/);
  assert.equal(started.encounter.encounterId, 'fixture_butcher');
  assert.equal(started.encounter.location, 'butchers_stall');
  assert.equal(started.encounter.character.name, 'Bernard');
  assert.equal(started.encounter.resolvedMessage, null);
  assert.equal(started.encounter.difficulty, 0.4);
  assert.deepEqual(started.encounter.currentObjective, { id: 'buy_ham', prompt: 'Ask Bernard for ham, in Spanish.' });
  assert.notEqual(started.encounter.id, gerald.encounter.id, 'entering another encounter replaces the session');
  assert.equal(started.encounter.transcript[0].dialogue.speaker, 'Bernard');

  const again = await service.startEncounter(learnerId, { encounterId: 'fixture_butcher' });
  assert.equal(again.encounter.id, started.encounter.id, 'the same encounter resumes without restart');

  const turn = await service.submitDialogue(learnerId, {
    encounterId: started.encounter.id, version: started.encounter.version, attemptId: randomUUID(), message: 'Quiero jamón, por favor.',
  });
  assert.equal(turn.encounter.state, 'resolved');
  assert.match(provider.calls.at(-1).messages.at(-1).content, /React as Bernard to/);
  const save = await storage.load(learnerId);
  assert.equal(save.spellbook.words.jamon.contentVersion, 'fixture-meat-es-v1');
  assert.deepEqual(save.world.completedEncounterIds, ['fixture_butcher']);
  const ids = turn.spellbook.cards.map((card) => card.vocabularyId);
  assert.ok(ids.includes('jamon') && ids.includes('cafe'), 'both encounters’ cards are valid in one Spellbook');

  await assert.rejects(
    service.submitDialogue(learnerId, { encounterId: turn.encounter.id, version: turn.encounter.version, attemptId: randomUUID(), message: 'Más jamón.' }),
    { message: 'This encounter is already complete. Restart to play again.' },
  );
  const { world } = await service.getWorld(learnerId);
  assert.deepEqual(world.locations.find((l) => l.id === 'butchers_stall').encounter, { id: 'fixture_butcher', completed: true, characterName: 'Bernard' });
  assert.deepEqual(world.locations.find((l) => l.id === 'coffee_cart').encounter, { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald' });

  const web = await service.startEncounter(learnerId, {});
  assert.equal(web.encounter.encounterId, 'imp_coffee_greeting', 'without an id the default starts anywhere (web client)');
});

test('the loader rejects duplicate vocabulary across files, misplaced encounters and an unknown default', async (t) => {
  const cases = [
    ['duplicate entry', (dir) => editYaml(join(dir, 'languages/es/vocabulary/fixture_meat.yaml'), (v) => { v.entries[0].id = 'cafe'; }), /Vocabulary contains duplicate IDs: cafe/],
    ['encounter at no location', (dir) => editYaml(join(dir, 'world/locations/butchers_stall.yaml'), (l) => { l.encounter = null; }), /fixture_butcher must be held by its location butchers_stall/],
    ['two places, one encounter', (dir) => editYaml(join(dir, 'world/locations/cracked_fountain.yaml'), (l) => { l.encounter = 'fixture_butcher'; }), /cracked_fountain names encounter fixture_butcher, which is set at butchers_stall/],
    ['unknown default', (dir) => editYaml(join(dir, 'languages/es/language.yaml'), (l) => { l.default_encounter = 'nobody'; }), /unknown default_encounter nobody/],
    ['missing vocabulary', (dir) => editYaml(join(dir, 'languages/es/encounters/fixture_butcher.yaml'), (e) => { e.objectives[0].target_vocabulary_ids.push('chorizo'); }), /buy_ham references unknown vocabulary chorizo/],
  ];
  for (const [name, edit, error] of cases) {
    const dir = await fixtureContent(t, edit);
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), error, name);
  }
});
