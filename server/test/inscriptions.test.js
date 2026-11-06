// Round 082: inscriptions, lore hidden in plain sight at each location, found by visiting it. The map shows the text,
// the Spellbook its translation and glossary (withheld during an encounter). No inscription holds an answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { foldWords, loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { api, createRuntime, FixtureProvider, fixedNow, makeTempDir } from './helpers.js';

const root = resolve(import.meta.dirname, '..', '..');
const IDS = ['keystone', 'menu_board', 'chopping_block', 'plaque_back', 'flyleaf', 'seam'];
const PLACES = ['market_entrance', 'coffee_cart', 'butchers_stall', 'cracked_fountain', 'old_bookshop', 'the_rift'];

// Decision 3: checked false positives, each with its reason. es "las" is the article in "son las"; es "quien" shares
// its first four letters with "quieto" and "quiero" only.
const ALLOWED = { it: [], es: ['las', 'quien'] };
const words = (inscription) => foldWords([inscription.text, ...inscription.glossary.map((g) => g.word)].join(' ')).trim().split(' ');
const meaningKey = (meaning) => meaning.replace(/\([^)]*\)/g, ' ').trim().toLowerCase().replace(/^to /, '').replace(/\s+/g, ' ').trim();

// Every way an inscription could hand over an answer: a pack form, a word or 4-letter stem of any objective target's
// forms (every target, location and party), or a glossary meaning that is a target's accepted translation.
export function answerLeaks(content, inscription, allowed = []) {
  const body = foldWords([inscription.text, ...inscription.glossary.map((g) => g.word)].join(' '));
  const forms = content.vocabulary.entries.flatMap((entry) => entry.surface_variants.map((form) => [entry.id, foldWords(form)]));
  const targetIds = [...new Set([...content.encounters.values()].flatMap(({ encounter }) => encounter.objectives.flatMap((o) => o.target_vocabulary_ids)))];
  const targetWords = [...new Set(targetIds.flatMap((id) => content.vocabularyById.get(id).surface_variants)
    .flatMap((form) => foldWords(form).trim().split(' ')).filter((word) => word.length >= 3))];
  const meanings = new Set(targetIds.flatMap((id) => content.vocabularyById.get(id).accepted_translations.map(meaningKey)));
  const own = words(inscription).filter((word) => !allowed.includes(word));
  return {
    forms: [...new Set(forms.filter(([, form]) => body.includes(form)).map(([id]) => id))],
    targetWords: targetWords.filter((target) => own.some((word) => word === target
      || (target.length >= 4 && word.length >= 4 && word.slice(0, 4) === target.slice(0, 4)))),
    meanings: inscription.glossary.filter((entry) => entry.meaning.split(/[,;]/).some((m) => meanings.has(meaningKey(m)))).map((entry) => entry.word),
  };
}

test('both packs hold the same six inscriptions, one per location, with the same English', () => {
  const [it, es] = ['it', 'es'].map((code) => loadGameContent({ language: code }));
  assert.deepEqual(it.inscriptions.map((i) => i.id), IDS);
  assert.deepEqual(it.inscriptions.map((i) => i.location), PLACES);
  const english = (inscriptions) => inscriptions.map(({ id, location, where, translation }) => ({ id, location, where, translation }));
  assert.deepEqual(english(es.inscriptions), english(it.inscriptions));
  for (const content of [it, es]) {
    assert.deepEqual([...content.inscriptionsByLocation.keys()], PLACES);
    for (const i of content.inscriptions) assert.ok(i.glossary.length >= 3 && i.text !== i.translation, i.id);
  }
});

test('no inscription holds an answer: no pack form, no target word or stem, no target meaning; the checks are live', () => {
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    for (const inscription of content.inscriptions) {
      assert.deepEqual(answerLeaks(content, inscription, ALLOWED[code]), { forms: [], targetWords: [], meanings: [] }, `${code} ${inscription.id}`);
    }
    const [first] = content.inscriptions;
    const plant = (sentence) => answerLeaks(content, { ...first, text: `${first.text} ${sentence}` }, ALLOWED[code]);
    if (code === 'it') {
      assert.deepEqual(plant('Adesso.').forms, ['adesso']);
      assert.ok(plant('Nessuna.').targetWords.includes('nessuno'), 'a near-form of an answer (critique 1.2)');
      assert.ok(plant('Come mai?').targetWords.includes('come'), 'the first word of a multi-word answer (critique 1.2)');
    } else {
      assert.deepEqual(plant('Ahora.').forms, ['ahora']);
      assert.ok(plant('Otra vez.').targetWords.includes('vez'));
      assert.ok(answerLeaks(content, { ...first, text: `${first.text} Quien.` }).targetWords.length > 0, 'the allowlist is what lets quien through');
    }
    const glossed = { ...first, glossary: [...first.glossary, { word: first.glossary[0].word, meaning: 'stop (doing something)' }] };
    assert.deepEqual(answerLeaks(content, glossed, ALLOWED[code]).meanings, [first.glossary[0].word], `${code}: parentheses stripped (critique 1.1)`);
  }
});

async function editedContent(edit) {
  const dir = await makeTempDir('parallang-inscriptions-content-');
  await cp(join(root, 'content'), dir, { recursive: true });
  const file = join(dir, 'languages/es/lore/inscriptions.yaml');
  const data = yaml.load(await readFile(file, 'utf8'));
  edit(data.inscriptions);
  await writeFile(file, yaml.dump(data));
  return dir;
}

