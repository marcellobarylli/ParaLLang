// Round 111 (backlog B8): a redacted annex on containment file CM-001, read anyway at a cost (one hint fewer per
// objective in the next conversation the player finishes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import yaml from 'js-yaml';
import { foldWords, loadGameContent } from '../src/content-loader.js';
import { ALLOWED, answerLeaks } from './answer-check.js';
import { api, createLearnerAndEncounter, createRuntime, finishEncounter, makeTempDir } from './helpers.js';

const root = resolve(import.meta.dirname, '..', '..');
const ANNEX = 'cm001_second_verse';
const annexOf = (content) => content.encounters.get('cracked_fountain_letharger').encounter.containment_file.annex;
const fileOf = (spellbook) => spellbook.containmentFiles.find((file) => file.designation === 'CM-001');

async function seedFountain(runtime, learnerId) {
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, completedEncounterIds: [...envelope.world.completedEncounterIds, 'cracked_fountain_letharger'] };
  await runtime.storage.save(envelope);
}
const read = (runtime, learnerId, annexId = ANNEX) => api(runtime, '/api/spellbook/annex/read', { learnerId, method: 'POST', body: { annexId } });

// Round 112 (critique optional): every annex of the pack, so a new one is checked without a new test. The English
// shown (title, redaction, exposure note) and, after reading, the translation (critique 1.4) name no accepted
// translation of an objective target, except the companion's "I"/"you" in a redaction (round 111, decision 5).
const ENGLISH_ALLOWED = {
  it: { cm001_second_verse: ['i', 'you'], cm002_seam_minutes: ['i', 'you'] },
  es: { cm001_second_verse: ['i'], cm002_seam_minutes: ['i'] },
};
// CM-001's "finds it again" (round 111) names "again" (it Marginalia's *di nuovo* and Mortimer's *ancora*, es *otra vez*);
// the verse's *la ritrova* / *la vuelve a encontrar* gives no target form, and the translation is withheld during
// encounters. Allowed by name.
const TRANSLATION_ALLOWED = { it: { cm001_second_verse: ['again'] }, es: { cm001_second_verse: ['again'] } };
test('both packs hold the same annexes with the same English, and every text passes the answer check', () => {
  const annexes = {};
  for (const code of ['it', 'es']) {
    const content = loadGameContent({ language: code });
    annexes[code] = Object.fromEntries([...content.encounters.values()].filter(({ encounter }) => encounter.containment_file?.annex)
      .map(({ encounter }) => [encounter.containment_file.annex.id, encounter.containment_file.annex]));
    assert.deepEqual(Object.keys(annexes[code]).sort(), ['cm001_second_verse', 'cm002_seam_minutes'], code);
    const ids = new Set([...content.encounters.values()].flatMap(({ encounter }) => encounter.objectives.flatMap((o) => o.target_vocabulary_ids)));
    const meanings = new Set([...ids].flatMap((id) => content.vocabularyById.get(id).accepted_translations.map((m) => foldWords(m).trim())));
    const hitsIn = (text) => { const english = ` ${foldWords(text).trim()} `; return [...meanings].filter((m) => m && english.includes(` ${m} `)).sort(); };
    for (const annex of Object.values(annexes[code])) {
      assert.deepEqual(answerLeaks(content, annex, ALLOWED.fragments[code]), { forms: [], targetWords: [], meanings: [] }, `${code} ${annex.id}`);
      // Each allowed word must still be a hit, so the list stays honest.
      assert.deepEqual(hitsIn(`${annex.title} ${annex.redaction} ${annex.exposure_note}`), ENGLISH_ALLOWED[code][annex.id], `${code} ${annex.id} English`);
      assert.deepEqual(hitsIn(annex.translation), TRANSLATION_ALLOWED[code][annex.id] ?? [], `${code} ${annex.id} translation`);
    }
  }
  for (const id of Object.keys(annexes.it)) {
    for (const key of ['id', 'title', 'redaction', 'translation', 'exposure_note']) assert.equal(annexes.it[id][key], annexes.es[id][key], `${id} ${key}`);
    assert.equal(annexes.it[id].glossary.length, annexes.es[id].glossary.length, id);
  }
});

