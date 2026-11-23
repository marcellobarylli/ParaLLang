// Round 158 (issue #4): deep truths about the world exist only in the language being learned. They are set into the
// narrator's written passages as spans of their own kind; the server holds no translation of them, sends none and
// offers no hint; the guidebook explains the colour once and keeps the passages for a later reading.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';
import { passageView, selectPassage, toSegments, truthIds } from '../src/narration.js';
import { api, createRuntime } from './helpers.js';
import { moveTo, road, roadRuntime, talkHere } from './road-helpers.js';

const contentDir = resolve(import.meta.dirname, '..', '..', 'content');
const it = loadGameContent({ language: 'it' });
const es = loadGameContent({ language: 'es' });
const pack = (content) => ({ truths: content.truths, lang: content.language.tag });

test('both packs have the same texts, each in its own language only, and harder as the truth gets deeper', () => {
  assert.deepEqual([...it.truths.keys()], [...es.truths.keys()]);
  assert.equal(it.truths.size, 13); // ten on the road (round 158), three that characters utter (round 159)
  assert.equal(it.truths.get('wake_of_a_stitch').text, 'Torna indietro! Oltre giace la scia di un punto.'); // the issue's own
  for (const content of [it, es]) {
    for (const truth of content.truths.values()) {
      assert.deepEqual(Object.keys(truth).sort(), ['id', 'level', 'text'], 'no field could hold a translation');
      assert.doesNotMatch(truth.text, /\b(the|road|thread|stitch|world)\b/i, `${truth.id} holds no English`);
    }
  }
  // The harder the level, the longer the sentence, on average: the plain statements are short, the deep ones are not.
  const mean = (level) => { const of = [...it.truths.values()].filter((truth) => truth.level === level); return of.reduce((sum, truth) => sum + truth.text.length, 0) / of.length; };
  assert.ok(mean('A1') < mean('A2') && mean('A2') < mean('B1') && mean('B1') < mean('B2'));
});

test('no English of them is anywhere the server loads: the meanings are in the vault alone', () => {
  const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]));
  const loaded = [...files(contentDir), ...files(resolve(contentDir, '..', 'prompts'))].map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(loaded, /wake of a stitch|is not a road|walked on a web|were sewn|sewn to another|leaves a thread|sinking ship|was a mistake/i);
  const vault = readFileSync(resolve(contentDir, '..', 'parallang_obsidian', 'Understood Later.md'), 'utf8');
  for (const truth of it.truths.values()) assert.ok(vault.includes(truth.text), `the vault lists ${truth.id}`);
  for (const truth of es.truths.values()) assert.ok(vault.includes(truth.text), `the vault lists the Spanish ${truth.id}`);
  assert.match(vault, /the wake of a stitch/i);
});

test('a passage with a text is sent as a plain segment and a segment of the kind "truth", in the pack\'s language', () => {
  assert.deepEqual(truthIds('a {truth:not_a_road} b {truth:a_thread_passes}'), ['not_a_road', 'a_thread_passes']);
  const view = passageView(it.passagesById.get('truth_forest_edge'), pack(it));
  assert.deepEqual(view, { id: 'truth_forest_edge', segments: [
    { text: 'You walk to the edge of the forest, peering into the darkness between the trees. Etched into the wood you see a crude message: ' },
    { text: 'Torna indietro! Oltre giace la scia di un punto.', kind: 'truth', lang: 'it-IT' },
  ] });
  assert.equal(passageView(es.passagesById.get('truth_forest_edge'), pack(es)).segments[1].text, '¡Vuelve atrás! Más allá yace la estela de una puntada.');
  assert.equal(passageView(es.passagesById.get('truth_forest_edge'), pack(es)).segments[1].lang, 'es-ES');
  // Text after a span, and a pack that does not have the text.
  assert.deepEqual(toSegments('Before {truth:not_a_road} after.', pack(it)), [{ text: 'Before ' }, { text: 'La strada non è una strada.', kind: 'truth', lang: 'it-IT' }, { text: ' after.' }]);
  assert.deepEqual(toSegments('Before {truth:not_a_road} after.'), [{ text: 'Before ' }, { text: ' after.' }]);
  // A segment carries nothing but the text: no translation, no gloss, no id to ask a hint with.
  for (const passage of it.passages) for (const segment of passageView(passage, pack(it)).segments) assert.ok(Object.keys(segment).every((key) => ['text', 'kind', 'lang'].includes(key)));
});

test('every passage that holds a text leads up to it and says nothing of what it means; each is told once', () => {
  const holding = it.passages.filter((passage) => truthIds(passage.text).length);
  assert.ok(holding.length >= 10);
  for (const passage of holding) {
    assert.match(passage.text, /: \{truth:[a-z_]+\}$/, `${passage.id} ends on the text, after a colon`);
    assert.doesNotMatch(passage.text, /\b(means|says that|translat|in other words)\b/i);
    if (passage.when.event === 'road_arrive') assert.equal(passage.once, true, `${passage.id} is told once`);
  }
  // Every text is set somewhere: in a passage, or in what a character utters after an encounter (round 159).
  const uttered = [...it.encounters.values()].flatMap(({ encounter }) => truthIds(encounter.revelation?.text ?? ''));
  assert.deepEqual([...new Set([...holding.flatMap((passage) => truthIds(passage.text)), ...uttered])].sort(), [...it.truths.keys()].sort());
});

