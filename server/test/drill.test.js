// Round 029 (backlog C1): forced repetition before the Rift boss. One due card per required target group, owned by
// the server in the spellbook snapshot, before the first fight only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { loadGameContent } from '../src/content-loader.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { clearDrill } from '../scripts/play-market.js';
import { api, createRuntime, FixtureProvider, fixedNow, makeTempDir } from './helpers.js';

const root = resolve(import.meta.dirname, '..', '..');
const others = ['market_entrance_tutorial', 'imp_coffee_greeting', 'butchers_stall_charcutier', 'cracked_fountain_letharger', 'old_bookshop_bookworm'];
const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays) => new Date(fixedNow.getTime() + offsetDays * DAY).toISOString();

// Spanish Rift groups: café (cafe, cafe_solo, cafe_negro), meat, stop (quieto, basta), now (ahora), me llamo/soy, nadie.
async function setup(t, { clock } = {}) {
  const dir = await makeTempDir('parallang-drill-');
  const content = loadGameContent({ language: 'es' });
  const storage = new JsonLearningStorage({ saveDir: dir });
  let now = fixedNow;
  const service = new LearningService({ provider: new FixtureProvider(), storage, content, clock: clock ?? (() => now) });
  const { learnerId } = await service.createOrRecoverLearner();
  const card = (id, dueAt, extra = {}) => ({
    vocabularyId: id, contentVersion: content.entryVersion(id), discoveredAt: iso(-3), discoverySource: 'encounter_exposure', evidence: [],
    schedule: { ease: 2.5, repetitions: 0, intervalDays: 0, dueAt, lastReviewedAt: null, lastQuality: null }, ...extra,
  });
  const seed = async ({ at = 'the_rift', completed = others, words = {} } = {}) => {
    const envelope = await storage.load(learnerId);
    envelope.world = { currentLocationId: at, visitedLocationIds: ['market_entrance', 'old_bookshop', at], completedEncounterIds: completed };
    Object.assign(envelope.spellbook.words, words);
    await storage.save(envelope);
  };
  return { content, service, learnerId, card, seed, storage, setNow: (value) => { now = value; } };
}

// Café group: one due, one not (no block). Meat: two due (the older blocks). Ahora: due (blocks). A stale due card
// (quieto) and a due non-target (hola) never block.
const fixture = (card) => ({
  cafe: card('cafe', iso(-1)), cafe_solo: card('cafe_solo', iso(2)),
  jamon: card('jamon', iso(-1)), chorizo: card('chorizo', iso(-2)),
  ahora: card('ahora', iso(-1)),
  quieto: card('quieto', iso(-2), { contentVersion: 'old-v0' }),
  hola: card('hola', iso(-5)),
});

test('the flag is on the Rift in both packs; the loader refuses it on a party conversation or as a non-boolean', async () => {
  for (const code of ['it', 'es']) assert.equal(loadGameContent({ language: code }).encounters.get('the_rift_errata').encounter.drill_before, true);
  for (const [path, value, error] of [
    ['languages/es/encounters/flick_slow_walk.yaml', true, /party conversation cannot require a drill/],
    ['languages/es/encounters/the_rift_errata.yaml', 'yes', /drill_before/],
  ]) {
    const dir = await makeTempDir('parallang-drill-content-');
    await cp(join(root, 'content'), dir, { recursive: true });
    const encounter = yaml.load(await readFile(join(dir, path), 'utf8'));
    encounter.drill_before = value;
    await writeFile(join(dir, path), yaml.dump(encounter));
    assert.throws(() => loadGameContent({ contentDir: dir, language: 'es' }), error);
  }
});

test('the drill is one card per blocking group, at the open Rift only, and the start waits for it', async (t) => {
  const { service, learnerId, card, seed } = await setup(t);
  await seed({ words: fixture(card) });
  const { drill } = await service.getSpellbook(learnerId);
  assert.deepEqual(drill, { encounterId: 'the_rift_errata', characterName: 'Errata', vocabularyIds: ['chorizo', 'ahora'] });
  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'the_rift_errata' }), (error) => {
    assert.equal(error.status, 409);
    assert.equal(error.code, 'DRILL_REQUIRED');
    assert.equal(error.message, 'Errata reviews everything you have learned. Review your 2 due words in the Spellbook first.');
    assert.deepEqual(error.details.vocabularyIds, drill.vocabularyIds);
    return true;
  });

  // Continue (no id) serves the drill first, even with an older non-drill card due.
  const first = await service.createReviewChallenge(learnerId, null);
  assert.equal(first.challenge.vocabularyId, 'chorizo');
  await service.submitReview(learnerId, { challengeId: first.challenge.id, attemptId: 'a1', action: 'reveal', answer: '' });
  const second = await service.createReviewChallenge(learnerId, null);
  assert.equal(second.challenge.vocabularyId, 'ahora');
  const done = await service.submitReview(learnerId, { challengeId: second.challenge.id, attemptId: 'a2', action: 'answer', answer: 'now' });
  assert.equal(done.spellbook.drill, null, 'every review response carries the drill');
  const started = await service.startEncounter(learnerId, { encounterId: 'the_rift_errata' });
  assert.equal(started.encounter.encounterId, 'the_rift_errata');
});

