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
const golden = JSON.parse(await readFile(resolve(import.meta.dirname, 'fixtures', 'gerald-prompts-r131.json'), 'utf8'));

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
  // Round 010: the real Butcher's Stall encounter stands where the fixture goes (and also authors jamon).
  await rm(join(dir, 'languages/es/encounters/butchers_stall_charcutier.yaml'));
  await rm(join(dir, 'languages/es/vocabulary/butcher_meats.yaml'));
  // Round 023: Mortimer's party conversation continues the removed encounter.
  await rm(join(dir, 'languages/es/encounters/mortimer_tasting.yaml'));
  // Round 048: so does his deeper tier.
  await rm(join(dir, 'languages/es/encounters/mortimer_oath.yaml'));
  // Round 052: Flick's minutes objective also targets Mortimer's dos and tres.
  await editYaml(join(dir, 'languages/es/encounters/flick_slow_walk.yaml'), (file) => {
    const minutes = file.objectives.find((objective) => objective.id === 'minutes');
    minutes.target_vocabulary_ids = minutes.target_vocabulary_ids.filter((id) => !['dos', 'tres'].includes(id));
    minutes.required_target_groups = [minutes.target_vocabulary_ids];
  });
  await writeYaml(join(dir, 'characters/enemies/charcutier_fixture.yaml'), character);
  await writeYaml(join(dir, 'languages/es/vocabulary/fixture_meat.yaml'), vocabulary);
  await writeYaml(join(dir, 'languages/es/encounters/fixture_butcher.yaml'), encounter);
  await editYaml(join(dir, 'world/locations/butchers_stall.yaml'), (location) => { location.encounter = 'fixture_butcher'; });
  // Round 119: the dungeon names the encounters this fixture replaces or removes (the butcher's, the Rift's). These
  // tests are the market's, so the fixture has no dungeon.
  await rm(join(dir, 'world/dungeons'), { recursive: true });
  // Round 014: the Rift's gate names the replaced encounter. Round 015: the Rift boss reviews the removed meats, so
  // the fixture pack leaves it out.
  await rm(join(dir, 'languages/es/encounters/the_rift_errata.yaml'));
  // Round 030: the shroud fragment follows the removed Rift encounter. Round 033: Mortimer's follows the removed stall.
  await editYaml(join(dir, 'languages/es/lore/fragments.yaml'), (file) => {
    file.fragments = file.fragments.filter((fragment) => !['the_rift_errata', 'butchers_stall_charcutier'].includes(fragment.found_after));
  });
  await editYaml(join(dir, 'world/locations/the_rift.yaml'), (location) => {
    location.encounter = null;
    location.requires_completed = location.requires_completed.map((id) => (id === 'butchers_stall_charcutier' ? 'fixture_butcher' : id));
  });
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

