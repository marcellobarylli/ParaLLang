import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { availableLanguages, loadGameContent } from '../src/content-loader.js';
import { resolveTargetLanguage, saveDirForLanguage } from '../src/config.js';
import { matchCanonicalVocabulary } from '../src/language-engine.js';
import { JsonLearningStorage } from '../src/learning-storage.js';
import { buildGradingMessages, buildNarrationMessages } from '../src/llm/prompt-builder.js';
import { api, createLearnerAndEncounter, createRuntime } from './helpers.js';

const italian = loadGameContent({ language: 'it' });

function objectiveRubric(systemPrompt) {
  const marker = 'AUTHORED RUBRIC: ';
  const start = systemPrompt.indexOf(marker);
  return JSON.parse(systemPrompt.slice(start + marker.length, systemPrompt.indexOf('\nReturn only structured JSON.', start)));
}

// Grades from the Italian pack's own surface forms, with the same English context rules as the Spanish fixture.
class ItalianFixtureProvider {
  constructor() { this.calls = []; }

  grade(messages) {
    const answer = JSON.parse(messages.at(-1).content).player_answer;
    const lower = answer.toLowerCase();
    const contextual = !/["']|sign says|gerald said|two words|\b(?:she|he|friend)\b/.test(lower);
    const contradicted = /non\s+senza latte|senza latte.*con latte/.test(lower);
    const matches = matchCanonicalVocabulary(answer, italian.vocabulary.entries);
    return {
      objective_results: objectiveRubric(messages[0].content).map((objective) => {
        const targetIds = objective.targets.map((target) => target.id);
        const evidence = matches.filter((match) => targetIds.includes(match.id))
          .map((match) => ({ vocabulary_id: match.id, evidence: match.excerpt, quality: 5 }));
        const found = new Set(evidence.map((item) => item.vocabulary_id));
        const grouped = objective.required_target_groups.every((group) => group.some((id) => found.has(id)));
        const passed = contextual && grouped && (objective.id !== 'no_milk' || !contradicted);
        return { objective_id: objective.id, passed, feedback: `${passed ? 'Passed' : 'Keep working on'} ${objective.id}.`, vocabulary_evidence: evidence };
      }),
      overall_feedback: 'Italian fixture assessment applied.',
    };
  }

  narrate(messages) {
    const greeting = JSON.parse(messages.at(-1).content.split('TURN DATA: ').at(-1).trim()).task === 'greeting';
    return {
      narrative: greeting ? 'A tiny barista inspects you over an espresso cup.' : 'Gerald files the order under acceptable.',
      dialogue: {
        speaker: 'Gerald',
        native: greeting ? 'Vuoi un caffè? Senza latte è l’unica scelta civile.' : 'Bene. Il tuo caffè è in buone mani.',
        translation: greeting ? 'Do you want a coffee? Without milk is the only civilized choice.' : 'Good. Your coffee is in good hands.',
        words: [],
      },
      must_translate: false, difficulty: 99, hints_available: false, encounter_state: 'failed',
    };
  }

  async structuredChat(messages, _schema, options) {
    this.calls.push({ messages, options });
    return options.schemaName === 'dialogue_assessment' ? this.grade(messages) : this.narrate(messages);
  }
}

async function submit(runtime, learnerId, encounter, message) {
  return api(runtime, '/api/encounter/dialogue', {
    learnerId, method: 'POST', body: { encounterId: encounter.id, version: encounter.version, attemptId: crypto.randomUUID(), message },
  });
}

test('both packs load, Italian is the default, and an unknown code lists the packs', () => {
  assert.deepEqual(availableLanguages(), ['es', 'it']);
  assert.equal(resolveTargetLanguage({}), 'it');
  assert.equal(resolveTargetLanguage({ TARGET_LANGUAGE: ' es ' }), 'es');
  assert.equal(loadGameContent().language.code, 'it');
  assert.equal(loadGameContent({ language: 'es' }).language.name, 'Spanish');
  assert.deepEqual(italian.language, { code: 'it', name: 'Italian', tag: 'it-IT' });
  assert.throws(() => loadGameContent({ language: 'fr' }), /Unknown target language: fr\. Available: es, it/);
});

test('Italian matching prefers the longest phrase and ignores accents and elision', () => {
  const ids = (text) => matchCanonicalVocabulary(text, italian.vocabulary.entries).map((match) => match.id);
  assert.deepEqual(ids('Vorrei un caffè nero.'), ['vorrei', 'caffe_nero']);
  assert.deepEqual(ids('Un caffé, per favore.'), ['caffe']);
  assert.deepEqual(ids('Un caffe senza latte.'), ['caffe', 'senza_latte']);
  assert.deepEqual(ids("Il profumo dell'espresso."), ['espresso']);
});

test('prompts name the selected language and leave no placeholder unfilled', () => {
  for (const [code, name] of [['it', 'Italian'], ['es', 'Spanish']]) {
    const content = loadGameContent({ language: code });
    const shared = { language: content.language, objectives: content.encounter.objectives, vocabularyById: content.vocabularyById };
    const prompts = [
      ...buildNarrationMessages({ ...shared, character: content.character, targetRatio: .3 }),
      ...buildNarrationMessages({ ...shared, character: content.character, targetRatio: .3, playerInput: 'Ciao', decision: { encounterState: 'ongoing' } }),
      ...buildGradingMessages({ ...shared, conversationContext: [], playerInput: 'Ciao' }),
    ].map((message) => message.content).join('\n');
    assert.match(prompts, new RegExp(`30% ${name} in dialogue`));
    assert.match(prompts, new RegExp(`strict contextual ${name}-learning assessor`));
    assert.doesNotMatch(prompts, /\{\{/);
    assert.doesNotMatch(prompts, new RegExp(name === 'Italian' ? 'Spanish' : 'Italian'));
  }
});

test('the Italian encounter teaches, charges hints, separates espresso from no milk, and reviews', async (t) => {
  const runtime = await createRuntime({ provider: new ItalianFixtureProvider(), language: 'it' });
  t.after(runtime.close);

  const staged = await createLearnerAndEncounter(runtime);
  const greeting = staged.started.encounter.transcript.at(-1);
  assert.deepEqual(greeting.dialogue.words.map((word) => word.canonicalTarget), ['caffè', 'senza latte']);
  assert.deepEqual(staged.started.spellbook.cards.map((card) => card.target).sort(), ['caffè', 'senza latte']);
  const help = await api(runtime, '/api/encounter/help', {
    learnerId: staged.learnerId, method: 'POST',
    body: { encounterId: staged.started.encounter.id, version: staged.started.encounter.version, messageId: greeting.id, kind: 'word', vocabularyId: 'caffe' },
  });
  assert.equal(help.data.charged, true);
  assert.equal(help.data.reveal.value, 'coffee');

  let response = await submit(runtime, staged.learnerId, help.data.encounter, 'Un espresso, per favore.');
  assert.deepEqual(response.data.assessment.objectiveResults.map((result) => result.passed), [true, false]);
  assert.equal(response.data.encounter.currentObjective.id, 'no_milk');
  response = await submit(runtime, staged.learnerId, response.data.encounter, 'Senza latte, per favore.');
  assert.equal(response.data.encounter.state, 'resolved');

  const complete = await createLearnerAndEncounter(runtime);
  response = await submit(runtime, complete.learnerId, complete.started.encounter, 'Vorrei un caffè senza latte.');
  assert.equal(response.data.encounter.state, 'resolved');
  const review = await api(runtime, '/api/spellbook/review', { learnerId: complete.learnerId, method: 'POST', body: { vocabularyId: 'vorrei' } });
  assert.equal(review.data.challenge.target, 'vorrei');
  const answered = await api(runtime, '/api/spellbook/review/submit', {
    learnerId: complete.learnerId, method: 'POST',
    body: { challengeId: review.data.challenge.id, attemptId: crypto.randomUUID(), action: 'answer', answer: "I'd like" },
  });
  assert.equal(answered.data.result.correct, true);
  assert.equal(answered.data.result.effectiveQuality, 5);
});

test('each language keeps its own Spellbook; Spanish saves stay at the top of the save directory', async (t) => {
  const base = await mkdtemp(join(tmpdir(), 'parallang-languages-'));
  assert.equal(saveDirForLanguage(base, 'es'), base);
  assert.equal(saveDirForLanguage(base, 'it'), join(base, 'it'));

  const spanish = await createRuntime({ language: 'es', saveDir: base });
  t.after(spanish.close);
  const { learnerId, started } = await createLearnerAndEncounter(spanish);
  const spanishCards = started.spellbook.cards.map((card) => card.vocabularyId);
  assert.ok(spanishCards.length > 0);
  await access(join(base, `${learnerId}.json`));

  const italianRuntime = await createRuntime({
    language: 'it', provider: new ItalianFixtureProvider(),
    storage: new JsonLearningStorage({ saveDir: saveDirForLanguage(base, 'it') }),
  });
  t.after(italianRuntime.close);
  const identity = await api(italianRuntime, '/api/learner', { method: 'POST', body: { learnerId } });
  assert.equal(identity.data.recovered, false);
  assert.deepEqual(identity.data.language, { code: 'it', name: 'Italian', tag: 'it-IT' });
  assert.equal((await api(italianRuntime, '/api/spellbook', { learnerId })).data.cards.length, 0);
  await api(italianRuntime, '/api/encounter/start', { learnerId, method: 'POST', body: {} });
  await access(join(base, 'it', `${learnerId}.json`));

  const back = await api(spanish, '/api/spellbook', { learnerId });
  assert.deepEqual(back.data.cards.map((card) => card.vocabularyId), spanishCards);
  assert.deepEqual(back.data.cards.map((card) => card.target), started.spellbook.cards.map((card) => card.target));
});
