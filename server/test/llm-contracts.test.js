import test from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIAdapter } from '../src/llm/adapters/openai.js';
import { OllamaAdapter } from '../src/llm/adapters/ollama.js';
import { encounterResponseSchema, gradingResponseSchema } from '../src/llm/schemas.js';
import { buildGradingMessages, buildNarrationMessages } from '../src/llm/prompt-builder.js';
import { loadGameContent } from '../src/content-loader.js';

const narration = {
  narrative: 'English narration.',
  dialogue: { speaker: 'Gerald', native: 'Un café.', translation: 'A coffee.', words: [{ word: 'café', pos: 'noun', meaning: 'coffee' }] },
  must_translate: true, difficulty: 1, hints_available: true, encounter_state: 'ongoing',
};
const grade = {
  objective_results: [{ objective_id: 'order_coffee', passed: true, feedback: 'Good.', vocabulary_evidence: [{ vocabulary_id: 'cafe', evidence: 'café', quality: 5 }] }],
  overall_feedback: 'Good.',
};
const messages = [{ role: 'system', content: 'system' }, { role: 'user', content: 'input' }];

function openAIClient(contents) {
  const calls = [];
  return {
    calls,
    client: { chat: { completions: { create: async (body) => {
      calls.push(body);
      const value = contents.shift();
      if (value instanceof Error) throw value;
      return { choices: [{ message: { content: value } }], usage: {} };
    } } } },
  };
}

function ollamaFetch(contents, calls) {
  return async (_url, init) => {
    calls.push(JSON.parse(init.body));
    const value = contents.shift();
    if (value instanceof Error) throw value;
    if (value?.status) return new Response(value.body || 'failure', { status: value.status });
    return new Response(JSON.stringify({ message: { content: value }, prompt_eval_count: 2, eval_count: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}

test('OpenAI structured paths carry strict narration and grading schemas with provider default', async () => {
  const mock = openAIClient([JSON.stringify(narration), JSON.stringify(grade)]);
  const adapter = new OpenAIAdapter({ client: mock.client });
  assert.equal(adapter.model, 'gpt-4o-mini');
  assert.deepEqual(await adapter.structuredChat(messages, encounterResponseSchema, { schemaName: 'encounter_narration' }), narration);
  assert.deepEqual(await adapter.structuredChat(messages, gradingResponseSchema, { schemaName: 'dialogue_assessment' }), grade);
  assert.equal(mock.calls[0].response_format.type, 'json_schema');
  assert.equal(mock.calls[0].response_format.json_schema.strict, true);
  assert.equal(mock.calls[0].response_format.json_schema.name, 'encounter_narration');
  assert.equal(mock.calls[1].response_format.json_schema.name, 'dialogue_assessment');
});

test('OpenAI transport, malformed JSON and schema failures are surfaced without manual retry loops', async () => {
  const mock = openAIClient([new Error('HTTP 429'), '{bad', JSON.stringify({ ...narration, narrative: undefined })]);
  const adapter = new OpenAIAdapter({ client: mock.client });
  await assert.rejects(adapter.structuredChat(messages, encounterResponseSchema), /HTTP 429/);
  await assert.rejects(adapter.structuredChat(messages, encounterResponseSchema), /malformed JSON/);
  await assert.rejects(adapter.structuredChat(messages, encounterResponseSchema), /Required/);
  assert.equal(mock.calls.length, 3);
});

test('Ollama sends explicit JSON schema for both flows and retries invalid output once', async () => {
  const calls = [];
  const adapter = new OllamaAdapter({ fetch: ollamaFetch(['not json', JSON.stringify(narration), JSON.stringify(grade)], calls), maxRetries: 1 });
  assert.equal(adapter.model, 'llama3.1');
  assert.deepEqual(await adapter.structuredChat(messages, encounterResponseSchema, { schemaName: 'encounter_narration' }), narration);
  assert.equal(calls.length, 2);
  assert.equal(typeof calls[0].format, 'object');
  assert.match(calls[0].messages.at(-1).content, /matching this schema exactly/);
  assert.match(calls[1].messages.at(-1).content, /prior response was invalid/i);
  assert.deepEqual(await adapter.structuredChat(messages, gradingResponseSchema, { schemaName: 'dialogue_assessment' }), grade);
});

test('Ollama bounds retry, reports non-2xx/schema failure, and enforces timeout', async () => {
  const nonOk = new OllamaAdapter({ fetch: ollamaFetch([{ status: 503 }], []), maxRetries: 1 });
  await assert.rejects(nonOk.structuredChat(messages, encounterResponseSchema), /HTTP 503/);
  const calls = [];
  const invalid = new OllamaAdapter({ fetch: ollamaFetch([JSON.stringify({}), JSON.stringify({})], calls), maxRetries: 1 });
  await assert.rejects(invalid.structuredChat(messages, encounterResponseSchema), /did not match/);
  assert.equal(calls.length, 2);
  const hangingFetch = (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
  const timed = new OllamaAdapter({ fetch: hangingFetch, timeoutMs: 5, maxRetries: 0 });
  await assert.rejects(timed.structuredChat(messages, encounterResponseSchema), /timed out/);
});

test('prompt assembly contains one player-message copy and authored constraints', () => {
  const content = loadGameContent();
  const playerInput = 'UNIQUE PLAYER ANSWER';
  const grading = buildGradingMessages({
    objectives: [content.encounter.objectives[0]], vocabularyById: content.vocabularyById,
    conversationContext: ['Earlier context'], playerInput,
  });
  assert.equal(grading.map((message) => message.content).join('\n').split(playerInput).length - 1, 1);
  assert.match(grading[0].content, /grammar_constraints/);
  assert.match(grading[0].content, /café/);
  const narrative = buildNarrationMessages({
    character: content.character, objectives: content.encounter.objectives,
    vocabularyById: content.vocabularyById, conversationHistory: [], playerInput,
    spanishRatio: .3, decision: { encounterState: 'ongoing' },
  });
  assert.equal(narrative.map((message) => message.content).join('\n').split(playerInput).length - 1, 1);
  assert.match(narrative[0].content, /30% Spanish/);
});
