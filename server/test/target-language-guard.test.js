// Round 078 (prototype.md §11): an NPC line with no target language at all is written again once, with a correction
// appended; a retry that fails or is still all English keeps the first line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FixtureProvider, createRuntime } from './helpers.js';
import { lacksTargetLanguage } from '../src/language-engine.js';
import { correctionNote } from '../src/learning-service.js';
import { loadGameContent } from '../src/content-loader.js';

const ENGLISH = { native: 'There you are. I have waited a very long time.', translation: 'There you are. I have waited a very long time.' };
const MIXED = { native: '¡Hola! ¿Quieres un café?', translation: 'Hello! Do you want a coffee?' };

// Narration replies taken from a queue (then the fixture's); `throw` fails that call, `hold` waits until released.
class QueuedProvider extends FixtureProvider {
  constructor(queue = []) { super(); this.queue = queue; this.release = null; }
  async structuredChat(messages, schema, options) {
    if (options.schemaName === 'encounter_narration' && this.queue[0] === 'hold') {
      this.queue.shift();
      this.calls.push({ messages, options });
      await new Promise((resolve) => { this.release = resolve; });
      return this.narrate(messages);
    }
    return super.structuredChat(messages, schema, options);
  }
  narrate(messages) {
    // The fixture reads its turn from the last message; a retry's last message is the correction.
    const retry = messages.at(-1).content.startsWith('CORRECTION: ');
    const base = super.narrate(retry ? messages.slice(0, -2) : messages);
    const next = this.queue.shift();
    if (next === 'throw') throw new Error('fixture narration outage');
    return next ? { ...base, dialogue: { ...base.dialogue, ...next } } : base;
  }
}

async function setup(t, queue, serviceOptions = {}) {
  const runtime = await createRuntime({ provider: new QueuedProvider(queue), serviceOptions });
  t.after(runtime.close);
  return runtime;
}
const narrations = (runtime) => runtime.provider.calls.filter((call) => call.options.schemaName === 'encounter_narration');

test('lacksTargetLanguage: only a line whose every word is in its translation, with no vocabulary match', () => {
  const vocabulary = [{ id: 'ciao', target: 'ciao', surface_variants: ['ciao'] }];
  assert.equal(lacksTargetLanguage(ENGLISH.native, ENGLISH.translation, vocabulary), true);
  assert.equal(lacksTargetLanguage('There you are, reader.', 'There you are, at last, reader.', vocabulary), true, 'translation longer');
  assert.equal(lacksTargetLanguage('There you’re, Sam, at last.', "THERE you're sam at last", vocabulary), true, 'case, apostrophes, punctuation folded');
  assert.equal(lacksTargetLanguage('Eccoti. I have waited.', 'There you are. I have waited.', vocabulary), false);
  assert.equal(lacksTargetLanguage('Ciao, Sam!', 'Ciao, Sam!', vocabulary), false, 'a vocabulary word');
  assert.equal(lacksTargetLanguage('Perché, Sam, perché adesso?', 'Perche, Sam, perche adesso?', vocabulary), true, 'accents folded: the same words');
  assert.equal(lacksTargetLanguage('No, Sam.', 'No, Sam.', vocabulary), false, 'under four words (critique 1.1)');
  assert.equal(lacksTargetLanguage('Sam, no, no, no.', 'Sam, no, no, no.', vocabulary), true, 'four words that are also English');
  assert.equal(lacksTargetLanguage('…!', '…!', vocabulary), false, 'no words');
  assert.equal(lacksTargetLanguage('', 'Hello', vocabulary), false);
  // The subset this rule does not catch (critique 1.2): an English line that rewords its translation.
  assert.equal(lacksTargetLanguage('Take the book, reader.', 'Pick up the book, reader.', vocabulary), false);
});

test('a normal greeting makes one call and is only counted as checked', async (t) => {
  const runtime = await setup(t, []);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  await runtime.service.startEncounter(learnerId);
  assert.equal(narrations(runtime).length, 1);
  assert.deepEqual(runtime.service.narrationStats, { checked: 1, flagged: 0, retryPassed: 0, kept: 0, timedOut: 0 });
});

