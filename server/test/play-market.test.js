import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { glitchFold, languageShare, tourOrder } from '../scripts/play-market.js';

test('languageShare estimates the target-language share of an NPC line two ways', () => {
  const { vocabulary } = loadGameContent({ language: 'it' });
  const share = languageShare('Vuoi un caffè? Senza latte, obviously.', 'Do you want a coffee? Without milk, obviously.', vocabulary.entries);
  assert.equal(share.tokens, 6);
  assert.equal(share.notInTranslation, 0.83);
  assert.equal(share.canonical, 0.5);
  assert.deepEqual(languageShare('', '', vocabulary.entries), { tokens: 0, notInTranslation: 0, folded: 0, translationShort: false, canonical: 0 });
  assert.equal(share.folded, 0.83, 'round 046: an Italian line reads the same folded');
});

// Round 046: glitched English is English once folded; a gloss instead of a translation is flagged.
test('the folded estimate reads Errata\'s glitched English as English and flags gloss translations', () => {
  assert.deepEqual(['procedùre', 'yoùù', 'ŧhe', 'hëre', 'errror', 'Cøntainment'].map((w) => glitchFold(w.toLowerCase())), ['procedure', 'you', 'the', 'here', 'eror', 'containment']);
  const errata = languageShare('Sono Errata. Cøntainment procedùre: yoùù sign hëre.', 'I am Errata. Containment procedure: you sign here.', []);
  assert.equal(errata.notInTranslation, 0.71, 'the old estimate counts the four glitched words as Italian (5 of 7)');
  assert.equal(errata.folded, 0.14, '"sono" is the one Italian word of seven');
  // Critique 1.1, 1.9: short words keep their letters (Spanish "al" is not English "all"); real double letters in a
  // target word against an English translation still count; a decomposed accent does not split a word.
  assert.equal(glitchFold('all'), 'all');
  assert.equal(languageShare('Vamos al mercado.', 'We all go to the market.', []).folded, 1);
  assert.equal(languageShare("Dopo vent'anni, il nonno.", 'After twenty years, grandpa.', []).folded, 1);
  assert.equal(languageShare('Procedu\u0300re: sign.', 'Procedure: sign.', []).folded, 0);
  // The length warning's boundary: 3 translation tokens for 5 line tokens is 60%, not short; 2 is.
  assert.equal(languageShare('uno dos tres cuatro cinco', 'one two three', []).translationShort, false);
  assert.equal(languageShare('uno dos tres cuatro cinco', 'one two', []).translationShort, true);
  const gloss = languageShare('Esta es la historia de Journathan, el hombre de muchas lenguas. ¿Adónde va?', '“¿Adónde va?” means “Where is he going?”', []);
  assert.equal(gloss.translationShort, true);
  assert.equal(gloss.folded, null);
  assert.equal(typeof gloss.notInTranslation, 'number', 'the old estimate is still reported');
});

test('the tour visits every encounter once, the Old Bookshop just before The Rift, whose gate lists the others', () => {
  for (const language of ['it', 'es']) {
    const { world } = loadGameContent({ language });
    const held = world.locations.filter((l) => l.encounter).map((l) => l.id);
    assert.deepEqual([...tourOrder].sort(), held.sort());
    assert.equal(tourOrder.at(-1), 'the_rift');
    assert.ok(world.neighbours.get(tourOrder.at(-2)).includes('the_rift'));
    assert.deepEqual([...world.locationsById.get('the_rift').requires_completed].sort(), tourOrder.slice(0, -1).map((id) => world.locationsById.get(id).encounter).sort());
  }
});

// Round 097 (review R1.1, R1.2; critique 1.2-1.6): a retried narration is one report line, the one the player saw.
import { FixtureProvider, createRuntime } from './helpers.js';
import { narrationLines, recordCalls } from '../scripts/play-market.js';
import { scanReport } from '../scripts/leak-scan.js';
import { ProviderError } from '../src/llm/provider-error.js';

const ENGLISH = 'Hello there, friend. Coffee?';
class EnglishGreeting extends FixtureProvider {
  constructor({ hangRetry = false } = {}) { super(); this.greeted = false; this.hangRetry = hangRetry; }
  async structuredChat(messages, schema, options) {
    if (options.schemaName === 'encounter_narration' && !this.greeted) {
      this.greeted = true;
      this.calls.push({ messages, options });
      return { ...this.narrate(messages), dialogue: { speaker: 'Gerald', native: ENGLISH, translation: ENGLISH, words: [] } };
    }
    if (this.hangRetry && options.schemaName === 'encounter_narration' && String(messages.at(-1).content).startsWith('CORRECTION:')) {
      return new Promise((_, reject) => options.signal?.addEventListener('abort', () => reject(new ProviderError('interrupted', { provider: 'codex-cli' })), { once: true }));
    }
    // The guard's retry ends with the correction; the fixture narrates from the turn message before it.
    if (options.schemaName === 'encounter_narration' && String(messages.at(-1).content).startsWith('CORRECTION:')) {
      this.calls.push({ messages, options });
      return this.narrate(messages.slice(0, -2));
    }
    return super.structuredChat(messages, schema, options);
  }
}