// Regenerated in round 007, when the style guide entered the prompt on purpose (round 006 pinned the round 005 text),
// in round 012 for the no-menu rule, in round 026 for the concrete language-mix rule, in round 081 for footnotes, and
// in round 128, when the owner dropped the meme-culture texture: the humour is in Pratchett's manner, with no slang.
// Round 130: regenerated again, for the target-language words in the narration. Round 131: for the conversation rules.
test("Gerald's narration prompts match the round 131 fixture and carry the style guide", () => {
  for (const code of ['it', 'es']) {
    const c = loadGameContent({ language: code });
    const base = { language: c.language, character: c.character, styleGuide: c.styleGuide, locationName: 'The Coffee Cart', vocabularyById: c.vocabularyById };
    const greeting = buildNarrationMessages({ ...base, objectives: c.encounter.objectives, targetRatio: 0.25 });
    assert.deepEqual(greeting, golden[code].greeting);
    assert.match(greeting[0].content, /- Never tell the player what to say or how to phrase it/);
    assert.match(greeting[0].content, /- Never offer an open objective's target words as options to choose from/);
    assert.match(greeting[0].content, /in the manner of Terry Pratchett: dry wit and understatement/);
    assert.match(greeting[0].content, /No internet slang, meme formats or references to the present day/);
    assert.doesNotMatch(greeting[0].content, /meme-culture|internet register|\bmid\b|lowkey|vibe|POV:|Nobody:|ratioed/i);
    assert.match(greeting[0].content, /- The narrator may add a footnote \(the footnote field\)/);
    assert.match(greeting[0].content, /Delivers a verdict on every translation like a wine taster addressing a court/);
    assert.doesNotMatch(greeting[0].content, /word-level breakdowns/);
    assert.match(greeting[0].content, /about 13% of its words \(in a 40-word narrative, about 5\)/);
    assert.doesNotMatch(greeting[0].content, /Narrative text is always/);
    assert.match(greeting[0].content, /CONVERSATION:\n- Gerald talks like someone glad of the company\. Each dialogue line is two to four sentences and ends by asking the player something open, so that a good answer is several sentences long, about a paragraph\./);
    assert.match(greeting[0].content, /Ask in one go for everything the learning data below still wants from the player/);
    assert.match(greeting[0].content, /Add one small question of Gerald's own/);
    assert.match(greeting[0].content, /Never a question that yes or no would answer\./);
    assert.match(greeting.at(-1).content, /end it with the open questions the conversation rules ask for/);
    assert.doesNotMatch(greeting.at(-1).content, /concise/);
    assert.deepEqual(buildNarrationMessages({
      ...base, objectives: c.encounter.objectives.slice(1), targetRatio: 0.3,
      conversationHistory: [{ role: 'assistant', content: 'Ciao.' }], playerInput: 'Un caffè.',
      decision: { objectiveResults: [{ objectiveId: 'order_coffee', passed: true }], encounterState: 'ongoing', nextObjectiveId: 'no_milk' },
    }), golden[code].turn);
  }
});

test('the real packs hold Gerald (the default), the tutorial, the butcher, the fountain, the bookshop and the Rift, with per-file vocabulary versions', () => {
  for (const code of ['it', 'es']) {
    const c = loadGameContent({ language: code });
    assert.deepEqual([...c.encounters.keys()].sort(), ['butchers_stall_charcutier', 'cracked_fountain_letharger', 'flick_lotus', 'flick_slow_walk', 'gerald_coffee_break', 'gerald_confidence', 'high_gate_bambieshart', 'imp_coffee_greeting', 'marginalia_folded_page', 'marginalia_fragment', 'market_entrance_tutorial', 'micromort_eduardo', 'mortimer_oath', 'mortimer_tasting', 'old_bookshop_bookworm', 'the_rift_errata']);
    assert.equal(c.defaultEncounterId, 'imp_coffee_greeting');
    assert.equal(c.encounter, c.encounters.get('imp_coffee_greeting').encounter);
    assert.equal(c.vocabulary.version, `bambieshart-gate-${code}-v1+bookshop-journey-${code}-v1+butcher-meats-${code}-v1+eduardo-ankle-${code}-v1+entrance-greetings-${code}-v2+flick-lotus-${code}-v1+flick-party-${code}-v2+fountain-riddles-${code}-v2+gerald-break-${code}-v1+${c.entryVersion(c.encounter.objectives[0].target_vocabulary_ids[0])}+gerald-confidence-${code}-v1+marginalia-folded-page-${code}-v1+marginalia-party-${code}-v1+mortimer-oath-${code}-v1+mortimer-party-${code}-v1`);
    assert.equal(c.language.default_encounter, undefined, 'the default encounter is not sent to clients');
  }
});

test('a second encounter defined only as content plays at its own location, independently of Gerald', async (t) => {
  const { service, provider, content, storage } = await runtime(t, await fixtureContent(t));
  assert.equal(content.vocabulary.version, 'bambieshart-gate-es-v1+bookshop-journey-es-v1+eduardo-ankle-es-v1+entrance-greetings-es-v2+fixture-meat-es-v1+flick-lotus-es-v1+flick-party-es-v2+fountain-riddles-es-v2+gerald-break-es-v1+gerald-coffee-v1+gerald-confidence-es-v1+marginalia-folded-page-es-v1+marginalia-party-es-v1+mortimer-oath-es-v1+mortimer-party-es-v1');
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
  // Round 091: a named start does not replace Gerald's conversation under way; leaving it is a restart start.
  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'fixture_butcher' }), { status: 409, code: 'CONVERSATION_UNDER_WAY', message: 'Finish your conversation with Gerald first.' });
  const started = await service.startEncounter(learnerId, { encounterId: 'fixture_butcher', restart: true });
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
  assert.notEqual(started.encounter.id, gerald.encounter.id, 'leaving Gerald for another encounter replaces the session');
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
  assert.deepEqual(world.locations.find((l) => l.id === 'butchers_stall').encounter, { id: 'fixture_butcher', completed: true, characterName: 'Bernard', characterId: 'charcutier_fixture', saveable: true });
  assert.deepEqual(world.locations.find((l) => l.id === 'coffee_cart').encounter, { id: 'imp_coffee_greeting', completed: false, characterName: 'Gerald', characterId: 'imp_coffee_001', saveable: true });

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