test('the loader rejects a malformed annex', async () => {
  const fountain = 'languages/es/encounters/cracked_fountain_letharger.yaml';
  const cases = [
    ['unknown key', (e) => { e.containment_file.annex.colour = 'black'; }, /colour/],
    ['missing redaction', (e) => { delete e.containment_file.annex.redaction; }, /redaction/],
    ['gloss not in text', (e) => { e.containment_file.annex.glossary[0].word = 'zanahoria'; }, /glosses "zanahoria"/],
    ['short glossary', (e) => { e.containment_file.annex.glossary = e.containment_file.annex.glossary.slice(0, 3); }, /glossary/],
  ];
  for (const [name, change, error] of cases) {
    const dir = await makeTempDir('parallang-annex-');
    await cp(join(root, 'content'), dir, { recursive: true });
    const value = yaml.load(await readFile(join(dir, fountain), 'utf8'));
    change(value);
    await writeFile(join(dir, fountain), yaml.dump(value));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), error, name);
  }
});

test('reading the annex: not filed, in an encounter, unknown; then read once, with no text before', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const session = await createLearnerAndEncounter(runtime);
  const { learnerId } = session;

  let response = await read(runtime, learnerId);
  assert.equal(response.status, 409);
  assert.equal(response.data.error.code, 'NOT_FILED');
  await seedFountain(runtime, learnerId);

  // Gerald's encounter is under way: the redaction holds, and the file shows no text, translation or glossary.
  response = await read(runtime, learnerId);
  assert.equal(response.status, 409);
  assert.equal(response.data.error.code, 'IN_ENCOUNTER');
  let spellbook = (await api(runtime, '/api/spellbook', { learnerId })).data;
  assert.deepEqual(
    { ...fileOf(spellbook).annex },
    {
      id: ANNEX, title: 'Annex A: the second verse', redaction: annexOf(runtime.content).redaction, read: false, readAt: null,
      strainPending: false, strainQueue: null, hidden: true, text: null, translation: null, glossary: null, exposureNote: null,
    },
  );
  assert.equal(JSON.stringify(spellbook).includes(annexOf(runtime.content).text), false);

  await finishEncounter(runtime, session);
  for (const annexId of ['nope', '', 7]) {
    response = await api(runtime, '/api/spellbook/annex/read', { learnerId, method: 'POST', body: { annexId } });
    assert.equal(response.status, 404, String(annexId));
    assert.equal(response.data.error.code, 'NOT_FOUND');
  }

  response = await read(runtime, learnerId);
  assert.equal(response.status, 200);
  assert.equal(response.data.charged, true);
  const annex = fileOf(response.data.spellbook).annex;
  assert.equal(annex.read, true);
  assert.equal(annex.strainPending, true);
  assert.equal(annex.text, annexOf(runtime.content).text);
  assert.equal(annex.translation, annexOf(runtime.content).translation);
  assert.equal(annex.glossary.length, annexOf(runtime.content).glossary.length);
  assert.match(annex.exposureNote, /^Exposure log/);
  assert.equal(annex.readAt, '2026-01-15T12:00:00.000Z');

  response = await read(runtime, learnerId);
  assert.equal(response.data.charged, false);
  // Review R1.11: during a conversation even an annex already read is refused (the encounter check comes first).
  await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { restart: true } });
  response = await read(runtime, learnerId);
  assert.equal(response.status, 409);
  assert.equal(response.data.error.code, 'IN_ENCOUNTER');
  const saved = await runtime.storage.load(learnerId);
  assert.deepEqual(saved.annexes, [{ id: ANNEX, readAt: '2026-01-15T12:00:00.000Z', strainSpentOn: null }]);
});

