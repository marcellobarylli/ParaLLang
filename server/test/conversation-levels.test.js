// Round 177: the conversation rules by level, after the playtest of 2026-11-24 (docs/playtests/2026-11-24-conversations).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGameContent } from '../src/content-loader.js';
import { buildNarrationMessages, conversationLevel } from '../src/llm/prompt-builder.js';

const content = loadGameContent({ language: 'it' });
const systemAt = (level) => buildNarrationMessages({
  language: content.language, character: content.character, styleGuide: content.styleGuide, locationName: 'The Coffee Cart',
  vocabularyById: content.vocabularyById, objectives: content.encounter.objectives, targetRatio: 0.25, ...(level ? { level } : {}),
})[0].content;

test('a level is read as its band; an unknown or missing one is A1', () => {
  assert.equal(conversationLevel('A1'), 'A1');
  assert.equal(conversationLevel('a2'), 'A2');
  assert.equal(conversationLevel('B1'), 'B1');
  assert.equal(conversationLevel('B2'), 'B1');
  assert.equal(conversationLevel(null), 'A1');
  assert.equal(conversationLevel('nonsense'), 'A1');
});

test('every level: one question a line, never about the character\'s own work, no model answers, steady weather', () => {
  for (const level of ['A1', 'A2', 'B1']) {
    const system = systemAt(level);
    assert.match(system, new RegExp(`CONVERSATION \\(the player is at level ${level}\\):`));
    assert.match(system, /asks the player exactly one question, at its end\. Never two questions in one line/);
    assert.match(system, /never what the player thinks of Gerald's work, trade, things or place, and never what the player wants to know or ask about Gerald/);
    assert.match(system, /Never say the phrase the player is meant to say as a model answer/);
    assert.match(system, /never change them partway through the conversation/);
    assert.match(system, /Plain text only: no markdown/);
    assert.doesNotMatch(system, /what they make of Gerald's trade|Ask in one go for everything|\{\{/);
  }
});

test('A1 keeps to the conversation\'s words and accepts a goodbye; A2 and B1 talk about the player', () => {
  const a1 = systemAt('A1');
  assert.equal(systemAt(), a1, 'an authored encounter speaks at A1');
  assert.match(a1, /one or two short sentences of plain words/);
  assert.match(a1, /Do not open new topics that need new words/);
  assert.match(a1, /a question answered by yes or no, or by one word, is good here/);
  assert.match(a1, /When the player says goodbye, Gerald says goodbye back/);
  for (const level of ['A2', 'B1']) {
    const system = systemAt(level);
    assert.match(system, /First respond to what the player actually said/);
    assert.match(system, /at most one remark of Gerald's own, as a statement: the weather/);
    assert.doesNotMatch(system, /knows only a handful/);
  }
  assert.match(systemAt('A2'), /End with one question about the player that an elementary learner can answer/);
  assert.match(systemAt('B1'), /End with one open question about the player: their experience, their opinion and why/);
});
