# Round 002 — Critic's report after the correction

**Usable, with gaps.** The logging fix is confirmed and nothing it touched broke; the round remains usable with the same two gaps as before: a generic bad-model message and an incomplete live grading record.

## Works

- All 60 server tests pass, including the Reviser's new regression test for unexpected-error logging.
- Hand reproduction against a loopback server: a plain Error now logs its message with the request id, while the browser still gets only the generic message.
- Provider errors still log only safe fields (provider, category, exit code); raw CLI stderr does not reach the log.
- Known AppError messages are unchanged in logs and responses.
- Whitespace check on the diff is clean; the change touched only the error handler and one test file.

## Broken

- An unavailable model name still produces the generic 'temporarily unavailable, retry' message for both CLIs instead of a model-unavailable message (unchanged from audit 1).
- Codex's nine live grading cases ran before the narration schema fix, so the full per-case record is still incomplete (unchanged from audit 1).

## Not checked

- Claude's nine live grading cases still rest on the Performer's report; the live call budget was exhausted in audit 1.
- Browser playthroughs were not repeated; the correction did not touch client or provider code.
- If a route ever throws a non-Error value, the log line ends in 'undefined'. Cosmetic; not exercised by real code paths.

## Needs you

- Decide whether to allow two extra live calls so the bad-model error can be mapped properly. I recommend allowing it; otherwise accept the generic message.
- Optionally run npm run verify:cli for each provider yourself (14 calls each) for the full nine-case live record.

## Correction results

- **fixed**: Unexpected non-provider errors are logged without their message (server/src/app.js). — Log line now reads '[id] INTERNAL_ERROR <message>' for non-AppError throws; browser body stays generic; provider and AppError logs unchanged. Verified by the new test and a manual loopback reproduction saved in evidence.