test('the strain: the next conversation has a hint fewer per objective until one is finished', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const identity = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const { learnerId } = identity.data;
  await seedFountain(runtime, learnerId);
  assert.equal((await read(runtime, learnerId)).data.charged, true);
  const limit = runtime.content.encounters.get('imp_coffee_greeting').encounter.objectives[0].hint_limit;
  assert.ok(limit >= 2);

  const start = async (restart = false) => (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { restart } })).data;
  let started = await start();
  let encounter = started.encounter;
  assert.deepEqual(encounter.hints, { used: 0, remaining: limit - 1, limit: limit - 1, baseLimit: limit, strained: true });
  // During the conversation the read annex keeps its text but not its translation.
  assert.equal(fileOf(started.spellbook).annex.translation, null);
  assert.equal(fileOf(started.spellbook).annex.text, annexOf(runtime.content).text);

  // The reduced limit is the one revealHelp enforces.
  const active = encounter.transcript.at(-1);
  const help = (body) => api(runtime, '/api/encounter/help', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, messageId: active.id, ...body } });
  for (let used = 0; used < limit - 1; used += 1) {
    const words = active.dialogue.words.map((word) => word.vocabularyId);
    const response = used < words.length ? await help({ kind: 'word', vocabularyId: words[used] }) : await help({ kind: 'sentence' });
    assert.equal(response.data.charged, true);
    encounter = response.data.encounter;
  }
  const exhausted = await help({ kind: 'sentence' });
  assert.equal(exhausted.status, 409);
  assert.equal(exhausted.data.error.code, 'HINTS_EXHAUSTED');

  // A resume keeps it; a restart does not spend it.
  assert.equal((await start()).encounter.hints.strained, true);
  started = await start(true);
  assert.equal(started.encounter.hints.strained, true);
  assert.equal(started.encounter.hints.limit, limit - 1);

  // Finishing the conversation spends it, in the resolving turn's save and Spellbook.
  const resolved = await runtime.service.submitDialogue(learnerId, {
    encounterId: started.encounter.id, version: started.encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.',
  });
  assert.equal(resolved.encounter.state, 'resolved');
  assert.equal(resolved.encounter.hints.strained, true);
  assert.equal(fileOf(resolved.spellbook).annex.strainPending, false);
  const saved = await runtime.storage.load(learnerId);
  assert.deepEqual(saved.annexes, [{ id: ANNEX, readAt: '2026-01-15T12:00:00.000Z', strainSpentOn: 'imp_coffee_greeting' }]);

  started = await start(true);
  assert.deepEqual(started.encounter.hints, { used: 0, remaining: limit, limit, baseLimit: limit, strained: false });
});

test('a save drops malformed and repeated annex records and refuses a non-array', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId } = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data;
  const path = join(runtime.saveDir, `${learnerId}.json`);
  const raw = JSON.parse(await readFile(path, 'utf8'));
  const good = { id: ANNEX, readAt: '2026-01-15T12:00:00.000Z', strainSpentOn: null };
  raw.annexes = [good, { ...good, strainSpentOn: 'x' }, { id: '', readAt: good.readAt, strainSpentOn: null }, { id: 'a', readAt: 'never', strainSpentOn: null }, null, 'x'];
  await writeFile(path, JSON.stringify(raw));
  assert.deepEqual((await runtime.storage.load(learnerId)).annexes, [good]);
  // Round 112 (review optional): the order of reads survives a load (it decides which read strains first), and a
  // repeat keeps the first record in its place.
  const rift = { id: 'cm002_seam_minutes', readAt: '2026-01-15T11:00:00.000Z', strainSpentOn: null };
  raw.annexes = [rift, good, { ...rift, readAt: '2026-01-15T13:00:00.000Z' }];
  await writeFile(path, JSON.stringify(raw));
  assert.deepEqual((await runtime.storage.load(learnerId)).annexes, [rift, good]);
  raw.annexes = { [ANNEX]: good };
  await writeFile(path, JSON.stringify(raw));
  await assert.rejects(runtime.storage.load(learnerId), (error) => error.code === 'SAVE_UNREADABLE');
});

