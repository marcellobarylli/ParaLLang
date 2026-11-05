// Round 030 (backlog A9): fragments of The Journey, found when their encounter is completed and kept in the
// Spellbook. The resolving turns at the Bookshop and the Rift are in bookshop.test.js and rift-boss.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { foldWords, loadGameContent } from '../src/content-loader.js';
import { api, createLearnerAndEncounter, createRuntime, finishEncounter, makeTempDir } from './helpers.js';

const root = resolve(import.meta.dirname, '..', '..');
const IDS = ['journey_first_stitch', 'journey_sirens', 'journey_shroud'];

// Every vocabulary form of the pack found in a fragment's text or glossary words, and every glossary meaning that
// is an accepted translation of an objective target (critique 1.1, 1.2, 1.10).
function leaks(content, fragment) {
  const body = foldWords([fragment.text, ...fragment.glossary.map((entry) => entry.word)].join(' '));
  const forms = content.vocabulary.entries.flatMap((entry) => entry.surface_variants.map((form) => [entry.id, foldWords(form)]));
  const targetIds = new Set([...content.encounters.values()].flatMap(({ encounter }) => encounter.objectives.flatMap((o) => o.target_vocabulary_ids)));
  const meanings = new Set([...targetIds].flatMap((id) => content.vocabularyById.get(id).accepted_translations.map((m) => m.toLowerCase().trim())));
  return {
    forms: [...new Set(forms.filter(([, form]) => body.includes(form)).map(([id]) => id))],
    meanings: fragment.glossary.filter((entry) => entry.meaning.split(/[,;]/).some((m) => meanings.has(m.toLowerCase().trim()))).map((entry) => entry.word),
  };
}

test('both packs hold the same three fragments, after the same encounters, with the same English text', () => {
  const [it, es] = ['it', 'es'].map((code) => loadGameContent({ language: code }).fragments);
  assert.deepEqual(it.map((f) => f.id), IDS);
  assert.deepEqual(it.map((f) => f.found_after), ['old_bookshop_bookworm', 'cracked_fountain_letharger', 'the_rift_errata']);
  const english = (fragments) => fragments.map(({ id, title, found_after, found, translation }) => ({ id, title, found_after, found, translation }));
  assert.deepEqual(english(es), english(it));
  for (const fragment of [...it, ...es]) assert.ok(fragment.glossary.length >= 4 && fragment.text !== fragment.translation, fragment.id);
});

test('no fragment holds a vocabulary form of its pack or glosses a target\'s meaning; the check is live', () => {
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    assert.ok(content.vocabulary.entries.length > 40, 'the check has forms to look for');
    for (const fragment of content.fragments) assert.deepEqual(leaks(content, fragment), { forms: [], meanings: [] }, `${code} ${fragment.id}`);
    const [fragment] = content.fragments;
    const planted = code === 'it'
      ? [['Journathan disse adesso.', 'adesso'], ["Aspettò un'ora.", 'ora']]
      : [['Journathan dijo ahora.', 'ahora'], ['Volvió a casa.', 'casa']];
    for (const [sentence, id] of planted) {
      assert.deepEqual(leaks(content, { ...fragment, text: `${fragment.text} ${sentence}` }).forms, [id], `${code} planted ${id}`);
    }
    const glossed = { ...fragment, glossary: [...fragment.glossary, { word: fragment.glossary[0].word, meaning: 'thread; now' }] };
    assert.deepEqual(leaks(content, glossed).meanings, [fragment.glossary[0].word], `${code} planted meaning`);
  }
});

test('foldWords splits elisions and punctuation, folds accents and case', () => {
  assert.equal(foldWords("All'albero, Dell'ORA! Più"), ' all albero dell ora piu ');
});

async function packCopy(change) {
  const dir = await makeTempDir('parallang-lore-');
  await cp(join(root, 'content'), dir, { recursive: true });
  if (change) await change(dir);
  return dir;
}
const editFragments = (edit) => async (dir) => {
  const path = join(dir, 'languages/es/lore/fragments.yaml');
  const file = yaml.load(await readFile(path, 'utf8'));
  edit(file.fragments);
  await writeFile(path, yaml.dump(file));
};

