# Critique 1: the round 099 fix plan

- **Dispatched:** about 07:58:40 UTC 2026-11-06
- **Returned:** about 08:01:25 UTC (165 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC).
- **Prompt:** adversarial read-only critique of `plan-v1.md` against the two reviews and the code (store, ReviewPanel,
  tests, `submitDialogue`'s receipt order, the runner, the Codex adapter): decisions that would not fix the defect or
  add bugs, missing cases, wrong claims, weak tests, anything simpler; numbered Error / Gap / Cut with file:line;
  an Optional section; under 900 words.
- **Reviewed input:** `plan-v1.md`, sha256 9bde3010…, HEAD 6cc3a5f, working tree: docs/rounds/099/ new
- **Findings:** 9

## Raw output (verbatim in wording; bullet layout condensed when saved)

```text
Nine items. Decision 1 is sound in principle but has three holes; Decisions 2, 3, 7, 8, 9 and 11 check out.

1. **Gap — Decision 1 has no way to tell whether the send succeeded.** sendMessage returns undefined on every path (gameStore.js:335-418): success, replay, STALE reload to the dialogue, STALE reload to the map (STALE_CLOSED, :330) and a second network error look the same to the caller. The help's owns() (:427) is also false once any of these moves the version. Fix: sendMessage returns an outcome ('committed' | 'replayed' | 'reloaded' | 'closed' | 'failed'); set STALE_HELP_SENT only on 'replayed', under an epoch + learner + encounter-id guard; never overwrite STALE_CLOSED, STALE_RELOADED or a network error.

2. **Error — STALE_HELP_SENT is wrong in two cases Decision 1 creates.** (a) The lost turn resolved the encounter: the replay brings back state 'resolved' (learning-service.js:1028, :1037); "Ask for help again" makes no sense there (the world/party read does run, :398-405). (b) The replay's follow-up read finds a newer version and clears assessment (:381-387); the line then says "its verdict is shown" when it is not. Fix: choose the line from encounter.state and assessment != null; test both.

3. **Error — Decision 1's rationale is incomplete for STALE_ENCOUNTER.** Receipt before version holds (learning-service.js:915-920 before validateVersion at :921). But encounters live only in memory while receipts persist. After a server restart help gets STALE_ENCOUNTER, yet the resend replays and shows an ongoing encounter at v+1 the server no longer holds; the follow-up read gets encounter: null, so the id check at :383 skips it and the phantom stays until the next send. Fix: after a replay also handle latest.encounter == null || id mismatch via _reloadStale's closed branch, or limit the auto-resend to STALE_VERSION.

4. **Cut — Decision 1 could skip the automatic resend.** The checks are right (no double grading: same version and attempt; the old send's guard does not interfere, it already returned; an in-flight send cannot overlap, isLoading blocks help, :422). Still, it sends an answer the player did not press Send for, and needs items 1-3. The review's second option is simpler: on a stale help with a pending answer, keep the version, pendingInput and draft, skip the reload, and say "Your last answer may have reached the server; send it again to see its verdict." The next Send then replays or reloads through existing, tested code. If you keep the auto-resend, write down why one tap was worth items 1-3.

5. **Gap — the Decision 6 R2.1 tests can pass without proving anything.** Store tests use jest mocks (send-retry.test.js:48, :151) that do not model receipt-before-version. Fix: assert the second sendDialogue payload has version === v and attemptId === the first call's; revealHelp called once, sendDialogue twice. Cover the edited-draft restore in both outcomes (_reloadStale writes draft: text, :323, so the restore must run after it), the resolved replay, and retryIds holding the key at a different version (no resend).

6. **Error (claim) — Decision 4 says the last ReviewPanel branch is reached only after a dismissed error … STALE_CHALLENGE.** Any dismissed review error leads there, including a failed startReview from the review screen (gameStore.js:347 sets the error, ErrorBanner clearError :94). A null challenge going to the Spellbook (:344) is correct. The fix suits every case; only the wording is off. Fix: reword; add a store-level test STALE_CHALLENGE → clearError → "Try again" → createReview called (review-loading.test.js:133-135 alone only checks the component).

7. **Gap — Decision 5's off-screen success path is underspecified.** It should also run reviewRetryIds.clear() (:370) as the on-screen path does. Checking get().reviewChallenge?.id === reviewChallenge.id is an equally simple guard: every way off the screen clears reviewChallenge (:328, :122, :154, :315). Either works, since isLoading keeps the player from getting back to 'review' before the reply. Test Return during the request with success (no cue, Spellbook applied), STALE_CHALLENGE (no error, keys deleted) and a network error.

8. **Gap — Decision 7's runner test misses the abort-during-grace case.** The guard change is correct, and chunks past the limit after exit are dropped (cli-runner.js:254-259). The test covers only a timeout in the grace. A shutdown or interrupt during the grace (task.cancel, :236) now becomes `process`, while shutdown() still waits for the forced kill at killGraceMs. Fix: add cancel-in-grace; assert SIGKILL still reaches a held group (a pipe-holding grandchild is killed) and only one SIGTERM was sent before the exit.

9. **Gap — Decision 8 never says how "maps to a known category" is decided.** categoryCodes is private (provider-error.js:76). Fix: in pickFailure use the first failure event whose providerErrorFromMachineCode(...).category !== 'provider', else the first; no export needed. Apply at codex-cli.js:43 and :61 and test both. Real Codex may carry the code only in message text, which cannot be checked offline; note the confidence limit.

Checked, no change needed:
- Decision 9: the PID claim is right (Linux keeps the number allocated while any task uses it as a pgid; kill(-pid) only reaches a process that both took the number and made itself group leader; the probe races the same way). Wording: say killGraceMs (2 s default, :55), not "2 s".
- Decision 2: createOrRecoverLearner keeps the requested id (learning-service.js:144-155), so a set keyed by learnerId works; createSave's createLearner(null) and _loadSave's second call answer true/false correctly. Remove the id only inside the guarded set.
- Decision 3: recruit touches only the party (learning-service.js:1237-1255), the world snapshot does not depend on the party; two counters are safe.

Optional
- Remove the id from the lost-save set in removeSave as well.
- Decision 11: `.then((data) => { const party = data?.party; … })` reads more clearly than `?? {}` in the destructuring.
- Decision 1: retrying the original help reveal automatically after a replay that is still ongoing would make "Ask for help again" unnecessary.
- Decision 10: deferring is fine; leave a note in play-market.js:208.
```
