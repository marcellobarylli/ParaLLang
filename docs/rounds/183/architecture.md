# Round 183 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's messages in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's messages; round 182 (Gemini's free tier: 20 requests a day per model and project);
  Anthropic's page on API credits for Max subscribers ($100 a month on Max, for the Claude API).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/llm/adapters/anthropic.js` (new), `server/src/llm/friend-router.js`, `server/server.js`,
  `server/src/llm/excuse.js`, `render.yaml`, `server/package.json` (`@anthropic-ai/sdk` 1.14.0),
  `server/test/anthropic.test.js` (new).

## Decisions

1. **Who plays on Claude.** With `CLAUDE_API_KEY` set, a friend's turn runs on the Claude API, model
   `claude-sonnet-5-5` (`FRIENDS_CLAUDE_MODEL` to change it). A friend who added a Gemini key of their own keeps
   playing on it. The owner's turns stay on `LLM_PROVIDER` (claude-cli); the CLI's environment is a whitelist, so it
   never receives the key.
2. **The request.** The game's leading system messages become the system prompt; turns alternate and open on a user
   turn. The reply is a structured output (`output_config.format`, the same strict schema the claude-cli adapter
   sends, without length and range limits); effort `low`; no `temperature`, which Sonnet 5.5 refuses. The reply is
   checked against the game's zod schema, nulls for absent optional fields dropped. A refusal or a reply cut short is
   an error. The SDK retries 429, 5xx and 529 twice; each call may take 120 s.
3. **When Claude fails.** With `GEMINI_API_KEY` set, the turn is tried once on Gemini (round 182's retries included);
   if that fails too, the player sees Claude's reason, in the excuse of round 182 ("Claude answered 529
   overloaded_error: \"Overloaded\"").
4. **Not built.** Free providers (Groq, OpenRouter, GLM-Flash): the owner chose Sonnet.

## Tests

`npm test` in `server/` (610; 7 new in `test/anthropic.test.js`). No call to the real Claude API.

## Status

Built and tested with fakes; merged to `main` and pushed so the owner can try it on the hosted page, where
`CLAUDE_API_KEY` is set.
