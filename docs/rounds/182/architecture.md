# Round 182 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's messages in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's messages; round 171 (friends on Gemini, `server/src/llm/friend-router.js`).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/excuse.js` (new), `server/src/llm/adapters/gemini.js`, `server/src/learning-service.js`
  (`callProvider`), `server/test/excuse.test.js` (new).

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

## Tests

`npm test` in `server/` (602; 5 new in `test/excuse.test.js`); the server run locally with a friend code against the
real Gemini endpoint (see findings).

## Status

Built and tested; committed and pushed on the session branch `claude/loving-lamport-s6pjlu`. Not merged to `main`
and not deployed: the owner has not asked for it.
