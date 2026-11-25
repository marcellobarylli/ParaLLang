# Round 182 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's messages in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's messages; round 171 (friends on Gemini, `server/src/llm/friend-router.js`).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/excuse.js` (new), `server/src/llm/adapters/gemini.js`, `server/src/learning-service.js`
  (`callProvider`), `server/src/llm/adapters/openai.js` (per-request model and timeout), `server/src/llm/friend-router.js`,
  `server/server.js`, `server/src/config.js` (`GEMINI_FALLBACK_MODEL`), `render.yaml` (a comment),
  `server/test/excuse.test.js` (new), `server/test/gemini.test.js`.

## Decisions

1. **The message.** A character's turn that fails for a reason without its own steps now reads "<name> isn't feeling
   it right now. His convenient excuse: <reason> Your progress was not changed; retry in a moment." Before, it was
   "<name> is temporarily unavailable…", whatever the cause. The code stays `PROVIDER_FAILURE`, retryable, so the
   page behaves as before. The grader's failures read the same way, as "The language assessor".
2. **The reason.** Built from the thrown error (`describeFailure`): the provider's own status and words when it sent
   them ("Gemini answered 503 UNAVAILABLE: \"This model is currently experiencing high demand…\""), a reply that did
   not fit the game's format with the first fields at fault, no answer in time, not reachable, or the error's message
   (cut at 240 characters). It never contains a key.
3. **Google's words.** Google sends errors as a list (`[{ "error": … }]`), which the OpenAI library cannot read, so
   every Gemini error was "NNN status code (no body)". The Gemini client's `fetch` now unwraps the list before the
   library reads it (`unwrapGoogleErrors`). A refused key, now readable as "API key not valid", still becomes
   `MODEL_KEY_INVALID` with the page's steps; a 400 with no body in JSON mode still counts as a refused key.
4. **For everyone.** The message is the same for the owner and friends; the owner's claude-cli failures are mostly
   provider errors with their own messages, which are unchanged, as are the three Gemini key and quota errors.
5. **"His".** As the owner wrote it, for every character, including female ones.
6. **Fewer failures (second build, on the owner's word).** A Gemini call that fails for a passing reason (a 5xx such
   as 503 "high demand", 408, a timeout, no connection) is tried again: the configured model after 2 s, again after
   3 s on the fallback model (`GEMINI_FALLBACK_MODEL`, default `gemini-3.5-flash`; `none` keeps the configured
   model). Each attempt may take 90 s (it was 60 s), all three within 150 s; no attempt starts with less than 15 s
   left. The OpenAI library's own retry is off, so the plan is the only one.
7. **A spent allowance** (429) is counted per model, so it goes straight to the fallback model; when both are spent,
   the page shows the quota steps as before. A refused key is never tried again.
8. **The tries in the excuse.** After more than one try, the reason ends with them, e.g. "(tried 3 times:
   gemini-3.8-flash ×2, gemini-3.5-flash)", a model whose allowance was spent marked "(allowance spent)".

## Tests

`npm test` in `server/` (604; 5 new in `test/excuse.test.js`, 3 Gemini tests new or rewritten); the server run locally with a friend code against the
real Gemini endpoint (see findings).

## Status

Built and tested; merged to `main` and pushed on the owner's word ("yes pls to both"); Render deploys `main`.
