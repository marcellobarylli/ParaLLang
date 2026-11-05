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
const IDS = ['journey_first_stitch', 'journey_sirens', 'journey_shroud', 'journey_dead_branch', 'journey_forbidden_herd', 'journey_lotus', 'journey_old_dog'];

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

test('both packs hold the same seven fragments, after the same encounters, with the same English text', () => {
  const [it, es] = ['it', 'es'].map((code) => loadGameContent({ language: code }).fragments);
  assert.deepEqual(it.map((f) => f.id), IDS);
  assert.deepEqual(it.map((f) => f.found_after), ['old_bookshop_bookworm', 'cracked_fountain_letharger', 'the_rift_errata', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm']);
  assert.deepEqual(it.map((f) => f.after_conversations), [undefined, undefined, undefined, 3, 3, 3, 3], 'rounds 032, 033: after three party conversations');
  const english = (fragments) => fragments.map(({ id, title, found_after, after_conversations, found, translation }) => ({ id, title, found_after, after_conversations, found, translation }));
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

// Round 032 (critique 1.5): a conversation fragment shows during later conversations with its member, so its text
// and glossary hold no word starting with a stem (first 4 folded letters) of a party conversation's targets. Round 033
// (critique 1.2, 1.3): every word of 4 letters or more of a multi-word form gives a stem, and every fragment is checked
// against every party conversation, since the Spellbook shows all found texts during any of them.
function partyStems(content) {
  const ids = [...content.encounters.values()].filter(({ encounter }) => encounter.party_of)
    .flatMap(({ encounter }) => encounter.objectives.flatMap((o) => o.target_vocabulary_ids));
  return [...new Set(ids.flatMap((id) => content.vocabularyById.get(id).surface_variants)
    .flatMap((form) => foldWords(form).trim().split(' ')).filter((word) => word.length >= 4).map((word) => word.slice(0, 4)))];
}
function stemLeaks(content, fragment) {
  const words = foldWords([fragment.text, ...fragment.glossary.map((entry) => entry.word)].join(' ')).trim().split(' ');
  return partyStems(content).filter((stem) => words.some((word) => word.startsWith(stem)));
}

test('no fragment holds a stem of any party conversation\'s targets; the check is live', () => {
  const expected = {
    it: ['buon', 'otti', 'graz', 'mill', 'piac', 'anco', 'andi', 'insi', 'mera', 'nuov'],
    es: ['buen', 'deli', 'grac', 'much', 'gust', 'poco', 'vamo', 'junt', 'prec', 'otra'],
  };
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    assert.deepEqual(partyStems(content).sort(), expected[code].sort(), `${code} stems, multi-word forms split`);
    assert.equal(content.fragments.filter((f) => f.after_conversations !== undefined).length, 4, 'round 033: Gerald, Mortimer, Flick, Marginalia');
    for (const each of content.fragments) assert.deepEqual(stemLeaks(content, each), [], `${code} ${each.id}`);
    const herd = content.fragments.find((f) => f.id === 'journey_forbidden_herd');
    const planted = code === 'it' ? [['Era buonissimo.', 'buon'], ['Insistevano.', 'insi']] : [['Era buenísimo.', 'buen'], ['Le gustaba.', 'gust'], ['Se juntaron.', 'junt']];
    for (const [sentence, stem] of planted) assert.deepEqual(stemLeaks(content, { ...herd, text: `${herd.text} ${sentence}` }), [stem], `${code} planted ${stem}`);
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
    // Round 032: conversation counts need a party conversation, and a whole number from 1.
    ['count without a party conversation', (f) => { f[0].found_after = 'market_entrance_tutorial'; f[0].after_conversations = 2; }, /counts conversations, but market_entrance_tutorial has no party conversation/],
    ['zero conversations', (f) => { f[3].after_conversations = 0; }, /after_conversations/],
    ['fractional conversations', (f) => { f[3].after_conversations = 1.5; }, /after_conversations/],
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

  await seed({ visitedLocationIds: ['market_entrance', 'old_bookshop', 'cracked_fountain'], completedEncounterIds: ['marginalia_fragment', 'imp_coffee_greeting'] });
  assert.deepEqual(await fragments(), [], 'a visit, a party conversation or Gerald\'s completion alone finds nothing');
  // Round 032: Gerald's fragment counts his member's conversations (two are not enough; a missing count reads as 0).
  const member = (conversations) => ({ characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z', conversations });
  for (const [party, ids] of [[[member(undefined)], []], [[member(2)], []], [[member(3)], ['journey_dead_branch']], [[member(9)], ['journey_dead_branch']], [[{ ...member(5), characterId: 'someone_else' }], []]]) {
    const envelope = await runtime.storage.load(learnerId); envelope.party = party; await runtime.storage.save(envelope);
    assert.deepEqual((await fragments()).map((f) => f.id), ids, JSON.stringify(party));
  }
  // Round 033: Mortimer, Flick and Marginalia unlock theirs the same way, each filed under its party conversation.
  const members = [['charcutier_mortimer_001', 'butchers_stall_charcutier'], ['letharger_flick_001', 'cracked_fountain_letharger'], ['bookworm_marginalia_001', 'old_bookshop_bookworm']]
    .map(([characterId, encounterId]) => (conversations) => ({ characterId, encounterId, joinedAt: '2026-01-15T12:00:00.000Z', conversations }));
  for (const [counts, ids] of [[[2, 2, 2], []], [[3, 2, 2], ['journey_forbidden_herd']], [[3, 3, 3], ['journey_forbidden_herd', 'journey_lotus', 'journey_old_dog']]]) {
    const envelope = await runtime.storage.load(learnerId); envelope.party = members.map((m, i) => m(counts[i])); await runtime.storage.save(envelope);
    const list = await fragments();
    assert.deepEqual(list.map((f) => f.id), ids, JSON.stringify(counts));
    if (ids.length === 3) {
      assert.deepEqual(list.map((f) => [f.encounterId, f.locationName, f.unlockedAt, f.conversations]), [
        ['mortimer_tasting', "The Butcher's Stall", 3, 3], ['flick_slow_walk', 'The Cracked Fountain', 3, 3], ['marginalia_fragment', 'The Old Bookshop', 3, 3],
      ]);
      assert.deepEqual(list.map((f) => f.toldBy), ['Mortimer', 'Flick', 'Marginalia'], 'round 036');
    }
  }
  { const envelope = await runtime.storage.load(learnerId); envelope.party = []; await runtime.storage.save(envelope); }

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

// Round 043 (backlog G1): the Party screen's hint agrees with what the Spellbook shows.
for (const language of ['it', 'es']) test(`the party snapshot counts down to each member's next story and agrees with the Spellbook (${language})`, async (t) => {
  const runtime = await createRuntime({ language });
  t.after(() => runtime.close());
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const member = (conversations) => ({ characterId: 'imp_coffee_001', encounterId: 'imp_coffee_greeting', joinedAt: '2026-01-15T12:00:00.000Z', conversations });
  for (const [conversations, nextStoryAt, storiesTold] of [[undefined, 3, 0], [2, 3, 0], [3, null, 1], [7, null, 1]]) {
    const envelope = await runtime.storage.load(learnerId); envelope.party = [member(conversations)]; await runtime.storage.save(envelope);
    const [gerald] = (await api(runtime, '/api/party', { learnerId })).data.party;
    assert.deepEqual([gerald.nextStoryAt, gerald.storiesTold], [nextStoryAt, storiesTold], String(conversations));
    const told = (await api(runtime, '/api/spellbook', { learnerId })).data.journeyFragments.filter((f) => f.toldBy === 'Gerald');
    assert.equal(told.length, storiesTold, 'the Spellbook holds as many of his stories as the hint says');
  }
  // A member with no conversation fragments (a pack without them) gets no hint.
  assert.deepEqual(runtime.service.storyProgress({ characterId: 'archway_portia_001', encounterId: 'market_entrance_tutorial', conversations: 4 }), { nextStoryAt: null, storiesTold: 0 });
  assert.deepEqual(runtime.service.storyProgress({ ...member(5), characterId: 'someone_else' }), { nextStoryAt: null, storiesTold: 0 }, 'matched as the Spellbook matches');
  // Two thresholds for one member: the nearer unreached one is next.
  const fragments = [...runtime.content.fragments, { ...runtime.content.fragments.find((f) => f.id === 'journey_dead_branch'), id: 'journey_test_later', after_conversations: 6 }];
  // Content is frozen: a stand-in `this` with the edited list (storyProgress reads only fragments and isHomeMember).
  const progress = (m) => runtime.service.storyProgress.call({ content: { fragments }, isHomeMember: (x, id) => runtime.service.isHomeMember(x, id) }, m);
  assert.deepEqual(progress(member(4)), { nextStoryAt: 6, storiesTold: 1 });
  assert.deepEqual(progress(member(1)), { nextStoryAt: 3, storiesTold: 0 });
  assert.deepEqual(progress(member(6)), { nextStoryAt: null, storiesTold: 2 });
});
