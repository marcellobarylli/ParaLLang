// Round 181: French, the third language, and one server that plays several languages at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadGameContent } from '../src/content-loader.js';
import { resolveTargetLanguages, saveDirForLanguage } from '../src/config.js';
import { matchCanonicalVocabulary, normalizeAnswer, vocabularyFormConflicts } from '../src/language-engine.js';
import { sameLetters } from '../src/learning-service.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { LearningService } from '../src/learning-service.js';
import { createApp, LANGUAGE_HEADER } from '../src/app.js';
import { FixtureProvider, fixedNow, makeTempDir } from './helpers.js';

const french = loadGameContent({ language: 'fr' });

test('the French pack loads whole, in French, with no form shared between two entries', () => {
  assert.deepEqual(french.language, { code: 'fr', name: 'French', tag: 'fr-FR' });
  assert.deepEqual(vocabularyFormConflicts(french.vocabulary.entries), []);
  assert.ok(french.curriculum.units.length > 0);
  const italian = loadGameContent({ language: 'it' });
  assert.deepEqual([...french.encounters.keys()].sort(), [...italian.encounters.keys()].sort(), 'the same encounters as the other packs');
  assert.deepEqual(french.curriculum.units.map((unit) => unit.id), italian.curriculum.units.map((unit) => unit.id), 'the same curriculum');
});

test('no Italian is left in the French pack', () => {
  const text = JSON.stringify([...french.encounters.values()]) + JSON.stringify(french.vocabulary.entries);
  for (const word of ['caffè', 'grazie', 'Treccani', 'Italian', '-it-v1']) assert.ok(!text.includes(word), word);
});

test('French matching: ligatures, elision and guillemets', () => {
  const entries = [
    { id: 'coeur', surface_variants: ['cœur'] },
    { id: 'eau', surface_variants: ['eau'] },
    { id: 'je_m_appelle', surface_variants: ["je m'appelle"] },
  ];
  const ids = (text) => matchCanonicalVocabulary(text, entries).map((match) => match.id);
  assert.deepEqual(ids('Mon coeur !'), ['coeur'], 'oe typed for œ');
  assert.deepEqual(ids('MON CŒUR'), ['coeur']);
  const [heart] = matchCanonicalVocabulary('Le Cœur.', entries);
  assert.equal(heart.excerpt, 'Cœur', 'the excerpt is the source text, whatever the fold');
  assert.deepEqual(ids("De l'eau, s'il vous plaît."), ['eau'], 'an elided article does not hide the word');
  assert.deepEqual(ids('Je m’appelle Sam.'), ['je_m_appelle'], 'the iPhone apostrophe');
  assert.equal(normalizeAnswer('« Bonjour » !'), 'bonjour');
  assert.equal(normalizeAnswer('Sœur', { stripAccents: true }), 'soeur');
  assert.ok(sameLetters('Ma soeur est là.', 'Ma sœur est la.'), 'a ligature is a spelling, not a mistake');
});

test('TARGET_LANGUAGES lists the languages one server plays, TARGET_LANGUAGE first', () => {
  assert.deepEqual(resolveTargetLanguages({}), ['it']);
  assert.deepEqual(resolveTargetLanguages({ TARGET_LANGUAGE: 'fr' }), ['fr']);
  assert.deepEqual(resolveTargetLanguages({ TARGET_LANGUAGES: 'it, FR,es,fr' }), ['it', 'fr', 'es']);
  assert.deepEqual(resolveTargetLanguages({ TARGET_LANGUAGE: 'es', TARGET_LANGUAGES: 'it,fr,es' }), ['es', 'it', 'fr']);
  assert.equal(saveDirForLanguage('/saves', 'fr'), '/saves/fr');
});

test('one server, three languages: a request plays the language it names, and the default without one', async (t) => {
  const services = {};
  for (const code of ['it', 'fr', 'es']) {
    const content = code === 'fr' ? french : loadGameContent({ language: code });
    const storage = new JsonLearningStorage({ saveDir: await makeTempDir(`parallang-${code}-`) });
    services[code] = new LearningService({ provider: new FixtureProvider(), storage, content, clock: () => fixedNow });
  }
  const token = randomUUID();
  const server = createApp({ services, defaultLanguage: 'it', token, logger: { error() {} } }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); for (const each of Object.values(services)) await each.shutdown(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, { language, learnerId, method = 'GET', body } = {}) => {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { 'X-ParaLLang-Token': token, ...(language ? { [LANGUAGE_HEADER]: language } : {}), ...(learnerId ? { 'X-Learner-Id': learnerId } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: response.status, data: await response.json() };
  };

  const health = await (await fetch(`${base}/api/health`)).json();
  assert.deepEqual(health.languages.map((entry) => entry.code), ['it', 'fr', 'es'], 'listed without the token');
  assert.equal(health.defaultLanguage, 'it');

  const plain = await call('/api/learner', { method: 'POST', body: {} });
  assert.equal(plain.data.language.code, 'it', 'no header: the default, as every client before round 181');
  const learner = await call('/api/learner', { language: 'fr', method: 'POST', body: {} });
  assert.equal(learner.status, 201);
  assert.equal(learner.data.language.code, 'fr');
  const again = await call('/api/learner', { language: 'FR', method: 'POST', body: { learnerId: learner.data.learnerId } });
  assert.equal(again.data.recovered, true, 'the French save is found in French');
  const elsewhere = await call('/api/learner', { language: 'es', method: 'POST', body: { learnerId: learner.data.learnerId } });
  assert.equal(elsewhere.data.recovered, false, 'each language keeps its own saves');

  const refused = await call('/api/world', { language: 'de', learnerId: learner.data.learnerId });
  assert.equal(refused.status, 400);
  assert.equal(refused.data.error.code, 'LANGUAGE_UNAVAILABLE');
  assert.deepEqual(refused.data.error.details.languages, ['it', 'fr', 'es']);
  const unauthorized = await fetch(`${base}/api/world`, { headers: { [LANGUAGE_HEADER]: 'fr' } });
  assert.equal(unauthorized.status, 401, 'the token is still asked for first');
});
