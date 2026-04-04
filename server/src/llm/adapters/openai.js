import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class OpenAIAdapter {
  constructor(config) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model || 'gpt-4o-mini';
  }

  async chat(messages, options = {}) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 1024,
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
    };
  }

  async structuredChat(messages, schema, options = {}) {
    const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 1024,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'encounter_response',
          strict: true,
          schema: jsonSchema,
        },
      },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    return schema.parse(parsed);
  }
}
