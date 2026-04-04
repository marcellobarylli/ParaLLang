export class OllamaAdapter {
  constructor(config) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3';
  }

  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.8,
          num_predict: options.maxTokens ?? 1024,
        },
      }),
    });

    const data = await response.json();
    return {
      content: data.message.content,
      usage: { prompt_tokens: data.prompt_eval_count, completion_tokens: data.eval_count },
    };
  }

  async structuredChat(messages, schema, options = {}) {
    // Append JSON instruction to the last system message or add one
    const augmentedMessages = [
      ...messages,
      {
        role: 'system',
        content: 'You MUST respond with valid JSON only. No text outside the JSON object.',
      },
    ];

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: augmentedMessages,
        format: 'json',
        stream: false,
        options: {
          temperature: options.temperature ?? 0.8,
          num_predict: options.maxTokens ?? 1024,
        },
      }),
    });

    const data = await response.json();
    const parsed = JSON.parse(data.message.content);

    // Validate and retry once on failure
    const result = schema.safeParse(parsed);
    if (result.success) return result.data;

    // Retry with error feedback
    const retryMessages = [
      ...augmentedMessages,
      { role: 'assistant', content: data.message.content },
      {
        role: 'user',
        content: `Your JSON was invalid. Errors: ${result.error.message}. Please try again with valid JSON.`,
      },
    ];

    const retryResponse = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: retryMessages,
        format: 'json',
        stream: false,
        options: { temperature: 0.3, num_predict: options.maxTokens ?? 1024 },
      }),
    });

    const retryData = await retryResponse.json();
    const retryParsed = JSON.parse(retryData.message.content);
    return schema.parse(retryParsed);
  }
}