// Critique 1.5: the resolving turn's receipt carries the spend; a replay spends nothing again, a failed save nothing.
test('the spend: a failed resolving save leaves it pending; a replay of the resolving turn does not spend twice', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId } = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data;
  await seedFountain(runtime, learnerId);
  await read(runtime, learnerId);
  const { encounter } = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} })).data;
  const turn = { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.' };

  const save = runtime.storage.save;
  runtime.storage.save = async () => { throw Object.assign(new Error('disk full'), { code: 'STORAGE_FAILURE' }); };
  await assert.rejects(runtime.service.submitDialogue(learnerId, turn));
  runtime.storage.save = save;
  assert.deepEqual((await runtime.storage.load(learnerId)).annexes.map((r) => r.strainSpentOn), [null]);

  const resolved = await runtime.service.submitDialogue(learnerId, turn);
  assert.equal(resolved.encounter.state, 'resolved');
  const replayed = await runtime.service.submitDialogue(learnerId, turn);
  assert.equal(replayed.replayed, true);
  assert.equal(fileOf(replayed.spellbook).annex.strainPending, false);
  assert.deepEqual((await runtime.storage.load(learnerId)).annexes, [{ id: ANNEX, readAt: '2026-01-15T12:00:00.000Z', strainSpentOn: 'imp_coffee_greeting' }]);
  const next = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { restart: true } })).data.encounter;
  assert.equal(next.hints.strained, false);
});

// Critique 1.6: a read annex the content no longer holds neither strains a session nor is spent.
test('an annex record unknown to the content does not strain and stays as it was', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId } = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data;
  const envelope = await runtime.storage.load(learnerId);
  envelope.annexes = [{ id: 'retired_annex', readAt: '2026-01-15T12:00:00.000Z', strainSpentOn: null }];
  await runtime.storage.save(envelope);
  const { encounter } = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} })).data;
  assert.equal(encounter.hints.strained, false);
  await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.' });
  assert.deepEqual((await runtime.storage.load(learnerId)).annexes, [{ id: 'retired_annex', readAt: '2026-01-15T12:00:00.000Z', strainSpentOn: null }]);
});

// Critique 1.11: the floor. An objective with one hint has none in a strained session.
test('a strained objective with one hint has none: no hints available, the first reveal is refused', async (t) => {
  const dir = await makeTempDir('parallang-annex-floor-');
  await cp(join(root, 'content'), dir, { recursive: true });
  const path = join(dir, 'languages/es/encounters/imp_coffee_greeting.yaml');
  const value = yaml.load(await readFile(path, 'utf8'));
  value.objectives[0].hint_limit = 1;
  await writeFile(path, yaml.dump(value));
  const runtime = await createRuntime({ content: loadGameContent({ contentDir: dir, language: 'es' }) });
  t.after(runtime.close);
  const { learnerId } = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data;
  await seedFountain(runtime, learnerId);
  await read(runtime, learnerId);
  const { encounter } = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: {} })).data;
  assert.deepEqual(encounter.hints, { used: 0, remaining: 0, limit: 0, baseLimit: 1, strained: true });
  assert.equal(encounter.hints_available, false);
  const active = encounter.transcript.at(-1);
  const refused = await api(runtime, '/api/encounter/help', { learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, messageId: active.id, kind: 'sentence' } });
  assert.equal(refused.status, 409);
  assert.equal(refused.data.error.code, 'HINTS_EXHAUSTED');
});

// Round 112: the annex on CM-002 (Errata), filed with the Rift, not with the Fountain.
const RIFT_ANNEX = 'cm002_seam_minutes';
const others = ['market_entrance_tutorial', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm'];
async function seedWorld(runtime, learnerId, completedEncounterIds, currentLocationId = 'market_entrance') {
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { ...envelope.world, currentLocationId, visitedLocationIds: [...new Set([...envelope.world.visitedLocationIds, 'market_entrance', currentLocationId])], completedEncounterIds };
  await runtime.storage.save(envelope);
}

test('CM-002\'s annex: not filed with only the Fountain done; refused during a Rift restart; read after', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId } = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data;
  await seedWorld(runtime, learnerId, others);
  let response = await read(runtime, learnerId, RIFT_ANNEX);
  assert.equal(response.status, 409);
  assert.equal(response.data.error.code, 'NOT_FILED');

  await seedWorld(runtime, learnerId, [...others, 'the_rift_errata'], 'the_rift');
  const started = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { restart: true, encounterId: 'the_rift_errata' } });
  assert.equal(started.status, 200);
  assert.equal(started.data.encounter.encounterId, 'the_rift_errata');
  const rift = started.data.spellbook.containmentFiles.find((file) => file.designation === 'CM-002');
  assert.equal(rift.annex.read, false);
  assert.equal(rift.annex.text, null);
  response = await read(runtime, learnerId, RIFT_ANNEX);
  assert.equal(response.status, 409);
  assert.equal(response.data.error.code, 'IN_ENCOUNTER');

  runtime.service.encounters.delete(learnerId); // as after a server restart: no conversation is held
  response = await read(runtime, learnerId, RIFT_ANNEX);
  assert.equal(response.status, 200);
  assert.equal(response.data.charged, true);
  const annex = response.data.spellbook.containmentFiles.find((file) => file.designation === 'CM-002').annex;
  const source = runtime.content.encounters.get('the_rift_errata').encounter.containment_file.annex;
  assert.equal(annex.text, source.text);
  assert.equal(annex.translation, source.translation);
  assert.equal(fileOf(response.data.spellbook).annex.read, false, 'CM-001\'s annex stays unread');
});

