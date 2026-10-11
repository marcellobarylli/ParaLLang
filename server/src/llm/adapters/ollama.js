import { zodToJsonSchema } from 'zod-to-json-schema';

export class OllamaAdapter {
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
    this.model = config.model || 'llama3.1';
    this.fetch = config.fetch || globalThis.fetch;
    this.timeoutMs = config.timeoutMs ?? 20_000;
    this.maxRetries = config.maxRetries ?? 1;
  }

  async request(body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Ollama request failed with HTTP ${response.status}.`);
      let data;
      try { data = await response.json(); }
      catch { throw new Error('Ollama returned a malformed HTTP response.'); }
      if (typeof data?.message?.content !== 'string') throw new Error('Ollama returned no response content.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`Ollama request timed out after ${this.timeoutMs}ms.`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async chat(messages, options = {}) {
    const data = await this.request({
      model: this.model, messages, stream: false,
      options: { temperature: options.temperature ?? 0.8, num_predict: options.maxTokens ?? 1024 },
    });
    return { content: data.message.content, usage: { prompt_tokens: data.prompt_eval_count, completion_tokens: data.eval_count } };
  }

  async structuredChat(messages, schema, options = {}) {
    const name = options.schemaName || 'structured_response';
    const { $schema: _ignored, ...jsonSchema } = zodToJsonSchema(schema, { target: 'jsonSchema7', $refStrategy: 'none' });
    const augmentedMessages = [...messages, {
      role: 'system',
      content: `Respond with JSON only, matching this schema exactly: ${JSON.stringify(jsonSchema)}`,
    }];
    let feedback = null;
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const attemptMessages = feedback ? [...augmentedMessages, { role: 'user', content: feedback }] : augmentedMessages;
      const data = await this.request({
        model: this.model, messages: attemptMessages, format: jsonSchema, stream: false,
        options: { temperature: attempt ? 0 : (options.temperature ?? 0.2), num_predict: options.maxTokens ?? 1400 },
      });
      try {
        const parsed = JSON.parse(data.message.content);
        const result = schema.safeParse(parsed);
        if (result.success) return result.data;
        lastError = new Error(`Ollama JSON did not match ${name}: ${result.error.message}`);
      } catch (error) {
        lastError = error instanceof SyntaxError ? new Error('Ollama returned malformed JSON.') : error;
      }
      feedback = `The prior response was invalid (${lastError.message}). Return a corrected JSON object only.`;
    }
    throw lastError;
  }
}