test('no drill elsewhere, at a completed Rift, or with only stale and non-target cards due', async (t) => {
  const { service, learnerId, card, seed } = await setup(t);
  await seed({ at: 'old_bookshop', words: fixture(card) });
  assert.equal((await service.getSpellbook(learnerId)).drill, null);
  await seed({ completed: [...others, 'the_rift_errata'] });
  assert.equal((await service.getSpellbook(learnerId)).drill, null);
  const { service: fresh, learnerId: other, card: c2, seed: seed2 } = await setup(t);
  await seed2({ words: { quieto: c2('quieto', iso(-2), { contentVersion: 'old-v0' }), hola: c2('hola', iso(-5)) } });
  assert.equal((await fresh.getSpellbook(other)).drill, null);
  const review = await fresh.createReviewChallenge(other, null);
  assert.equal(review.challenge.vocabularyId, 'hola', 'the no-id pick skips the stale card (critique 2.4)');
});

test('an ongoing encounter elsewhere is named; an active Rift session resumes and restarts despite due cards', async (t) => {
  const { service, learnerId, card, seed } = await setup(t);
  await seed({ at: 'old_bookshop', words: {} });
  await service.startEncounter(learnerId, { encounterId: 'old_bookshop_bookworm' });
  await seed({ words: fixture(card) });
  await assert.rejects(service.startEncounter(learnerId, { encounterId: 'the_rift_errata' }), { code: 'DRILL_REQUIRED', message: /2 due words in the Spellbook first\. Finish your conversation with Marginalia first\.$/ });

  const { service: s2, learnerId: l2, card: c2, seed: seed2 } = await setup(t);
  await seed2();
  const session = (await s2.startEncounter(l2, { encounterId: 'the_rift_errata' })).encounter;
  await seed2({ words: fixture(c2) });
  assert.equal((await s2.startEncounter(l2, { encounterId: 'the_rift_errata' })).encounter.id, session.id, 'resumes');
  assert.notEqual((await s2.startEncounter(l2, { restart: true, encounterId: 'the_rift_errata' })).encounter.id, session.id, 'restarts (critique 2.2)');
});

test('a day later the drill is due again until the Rift is completed', async (t) => {
  const { service, learnerId, card, seed, setNow } = await setup(t);
  await seed({ words: { ahora: card('ahora', iso(-1)) } });
  assert.deepEqual(await clearDrill(service, learnerId), ['ahora']);
  assert.equal((await service.getSpellbook(learnerId)).drill, null);
  setNow(new Date(fixedNow.getTime() + 2 * DAY));
  assert.deepEqual((await service.getSpellbook(learnerId)).drill?.vocabularyIds, ['ahora']);
});

test('over HTTP the start is 409 DRILL_REQUIRED with the ids, and the spellbook carries the drill', async (t) => {
  const runtime = await createRuntime({ language: 'es' });
  t.after(() => runtime.close());
  const { data: { learnerId } } = await api(runtime, '/api/learner', { method: 'POST', body: {} });
  const envelope = await runtime.storage.load(learnerId);
  envelope.world = { currentLocationId: 'the_rift', visitedLocationIds: ['market_entrance', 'the_rift'], completedEncounterIds: others };
  envelope.spellbook.words.ahora = {
    vocabularyId: 'ahora', contentVersion: runtime.content.entryVersion('ahora'), discoveredAt: fixedNow.toISOString(), discoverySource: 'encounter_exposure',
    evidence: [], schedule: { ease: 2.5, repetitions: 0, intervalDays: 0, dueAt: fixedNow.toISOString(), lastReviewedAt: null, lastQuality: null },
  };
  await runtime.storage.save(envelope);
  const refused = await api(runtime, '/api/encounter/start', { learnerId, method: 'POST', body: { encounterId: 'the_rift_errata' } });
  assert.equal(refused.status, 409);
  assert.equal(refused.data.error.code, 'DRILL_REQUIRED');
  assert.deepEqual(refused.data.error.details, { vocabularyIds: ['ahora'] });
  assert.deepEqual((await api(runtime, '/api/spellbook', { learnerId })).data.drill.vocabularyIds, ['ahora']);
});
