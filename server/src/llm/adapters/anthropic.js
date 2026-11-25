import Anthropic from '@anthropic-ai/sdk';
import { schemaForCLI } from '../cli-adapter.js';

// Round 183: friends' turns on the Claude API, on a key from a Console organization that receives the owner's monthly
// Max API credit (CLAUDE_API_KEY). Replies are structured outputs (output_config.format, the same strict JSON
// schema the claude-cli adapter sends), checked against the zod schema here as every provider's are. Sonnet 5.5 takes
// no sampling parameters, so the game's temperature is not sent; effort is low, as for chat, to keep turns quick.
export const CLAUDE_DEFAULT_MODEL = 'claude-sonnet-5-5';
const MAX_TOKENS = 16_000;
const TIMEOUT_MS = 120_000;

// The game's messages are OpenAI-shaped: system messages first, then turns. The leading system messages become the
// system prompt; a later one (none today) is passed on as a user note. Consecutive turns of one role are joined, and a
// conversation that opens on the character's line gets a short user turn before it, as the API expects.
export function toClaudeRequest(messages) {
  const system = [];
  const turns = [];
  for (const message of messages) {
    const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
    if (message.role === 'system' && !turns.length) { system.push(content); continue; }
    const role = message.role === 'assistant' ? 'assistant' : 'user';
    const text = message.role === 'system' ? `[Instruction] ${content}` : content;
    const last = turns.at(-1);
    if (last?.role === role) last.content += `\n\n${text}`;
    else turns.push({ role, content: text });
  }
  if (turns[0]?.role !== 'user') turns.unshift({ role: 'user', content: '(The conversation so far.)' });
  return { system: system.join('\n\n'), messages: turns };
}

// The strict schema lists every field as required and makes optional ones nullable, so a reply may carry null where
// the game's schema expects the field to be absent: those nulls are dropped before a second check.
function withoutNulls(value) {
  if (Array.isArray(value)) return value.map(withoutNulls);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, withoutNulls(v)]));
  }
  return value;
}

export function parseAgainst(schema, value) {
  const first = schema.safeParse(value);
  if (first.success) return first.data;
  const second = schema.safeParse(withoutNulls(value));
  if (second.success) return second.data;
  throw first.error;
}

// Structured outputs accept a subset of JSON Schema; length and range limits are left out of what is sent and are
// still enforced by the zod check of the reply.
const UNSENT_KEYWORDS = new Set(['minLength', 'maxLength', 'pattern', 'format', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minItems', 'maxItems', 'uniqueItems', 'default']);
export function claudeSchema(value) {
  if (Array.isArray(value)) return value.map(claudeSchema);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => !UNSENT_KEYWORDS.has(key)).map(([key, v]) => [key, key === 'properties' ? Object.fromEntries(Object.entries(v).map(([name, sub]) => [name, claudeSchema(sub)])) : claudeSchema(v)]));
  }
  return value;
}

function tagged(error) {
  if (error && typeof error === 'object' && !error.provider) {
    try { error.provider = 'anthropic'; } catch { /* a frozen error keeps its own fields */ }
  }
  return error;
}

export class AnthropicAdapter {
  constructor(config = {}) {
    if (!config.client && !config.apiKey) throw new Error('The Claude API needs a key (CLAUDE_API_KEY).');
    this.model = config.model || CLAUDE_DEFAULT_MODEL;
    this.effort = config.effort || 'low';
    this.client = config.client || new Anthropic({ apiKey: config.apiKey, timeout: config.timeoutMs ?? TIMEOUT_MS, maxRetries: config.maxRetries ?? 2 });
    this.providerName = 'anthropic';
  }

  async send(messages, options, format = null) {
    const { system, messages: turns } = toClaudeRequest(messages);
    let response;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        ...(system ? { system } : {}),
        messages: turns,
        output_config: { effort: this.effort, ...(format ? { format } : {}) },
      }, options.signal ? { signal: options.signal } : undefined);
    } catch (error) { throw tagged(error); }
    if (response.stop_reason === 'refusal') {
      const category = response.stop_details?.category;
      throw tagged(new Error(`Claude declined to answer${category ? ` (${category})` : ''}.`));
    }
    const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
    if (response.stop_reason === 'max_tokens') throw tagged(new Error('Claude ran out of room before finishing its reply.'));
    return { text, usage: response.usage };
  }

  async chat(messages, options = {}) {
    const { text, usage } = await this.send(messages, options);
    return { content: text, usage };
  }

  async structuredChat(messages, schema, options = {}) {
    const { text } = await this.send(messages, options, { type: 'json_schema', schema: claudeSchema(schemaForCLI(schema)) });
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { throw tagged(new Error('Claude returned malformed JSON.')); }
    try { return parseAgainst(schema, parsed); }
    catch (error) { throw tagged(error); }
  }
}
