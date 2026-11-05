import { resolve } from 'node:path';
import { createLLMAdapter } from './src/llm/index.js';
import { listenHostForProvider, loadRootEnv, resolveTargetLanguage, saveDirForLanguage } from './src/config.js';
import { loadGameContent } from './src/content-loader.js';
import { JsonLearningStorage } from './src/learning-storage.js';
import { LearningService } from './src/learning-service.js';
import { createApp } from './src/app.js';

loadRootEnv();

const port = Number(process.env.PORT || 3001);
const selectedProvider = process.env.LLM_PROVIDER || 'openai';
const host = listenHostForProvider(selectedProvider);
const content = loadGameContent({ language: resolveTargetLanguage() });
const provider = createLLMAdapter();
const storage = new JsonLearningStorage({
  saveDir: saveDirForLanguage(process.env.PARALLANG_SAVE_DIR || resolve(import.meta.dirname, 'data', 'saves'), content.language.code),
});
// Round 053: PARALLANG_ATMOSPHERE=on turns the map's LLM atmosphere line on (off by default: the CLI runner is serial).
const service = new LearningService({ provider, storage, content, atmosphere: (process.env.PARALLANG_ATMOSPHERE || '').trim().toLowerCase() === 'on' });
// Round 040 (critique 1.2): the ends are trimmed, as fetch trims header values.
const app = createApp({ service, token: (process.env.PARALLANG_TOKEN || '').trim() || null });

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, host, () => {
    console.log(`ParaLLang server listening on http://${host}:${port}`);
    console.log(`LLM provider: ${selectedProvider}`);
    console.log(`Target language: ${content.language.name} (${content.language.code})`);
    console.log(`Spellbook saves: ${storage.saveDir}`);
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    await service.shutdown();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

export { app, service };
export default app;
