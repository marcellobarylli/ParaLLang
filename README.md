# ParaLLang

ParaLLang is a conversational Spanish-learning game. The implemented Phase 2 loop takes place at The Coffee Cart in The Crumbling Market: order from Gerald, use tracked companion help, collect canonical vocabulary, and practise due Spellbook cards.

## Run locally

Node.js 20.11 or newer and npm are required (`import.meta.dirname` is used by the server). From the repository root:

```sh
npm ci
cp .env.example .env
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` to the server on port 3001. The root `.env` is loaded consistently even when the server is started through its npm workspace.

Choose one narration/grading provider in `.env`:

- `LLM_PROVIDER=openai`: set `OPENAI_API_KEY`; the default model is `gpt-4o-mini`.
- `LLM_PROVIDER=ollama`: ensure the configured `OLLAMA_BASE_URL` is already reachable; the default model is `llama3.1`.
- `LLM_MODEL` overrides the selected provider's default. The app does not download models or provision accounts.

Both dialogue grading and Gerald's follow-up narration are separate structured calls. A grading/provider error is retryable and does not commit the turn.

## Learning data and saves

The browser keeps a server-issued opaque learner ID in local storage. The server writes that learner's Spellbook and durable attempt receipts as one atomic JSON document under `server/data/saves/` by default. Override the directory with `PARALLANG_SAVE_DIR`. The directory is resolved independently of the shell's working directory and is gitignored.

Definitions remain in `content/language/vocabulary/`; saves contain canonical IDs, content version, evidence, and review schedules. Encounter transcripts are intentionally in memory only, so a server restart starts a fresh conversation while preserving the Spellbook. Invalid, corrupt, or unsupported saves are reported and left untouched rather than reset.

## Focused verification

Round 001 deliberately selects these checks rather than a broad repository suite:

```sh
node --test server/test/language-engine.test.js server/test/learning-flow.test.js server/test/learning-storage.test.js server/test/llm-contracts.test.js
npm exec --workspace client -- vitest run src/components/__tests__/learning-flow.test.jsx src/stores/__tests__/learning-state.test.js
npm run build -w client
```

The automated provider-contract tests use mocked transports and deterministic grading fixtures; they prove schema/error integration, not live-model teaching quality. Live evaluation requires an already configured OpenAI account or reachable Ollama model. Browser speech tests mock the speech-synthesis boundary; actual voice and speaker quality must be checked on the target device.