test('the loader refuses an unknown location, two at one place and a glossary word not in the text', async () => {
  const cases = [
    [(list) => { list[0].location = 'atlantis'; }, /unknown location atlantis/],
    [(list) => { list[1].location = 'market_entrance'; }, /market_entrance already has an inscription/],
    [(list) => { list[0].glossary.push({ word: 'gato', meaning: 'cat' }); }, /glosses "gato"/],
  ];
  for (const [edit, message] of cases) {
    const dir = await editedContent(edit);
    assert.throws(() => loadGameContent({ language: 'es', contentDir: dir }), message);
  }
});

async function setup() {
  const dir = await makeTempDir('parallang-inscriptions-');
  const content = loadGameContent({ language: 'es' });
  const storage = new JsonLearningStorage({ saveDir: dir });
  const service = new LearningService({ provider: new FixtureProvider(), storage, content, clock: () => fixedNow });
  const { learnerId } = await service.createOrRecoverLearner();
  return { content, storage, service, learnerId };
}

test('the map carries the text of current and visited places only, never the translation', async (t) => {
  const { service, learnerId, content } = await setup();
  t.after(() => service.shutdown());
  const { world } = await service.getWorld(learnerId);
  const node = (id) => world.locations.find((location) => location.id === id);
  const keystone = content.inscriptionsByLocation.get('market_entrance');
  assert.deepEqual(node('market_entrance').inscription, { id: 'keystone', where: keystone.where, text: keystone.text });
  assert.equal(node('coffee_cart').state, 'known');
  assert.equal(node('coffee_cart').inscription, undefined, 'an unvisited place shows nothing');
  const moved = await service.moveTo(learnerId, { locationId: 'coffee_cart' });
  const here = moved.world.locations.find((location) => location.id === 'coffee_cart');
  const back = moved.world.locations.find((location) => location.id === 'market_entrance');
  assert.equal(here.inscription.id, 'menu_board');
  assert.equal(back.state, 'visited');
  assert.equal(back.inscription.id, 'keystone');
  assert.ok(!JSON.stringify(moved.world).includes(keystone.translation), 'no English translation on the map');
});

test('the Spellbook keeps visited places\' inscriptions in file order; a move returns it from the staged save', async (t) => {
  const { service, learnerId } = await setup();
  t.after(() => service.shutdown());
  const first = await service.getSpellbook(learnerId);
  assert.deepEqual(first.inscriptions.map((i) => i.id), ['keystone']);
  const [keystone] = first.inscriptions;
  assert.equal(keystone.locationName, 'Market Entrance');
  assert.equal(keystone.hidden, false);
  assert.ok(keystone.translation.startsWith('Whoever enters'));
  assert.ok(keystone.glossary.length >= 3);
  const moved = await service.moveTo(learnerId, { locationId: 'coffee_cart' });
  assert.deepEqual(moved.spellbook.inscriptions.map((i) => i.id), ['keystone', 'menu_board'], 'the new place is in at once');
  const again = await service.moveTo(learnerId, { locationId: 'coffee_cart' });
  assert.deepEqual(again.spellbook.inscriptions.map((i) => i.id), ['keystone', 'menu_board'], 'an unchanged move returns it too');
  await service.moveTo(learnerId, { locationId: 'market_entrance' });
  assert.deepEqual((await service.getSpellbook(learnerId)).inscriptions.map((i) => i.id), ['keystone', 'menu_board'], 'file order, not visit order');
});

test('during an encounter the translation and glossary are withheld; over HTTP the move carries the Spellbook', async (t) => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  const identity = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const learnerId = identity.data.learnerId;
  const started = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'market_entrance_tutorial' } });
  assert.equal(started.status, 200);
  const [held] = started.data.spellbook.inscriptions;
  assert.deepEqual({ hidden: held.hidden, translation: held.translation, glossary: held.glossary }, { hidden: true, translation: null, glossary: null });
  assert.ok(held.text.length > 0, 'the text stays: it holds no answer');
  const moved = await api(runtime, '/api/world/move', { learnerId, method: 'POST', body: { locationId: 'coffee_cart' } });
  assert.equal(moved.status, 200);
  assert.deepEqual(moved.data.spellbook.inscriptions.map((i) => [i.id, i.hidden]), [['keystone', true], ['menu_board', true]]);
  assert.equal(moved.data.world.currentLocationId, 'coffee_cart');
});

test('a move to the Rift returns its pending drill; walking away clears it (critique 1.3)', async (t) => {
  const { service, learnerId, storage, content } = await setup();
  t.after(() => service.shutdown());
  const envelope = await storage.load(learnerId);
  envelope.world = {
    currentLocationId: 'old_bookshop', visitedLocationIds: ['market_entrance', 'old_bookshop'],
    completedEncounterIds: ['market_entrance_tutorial', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm'],
  };
  envelope.spellbook.words.ahora = {
    vocabularyId: 'ahora', contentVersion: content.entryVersion('ahora'), discoveredAt: '2026-01-12T12:00:00.000Z', discoverySource: 'encounter_exposure', evidence: [],
    schedule: { ease: 2.5, repetitions: 0, intervalDays: 0, dueAt: '2026-01-14T12:00:00.000Z', lastReviewedAt: null, lastQuality: null },
  };
  await storage.save(envelope);
  assert.equal((await service.getSpellbook(learnerId)).drill, null);
  const there = await service.moveTo(learnerId, { locationId: 'the_rift' });
  assert.deepEqual(there.spellbook.drill?.vocabularyIds, ['ahora']);
  assert.equal(there.spellbook.inscriptions.at(-1).id, 'seam');
  const away = await service.moveTo(learnerId, { locationId: 'old_bookshop' });
  assert.equal(away.spellbook.drill, null);
});
