import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { createLLMAdapter } from './src/llm/index.js';
import { loadGameContent } from './src/content-loader.js';
import { JsonLearningStorage } from './src/learning-storage.js';
import { LearningService } from './src/learning-service.js';
import { createApp } from './src/app.js';

dotenv.config({ path: resolve(import.meta.dirname, '..', '.env') });

const port = Number(process.env.PORT || 3001);
const content = loadGameContent();
const provider = createLLMAdapter();
const storage = new JsonLearningStorage({
  saveDir: process.env.PARALLANG_SAVE_DIR || resolve(import.meta.dirname, 'data', 'saves'),
});
const service = new LearningService({ provider, storage, content });
const app = createApp({ service });

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`ParaLLang server listening on port ${port}`);
    console.log(`LLM provider: ${process.env.LLM_PROVIDER || 'openai'}`);
    console.log(`Spellbook saves: ${storage.saveDir}`);
  });
}

export { app, service };
export default app;
