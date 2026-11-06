# Round 099 plan v1: fixes from a second review of rounds 093–098

Source: `review-1.md` (server, 4 findings) and `review-2.md` (mobile store, 6 findings), HEAD 6cc3a5f. Offline.

## Decisions

1. **R2.1 (Error): help after a lost send.** In `revealHelp`'s stale branch (STALE_CODES), when `pendingInput` is
   set and `retryIds` holds the key `[learnerId, encounterId, version, pendingInput]` (an answer whose fate is
   unknown, sent at this very version), do not reload: clear `isLoading` and `await get().sendMessage(pendingInput)`.
   The server checks receipts before the version, so a committed turn replays (its verdict shown, no cue, then the
   replay's own newer-version refresh); a turn that never landed meets STALE_VERSION and the send's own reload runs
   (as before 096). Afterwards, if the send succeeded, the line says `STALE_HELP_SENT` ("Your last answer had
   reached the server; its verdict is shown. Ask for help again."). A draft the player edited after the failure
   (draft ≠ pendingInput) is put back after the send. Without a pending answer, the reload stands as in 096.
2. **R2.2 (Minor): SAVE_LOST survives a failed load.** A closure `Set` `lostSaves`: an id is added when
   `createLearner` answers `recovered === false` for a stored/target id; the notice is shown (init and `_loadSave`)
   when the id is in the set, and the id removed only when shown.
3. **R2.3 (Minor): two write counters.** `worldWrites` (move, init load, `_loadSave`, resolve) and `partyWrites`
   (recruit, init load, `_loadSave`, resolve). `openMap`'s world read checks `worldWrites`, `openParty` checks
   `partyWrites`; the post-resolve read applies world and party separately, each under its own counter.
4. **R2.4 (Minor): the review screen after a dismissed error.** ReviewPanel's last branch (no challenge, not
   loading, no error) is reached only after a dismissed error (a null challenge goes to the Spellbook view), so it
   offers "Try again" (onContinue) beside Return, with the text "No review is loaded." The existing
   `review-loading.test.js` NO_DUE text is updated.
5. **R2.5 (Minor): `_sendReview` off-screen.** Capture `from = get().view`; if the view changed when the reply
   lands, only `isLoading: false` (and the Spellbook on success; on STALE_CHALLENGE the retry keys are still
   deleted), no error, no cue, no `reviewResult`.
6. **R2.6 (Gap):** tests for R2.1 (committed: replay shown, no double grading; not committed: reload), help reload
   when `currentEncounter` rejects, SAVE_LOST after fail and retry, the two counters, review off-screen.
7. **R1.1 (Minor): any exit is final** for `failAndTerminate`: `if (failure || closed || exited) return;`. After a
   non-zero exit the grace timer still force-kills a held group. Output beyond the limit after an exit is dropped
   (the data handler pushes only when under the limit).
8. **R1.2 (Minor): the most specific Codex failure.** `parseCodexEvents` and `codexFailure` collect every `error` /
   `turn.failed` event and use the first whose code maps to a known category, else the first (→ `provider`). A
   helper `pickFailure(events)`.
9. **R1.3: rejected.** Linux does not reuse a PID while it is still a process-group id in use, so while a group
   member holds the pipes the kill is safe; with no member left the kill gets ESRCH unless a new process both took
   the PID and made itself a group leader within 2 s. A `kill(-pid, 0)` probe has the same race. Documented in a
   comment.
10. **R1.4: deferred** to the next live round (play-market's per-step matching; only `durationMs`/`retried` of a
    line whose turn failed to commit with identical text can be wrong).
11. Not new: `openParty`'s `.then` with a throwing first callback: add `?? {}` guard (trivial).

## Tests

- `mobile/src/__tests__/store-review.test.js` (or a new `store-help-replay.test.js`): R2.1 both branches, edited draft
  restored; help reload with `currentEncounter` rejecting; SAVE_LOST lost → fail → retry shows the notice once;
  recruit during a post-resolve read keeps the world; move during openParty keeps the party; review reply after
  Return: no error, no cue.
- `server/test/`: a runner test where the child exits non-zero, holds its pipes, and the timeout fires in the grace:
  `process` category (adapter then maps the events); Codex events `error` (no code) then `turn.failed`
  (usage_limit_reached): quota category, both parse paths.
- Mutations; full suites (server, client, mobile).