async function played(t, provider, serviceOptions = {}) {
  const raw = [];
  recordCalls(provider, raw);
  const runtime = await createRuntime({ provider, serviceOptions });
  t.after(runtime.close);
  const { service, content } = runtime;
  const definition = content.encounters.get(content.defaultEncounterId);
  const { learnerId } = await service.createOrRecoverLearner();
  const started = await service.startEncounter(learnerId);
  const message = 'Hola, no sé.';
  const said = await service.submitDialogue(learnerId, { encounterId: started.encounter.id, version: started.encounter.version, attemptId: crypto.randomUUID(), message });
  const natives = said.encounter.transcript.filter((item) => item.role === 'npc').map((item) => item.dialogue.native);
  const result = narrationLines(raw, natives, {
    ratioFor: (turn) => service.ratioFor(turn, definition), share: () => null, lacksTarget: (output) => service.lacksTarget(output, definition),
    retryMs: serviceOptions.narrationRetryMs,
  });
  const verdicts = said.assessment.objectiveResults.map((r) => ({ objective: r.objectiveId, passed: r.passed, evidence: r.vocabularyEvidence }));
  return { raw, natives, result, definition, content, message, verdicts, service };
}

test('a greeting written again by the guard is one line on turn 0, the retry kept and the English beside it; the scan reads it', async (t) => {
  const { raw, natives, result, definition, content, message, verdicts, service } = await played(t, new EnglishGreeting());
  assert.equal(service.narrationStats.retryPassed, 1);
  assert.deepEqual(raw.filter((c) => c.schema === 'encounter_narration').map((c) => c.retry), [false, true, false]);
  assert.equal(result.lines.length, 2);
  assert.deepEqual(result.uncommitted, []);
  const [greeting, reply] = result.lines;
  assert.equal(greeting.turn, 0);
  assert.equal(greeting.native, natives[0]);
  assert.equal(greeting.requestedRatio, service.ratioFor(0, definition));
  assert.deepEqual({ kept: greeting.retried.kept, rejectedNative: greeting.retried.rejectedNative }, { kept: 'retry', rejectedNative: ENGLISH });
  const [first, retry] = raw.filter((c) => c.schema === 'encounter_narration');
  assert.equal(greeting.durationMs, first.durationMs + retry.durationMs);
  assert.equal(reply.turn, 1);
  assert.equal(reply.native, natives[1]);
  assert.equal(reply.retried, undefined);
  const scanned = scanReport({ language: 'es', steps: [{ ok: true, name: `say "${message}"`, verdicts }], encounters: [{ encounterId: definition.encounter.id, grading: [], lines: result.lines }] }, content);
  assert.deepEqual(scanned.skipped, []);
  assert.equal(scanned.scenes.length, 1);
});

test('a retry that times out keeps the first line, marked so', async (t) => {
  const { result, natives } = await played(t, new EnglishGreeting({ hangRetry: true }), { narrationRetryMs: 50 });
  assert.equal(natives[0], ENGLISH);
  assert.equal(result.lines.length, 2);
  assert.equal(result.lines[0].native, ENGLISH);
  assert.equal(result.lines[0].retried.kept, 'first');
  assert.equal(result.lines[0].retried.rejectedNative, null);
  assert.equal(result.lines[0].retried.error, 'CLI_INTERRUPTED');
});

test('narrationLines: a call with no committed line is set aside; identical natives follow the service rule', () => {
  const call = (native, extra = {}) => ({ schema: 'encounter_narration', retry: false, durationMs: 10, output: { narrative: '', dialogue: { native, translation: native } }, ...extra });
  const options = { ratioFor: (turn) => turn, share: () => null, lacksTarget: () => false, retryMs: 1000 };
  const drift = narrationLines([call('A'), call('lost'), call('B')], ['A', 'B'], options);
  assert.deepEqual(drift.lines.map((line) => [line.turn, line.native]), [[0, 'A'], [1, 'B']]);
  assert.deepEqual(drift.uncommitted.map((group) => group.native), ['lost']);
  const same = [call('X'), call('X', { retry: true, output: { narrative: '', dialogue: { native: 'X', translation: 'ecks' } } })];
  assert.equal(narrationLines(same, ['X'], options).lines[0].retried.kept, 'retry');
  assert.equal(narrationLines(same, ['X'], options).lines[0].durationMs, 20, 'the player waited for both calls');
  assert.equal(narrationLines(same, ['X'], options).lines[0].retried.durationMs, 10);
  assert.equal(narrationLines(same, ['X'], { ...options, lacksTarget: () => true }).lines[0].retried.kept, 'first');
  assert.equal(narrationLines([same[0], { ...same[1], durationMs: 5000 }], ['X'], options).lines[0].retried.kept, 'first', 'past the deadline');
});

// Round 097 (review R1.4): verify-cli compares verdicts by objective, not in the grader's order.
test('verify-cli: verdicts listed in reverse are read in the objectives\' order', async () => {
  const { observedVerdicts } = await import('../scripts/verify-cli.js');
  const objectives = [{ id: 'order_coffee' }, { id: 'no_milk' }];
  assert.deepEqual(observedVerdicts(objectives, [{ objective_id: 'no_milk', passed: false }, { objective_id: 'order_coffee', passed: true }]), [true, false]);
});
