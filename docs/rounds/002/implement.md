Implemented “Playtest ParaLLang through Codex and Claude Code subscriptions.”

- Added isolated Codex/Claude CLI adapters, native subscription preflight, structured-output validation, bounded queue/process runner, safe errors, rollback, shutdown cleanup, loopback binding, verification scripts, documentation, and focused fixtures/tests.
- Blank `LLM_MODEL` uses the CLI default. Codex runs without its shared daemon; provider UI and the existing Spellbook policy remain unchanged.
- Passed: 46 server tests, 3 selected storage tests, 5 store tests, 3 selected UI tests, client production build, `git diff --check`, both provider checks, and a real Vite proxy health smoke.
- Claude live: Claude Code 2.1.287, native subscription, resolved `claude-opus-5-5`; all 9 grading cases matched and the complete encounter resolved in 14 calls. Grading took 5.4–6.4 seconds per case; encounter total was 46.8 seconds.
- Codex live gap: Codex CLI 0.162.0 passed ChatGPT-auth and isolation preflight, but this managed environment denied its in-process runtime initialization before inference. Four bounded launch attempts were stopped; no model/result was resolved.
- Actual browser driving was unavailable. The managed sandbox also denied writing to the requested external evidence directory, so no evidence files were saved elsewhere or in the worktree. Broad/unselected suites were intentionally skipped per the test plan.

The [OpenAI Docs skill](/Users/bary/.codex/skills/.system/openai-docs/SKILL.md) guided the Codex auth, isolation, and structured-exec controls, cross-checked against official [authentication](https://learn.chatgpt.com/docs/auth) and [non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) documentation.
