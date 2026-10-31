# ParaLLang

ParaLLang is a conversational language-learning game. It teaches Italian by default, and Spanish is also available. The implemented Phase 2 loop takes place at The Coffee Cart in The Crumbling Market: order from Gerald, use tracked companion help, collect canonical vocabulary, and practise due Spellbook cards.

## Design notes and project records

- `parallang.md` is the vision and lore; `prototype.md` is the technical blueprint.
- `parallang_obsidian/` holds the owner's Obsidian notes: design choices, lore, characters, locations, plot and quests, game mechanics and the development roadmap. Start at `Parallang.md` (the combined note) or `HUB.md` (links to the topic notes). The folder is a copy of the vault in `~/Documents/Parallang`, taken 2026-10-31 without the `.obsidian/` app settings. Edits made in Obsidian are not synced; copy the notes again to update them. To browse the notes with their `[[links]]`, open the folder as a vault in Obsidian.
- [`STATUS.md`](STATUS.md) has the current state, how the project is logged, and the round index. Design rounds live in `docs/rounds/NNN/`. From round 003 on they are recorded with the `round-log` and `codex-critique` Claude Code skills, and `python3 tools/round_log_check.py NNN` checks a round's records (tests: `python3 -m unittest discover -s tools`).

## Playtest ParaLLang through Codex and Claude Code subscriptions

ParaLLang can use either official CLI with its native subscription sign-in for both Gerald's narration and dialogue grading. CLI mode is local-only: the backend binds to `127.0.0.1`, starts a fresh isolated CLI process for each generation, disables coding and external tools, and never falls back to an API key, alternate provider, model, or billing path.

## Run locally

Node.js 20.11 or newer and npm are required (`import.meta.dirname` is used by the server). From the repository root:

```sh
npm ci
cp .env.example .env
npm run dev
```

For the iPhone app, see [Run the iPhone app](#run-the-iphone-app). The browser client runs at `http://localhost:5173` and proxies `/api` to the server on port 3001. The root `.env` is loaded consistently even when the server is started through its npm workspace.

### Target language

`TARGET_LANGUAGE` in the root `.env` selects the language Gerald speaks: `it` (Italian, the default) or `es` (Spanish). Each value names a language pack under `content/languages/<code>/`, which holds its `language.yaml` (name and BCP 47 tag), vocabulary and encounter; the character and narration style in `content/characters/` and `content/narration/` are shared. An unknown value stops the server at startup and lists the available packs. To switch, change the value, restart the server, then reload the browser page. The server prints the active language at startup.

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

The cases and encounter answers follow `TARGET_LANGUAGE` (for example `TARGET_LANGUAGE=es npm run verify:cli -- --provider codex-cli`). The output's `passed` is true only when every grading case matches its expected verdict and the encounter ends `resolved`; otherwise the command exits with status 1.

Live verification uses a temporary learner save and removes it afterward. It is never run by installation, startup, health checks, `check:provider`, or deterministic tests.

## Run the iPhone app

Development is app-first from round 004: new features go to the Expo / React Native app in `mobile/`, tested in the iOS Simulator on a Mac. The browser client in `client/` is kept working but frozen.

One-time setup (needs the Mac App Store and `sudo`):

1. Install Xcode from the App Store and open it once.
2. `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, then `sudo xcodebuild -runFirstLaunch`.
3. If no iOS Simulator runtime came with Xcode, run `xcodebuild -downloadPlatform iOS`.
4. Check that `xcrun simctl list devices available | grep iPhone` lists at least one iPhone.

`mobile/` is a standalone npm project, not a root workspace (Expo pins its own React and React Native versions), so it is installed separately. From the repository root:

```sh
npm ci
npm ci --prefix mobile
npm run dev:server     # in one terminal, with the provider chosen in .env as above
npm run dev:ios        # in another: boots the Simulator and opens the app in Expo Go
```

No Apple developer account, signing or native build is needed: Expo Go runs the app in the Simulator. The Simulator shares the Mac's network, so the app reaches the server at `http://127.0.0.1:3001` and CLI providers keep their local-only binding. To point the app at another address, set `EXPO_PUBLIC_API_URL` when starting Expo (for example `EXPO_PUBLIC_API_URL=http://127.0.0.1:3002 npm run dev:ios`); it is read at bundle time, so restart Expo after changing it.

If the server is not running, the app shows "Can't reach the ParaLLang server at http://127.0.0.1:3001. Start it with npm run dev:server." and keeps the text you sent. The target language comes from the server's `TARGET_LANGUAGE`; restart the server and reload the app (press `r` in the Expo terminal) to switch. Pronunciation uses the iOS voices installed in the Simulator: if the speaker button shows "Italian pronunciation unavailable", add an Italian voice in the Simulator's Settings → Accessibility → Spoken Content → Voices.

The app keeps its own learner ID (in the app's storage), so its Spellbook is separate from the browser's.

## Learning data and saves

The browser keeps a server-issued opaque learner ID in local storage, and the iPhone app keeps its own in the app's storage. The server writes that learner's Spellbook and durable attempt receipts as one atomic JSON document under `server/data/saves/` by default. Override the directory with `PARALLANG_SAVE_DIR`. Each language has its own Spellbook: Spanish saves stay directly in the save directory (where they were before language packs existed), and every other language saves to a subdirectory named after its code, such as `server/data/saves/it/`. The same learner ID starts with an empty Spellbook in a new language and finds its earlier cards again when that language is selected. The directory is resolved independently of the shell's working directory and is gitignored.

Definitions remain in each pack's `vocabulary/` folder; saves contain canonical IDs, content version, evidence, and review schedules. Encounter transcripts are intentionally in memory only, so a server restart starts a fresh conversation while preserving the Spellbook. Invalid, corrupt, or unsupported saves are reported and left untouched rather than reset.

## Focused verification

Round 002 deliberately selects these checks rather than a broad repository suite; round 003 adds the language-pack test (both packs, the Italian encounter and per-language saves), and round 004 adds the iPhone app's tests, its Expo health check and an iOS bundle:

```sh
node --test server/test/language-packs.test.js
node --test server/test/llm-contracts.test.js server/test/learning-flow.test.js server/test/cli-runner.test.js server/test/cli-providers.test.js server/test/cli-learning-flow.test.js
node --test --test-name-pattern="same-learner mutations serialize|dialogue and review receipts replay after service restart|persisted full-flow simulation recovers the exact review schedule" server/test/learning-storage.test.js
npm exec --workspace client -- vitest run src/stores/__tests__/learning-state.test.js
npm exec --workspace client -- vitest run src/components/__tests__/learning-flow.test.jsx -t "actual learning UI|loading plus|CLI provider"
npm run build -w client
npm run test:mobile
(cd mobile && npx expo-doctor && npx expo export --platform ios --output-dir "$(mktemp -d)")
git diff --check
```

The automated CLI tests use deterministic fake executables and never discover real CLIs, read credentials, or consume subscription quota. They prove process, isolation, schema, rollback, and error integration—not live-model teaching quality. Browser speech remains independent of the provider; actual voice and speaker quality must still be checked on the target device.
