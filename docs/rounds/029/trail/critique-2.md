# Critique 2 (round 029)

- **Reviewer:** the same Claude subagent as critique 1 (general-purpose, claude-opus-5-5, read-only). A second,
  different final report arrived from the same agent after the freeze; kept verbatim as a separate critique.
- **Critiqued:** `plan-v1.md`, sha256 1867107f… (the same draft as critique 1).
- **Returned:** about 18:52 UTC (after the freeze commit).

---

1. **Error: An ongoing encounter anywhere else deadlocks the Rift.** Today `startEncounter` simply replaces an ongoing session that belongs to a different definition, so walking to the Rift with Gerald unfinished, or with a party conversation under way, never blocks anything. Under the plan, the Rift refuses with `DRILL_REQUIRED`, while `createReviewChallenge` and `submitReview` refuse with `IN_ENCOUNTER` (`assertNoEncounter`, learning-service.js:109). The app makes it worse. `cardState` returns `'inEncounter'` and never `'due'` while `spellbook.inEncounter` is set, so the map counts 0, enables Talk, and the server then refuses. The Spellbook says "reviews wait". The player is told to do something the server forbids. Fix: when the drill would block and another session is ongoing, refuse with a separate code (e.g. `FINISH_ENCOUNTER`, "Finish your conversation with X first"). Have the map show that line plus a return button instead of the count. Or let the drill check abandon the other ongoing session before refusing. Add a server test and an app test for this.

2. **Error: The drill check must come after the resume branch and must also exempt `restart`.** The plan says "after the gate check", but the resume early-return comes after the gate check (line ~270). Placed literally, the drill check blocks resuming an ongoing Rift session, and reviews are refused for as long as it is ongoing: a hard deadlock until the server restarts. `restart: true` (the app's Restart button during dialogue, gameStore.js:152) skips the resume branch, so it hits the drill. The Rift's own narration has just discovered target words with `dueAt = now` (`initialSchedule`), and reviews are refused, so Restart always fails. Fix: skip the drill whenever an active session of the same definition exists, restart or not. Test restart of an ongoing Rift session that has freshly discovered due target cards.

3. **Error: Existing tests that deepEqual the Rift's encounter block will break.** `test/rift-gate.test.js:91` and `test/rift-boss.test.js:137` deepEqual the block without a `drill` key. The plan does not list them. Fix: update both, and assert that the non-drill blocks stay unchanged.

4. **Risk: "Next review" leaves the drill set.** After a result, `onContinue={() => state.startReview()}` calls `createReviewChallenge()` with no id, which picks the first due card of any kind. The player can review several non-target cards while "Review N due words" stays at N. That unfiltered `.find` also ignores content version. One stale, due card makes every no-id review throw `STALE_CONTENT` (line 572), and the drill makes the player lean on that path. Fix: either let the drill button pass the target ids, or make the server's no-id selection prefer drill targets when at the drill location. Also filter stale cards out of the `.find`. Test a stale due card next to a due target.

5. **Risk: The app can count a card the server no longer counts.** `cardState` is `card.due || nextReviewAt <= now`. If the device clock runs ahead, a card the server treats as not due shows as due. Reviewing it becomes a practice review (`scheduleChanged` false), its `nextReviewAt` stays the same, and the app's count never drops: Talk stays disabled, a soft deadlock in the app. Fix: count from the server's `card.due` only, or keep Talk enabled and let the server be the authority. Test it with an injected `now`.

6. **Risk: The tour test could pass without testing the drill.** The plan's "dry check" must assert that the tour actually met `DRILL_REQUIRED` (N > 0) before reviewing, and that the start then succeeded. Add a drill flag to the report's `ok` criterion (play-market.js:301). The `--location the_rift` path seeds completions with an empty Spellbook, so it never exercises the drill. Say so in the test, or seed a few due cards there.

7. **Risk: Server tests that depend on the fixed clock.** With `clock: () => fixedNow`, discovered cards are due at exactly `fixedNow`. Reviewed cards then fall due at `fixedNow + 1 day` and stay not due, so this works. Add one test that advances the clock a day and checks the drill fires again before completion. That proves the rule is "not completed", not "first time".

8. **Suggestion: The drill can be clicked through.** Reveal counts as a review, so up to 17 "Show answer" taps clear the drill. That is still exposure to the answer, but it is weak forced repetition. Either accept it and say so in the plan, or require at least one typed attempt per card before revealing.

9. **Suggestion: Say what the drill set will usually be.** Words scheduled at passed objectives are not due for a day. In a same-session playthrough, the drill will mostly be exposure-only words the player never produced. That fits SM-2, but the plan's claim "in practice fewer" should state it. Also make the app's line name the words, not only N.

10. **Suggestion: MapPanel needs a `now` prop and the spellbook.** `MapPanel` currently gets neither. Thread `spellbook` and `now` through App.js, as `Spellbook` does, so the mobile tests stay deterministic. Also re-render on Spellbook return so the count is fresh.

11. **Suggestion: The loader test should also reject a non-boolean value.** Check that `drill_before: "yes"` is refused, and that the field is accepted in both packs.
