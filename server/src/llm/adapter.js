import { OpenAIAdapter } from './adapters/openai.js';
import { OllamaAdapter } from './adapters/ollama.js';

const providers = {
  openai: OpenAIAdapter,
  ollama: OllamaAdapter,
};

export class LLMAdapter {
  constructor(provider, config) {
    const AdapterClass = providers[provider];
    if (!AdapterClass) {
      throw new Error(`Unknown LLM provider: ${provider}. Available: ${Object.keys(providers).join(', ')}`);
    }
    this.provider = new AdapterClass(config);
  }

  async chat(messages, options = {}) {
    return this.provider.chat(messages, options);
  }

  async structuredChat(messages, schema, options = {}) {
    return this.provider.structuredChat(messages, schema, options);
  }
}
