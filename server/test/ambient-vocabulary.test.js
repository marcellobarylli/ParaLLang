// Round 019: ambient vocabulary, authored words an NPC may use freely (Portia's benvenuto, piacere, mercato).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { buildGradingMessages, buildNarrationMessages } from '../src/llm/prompt-builder.js';
import { FixtureProvider, fixedNow } from './helpers.js';

const contentRoot = resolve(import.meta.dirname, '..', '..', 'content');
const tutorialPath = 'languages/es/encounters/market_entrance_tutorial.yaml';
const ambient = { it: ['benvenuto', 'piacere', 'mercato'], es: ['bienvenido', 'mucho_gusto', 'mercado'] };

async function contentCopy(t, change) {
  const dir = await mkdtemp(join(tmpdir(), 'parallang-ambient-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await cp(contentRoot, dir, { recursive: true });
  await change(dir);
  return dir;
}

async function editYaml(path, change) {
  const value = yaml.load(await readFile(path, 'utf8'));
  change(value);
  await writeFile(path, yaml.dump(value));
}

const extraFile = (entries) => ({
  version: 'fixture-ambient-es-v1',
  references: [{ id: 'fixture-rae-puesto', title: 'RAE: puesto', url: 'https://dle.rae.es/puesto' }],
  entries: entries.map(([id, target]) => ({
    id, kind: 'word', target, part_of_speech: 'noun', accepted_translations: [id], surface_variants: [target],
    accent_insensitive: true, example: { target: `Un ${target}.`, english: `A ${id}.` }, reference_ids: ['fixture-rae-puesto'],
  })),
});

test('both tutorials load their ambient vocabulary as narration entries, not as objective targets', () => {
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    const definition = content.encounters.get('market_entrance_tutorial');
    assert.deepEqual(definition.ambientEntries.map((entry) => entry.id), ambient[code]);
    const narrationIds = new Set(definition.narrationEntries.map((entry) => entry.id));
    for (const id of ambient[code]) assert.ok(narrationIds.has(id), `${code} ${id}`);
    const targets = definition.encounter.objectives.flatMap((objective) => objective.target_vocabulary_ids);
    for (const id of ambient[code]) assert.ok(!targets.includes(id));
    for (const other of content.encounters.values()) {
      if (other !== definition) assert.deepEqual(other.ambientEntries, []);
    }
  }
});

test('the loader rejects unknown, duplicate, target and target-overlapping ambient ids', async (t) => {
  const cases = [
    [['nadie_sabe'], /unknown ambient vocabulary nadie_sabe/],
    [['mercado', 'mercado'], /duplicate IDs: mercado/],
    [['hola'], /ambient vocabulary hola is an objective target/],
    [['hola_portia'], /overlaps the objective target form "hola"/],
  ];
  for (const [ids, message] of cases) {
    const dir = await contentCopy(t, async (root) => {
      await writeFile(join(root, 'languages/es/vocabulary/fixture_ambient.yaml'), yaml.dump(extraFile([['hola_portia', 'hola portia']])));
      await editYaml(join(root, tutorialPath), (encounter) => { encounter.ambient_vocabulary_ids = ids; });
    });
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), message);
  }
});

test('an ambient entry from another file joins the narration entries alone, without its siblings', async (t) => {
  const dir = await contentCopy(t, async (root) => {
    await writeFile(join(root, 'languages/es/vocabulary/fixture_ambient.yaml'), yaml.dump(extraFile([['puesto', 'puesto'], ['toldo', 'toldo']])));
    await editYaml(join(root, tutorialPath), (encounter) => { encounter.ambient_vocabulary_ids = ['bienvenido', 'puesto']; });
  });
  const definition = loadGameContent({ contentDir: dir, language: 'es' }).encounters.get('market_entrance_tutorial');
  const ids = definition.narrationEntries.map((entry) => entry.id);
  assert.ok(ids.includes('puesto'));
  assert.ok(!ids.includes('toldo'));
  assert.deepEqual(matchCanonicalVocabulary('Mi puesto y mi toldo.', definition.narrationEntries).map((match) => match.entry.id), ['puesto']);
});

