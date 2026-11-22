// Round 159 (issue #7): at certain points a character has come to know more of the world. When its encounter is
// completed the narrator tells what it then utters: a passage of lore in untranslatable text.
import assert from 'node:assert/strict';
import test from 'node:test';
import { loadGameContent } from '../src/content-loader.js';
import { truthIds } from '../src/narration.js';
import { REVELATION_PREFIX } from '../src/learning-service.js';
import { PassingProvider, api, createRuntime, passingAnswers } from './helpers.js';

const it = loadGameContent({ language: 'it' });
const es = loadGameContent({ language: 'es' });
const UTTERERS = ['high_gate_bambieshart', 'old_bookshop_bookworm', 'the_rift_errata'];

test('three encounters of the dead branch have a revelation, in both packs: the narrator\'s line, then one untranslatable text', () => {
  for (const content of [it, es]) {
    const having = [...content.encounters.values()].filter(({ encounter }) => encounter.revelation).map(({ encounter }) => encounter.id).sort();
    assert.deepEqual(having, UTTERERS);
    for (const id of having) {
      const { encounter, character } = content.encounters.get(id);
      const { text } = encounter.revelation;
      assert.match(text, new RegExp(`\\b${character.name}\\b`), `${id} names who speaks`);
      assert.match(text, / utters the following: \{truth:[a-z_]+\}$/, `${id} ends on the narrator's line and the text`);
      assert.equal(truthIds(text).length, 1);
      assert.ok(['B1', 'B2'].includes(content.truths.get(truthIds(text)[0]).level), 'what a character utters is harder than the road\'s signs');
      assert.doesNotMatch(text, /\b(means|translat|web|stitched|other worlds?)\b/i);
    }
  }
});

async function play(t, encounterId, { location = null } = {}) {
  const content = loadGameContent({ language: 'it' });
  const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  if (location) {
    const envelope = await runtime.storage.load(learnerId);
    await runtime.storage.save({ ...envelope, world: { ...envelope.world, currentLocationId: location, visitedLocationIds: [...new Set([...envelope.world.visitedLocationIds, location])] } });
  }
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId });
  return { runtime, content, learnerId, encounter };
}
const answerAll = async ({ runtime, content, learnerId, encounter }, encounterId) => {
  let session = encounter;
  let turn = null;
  for (const message of passingAnswers(content, encounterId)) {
    if (session.state !== 'ongoing') break;
    turn = await runtime.service.submitDialogue(learnerId, { encounterId: session.id, version: session.version, attemptId: `a-${message}`, message });
    session = turn.encounter;
  }
  return turn;
};

test('Bambieshart: nothing is uttered while the conversation runs; on completion the narrator tells it, and the guidebook keeps it', async (t) => {
  const game = await play(t, 'high_gate_bambieshart', { location: 'the_high_gate' });
  assert.equal(game.encounter.revelation, null);
  const turn = await answerAll(game, 'high_gate_bambieshart');
  assert.equal(turn.encounter.state, 'resolved');
  const { revelation } = turn.encounter;
  assert.equal(revelation.id, `${REVELATION_PREFIX}high_gate_bambieshart`);
  assert.equal(revelation.segments.length, 2);
  assert.match(revelation.segments[0].text, /^Bambieshart looks past you.*he utters the following: $/);
  assert.deepEqual(revelation.segments[1], { text: it.truths.get('inflection').text, kind: 'truth', lang: 'it-IT' });
  // The guidebook's entry on turmeric text is entered with it, and the reply says so.
  assert.deepEqual(turn.guidebook.unread.map((entry) => entry.id), ['turmeric_text']);
  // It is kept, and read again from the guidebook and from the conversation as the server still holds it.
  const save = await game.runtime.storage.load(game.learnerId);
  assert.ok(Object.hasOwn(save.told, `${REVELATION_PREFIX}high_gate_bambieshart`));
  const book = (await api(game.runtime, '/api/guidebook', { learnerId: game.learnerId })).data.guidebook;
  assert.deepEqual(book.fragments.map((fragment) => fragment.id), [revelation.id]);
  assert.deepEqual(book.fragments[0].segments, revelation.segments);
  const current = (await api(game.runtime, '/api/encounter/current', { learnerId: game.learnerId })).data.encounter;
  assert.deepEqual(current.revelation, revelation);
  assert.doesNotMatch(JSON.stringify([turn, book]), /sinking ship|bail/i);
});

test('an encounter without one has none, before and after', async (t) => {
  const game = await play(t, 'imp_coffee_greeting', { location: 'coffee_cart' });
  const turn = await answerAll(game, 'imp_coffee_greeting');
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.encounter.revelation, null);
  assert.equal(turn.guidebook, undefined);
  assert.equal((await game.runtime.storage.load(game.learnerId)).told, undefined);
});

test('in a dungeon the same characters utter the same: Ta Prohm\'s site before the sanctuary', async (t) => {
  const content = loadGameContent({ language: 'it' });
  const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const envelope = await runtime.storage.load(learnerId);
  await runtime.storage.save({ ...envelope, dungeons: { ta_prohm: { run: 1, at: 'before_sanctuary', cleared: [], visited: ['face_gate', 'before_sanctuary'] } } });
  const { encounter } = await runtime.service.startEncounter(learnerId, { dungeonId: 'ta_prohm' });
  assert.equal(encounter.encounterId, 'high_gate_bambieshart');
  const turn = await answerAll({ runtime, content, learnerId, encounter }, 'high_gate_bambieshart');
  assert.equal(turn.encounter.state, 'resolved');
  assert.equal(turn.encounter.revelation.segments.at(-1).kind, 'truth');
});

test('a pack that has texts must have the one a revelation names', async () => {
  const { cp, mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join, resolve } = await import('node:path');
  const dir = await mkdtemp(join(tmpdir(), 'parallang-revelation-'));
  try {
    await cp(resolve(import.meta.dirname, '..', '..', 'content'), dir, { recursive: true });
    const file = join(dir, 'languages/it/encounters/the_rift_errata.yaml');
    await writeFile(file, (await readFile(file, 'utf8')).replace('{truth:first_word_error}', '{truth:no_such_text}'));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'it' }), /Encounter the_rift_errata's revelation names the untranslatable text no_such_text/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
