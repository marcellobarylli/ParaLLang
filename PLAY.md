# Play ParaLLang

A language-learning game: you walk a 3D world and talk to absurd characters who speak more and more Italian (or
Spanish) as you answer them. It runs in your browser on your own computer, and the characters are voiced by your own
Claude or ChatGPT subscription.

**Hand this file to your coding agent** (Claude Code, Codex, …) and say: *"Set up ParaLLang for me using PLAY.md."*

---

## For the agent: setup steps

Works on macOS, Linux and Windows. No Mac or iPhone is needed for the browser game.

1. **Requirements.** Git and Node.js 20.11 or newer (`node -v`). Install Node from https://nodejs.org if missing.
2. **A subscription CLI, signed in.** One of:
   - Claude Code: `claude` on PATH, signed in with `claude auth login` (a claude.ai Pro/Max subscription).
   - Codex: `codex` on PATH, signed in with `codex login` (ChatGPT sign-in, not an API key).

   If you are Claude Code or Codex yourself, the CLI is already installed; check that it is signed in with a
   subscription. The sign-in opens a browser, so ask the user to complete it.
3. **Clone and set up:**

   ```sh
   git clone https://github.com/marcellobarylli/ParaLLang.git
   cd ParaLLang
   npm run setup
   ```

   `npm run setup` installs dependencies, creates `.env`, picks `claude-cli` or `codex-cli` from what is on PATH,
   and checks the sign-in without spending any usage. It ends with `✓ Ready.` or names the one thing to fix.
   To choose the provider: `npm run setup -- claude-cli` or `npm run setup -- codex-cli`.
4. **Start it:** `npm run dev`, leave it running, and have the user open **http://localhost:5173**.
   The server is ready when the log shows `ParaLLang server listening on http://127.0.0.1:3001`.
   Check: `curl http://127.0.0.1:3001/api/health` returns `{"status":"ok",...}`.

### Options (in `.env`; restart `npm run dev` after a change, then reload the page)

| Setting | Values |
|---|---|
| `TARGET_LANGUAGE` | `it` Italian (default), `es` Spanish |
| `LLM_MODEL` | Blank = Sonnet for claude-cli. `haiku` is faster and uses less of the subscription |
| `LLM_PROVIDER` | `claude-cli`, `codex-cli`, or `openai` (needs `OPENAI_API_KEY`) / `ollama` (a local model) |

### Do not

- Set `ANTHROPIC_API_KEY` or similar for the CLI providers: they are refused on purpose. CLI mode uses the
  subscription sign-in only.
- Commit `.env`.

### If something fails

| Message | Fix |
|---|---|
| `CLI_MISSING` | Install the CLI, or set `CLAUDE_CLI_PATH` / `CODEX_CLI_PATH` in `.env` to its full path |
| `CLI_AUTH_REQUIRED` | `claude auth login` or `codex login`, then `npm run setup` |
| `CLI_MODEL_UNAVAILABLE` | `LLM_MODEL=default` (claude-cli) or leave it blank (codex-cli) |
| `CLI_QUOTA_EXHAUSTED`, `CLI_BUSY`, `CLI_TIMEOUT` | The subscription's limit or a slow turn; the typed answer is kept, retry later |
| Port 3001 or 5173 in use | Stop the other process, or set `PORT` in `.env` |

More detail: the README's "Run locally" and "CLI troubleshooting".

---

## For the player: how to play

- **The world map** opens first. Start at **Ta Prohm**, a jungle temple. The Kiln and *The Journey 2* (an endless
  road with a lesson plan from beginner A1 to B1) are open too.
- **Walk** to a site and talk to its character. Each has a small goal (greet them, order a coffee, …). Answer in the
  target language; the more you manage, the more of it they speak.
- **Stuck?** The help buttons reveal a word's or the whole line's meaning, and your companion's card gives hints.
- **The Spellbook** keeps every word you have met and brings them back for review at the right time.
- **Accents:** on a Mac hold a letter (e, a) to get è, à; on Windows use the international keyboard or just type
  without them.
- Each turn takes a few seconds: it is the model thinking, not a crash.

Progress is saved on your computer (`server/data/saves/`), so you can stop and come back.