test('an all-English greeting is written again with the rejected reply and the correction appended; the second line is used', async (t) => {
  const runtime = await setup(t, [ENGLISH, MIXED]);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  const [first, second] = narrations(runtime);
  assert.equal(narrations(runtime).length, 2);
  assert.deepEqual(second.messages.slice(0, -2), first.messages, 'the same prompt, history unchanged');
  const rejected = JSON.parse(second.messages.at(-2).content);
  assert.equal(second.messages.at(-2).role, 'assistant');
  assert.equal(rejected.dialogue.native, ENGLISH.native);
  assert.deepEqual(second.messages.at(-1), { role: 'user', content: correctionNote(runtime.content.language, 0.25) });
  assert.match(second.messages.at(-1).content, /about 25% Spanish/);
  assert.equal(encounter.transcript.length, 1, 'the rejected line is not in the transcript');
  assert.equal(encounter.transcript[0].dialogue.native, MIXED.native);
  assert.deepEqual(encounter.transcript[0].dialogue.words.map((w) => w.vocabularyId), ['cafe'], 'chips from the second line');
  assert.deepEqual(runtime.service.narrationStats, { checked: 1, flagged: 1, retryPassed: 1, kept: 0, timedOut: 0 });
});

test('still English after the retry: the first line is kept', async (t) => {
  const runtime = await setup(t, [ENGLISH, { native: 'Hello again, my reader.', translation: 'Hello again, my reader.' }]);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  assert.equal(narrations(runtime).length, 2);
  assert.equal(encounter.transcript[0].dialogue.native, ENGLISH.native);
  assert.deepEqual(runtime.service.narrationStats, { checked: 1, flagged: 1, retryPassed: 0, kept: 1, timedOut: 0 });
});

test('a failed retry keeps the first line and the start succeeds', async (t) => {
  const runtime = await setup(t, [ENGLISH, 'throw']);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  assert.equal(encounter.transcript[0].dialogue.native, ENGLISH.native);
  assert.equal(runtime.service.narrationStats.kept, 1);
});

test('a failed first call still fails the start (no retry)', async (t) => {
  const runtime = await setup(t, ['throw']);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  await assert.rejects(runtime.service.startEncounter(learnerId), { code: 'PROVIDER_FAILURE' });
  assert.equal(narrations(runtime).length, 1);
});

test('a turn reply with no target language is written again; the grading call is not repeated', async (t) => {
  const runtime = await setup(t, [null, ENGLISH, { native: 'Bien. Tu café será tomado en serio.', translation: 'Good. Your coffee will be taken seriously.' }]);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  const result = await runtime.service.submitDialogue(learnerId, {
    encounterId: encounter.id, version: encounter.version, attemptId: 'a1', message: 'Quiero un café, por favor.',
  });
  assert.equal(result.encounter.transcript.at(-1).dialogue.native, 'Bien. Tu café será tomado en serio.');
  assert.equal(narrations(runtime).length, 3);
  assert.equal(runtime.provider.calls.filter((call) => call.options.schemaName === 'dialogue_assessment').length, 1);
  assert.deepEqual(runtime.service.narrationStats, { checked: 2, flagged: 1, retryPassed: 1, kept: 0, timedOut: 0 });
  assert.match(narrations(runtime)[2].messages.at(-1).content, /about 30% Spanish/, "the turn's ratio (0.25 + 0.05)");
});

test('a prefetched greeting goes through the same guard', async (t) => {
  const runtime = await setup(t, [ENGLISH, MIXED], { prefetch: true, prefetchDwellMs: 20 });
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  await runtime.service.moveTo(learnerId, { locationId: 'coffee_cart' });
  const end = Date.now() + 2000;
  while (runtime.service.narrationStats.retryPassed < 1) {
    if (Date.now() > end) throw new Error('timed out');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const { encounter } = await runtime.service.startEncounter(learnerId, { encounterId: 'imp_coffee_greeting' });
  assert.equal(narrations(runtime).length, 2, 'the start made no call');
  assert.equal(encounter.transcript[0].dialogue.native, MIXED.native);
  assert.equal(runtime.service.prefetchStats.used, 1);
});

test('a retry over the deadline keeps the first line; the turn commits and its progress entry is cleared', async (t) => {
  const runtime = await setup(t, [null, ENGLISH, 'hold'], { narrationRetryMs: 30 });
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  const result = await runtime.service.submitDialogue(learnerId, {
    encounterId: encounter.id, version: encounter.version, attemptId: 'a1', message: 'Quiero un café, por favor.',
  });
  assert.equal(result.encounter.transcript.at(-1).dialogue.native, ENGLISH.native);
  assert.equal(runtime.service.narrationStats.timedOut, 1);
  assert.equal(runtime.service.turnProgress.has(learnerId), false);
  assert.equal(runtime.service.progress(learnerId, 'a1').progress.assessment, null);
  runtime.provider.release(); // the abandoned retry ends; its line is dropped
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal((await runtime.service.currentEncounter(learnerId)).encounter.transcript.at(-1).dialogue.native, ENGLISH.native);
});

test('the correction at a ratio of 1 asks for 100% and demands no English (critique 1.4)', () => {
  const note = correctionNote(loadGameContent({ language: 'it' }).language, 1);
  assert.match(note, /about 100% Italian/);
  assert.doesNotMatch(note, /English/);
});
