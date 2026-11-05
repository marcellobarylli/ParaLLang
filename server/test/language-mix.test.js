// Round 026 (backlog E1): the language-mix rule gives the percentage and a worked example from the same ratio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { buildNarrationMessages } from '../src/llm/prompt-builder.js';
import { greetingMessages, variants } from '../../docs/rounds/026/results/greeting-replay.mjs';

const content = loadGameContent({ language: 'it' });
const render = (targetRatio) => buildNarrationMessages({
  language: content.language, character: content.character, styleGuide: content.styleGuide, locationName: 'The Coffee Cart',
  objectives: content.encounter.objectives, vocabularyById: content.vocabularyById, targetRatio,
})[0].content;

test('the language-mix rule renders the percentage and a 20-word example that agree', () => {
  for (const [ratio, pct, words] of [[0, 0, 0], [0.05, 5, 1], [0.25, 25, 5], [0.6, 60, 12]]) {
    const system = render(ratio);
    assert.ok(system.includes(`- Language mix: about ${pct}% of the words in each dialogue line are Italian, the greeting included (in a 20-word line, about ${words} words). Stay within about 10 points of it, under or over.`), `ratio ${ratio}`);
  }
  const system = render(0.25);
  assert.match(system, /- Reach it with short, whole Italian phrases \(greetings, questions, reactions, remarks\) that the English around them explains, not a single Italian formula inside a long English line\./);
  assert.doesNotMatch(system, /Target approximately/);
});

test("the greeting replay's new variant is what the built template renders, for every encounter of both packs", () => {
  for (const code of ['it', 'es']) {
    const pack = loadGameContent({ language: code });
    for (const definition of pack.encounters.values()) {
      const { messages, ratio } = greetingMessages(pack, definition);
      assert.deepEqual(variants(messages, ratio, pack.language.name).new, messages, `${code} ${definition.encounter.id}`);
    }
  }
});