// Critique 1.5: two reads pending strain one conversation each, oldest first; never two hints fewer.
test('two annexes read: each strains its own finished conversation, the oldest first, without stacking', async (t) => {
  const runtime = await createRuntime();
  t.after(runtime.close);
  const { learnerId } = (await api(runtime, '/api/learner', { method: 'POST', body: {} })).data;
  await seedWorld(runtime, learnerId, [...others, 'the_rift_errata'], 'coffee_cart');
  assert.equal((await read(runtime, learnerId, RIFT_ANNEX)).data.charged, true);
  assert.equal((await read(runtime, learnerId, ANNEX)).data.charged, true);
  const limit = runtime.content.encounters.get('imp_coffee_greeting').encounter.objectives[0].hint_limit;
  const files = async () => (await api(runtime, '/api/spellbook', { learnerId })).data.containmentFiles.map((file) => [file.annex.strainPending, file.annex.strainQueue]);
  assert.deepEqual(await files(), [[true, 1], [true, 0]], 'CM-002 was read first, so it strains the next conversation');

  const play = async () => {
    const { encounter } = (await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { restart: true, encounterId: 'imp_coffee_greeting' } })).data;
    const hints = encounter.hints;
    const strainedBy = runtime.service.encounters.get(learnerId).strainedBy ?? [];
    const resolved = await runtime.service.submitDialogue(learnerId, { encounterId: encounter.id, version: encounter.version, attemptId: randomUUID(), message: 'Quiero un café negro.' });
    assert.equal(resolved.encounter.state, 'resolved');
    // Review R1.3: the Spellbook's pending flags and queue places after each finished conversation, [CM-001, CM-002].
    const pending = resolved.spellbook.containmentFiles.map((file) => [file.annex.strainPending, file.annex.strainQueue]);
    return { hints, strainedBy, pending, spent: (await runtime.storage.load(learnerId)).annexes.map((r) => [r.id, r.strainSpentOn]) };
  };
  let result = await play();
  assert.deepEqual(result.hints, { used: 0, remaining: limit - 1, limit: limit - 1, baseLimit: limit, strained: true });
  assert.deepEqual(result.strainedBy, [RIFT_ANNEX]);
  assert.deepEqual(result.spent, [[RIFT_ANNEX, 'imp_coffee_greeting'], [ANNEX, null]]);
  assert.deepEqual(result.pending, [[true, 0], [false, null]]);
  result = await play();
  assert.deepEqual(result.hints, { used: 0, remaining: limit - 1, limit: limit - 1, baseLimit: limit, strained: true });
  assert.deepEqual(result.pending, [[false, null], [false, null]]);
  assert.deepEqual(result.strainedBy, [ANNEX]);
  assert.deepEqual(result.spent, [[RIFT_ANNEX, 'imp_coffee_greeting'], [ANNEX, 'imp_coffee_greeting']]);
  result = await play();
  assert.deepEqual(result.hints, { used: 0, remaining: limit, limit, baseLimit: limit, strained: false });
  assert.deepEqual(result.strainedBy, []);
  assert.deepEqual(result.pending, [[false, null], [false, null]]);
});
