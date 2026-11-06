# Critique 1: fixes from the review of the live-run scripts (plan v1)

- **Dispatched:** about 07:38:50 UTC 2026-11-06
- **Returned:** about 07:41:00 UTC (126 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id a9e576e1e0f288467. It ran the patched scan rules over all 149 committed reports
  in a scratch dir (`/tmp/rv5`, deleted).
- **Prompt:** adversarial read-only critique of `plan-v1.md` against `review-1.md` and the scripts, the service's
  `narrate` and closing rule, and the tests: the retry and kept-line identification in every case, the
  `openObjectives` rule against the server, committed reports that change, test strength, deferrals; numbered
  Error / Gap / Cut with file:line evidence, Optional separate, under 600 words.
- **Reviewed input:** `plan-v1.md`, sha256 5a2a3154…, HEAD f42b40b, working tree: docs/rounds/097/ new
- **Findings:** 10 (2 Error, 5 Gap, 1 Cut, 2 checks with no change needed), 3 Optional

## Raw output (verbatim)

```markdown
The plan mostly holds up. R1.3 matches the server's closing rule and R1.4 is correct. But it wrongly says no committed report changes, R1.1 lines up kept lines by position and breaks when they drift, and the tests skip the wrapper's tagging. The current suite passes (14/14). I compared the old and patched scan over all 149 committed reports; scratch in `/tmp/rv5` is deleted and nothing is left running.

1. **Error: "No committed report is affected" is false.** I ran the R1.3 and R1.9 changes over every committed report. Exactly one changes: `docs/rounds/045/results/party-es.json`, scene `mortimer_tasting`, line 1. It loses the word hit `ask_more:mas` (an echo), because `ask_more` passed in turn 5 (`[like_it:false, ask_more:true]`). The line stays `near` and no totals change. R1.9 changes nothing. **Fix:** state this one changed hit in the plan header and the claim boundary.

2. **Error: R1.1 finds the kept line by position (`keptNatives[turn]`), which breaks once the two lists drift.**
   - A narration call that is recorded but never committed shifts every later turn against the transcript. This happens when `submitDialogue` fails after `narrate` returns, e.g. the save at `learning-service.js:1047`.
   - The `lacksTarget` fallback is also wrong when a retry passed but arrived late. A retry past the 20 s deadline (`learning-service.js:19,589`) is discarded even if it passes. The wrapper only pushes after `await` (`play-market.js:182-187`), so a provider that ignores abort records the retry late, possibly after the next calls.
   - **Fix:**
     - Push each wrapper entry when the call starts and fill in its output (or error) when it ends, so order is call order and failed or timed-out retries are visible.
     - Pair each retry with the nearest unpaired narration call before it.
     - Match groups to the transcript's NPC lines one after another by native, rather than by index. Mark groups with no match `uncommitted` and drop them from the scan.

3. **Gap: identical natives.** A retry can have the same native as the first line but a different translation, and then pass `lacksTarget` (it reads translation too, `learning-service.js:596`). Matching by native cannot tell the two apart. Translation can't break the tie either: the current NPC line's translation is hidden while the encounter is ongoing (`learning-service.js:509-511`). **Fix:** when the natives are equal, decide by the service rule: the retry is kept if it passes `lacksTarget` and was not timed out or errored.

4. **Gap: the `CORRECTION:` prefix is hard-coded in the script.** `correctionNote` (`learning-service.js:21-22`) can drift away from it. The prefix itself is safe: the last message is always the template prompt or the correction, and player text sits in TURN DATA JSON or earlier history. **Fix:** export a `CORRECTION_PREFIX` constant and import it in `play-market.js`.

5. **Gap: the tests skip the wrapper.** The R1.1 test feeds hand-built calls to `narrationLines`. Neither the tagging nor the real retry path is exercised, and `play-market.test.js` has no narration test today. **Fix:** move the wrapper into an exported `recordCalls(provider, raw)`. Drive a real `LearningService` with a stub that returns English and then Italian for the greeting. Run the full chain wrapper → `narrationLines` → `scanReport`, and check it is not skipped. Add a case where the retry times out (small `narrationRetryMs`).

6. **Gap: line timing.** Nothing says what a retried line's `durationMs` is. The player waited for both calls. **Fix:** report the summed time, or give `retried.durationMs` separately.

7. **Cut: the R1.2 "ignore lines marked `rejected`" rule is dead code.** The R1.1 line shape has no `rejected` field; the rejected text lives in `retried.rejectedNative`. Drop the rule, or define the field (it fits the `uncommitted` marker from item 2).

8. **Gap: say in the plan where narration calls come from.** `LearningService` defaults to `prefetch = false` and `atmosphere = false` (`learning-service.js:98`), and `play-market.js:197` passes neither. So the only narration calls are the start's greeting (`:665`) and each say (`:987`). Party mode slices calls per `playAt` (`play-market.js:221,253`), and `recruit` and `clearDrill` make no narration calls. Write this down so a later prefetch switch-on knows to revisit the grouping.

9. **R1.3 checked, no change needed.** It matches `submitDialogue` (`learning-service.js:932-940`). Ordered: the leading run of passes among still-open objectives, in authored order, looked up by id. A held pass stays open. Unordered: every passed objective closes, including an early pass. The plan does not mention `held`; it isn't in the report verdicts (`play-market.js:230`) and isn't needed. **Fix (tests only):** also test a held pass in an ordered encounter, turns `[a:fail, b:pass]` then `[a:pass]`, where `b` must still be open. Keep the existing tests at `leak-scan.test.js:33-37`; they need the new parameter to be optional.

10. **R1.4 is fine.** `validateAssessment` guarantees a complete set of verdicts (`learning-service.js:897`), so `find` never returns undefined.

**Optional**
- R1.5's deferral is reasonable, but scanning the narrative could be added now as an uncounted kind, so totals stay comparable.
- R1.10: running NFC alone is a cheap fix for decomposed accents (it doesn't touch the apostrophe rules). The plan could take that part now and leave the rest of the tokenizer frozen.
- The deferrals of R1.6–R1.8 to a measured live round are justified.
```
