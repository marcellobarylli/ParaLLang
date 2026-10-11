import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OpenAIAdapter {
  constructor(config = {}) {
    this.model = config.model || 'gpt-4o-mini';
    this.client = config.client || new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeoutMs ?? 20_000,
      maxRetries: config.maxRetries ?? 1,
    });
  }

  async chat(messages, options = {}) {
    const response = await this.client.chat.completions.create({
      model: this.model, messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 1024,
    });
    return { content: response.choices[0].message.content, usage: response.usage };
  }

  async structuredChat(messages, schema, options = {}) {
    const name = options.schemaName || 'structured_response';
    // Strict mode requires the root to be the object schema itself; naming would wrap it in a $ref.
    const { $schema: _ignored, ...jsonSchema } = zodToJsonSchema(schema, { target: 'openAi', $refStrategy: 'none' });
    const response = await this.client.chat.completions.create({
      model: this.model, messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 1400,
      response_format: {
        type: 'json_schema',
        json_schema: { name, strict: true, schema: jsonSchema },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('OpenAI returned no structured response content.');
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { throw new Error('OpenAI returned malformed JSON.'); }
    return schema.parse(parsed);
  }
}