test('a harder text waits for its stage, and a passage may wait for a number of conversations', () => {
  const arrive = (facts) => ({ event: 'road_arrive', way: 'path', cover: 'meadow', kind: 'lesson', cefr: 'A1', step: 0, ...facts });
  const told = (facts, have = {}) => selectPassage(it.passages, arrive(facts), { told: have })?.id;
  assert.equal(told({ cover: 'forest', step: 1 }), 'path_forest');
  assert.equal(told({ cover: 'forest', step: 2 }), 'truth_forest_edge');
  assert.equal(told({ cover: 'forest', step: 9 }, { truth_forest_edge: 'x' }), 'path_forest');
  assert.equal(told({ step: 4 }), 'path_meadow');
  assert.equal(told({ step: 5 }), 'truth_milestone');
  assert.equal(told({ cover: 'highland', cefr: 'A2', step: 50 }, { truth_path_a2: 'x' }), 'path_highland');
  assert.equal(told({ cover: 'highland', cefr: 'B1', step: 90 }, { truth_path_b1: 'x' }), 'truth_highland_b1');
  for (const passage of it.passages.filter((entry) => entry.when.cefr)) {
    const levels = truthIds(passage.text).map((id) => it.truths.get(id).level);
    assert.ok(levels.every((level) => level <= passage.when.cefr), `${passage.id} is not harder than its stage`);
  }
});

test('on the road: the first forest after two conversations tells the text; the guidebook explains the colour and keeps the passage', async (t) => {
  const { runtime, learnerId } = await roadRuntime(t);
  await road(runtime, learnerId);
  let found = null;
  for (let walked = 0; walked < 60 && !found; walked += 1) {
    await talkHere(runtime, learnerId);
    const view = (await road(runtime, learnerId)).data.road;
    const moved = (await moveTo(runtime, learnerId, (view.frontier.find((site) => site.cover === 'forest') ?? view.frontier.find((site) => site.recommended) ?? view.frontier[0]).id)).data;
    if (moved.road.narration?.segments.some((segment) => segment.kind === 'truth')) found = moved;
  }
  assert.ok(found, 'a passage with a text was told within sixty conversations');
  const span = found.road.narration.segments.find((segment) => segment.kind === 'truth');
  assert.ok([...it.truths.values()].some((truth) => truth.text === span.text));
  assert.equal(span.lang, 'it-IT');
  // The guidebook's entry for the colour was entered with it, unread.
  assert.ok(found.guidebook.unread.some((entry) => entry.id === 'turmeric_text'));
  assert.match(found.guidebook.unread.find((entry) => entry.id === 'turmeric_text').segments[0].text, /^Turmeric coloured text cannot be translated\./);
  // And the guidebook keeps the passage, to be read again later.
  const book = (await api(runtime, '/api/guidebook', { learnerId })).data.guidebook;
  assert.deepEqual(book.fragments.map((fragment) => fragment.id), [found.road.narration.id]);
  assert.deepEqual(book.fragments[0].segments, found.road.narration.segments);
  assert.ok(Number.isFinite(Date.parse(book.fragments[0].at)));
  // Nothing the learner was sent holds a translation of it.
  assert.doesNotMatch(JSON.stringify([found, book]), /wake of a stitch|not a road|a thread passes|is a knot/i);
});

test('a dungeon: the library\'s lintel holds a text, and a walk there keeps it for the guidebook', async (t) => {
  const runtime = await createRuntime({ language: 'it' });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const envelope = await runtime.storage.load(learnerId);
  // A run that has walked to the library (the walk there needs sites cleared and a level; the save is set up directly).
  await runtime.storage.save({ ...envelope, progression: { xp: 5000 }, dungeons: { ta_prohm: { run: 1, at: 'sunlit_court', cleared: ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court'], visited: ['face_gate', 'buttress_tree', 'root_court', 'sunlit_court'] } } });
  const moved = await api(runtime, '/api/dungeons/ta_prohm/move', { learnerId, method: 'POST', body: { siteId: 'library', client: 121 } });
  assert.equal(moved.status, 200);
  assert.equal(moved.data.narration.id, 'ta_prohm_library');
  assert.deepEqual(moved.data.narration.segments.at(-1), { text: it.truths.get('roots_and_roads').text, kind: 'truth', lang: 'it-IT' });
  assert.ok(moved.data.guidebook.unread.some((entry) => entry.id === 'turmeric_text'));
  const book = (await api(runtime, '/api/guidebook', { learnerId })).data.guidebook;
  assert.deepEqual(book.fragments.map((fragment) => fragment.id), ['ta_prohm_library']);
});

test('a pack with texts must have every one a passage names; a pack with none plays without those passages', async (t) => {
  const copy = async (edit) => {
    const dir = await mkdtemp(join(tmpdir(), 'parallang-truths-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    await cp(contentDir, dir, { recursive: true });
    await edit(dir);
    return dir;
  };
  const missing = await copy((dir) => writeFile(join(dir, 'languages/it/lore/truths.yaml'), 'truths:\n  - id: not_a_road\n    level: A1\n    text: "La strada non è una strada."\n'));
  assert.throws(() => loadGameContent({ contentDir: missing, language: 'it' }), /names the untranslatable text \w+, which the Italian pack does not have/);
  const translated = await copy((dir) => writeFile(join(dir, 'languages/it/lore/truths.yaml'), 'truths:\n  - id: not_a_road\n    level: A1\n    text: "La strada non è una strada."\n    translation: "The road is not a road."\n'));
  assert.throws(() => loadGameContent({ contentDir: translated, language: 'it' }), /translation/);
  const none = await copy((dir) => rm(join(dir, 'languages/it/lore/truths.yaml')));
  const bare = loadGameContent({ contentDir: none, language: 'it' });
  assert.equal(bare.truths.size, 0);
  assert.ok(bare.passages.length > 20);
  assert.ok(bare.passages.every((passage) => truthIds(passage.text).length === 0));
});