test('the loader refuses malformed fragments and loads a pack without lore/', async () => {
  const cases = [
    ['unknown encounter', (f) => { f[0].found_after = 'no_such_encounter'; }, /names unknown encounter no_such_encounter/],
    ['party conversation', (f) => { f[0].found_after = 'marginalia_fragment'; }, /must follow a location encounter, not marginalia_fragment/],
    ['duplicate id', (f) => { f[1].id = f[0].id; }, /Lore fragments contains duplicate IDs: journey_first_stitch/],
    ['absent glossary word', (f) => { f[0].glossary.push({ word: 'ballena', meaning: 'whale' }); }, /glosses "ballena", which is not in its text/],
    ['substring glossary word', (f) => { f[0].text += ' Su nomea creció.'; f[0].glossary.push({ word: 'nome', meaning: 'name' }); }, /glosses "nome"/],
    ['unknown key', (f) => { f[0].colour = 'beige'; }, /colour/],
    ['empty glossary', (f) => { f[0].glossary = []; }, /glossary/],
  ];
  for (const [name, edit, error] of cases) {
    const dir = await packCopy(editFragments(edit));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), error, name);
  }
  const bare = await packCopy((dir) => rm(join(dir, 'languages/es/lore'), { recursive: true }));
  assert.deepEqual(loadGameContent({ contentDir: bare, language: 'es' }).fragments, []);
});

test('fragments appear on completion only, through the API; hidden during an encounter, shown after', async (t) => {
  const runtime = await createRuntime({ language: 'es' });
  t.after(() => runtime.close());
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const fragments = async () => (await api(runtime, '/api/spellbook', { learnerId })).data.journeyFragments;
  assert.deepEqual(await fragments(), []);
  const seed = async (world) => { const envelope = await runtime.storage.load(learnerId); envelope.world = { ...envelope.world, ...world }; await runtime.storage.save(envelope); };

  await seed({ visitedLocationIds: ['market_entrance', 'old_bookshop', 'cracked_fountain'], completedEncounterIds: ['marginalia_fragment'] });
  assert.deepEqual(await fragments(), [], 'a visit or a party conversation finds nothing');

  await seed({ completedEncounterIds: ['cracked_fountain_letharger', 'old_bookshop_bookworm'] });
  const found = await fragments();
  assert.deepEqual(found.map((f) => [f.id, f.encounterId, f.locationName]), [
    ['journey_first_stitch', 'old_bookshop_bookworm', 'The Old Bookshop'],
    ['journey_sirens', 'cracked_fountain_letharger', 'The Cracked Fountain'],
  ], 'story order, not completion order');
  const source = runtime.content.fragments[0];
  assert.deepEqual(found[0], {
    id: source.id, title: source.title, found: source.found, encounterId: 'old_bookshop_bookworm', locationName: 'The Old Bookshop',
    text: source.text, hidden: false, translation: source.translation, glossary: source.glossary.map((g) => ({ ...g })),
  });
});

test('during an encounter the translation and glossary are withheld; the resolving turn shows them again', async (t) => {
  const runtime = await createRuntime({ language: 'es' });
  t.after(() => runtime.close());
  const session = await createLearnerAndEncounter(runtime);
  const envelope = await runtime.storage.load(session.learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: ['old_bookshop_bookworm'] };
  await runtime.storage.save(envelope);

  const during = (await api(runtime, '/api/spellbook', { learnerId: session.learnerId })).data;
  assert.equal(during.inEncounter, true);
  assert.deepEqual(during.journeyFragments.map((f) => [f.id, f.hidden, f.translation, f.glossary]), [['journey_first_stitch', true, null, null]]);
  assert.equal(during.journeyFragments[0].text, runtime.content.fragments[0].text, 'the target-language text stays');

  const resolved = await finishEncounter(runtime, session);
  assert.equal(resolved.spellbook.journeyFragments[0].hidden, false);
  assert.equal(resolved.spellbook.journeyFragments[0].translation, runtime.content.fragments[0].translation);
});
