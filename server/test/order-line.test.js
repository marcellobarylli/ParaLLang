// Round 051 (backlog H1, critique 1.5): the grading prompt's ORDER line appears only for more than one ordered
// objective; otherwise the messages are byte-identical to the template with an empty placeholder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadGameContent } from '../src/content-loader.js';
import { buildGradingMessages } from '../src/llm/prompt-builder.js';

const content = loadGameContent({ language: 'it' });
const { objectives } = content.encounters.get('cracked_fountain_letharger').encounter;
const build = (list, ordered) => buildGradingMessages({ language: content.language, objectives: list, vocabularyById: content.vocabularyById, conversationContext: ['Ciao!'], playerInput: 'Adesso!', ordered });

test('the ORDER line is added for two or more ordered objectives, after the rules and before the rubric', () => {
  const system = build(objectives.slice(2), true)[0].content;
  assert.match(system, /unassisted\.\n- ORDER: these objectives count only in the order given\. .*never write an expression in Italian that would satisfy it\.\n\nAUTHORED RUBRIC: \[/s);
  assert.doesNotMatch(system, /\{\{order\}\}/);
  assert.match(system, /must not call it a success or say it will count later/);
});

test('one objective, or an unordered call, gives the prompt without the line, byte for byte', async () => {
  const template = await readFile(resolve(import.meta.dirname, '../../prompts/language/grading.txt'), 'utf8');
  assert.equal(template.match(/\{\{order\}\}/g).length, 1);
  const plain = build(objectives.slice(3), false);
  assert.deepEqual(build(objectives.slice(3), true), plain, 'a single ordered objective');
  assert.doesNotMatch(plain[0].content, /ORDER/);
  assert.match(plain[0].content, /5 correct and unassisted\.\n\nAUTHORED RUBRIC: /);
  assert.deepEqual(build(objectives.slice(2), false), buildGradingMessages({ language: content.language, objectives: objectives.slice(2), vocabularyById: content.vocabularyById, conversationContext: ['Ciao!'], playerInput: 'Adesso!' }), 'ordered defaults to false');
  assert.doesNotMatch(build(objectives.slice(2), false)[0].content, /ORDER/);
});
