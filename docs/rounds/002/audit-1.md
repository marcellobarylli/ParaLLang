# Round 002 — Critic's report

**Usable, with gaps.** Both subscription providers now play a full Gerald encounter in the real browser after I fixed a schema bug that had broken every Codex narration, but the bad-model message is still generic and the per-case grading record is incomplete.

## Works

- All selected automated checks pass: 46 server tests, 3 storage tests, 5 store tests, 3 UI tests, client build, formatting.
- Setup check passes for both CLIs with no model calls, reporting version, subscription category and isolation controls only.
- Real browser playthrough (headless Chrome, Vite proxy, loopback backend) for Codex and for Claude: greeting, coffee order, contextual no-milk answer, resolved order, Spellbook, reload. Turns took 9 to 18 seconds. No leftover CLI processes; clean shutdown.
- Missing-binary and process failures show safe, actionable messages in the browser and logs; learning data stays served; progress stays uncommitted.

## Broken

- An unavailable model name produces the generic 'temporarily unavailable, retry' message for both CLIs instead of a model-unavailable message.
- The Performer blamed the environment for the Codex failure; the real cause was the narration schema, which I fixed. Codex's nine grading cases ran before the fix but their verdicts were discarded by the verify script (also fixed).

## Not checked

- Claude's nine live grading cases rest on the Performer's report; the 20-call budget per provider is now fully used, so I could not repeat them or Codex's nine.
- Resolved model name for Codex: its event stream does not report it.

## Needs you

- Decide whether to allow two extra live calls so the bad-model error can be mapped properly. I recommend allowing it; otherwise accept the generic message.
- Optionally run npm run verify:cli for each provider yourself (14 calls each) to get the full nine-case live record.

## Sent to the Reviser

- Unexpected non-provider errors are now logged without their message, which hurts debugging. (server/src/app.js) — When the caught error is not an AppError, append error.message to the sanitized log line; provider errors are already wrapped, so no CLI output can reach this path.
