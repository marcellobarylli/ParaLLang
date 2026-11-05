# Critique 1: an LLM atmosphere line for the current location

- **Dispatched:** see journal row 3
- **Returned:** 23:27 (notification; duration 112 s)
- **Model:** a fresh Claude general-purpose subagent (model inherited, claude-opus-5-5; effort unknown), repo read access, read-only instructions (Codex at its usage limit until 01:36 UTC)
- **Prompt:** "You are an adversarial reviewer for a plan in the ParaLLang repo at /work/ParaLLang … Plan to critique: docs/rounds/053/trail/plan-v1.md … Relevant code to check the plan against: server/src/learning-service.js, server/src/world.js, server/src/app.js, server/src/llm/prompt-builder.js and schemas.js, server/src/language-engine.js, server/server.js, server/test/helpers.js, prompts/system/base.txt, content/narration/style_guide.yaml, content/world/locations/*.yaml, mobile/src/stores/gameStore.js, mobile/src/api/learning.js, mobile/src/components/MapPanel.js, and the CLI provider adapters … Find: errors …, risks, and missing tests. Output a numbered list of findings, each labelled Error, Risk or Question, each with a concrete fix and the file/line it concerns; then an 'Optional' list. Be concise (under 700 words)."
- **Reviewed input:** `plan-v1.md`, sha256 ae26a7878c0fc8621ac0b6228d6222cc5809aa4e5fc05801f328eadc8cf0b037, HEAD a771494, working tree: the server draft of this round (server.js, app.js, learning-service.js, prompt-builder.js, schemas.js modified; prompts/world/atmosphere.txt untracked), which the critic also read
- **Findings:** 13

## Raw output (verbatim)

```text
I found 13 problems in plan-v1 (3 Errors, 6 Risks, 4 Questions), plus 4 optional points. The server part of the plan is already in the working tree: `server.js`, `app.js`, `learning-service.js`, `prompt-builder.js` and `schemas.js` are modified, and `prompts/world/atmosphere.txt` is untracked. So I checked the plan against that code as well.

1. **Error: the vocabulary check drops normal English, at least in es.** I ran `matchCanonicalVocabulary` over both packs. In es, English "Once", "kilo" and "cafe" all match pack entries. In it, "Sola", "Pollo", "Basta" and "io" match. The shared `market_entrance.yaml` description itself contains "once" (line 6), so the model is likely to echo it, and the es line for that location would be dropped. It also contains "MERCATO", an it pack word, which is sent to the model in the prompt (line 4). Fix: keep a per-pack list of forms that are also English words, or ignore a hit whose excerpt also appears in the static description. Then test with an es line that uses "once" in its English sense.

2. **Error: one atmosphere call can block the player's encounter on the CLI providers.** `CLIProcessRunner` runs one process at a time with a queue of 8 (`cli-runner.js:47-58`). The app asks for the atmosphere right after a move, and the player usually taps "Talk" next. That greeting then waits behind a 30–120 s codex/claude call, or gets `busy`. Fix: run atmosphere calls in a separate runner or at lower priority, or skip them while an encounter call is pending. Or give them a short timeout of their own, or default to `off` for the `*-cli` providers. Test that `startEncounter` is not delayed by a pending atmosphere call.

3. **Error: failures are never cached, so a deterministic drop costs a new LLM call every time.** If the line is always dropped (item 1) or the provider is at its usage limit (Codex now), every map view or move fires a new call (`learning-service.js` `getAtmosphere`). Fix: cache a null result per key with a TTL or backoff, for example 10 minutes or 2 attempts per key. Test that repeated failures stop calling the provider.

4. **Risk: the stale-reply guard in the app is on location only.** The key changes when the encounter completes or someone is recruited. But the reply carries only `locationId`, so a reply written for "has not been won over yet" passes the guard after a win. The plan also refetches only on load or move. `recruit` (gameStore ~line 164) and the post-resolution refresh (~line 223) set new state without a refetch. Fix: return a `stateKey` (or encounter state plus party) with the line. Refetch from one helper wherever `world` or `party` is set, and guard on `stateKey`, learner and epoch.

5. **Risk: errors are swallowed with no trace** (`writeAtmosphere` `catch { return null; }`). The queued live check has to record calls and drop reasons, and nothing records them. Fix: count calls on the service and log the reason for each drop (provider, schema, length, vocabulary hit and the excerpt) through a logger. Tests can then assert the reason.

6. **Risk: the state facts give the model only a name.** "already won over Mortimer here" plus "WITH THE PLAYER: Mortimer" tells it nothing about who Mortimer is, so it may invent a role. Fix: add the character's species, and test the filled prompt for a saveable character who is in the party.

7. **Risk: the store must keep atmosphere out of `isLoading`, `error` and learner switching.** Fix: never set `error` or `isLoading` from the atmosphere fetch. Clear `atmosphere` in the learner load, switch and delete paths (gameStore ~line 88). Test that a reply for learner A is not shown after switching to B.

8. **Risk: the FixtureProvider sends any schema other than `dialogue_assessment` to `narrate()`** (`test/helpers.js:110`). Atmosphere requests would land in `provider.calls` and produce encounter-shaped replies. Fix: a separate `location_atmosphere` branch, and assert that the existing `calls.length` checks are unchanged.

9. **Risk: no maximum length may go into the zod schema.** `schemaForCLI` and the openai adapter turn `.max()` into `maxLength` for strict mode, which Codex or OpenAI may reject. The current code checks length after parsing, which is correct. Add a test on `schemaForCLI(locationAtmosphereSchema)`: `required: ['atmosphere']`, `additionalProperties: false`, no `maxLength`.

10. **Question: the `sealed` and `none` states can never happen.** `applyMove` refuses entry to a sealed location and completions never shrink, so the current location is never sealed. Every location has an encounter, so `none` never happens either. Fix: drop them, or document them as defensive and make the tests reflect that.

11. **Question: `temperature: 0.7` has no effect on the CLI providers** (their `structuredChat(messages, schema)` ignores options). Fine, but the plan should not say it controls variety there.

12. **Question: the plan and the code differ on the facts text and the sanitiser.** The plan says "Flick is no longer here"; the code says "has already won over". The code also trims and collapses whitespace, which the plan does not mention. Fix: update the plan so the frozen record matches the code.

13. **Question: the request can hang for up to 120 s.** The GET blocks for the full CLI timeout and the app has no abort. Is that acceptable on device? An `AbortController` tied to location changes would be safer.

**Optional**
- Put a hash of the prompt template and description in the cache key, in case content is hot-reloaded later.
- In the prompt, tell the model that the sign's word in the description (MERCATO) is not to be repeated.
- Test both packs in one test file: run every location description through the drop filter.
- Add a MapPanel test for the accessibility label, so the atmosphere text is not read as part of the location name.

The files involved are under `/work/ParaLLang`: `server/src/learning-service.js`, `server/src/llm/cli-runner.js`, `server/src/llm/cli-adapter.js`, `server/test/helpers.js`, `content/world/locations/market_entrance.yaml`, `content/languages/es/vocabulary/flick_party.yaml` and `mobile/src/stores/gameStore.js`.
```
