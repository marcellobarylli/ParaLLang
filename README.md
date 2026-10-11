# ParaLLang

ParaLLang is a conversational Spanish-learning game. The implemented Phase 2 loop takes place at The Coffee Cart in The Crumbling Market: order from Gerald, use tracked companion help, collect canonical vocabulary, and practise due Spellbook cards.

## Playtest ParaLLang through Codex and Claude Code subscriptions

ParaLLang can use either official CLI with its native subscription sign-in for both Gerald's narration and dialogue grading. CLI mode is local-only: the backend binds to `127.0.0.1`, starts a fresh isolated CLI process for each generation, disables coding and external tools, and never falls back to an API key, alternate provider, model, or billing path.

## Run locally

Node.js 20.11 or newer and npm are required (`import.meta.dirname` is used by the server). From the repository root:

```sh
npm ci
cp .env.example .env
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` to the server on port 3001. The root `.env` is loaded consistently even when the server is started through its npm workspace.

Choose one narration/grading provider in the root `.env`:

- `LLM_PROVIDER=codex-cli`: install the official Codex CLI, run `codex login`, and complete the ChatGPT browser sign-in. API-key login does not satisfy this mode.
- `LLM_PROVIDER=claude-cli`: install the official Claude Code CLI, run `claude auth login`, and use native `claude.ai` subscription authentication. API keys and third-party providers do not satisfy this mode.
- `LLM_PROVIDER=openai`: set `OPENAI_API_KEY`; the default model is `gpt-4o-mini`.
- `LLM_PROVIDER=ollama`: ensure the configured `OLLAMA_BASE_URL` is already reachable; the default model is `llama3.1`.
- `LLM_MODEL` optionally selects a model for any provider. When it is blank for a CLI provider, ParaLLang delegates to that CLI's default; it never supplies the OpenAI API default to a CLI.

Optional CLI settings are `CODEX_CLI_PATH`, `CLAUDE_CLI_PATH`, and `LLM_CLI_TIMEOUT_MS`. Executable settings are paths, not shell commands. The timeout defaults to 120000 ms and accepts integers from 1000 through 300000. Existing `.env` values are preserved when the root file is loaded.

After selecting a provider, verify installation, isolation capabilities, and subscription authentication without making an inference request:

```sh
npm run check:provider
# Or inspect a provider without editing .env:
npm run check:provider -- --provider codex-cli
npm run check:provider -- --provider claude-cli
```

The check prints only the provider, CLI version, authentication category, requested model/default, and active isolation controls. Provider changes require a server restart. Then run `npm run dev` and open `http://localhost:5173`.

Both dialogue grading and Gerald's follow-up narration are separate structured calls. A grading/provider error is retryable and does not commit the turn.

The integration was developed against capability surfaces observed in Codex CLI 0.162.0 and Claude Code 2.1.287. These are tested versions, not unconditional minimums: `check:provider` rejects an installed version when the controls ParaLLang needs are absent. ParaLLang does not install or upgrade either CLI.

### CLI troubleshooting

- `CLI_MISSING`: install the official CLI or set its executable path, then restart the server.
- `CLI_AUTH_REQUIRED`: sign in through `codex login` or `claude auth login`; do not set an API key as a substitute.
- `CLI_UNSUPPORTED`: remove conflicting provider configuration or use an installed version whose help exposes the reported isolation controls.
- `CLI_MODEL_UNAVAILABLE`: remove `LLM_MODEL` to use the CLI default, or select a model available to that subscription.
- `CLI_QUOTA_EXHAUSTED`, `CLI_BUSY`, or `CLI_TIMEOUT`: keep the retained response in the browser and retry later. Increase `LLM_CLI_TIMEOUT_MS` only when a normal request genuinely needs longer.
- `CLI_INVALID_RESPONSE` or `CLI_PROCESS_FAILURE`: run `npm run check:provider`, restart the backend after configuration changes, and retry. Raw CLI stderr, prompts, account details, and credentials are intentionally omitted from browser errors and ordinary logs.

For an explicit bounded live evaluation (nine grading cases plus one complete encounter, at most 14 generation calls), run one provider at a time:

```sh
npm run verify:cli -- --provider codex-cli
npm run verify:cli -- --provider claude-cli
```

Live verification uses a temporary learner save and removes it afterward. It is never run by installation, startup, health checks, `check:provider`, or deterministic tests.

## Learning data and saves

The browser keeps a server-issued opaque learner ID in local storage. The server writes that learner's Spellbook and durable attempt receipts as one atomic JSON document under `server/data/saves/` by default. Override the directory with `PARALLANG_SAVE_DIR`. The directory is resolved independently of the shell's working directory and is gitignored.

Definitions remain in `content/language/vocabulary/`; saves contain canonical IDs, content version, evidence, and review schedules. Encounter transcripts are intentionally in memory only, so a server restart starts a fresh conversation while preserving the Spellbook. Invalid, corrupt, or unsupported saves are reported and left untouched rather than reset.

## Focused verification

Round 002 deliberately selects these checks rather than a broad repository suite:

```sh
node --test server/test/llm-contracts.test.js server/test/learning-flow.test.js server/test/cli-runner.test.js server/test/cli-providers.test.js server/test/cli-learning-flow.test.js
node --test --test-name-pattern="same-learner mutations serialize|dialogue and review receipts replay after service restart|persisted full-flow simulation recovers the exact review schedule" server/test/learning-storage.test.js
npm exec --workspace client -- vitest run src/stores/__tests__/learning-state.test.js
npm exec --workspace client -- vitest run src/components/__tests__/learning-flow.test.jsx -t "actual learning UI|loading plus|CLI provider"
npm run build -w client
git diff --check
```

The automated CLI tests use deterministic fake executables and never discover real CLIs, read credentials, or consume subscription quota. They prove process, isolation, schema, rollback, and error integration—not live-model teaching quality. Browser speech remains independent of the provider; actual voice and speaker quality must still be checked on the target device.
