# Critique 1: round 089 plan v1 (fixes from a review of rounds 040–053)

- **Dispatched:** 2026-11-06 about 05:58:40 UTC
- **Returned:** about 06:00:15 UTC (exact time unknown; 96 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no network, no LLM calls). Critique the plan /work/ParaLLang/docs/rounds/089/trail/plan-v1.md (repo /work/ParaLLang: Node server in server/, Expo app in mobile/, YAML packs content/languages/{it,es}/). Read: server/src/learning-service.js (ATMOSPHERE_ENGLISH, getAtmosphere, writeAtmosphere, callProvider, narrate, fireArrival, journeyFragments, partyConversationFor, keptFootnote), server/src/llm/cli-runner.js and the codex-cli/claude-cli adapters (how an aborted call settles and frees the slot), mobile/src/stores/gameStore.js (the atmosphere ask with retryAfterMs), mobile/src/speech.js, mobile/src/components/DialoguePanel.js (fragmentNote), tests server/test/atmosphere.test.js, server/test/party-tiers.test.js, mobile/src/__tests__/ (speech-related). Look for: does each fix close its issue; can aborting an atmosphere call starve it forever or cause a busy-loop of retries; abort semantics when several requests share one atmosphere promise; races between abort and settle (a line arriving just after abort, the cache); whether `callProvider` is the right hook (any encounter LLM call that bypasses it); the fragment id change's effect on every consumer of fragment.encounterId (server and app); whether dropping ATMOSPHERE_ENGLISH breaks other tests; missing tests. Numbered list typed Error / Gap / Cut with brief reasoning and file:line evidence, then Optional. Under 450 words."
- **Reviewed input:** `plan-v1.md`, sha256 edeb3999…, HEAD 8adf0b9, working tree: docs/rounds/089/ new
- **Findings:** 9

## Raw output (verbatim)

```text
I found two errors in the plan, both in R1.2 (aborting atmosphere calls). R1.1, R1.3 and R1.4 each close their issue, with gaps noted below. `callProvider` is the right hook: the only other `structuredChat` call in the service is the atmosphere call itself (learning-service.js:503, :1082). Narration, its retry and grading (:863) all go through `callProvider`.

1. **Error: R1.2 almost always kills the atmosphere line at open locations when prefetch is on.** `fireArrival` checks only `providerCallsInFlight` (:708), and that count never includes atmosphere calls. So the greeting prefetch starts 1.5 s after travel (`PREFETCH_DWELL_MS`, :75) and goes through `narrate` → `callProvider`, which aborts the atmosphere call the app made when the location changed. That is every open-state arrival. The app's only retry comes 15 s later. If the CLI greeting is still running then, the reply is `busy` and nothing asks again. The plan also overstates the retries: `ask(1)` (gameStore.js:582) is one retry, two asks in total, not "again at most twice". The result is a bounded loss rather than a busy-loop, but the line is lost for good at open locations. Fix: only user-facing calls (start, turn, grading) abort. The prefetch should count an in-flight atmosphere call as busy; it already has 3 retries (:710).
2. **Error: the abort is caught as a failure and cached.** `writeAtmosphere` catches every provider error as drop `provider` and returns null (:1083). `getAtmosphere` then caches null for 10 minutes (:1055). The plan must check `signal.aborted` both in the catch and in the `.then`, and must say how `aborted` reaches the reply. The shared promise returns a string or null and cannot carry `retryAfterMs` as written. Every request awaiting that one promise (:1064) should get the same `{null, retryAfterMs}`.
3. **Gap: a line that arrives after the abort.** Once the child has closed, the runner's `cancel` does nothing (cli-runner.js:147, 133), so the call can still resolve with a valid line. The plan should say a valid text is kept and cached even if the signal fired. Otherwise "aborted" wrongly wins over a good line. Add a test for it.
4. **Gap: an aborted call holds the slot until the child exits.** The runner sends SIGTERM and frees the slot only on close, which can take up to `killGraceMs` 2 s before SIGKILL (cli-runner.js:136-137, 97-100). The encounter call still queues briefly. That is acceptable, but the plan should say so. Requests arriving in that window join the aborted promise.
5. **Gap: HTTP providers lose lines for nothing.** Aborting atmosphere calls on HTTP providers (openai.js:5, ollama.js:20) gives nothing back, since they have no serial slot. Consider aborting only when the provider is serial.
6. **Gap: the abort controller must be optional.** The test at atmosphere.test.js:132 calls `writeAtmosphere(location, 'none', null, [])` directly with four arguments.
7. **Gap: R1.3.** The thresholds are `min(1)` (content-loader.js:150), so `unlockedAt - 1 >= 0` and `partyConversationFor` cannot return null from the new argument. The only consumer of `fragment.encounterId` outside tests is `fragmentNote` (DialoguePanel.js:128); `client/src` has none. The pinned tests are party-tiers.test.js:89 and party-conversation.test.js:277/321, and they stay valid. The fix is sound. Add the contrast case: a fragment at 3 with a tier at 3 still gives the first tier's id.
8. **Gap: R1.4.** The `voice.identifier` access has to sit inside the `try`, because `voice` null is the likely throw. Add the test to the existing speech-stops.test.js rather than a new file.
9. **Cut (none required): R1.1 is safe.** `ATMOSPHERE_ENGLISH` is referenced only at :1092 and in the round's own exempt.mjs. The only test that changes is atmosphere.test.js:80. The description-passes test (:124) still holds through the own-words exemption.

**Missing tests**
- An abort followed by a valid late line: the line is kept and cached.
- Three concurrent requests sharing an aborted call all get `retryAfterMs`.
- A prefetch with an atmosphere call in flight backs off as busy and does not abort it.
- The abort does not cache a failure (as the plan already proposes).

**Optional**
- Count aborts in `atmosphereStats`.
- Stop tracking an aborted controller once it is aborted, so it is not aborted twice.
```
