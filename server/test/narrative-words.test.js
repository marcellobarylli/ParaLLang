// Round 130: the narration carries a share of target-language words, listed by the model with their meanings. The
// server keeps a listed word that really stands in the narration and is not an answer, and sends it for tapping.
import assert from 'node:assert/strict';
import test from 'node:test';
import { FixtureProvider, createRuntime } from './helpers.js';
import { NARRATIVE_WORDS } from '../src/learning-service.js';
import { encounterResponseSchema } from '../src/llm/schemas.js';
import { NARRATIVE_SHARE, buildNarrationMessages, narrativeRatio } from '../src/llm/prompt-builder.js';
import { loadGameContent } from '../src/content-loader.js';

// The fixture's narration with a narrative and a list of the test's own.
class NarratingProvider extends FixtureProvider {
  constructor(narrative, words) { super(); this.narrative = narrative; this.words = words; }
  narrate(messages) {
    const base = super.narrate(messages);
    return { ...base, narrative: this.narrative, ...(this.words === undefined ? {} : { narrative_words: this.words }) };
  }
}
async function greet(t, narrative, words, language = 'it') {
  const runtime = await createRuntime({ language, provider: new NarratingProvider(narrative, words) });
  t.after(runtime.close);
  const { learnerId } = await runtime.service.createOrRecoverLearner();
  const { encounter } = await runtime.service.startEncounter(learnerId);
  return { runtime, learnerId, line: encounter.transcript[0] };
}
const STALL = 'The bancarella leans a little, and the gatto on the counter has opinions about the pioggia. Nobody asks the gatto.';

test('the narration share is half the line\'s, capped, and the prompt states it with a count', () => {
  assert.deepEqual(NARRATIVE_SHARE, { ofLine: 0.5, max: 0.3 });
  assert.equal(narrativeRatio(0.25), 0.125);
  assert.equal(narrativeRatio(0.5), 0.25);
  assert.equal(narrativeRatio(0.9), 0.3);
  assert.equal(narrativeRatio(0), 0);
  const c = loadGameContent({ language: 'it' });
  const base = { language: c.language, character: c.character, styleGuide: c.styleGuide, locationName: 'The Coffee Cart', vocabularyById: c.vocabularyById, objectives: c.encounter.objectives };
  const at = (ratio) => buildNarrationMessages({ ...base, targetRatio: ratio })[0].content;
  assert.match(at(0.25), /Narrative text is English prose with a few Italian words dropped in: about 13% of its words \(in a 40-word narrative, about 5\)/);
  assert.match(at(0.5), /about 25% of its words \(in a 40-word narrative, about 10\)/);
  assert.match(at(0.9), /about 30% of its words \(in a 40-word narrative, about 12\)/);
  assert.match(at(0.25), /never a word the learning data below asks the player to say/);
  assert.match(at(0.25), /List every Italian word or phrase of the narrative in `narrative_words`/);
  assert.match(at(0.25), /- Narrative text is English prose; the few target-language words in it are the ones the language rules ask for/);
  assert.doesNotMatch(at(0.25), /always English|always in English/);
});

test('the schema takes the list, an empty one, or none', () => {
  const base = new FixtureProvider().narrate([{ content: 'TURN DATA: {"task":"greeting"}' }]);
  assert.equal(encounterResponseSchema.safeParse(base).success, true);
  assert.equal(encounterResponseSchema.safeParse({ ...base, narrative_words: [] }).success, true);
  assert.equal(encounterResponseSchema.safeParse({ ...base, narrative_words: [{ word: 'gatto', meaning: 'cat' }] }).success, true);
  assert.equal(encounterResponseSchema.safeParse({ ...base, narrative_words: [{ word: 'gatto' }] }).success, false);
});

test('listed words that stand in the narration are kept, stored and sent, once each and tidied', async (t) => {
  const { runtime, learnerId, line } = await greet(t, STALL, [
    { word: 'bancarella', meaning: 'market stall' }, { word: ' gatto ', meaning: '  cat ' }, { word: 'Gatto', meaning: 'the cat again' }, { word: 'pioggia', meaning: 'rain' },
  ]);
  assert.equal(line.narrative, STALL);
  assert.deepEqual(line.narrativeWords, [{ word: 'bancarella', meaning: 'market stall' }, { word: 'gatto', meaning: 'cat' }, { word: 'pioggia', meaning: 'rain' }]);
  const { encounter } = await runtime.service.currentEncounter(learnerId);
  assert.deepEqual(encounter.transcript[0].narrativeWords, line.narrativeWords);
});

test('a listed word is dropped when it is not in the narration, is part of a longer word, is too long or has no meaning', async (t) => {
  const { line } = await greet(t, STALL, [
    { word: 'sole', meaning: 'sun' }, // not there
    { word: 'banca', meaning: 'bank' }, // inside bancarella
    { word: 'gatto', meaning: '' },
    { word: 'pioggia', meaning: 'x'.repeat(NARRATIVE_WORDS.meaning + 1) },
    { word: `the ${'bancarella '.repeat(5)}`, meaning: 'too long to be a word' },
    { word: '', meaning: 'nothing' },
    { word: 'bancarella', meaning: 'market stall' },
  ]);
  assert.deepEqual(line.narrativeWords, [{ word: 'bancarella', meaning: 'market stall' }]);
});

test('a word an objective asks the player for is never tappable, whatever its form; the others are', async (t) => {
  // Gerald's objectives ask for caffè and senza latte.
  const narrative = 'A caffè steams on the banco. Someone has ordered it senza latte, which is the only way.';
  const { line } = await greet(t, narrative, [{ word: 'caffè', meaning: 'coffee' }, { word: 'senza latte', meaning: 'without milk' }, { word: 'banco', meaning: 'counter' }]);
  assert.equal(line.narrative, narrative); // the words stay in the text
  assert.deepEqual(line.narrativeWords, [{ word: 'banco', meaning: 'counter' }]);
  const spanish = await greet(t, 'Un café humea on the mostrador.', [{ word: 'café', meaning: 'coffee' }, { word: 'mostrador', meaning: 'counter' }], 'es');
  assert.deepEqual(spanish.line.narrativeWords, [{ word: 'mostrador', meaning: 'counter' }]);
});

test('at most the limit is kept; no list, an empty list or junk leaves the line as it was', async (t) => {
  const many = Array.from({ length: NARRATIVE_WORDS.max + 5 }, (_, i) => `parola${String.fromCharCode(97 + i)}`);
  const { line } = await greet(t, `The stall sells ${many.join(', ')} and little else.`, many.map((word) => ({ word, meaning: 'a word' })));
  assert.equal(line.narrativeWords.length, NARRATIVE_WORDS.max);
  for (const words of [undefined, [], [{ word: 'sole', meaning: 'sun' }]]) {
    const plain = await greet(t, STALL, words);
    assert.equal('narrativeWords' in plain.line, false, JSON.stringify(words));
  }
});
