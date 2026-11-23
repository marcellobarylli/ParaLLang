import { currentRequest } from '../request-context.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { ProviderError } from './provider-error.js';

// Round 171: the hosted server serves the owner on the owner's provider (claude-cli) and friends on Gemini: the
// friend's own key when they sent one (X-Gemini-Key), else the server's GEMINI_API_KEY. Without either, a friend's
// turn ends in MODEL_SETUP_REQUIRED and the page shows the steps for a free key. A friend's key is used for their
// request only and is never stored.
const MAX_CACHED_KEYS = 32;

export class FriendRouter {
  constructor({ primary, geminiKey = null, geminiModel = null, createGemini = (config) => new GeminiAdapter(config) }) {
    this.primary = primary;
    this.serverGeminiKey = geminiKey || null;
    this.geminiModel = geminiModel || null;
    this.createGemini = createGemini;
    this.geminiByKey = new Map();
  }

  forRequest() {
    const request = currentRequest();
    if (request?.access !== 'friend') return this.primary;
    const key = request.geminiKey || this.serverGeminiKey;
    if (!key) throw new ProviderError('model-setup', { provider: 'gemini' });
    let adapter = this.geminiByKey.get(key);
    if (!adapter) {
      adapter = this.createGemini({ apiKey: key, model: this.geminiModel });
      if (this.geminiByKey.size >= MAX_CACHED_KEYS) this.geminiByKey.delete(this.geminiByKey.keys().next().value);
      this.geminiByKey.set(key, adapter);
    }
    return adapter;
  }

  chat(messages, options) { return this.forRequest().chat(messages, options); }
  structuredChat(messages, schema, options) { return this.forRequest().structuredChat(messages, schema, options); }
  preflight() { return this.primary.preflight(); }
  shutdown() { return this.primary.shutdown?.(); }
  get serial() { return this.primary.serial === true; }
  get providerName() { return this.primary.providerName; }
  get model() { return this.primary.model; }
  get generationCount() { return this.primary.generationCount ?? 0; }
  get lastResolvedModel() { return this.primary.lastResolvedModel ?? null; }
}
