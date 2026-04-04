import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createLLMAdapter } from './src/llm/index.js';
import { createEncounterRouter } from './src/routes/encounter.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const llmAdapter = createLLMAdapter();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/encounter', createEncounterRouter(llmAdapter));

app.listen(PORT, () => {
  console.log(`ParaLLang server listening on port ${PORT}`);
  console.log(`LLM provider: ${process.env.LLM_PROVIDER || 'openai'}`);
});

export default app;