test("Portia's narration prompts carry one FREE VOCABULARY line with usage; her grading prompt and Gerald's do not", () => {
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    const definition = content.encounters.get('market_entrance_tutorial');
    const base = {
      language: content.language, character: definition.character, styleGuide: content.styleGuide,
      locationName: 'The Market Entrance', objectives: definition.encounter.objectives, vocabularyById: content.vocabularyById,
      targetRatio: 0.2, ambientEntries: definition.ambientEntries,
    };
    const greeting = buildNarrationMessages(base)[0].content;
    const turn = buildNarrationMessages({ ...base, playerInput: 'Ciao', decision: { encounterState: 'ongoing' } })[0].content;
    for (const prompt of [greeting, turn]) {
      const lines = prompt.split('\n').filter((line) => line.startsWith('FREE VOCABULARY'));
      assert.equal(lines.length, 1);
      const words = JSON.parse(lines[0].slice(lines[0].indexOf('[')));
      assert.deepEqual(words.map((word) => word.target), definition.ambientEntries.map((entry) => entry.target));
      assert.ok(words.every((word) => word.usage && word.meanings.length));
      assert.match(lines[0], /not the answer to any objective, and every rule above about open objectives still applies/);
    }
    assert.doesNotMatch(prompt(code, content), /FREE VOCABULARY/);
    const grading = buildGradingMessages({
      language: content.language, objectives: definition.encounter.objectives, vocabularyById: content.vocabularyById,
      conversationContext: [], playerInput: 'Ciao',
    })[0].content;
    assert.doesNotMatch(grading, /FREE VOCABULARY|benvenuto|bienvenido/);
    assert.doesNotMatch(greeting, /MERCATO/);
  }
});

function prompt(code, content) {
  const gerald = content.encounters.get('imp_coffee_greeting');
  return buildNarrationMessages({
    language: content.language, character: gerald.character, styleGuide: content.styleGuide, locationName: 'The Coffee Cart',
    objectives: gerald.encounter.objectives, vocabularyById: content.vocabularyById, targetRatio: 0.25, ambientEntries: gerald.ambientEntries,
  })[0].content;
}

test('ambient forms chip in target-language text and not in English look-alikes', () => {
  const it = loadGameContent({ language: 'it' }).encounters.get('market_entrance_tutorial').narrationEntries;
  const es = loadGameContent({ language: 'es' }).encounters.get('market_entrance_tutorial').narrationEntries;
  const ids = (text, entries) => matchCanonicalVocabulary(text, entries).map((match) => match.entry.id).sort();
  assert.deepEqual(ids('Benvenuto al mercato!', it), ['benvenuto', 'mercato']);
  assert.deepEqual(ids('Benvenuti! Piacere.', it), ['benvenuto', 'piacere']);
  assert.deepEqual(ids('Welcome to the supermarket, my pleasure.', it), []);
  assert.deepEqual(ids('¡Bienvenida! Mucho gusto.', es), ['bienvenido', 'mucho_gusto']);
  assert.deepEqual(ids('With gusto, to the supermarket.', es), []);
});

class AmbientProvider extends FixtureProvider {
  narrate(messages) {
    const value = super.narrate(messages);
    return { ...value, dialogue: { ...value.dialogue, native: '¡Bienvenida al mercado! Mucho gusto.', translation: 'Welcome to the market! Nice to meet you.', words: [] } };
  }
}

test("ambient words in Portia's greeting become chips and Spellbook entries", async (t) => {
  const saveDir = await mkdtemp(join(tmpdir(), 'parallang-ambient-save-'));
  t.after(() => rm(saveDir, { recursive: true, force: true }));
  const storage = new JsonLearningStorage({ saveDir });
  const service = new LearningService({ provider: new AmbientProvider(), storage, content: loadGameContent({ language: 'es' }), clock: () => fixedNow });
  const { learnerId } = await service.createOrRecoverLearner();
  const started = (await service.startEncounter(learnerId, { encounterId: 'market_entrance_tutorial' })).encounter;
  const chips = started.transcript[0].dialogue.words.map((word) => word.vocabularyId).sort();
  assert.deepEqual(chips, ['bienvenido', 'mercado', 'mucho_gusto']);
  const { spellbook } = await storage.load(learnerId);
  for (const id of ['bienvenido', 'mercado']) assert.ok(spellbook.words[id], id);
  assert.ok(spellbook.phrases.mucho_gusto);
});
