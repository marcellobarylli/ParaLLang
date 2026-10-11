import { OpenAIAdapter } from './adapters/openai.js';
import { OllamaAdapter } from './adapters/ollama.js';
import { CodexCLIAdapter } from './adapters/codex-cli.js';
import { ClaudeCLIAdapter } from './adapters/claude-cli.js';

const providers = {
  openai: OpenAIAdapter,
  ollama: OllamaAdapter,
  'codex-cli': CodexCLIAdapter,
  'claude-cli': ClaudeCLIAdapter,
};

export class LLMAdapter {
  constructor(provider, config) {
    const AdapterClass = providers[provider];
    if (!AdapterClass) {
      throw new Error(`Unknown LLM provider: ${provider}. Available: ${Object.keys(providers).join(', ')}`);
    }
    this.providerNameValue = provider;
    this.provider = new AdapterClass(config);
  }

  async chat(messages, options = {}) {
    return this.provider.chat(messages, options);
  }

  async structuredChat(messages, schema, options = {}) {
    return this.provider.structuredChat(messages, schema, options);
  }

  async preflight() {
    return this.provider.ensurePreflight ? this.provider.ensurePreflight() : {
      provider: this.providerName,
      requestedModel: this.provider.model,
      authentication: 'provider-specific',
      isolation: [],
    };
  }

  async shutdown() { await this.provider.shutdown?.(); }

  get providerName() { return this.provider.providerName ?? this.providerNameValue; }

  get model() { return this.provider.model; }

  get generationCount() { return this.provider.generationCount ?? 0; }

  get lastResolvedModel() { return this.provider.lastResolvedModel ?? null; }
}
