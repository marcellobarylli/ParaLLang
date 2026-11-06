// Round 028 (backlog B4): containment files for the market's infohazards, filed in the Spellbook once their
// encounter is completed. The Fountain's live flow is in fountain.test.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { api, createRuntime, makeTempDir } from './helpers.js';

const root = resolve(import.meta.dirname, '..', '..');
const fold = (text) => ` ${String(text).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\s']/gu, ' ').replace(/\s+/g, ' ').trim()} `;
const fileText = (file, { withName = true } = {}) => [withName ? file.name : '', file.class, file.virulence, file.harm, file.incubation, file.vector, file.containment, ...file.notes].join(' ');

// Every surface form a file must not contain: all objective targets of the pack, and every entry of the vocabulary
// files the file's own encounter draws on (round 017: the Spellbook never answers what the game is asking).
function forbiddenForms(content, definition) {
  const ids = new Set([...content.encounters.values()].flatMap(({ encounter }) => encounter.objectives.flatMap((o) => o.target_vocabulary_ids)));
  for (const entry of definition.narrationEntries) ids.add(entry.id);
  return [...ids].flatMap((id) => content.vocabularyById.get(id).surface_variants.map((form) => [id, fold(form)]));
}
// The jingle's name is the hazard itself; its own words are allowed there and nowhere else in the file.
function leaks(content, definition, file) {
  const body = fold(fileText(file, { withName: false }));
  const name = fold(file.name);
  const nameIds = new Set(forbiddenForms(content, definition).filter(([, form]) => name.includes(form)).map(([id]) => id));
  const hits = forbiddenForms(content, definition).filter(([, form]) => body.includes(form)).map(([id]) => id);
  const nameHits = [...nameIds].filter((id) => definition.encounter.id !== 'cracked_fountain_letharger');
  return [...new Set([...hits, ...nameHits])];
}

test('both packs hold the two files; Errata\'s is the same English text in both', () => {
  const files = {};
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    files[code] = Object.fromEntries([...content.encounters.values()].filter(({ encounter }) => encounter.containment_file)
      .map(({ encounter }) => [encounter.id, encounter.containment_file]));
    assert.deepEqual(Object.keys(files[code]).sort(), ['cracked_fountain_letharger', 'the_rift_errata']);
    assert.equal(files[code].cracked_fountain_letharger.designation, 'CM-001');
    assert.equal(files[code].the_rift_errata.designation, 'CM-002');
  }
  assert.equal(files.it.cracked_fountain_letharger.name, 'Dopo, dopo, domani!');
  assert.equal(files.es.cracked_fountain_letharger.name, '¡Después, después, mañana!');
  // Round 112: Errata's annex is in each pack's language; the file without it is the same, the annex's English too.
  const { annex: itAnnex, ...itRift } = files.it.the_rift_errata;
  const { annex: esAnnex, ...esRift } = files.es.the_rift_errata;
  assert.deepEqual(itRift, esRift);
  for (const key of ['id', 'title', 'redaction', 'translation', 'exposure_note']) assert.equal(itAnnex[key], esAnnex[key], key);
});

test('no file contains an objective target of its pack or a word of its own encounter (the jingle\'s name aside)', () => {
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    for (const definition of content.encounters.values()) {
      const file = definition.encounter.containment_file;
      if (!file) continue;
      assert.ok(forbiddenForms(content, definition).length > 10, 'the check has forms to look for');
      assert.deepEqual(leaks(content, definition, file), [], `${code} ${file.designation}`);
      // The check is live: a planted answer is caught.
      const target = code === 'it' ? 'adesso' : 'ahora';
      assert.deepEqual(leaks(content, definition, { ...file, notes: [...file.notes, `Say ${target}.`] }), [target], `${code} ${file.designation} planted`);
    }
  }
});

test('the loader rejects malformed containment files', async () => {
  const fountain = 'languages/es/encounters/cracked_fountain_letharger.yaml';
  const cases = [
    ['missing property', fountain, (e) => { delete e.containment_file.vector; }, /vector/],
    ['unknown key', fountain, (e) => { e.containment_file.colour = 'beige'; }, /colour/],
    ['bad designation', fountain, (e) => { e.containment_file.designation = 'SCP-173'; }, /designation/],
    ['duplicate designation', fountain, (e) => { e.containment_file.designation = 'CM-002'; }, /Containment file designations contains duplicate IDs: CM-002/],
    ['party conversation', 'languages/es/encounters/flick_slow_walk.yaml', (e, all) => { e.containment_file = { ...all.containment_file, designation: 'CM-009' }; }, /party conversation cannot hold a containment file/],
  ];
  for (const [name, path, change, error] of cases) {
    const dir = await makeTempDir('parallang-containment-');
    await cp(join(root, 'content'), dir, { recursive: true });
    const source = yaml.load(await readFile(join(dir, fountain), 'utf8'));
    const value = yaml.load(await readFile(join(dir, path), 'utf8'));
    change(value, source);
    await writeFile(join(dir, path), yaml.dump(value));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), error, name);
  }
});

test('files are filed on completion only, sorted, through the API too; a party conversation adds none', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(() => runtime.close());
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const files = async () => (await api(runtime, '/api/spellbook', { learnerId })).data.containmentFiles;
  assert.deepEqual(await files(), []);
  const seed = async (world) => { const envelope = await runtime.storage.load(learnerId); envelope.world = { ...envelope.world, ...world }; await runtime.storage.save(envelope); };

  await seed({ currentLocationId: 'cracked_fountain', visitedLocationIds: ['market_entrance', 'cracked_fountain', 'the_rift'], completedEncounterIds: ['flick_slow_walk'] });
  assert.deepEqual(await files(), [], 'a visit or a party conversation files nothing');

  await seed({ completedEncounterIds: ['the_rift_errata', 'flick_slow_walk', 'cracked_fountain_letharger'] });
  const filed = await files();
  assert.deepEqual(filed.map((file) => [file.designation, file.encounterId, file.locationName]), [
    ['CM-001', 'cracked_fountain_letharger', 'The Cracked Fountain'],
    ['CM-002', 'the_rift_errata', 'The Rift'],
  ]);
  const source = runtime.content.encounters.get('cracked_fountain_letharger').encounter.containment_file;
  assert.deepEqual(filed[0], {
    encounterId: 'cracked_fountain_letharger', locationName: 'The Cracked Fountain', designation: 'CM-001', name: source.name,
    class: source.class, notes: source.notes,
    properties: { virulence: source.virulence, harm: source.harm, incubation: source.incubation, vector: source.vector, containment: source.containment },
    // Round 111: the redacted annex, unread (annex.test.js covers reading it).
    annex: {
      id: source.annex.id, title: source.annex.title, redaction: source.annex.redaction, read: false, readAt: null,
      strainPending: false, hidden: false, text: null, translation: null, glossary: null, exposureNote: null,
    },
  });
  // Round 112: Errata's file has an unread annex too.
  const rift = runtime.content.encounters.get('the_rift_errata').encounter.containment_file.annex;
  assert.deepEqual(filed[1].annex, {
    id: 'cm002_seam_minutes', title: rift.title, redaction: rift.redaction, read: false, readAt: null,
    strainPending: false, hidden: false, text: null, translation: null, glossary: null, exposureNote: null,
  });
});
