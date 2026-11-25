import { currentRequest } from '../request-context.js';
import { GeminiAdapter } from './adapters/gemini.js';
import { AnthropicAdapter } from './adapters/anthropic.js';
import { ProviderError } from './provider-error.js';

// Round 171: the hosted server serves the owner on the owner's provider (claude-cli) and friends on Gemini: the
// friend's own key when they sent one (X-Gemini-Key), else the server's GEMINI_API_KEY. Without either, a friend's
// turn ends in MODEL_SETUP_REQUIRED and the page shows the steps for a free key. A friend's key is used for their
// request only and is never stored.
//
// Round 183: with CLAUDE_API_KEY (a Claude API key, paid from the owner's monthly Max API credit), friends'
// turns run on Claude (Sonnet 5.5 by default, FRIENDS_CLAUDE_MODEL), unless the friend sent a Gemini key of their own.
// When a Claude call fails and the server has GEMINI_API_KEY, the turn is tried once on Gemini; if that fails too, the
// player is told Claude's reason.
const MAX_CACHED_KEYS = 32;

class ClaudeThenGemini {
  constructor(claude, gemini) { this.claude = claude; this.gemini = gemini; }
  async run(method, args) {
    try { return await this.claude[method](...args); }
    catch (error) {
      const signal = args.at(-1)?.signal;
      if (!this.gemini || signal?.aborted) throw error;
      try { return await this.gemini[method](...args); }
      catch { throw error; }
    }
  }
  chat(...args) { return this.run('chat', args); }
  structuredChat(...args) { return this.run('structuredChat', args); }
}

export class FriendRouter {
  constructor({ primary, geminiKey = null, geminiModel = null, geminiFallbackModel = undefined, createGemini = (config) => new GeminiAdapter(config),
    claudeKey = null, claudeModel = null, createClaude = (config) => new AnthropicAdapter(config) }) {
    this.primary = primary;
    this.claude = claudeKey ? createClaude({ apiKey: claudeKey, model: claudeModel || undefined }) : null;
    this.serverGeminiKey = geminiKey || null;
    this.geminiModel = geminiModel || null;
    this.geminiFallbackModel = geminiFallbackModel; // round 182: undefined means the adapter's default
    this.createGemini = createGemini;
    this.geminiByKey = new Map();
  }

  forRequest() {
    const request = currentRequest();
    if (request?.access !== 'friend') return this.primary;
    if (this.claude && !request.geminiKey) {
      this.claudeRoute ??= new ClaudeThenGemini(this.claude, this.serverGeminiKey ? this.geminiFor(this.serverGeminiKey) : null);
      return this.claudeRoute;
    }
    const key = request.geminiKey || this.serverGeminiKey;
    if (!key) throw new ProviderError('model-setup', { provider: 'gemini' });
    return this.geminiFor(key);
  }

  geminiFor(key) {
    let adapter = this.geminiByKey.get(key);
    if (!adapter) {
      adapter = this.createGemini({ apiKey: key, model: this.geminiModel, ...(this.geminiFallbackModel !== undefined ? { fallbackModel: this.geminiFallbackModel } : {}) });
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
