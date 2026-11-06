# Review 1 (round 107)

- **Reviewer:** a fresh general-purpose subagent (claude-opus-5-5), read-only, on the uncommitted diff at HEAD 28a5fde.
- **Dispatched:** 09:09:16 UTC. **Returned:** before 09:13 UTC (notification; exact time unknown).
- **Prompt:** review `server/scripts/play-market.js` and `server/test/play-market.test.js` against
  `docs/rounds/107/architecture.md` for step attribution, string-mode behaviour, `turn`, a committed line with no call,
  retry grouping, the `uncommitted` shape and the test hook.

## Raw output

- **Findings:** 4

No Error. Step attribution is correct: `currentStep = steps.length` before `run()` and `steps.length - 1` after the push in `markCommitted` refer to the same step; tagging happens at call start, so a retry that outlives its step keeps its tag. In `playAt` moves happen before `firstCall`, `getWorld` makes no provider calls, and drill/recruit steps are outside the matched slice. Prefetch/atmosphere are off in play-market, so no greeting call gets tagged with a move step. String-mode retry grouping is unchanged (`undefined === undefined` still joins as before). Nothing outside play-market reads `uncommitted`/`uncommittedLines`; `server/scripts/leak-scan.js` reads only `lines` (positionally, not `line.turn`) and `grading`. The test hook does not leak into the CLI path: env is only mutated when no provider is injected, and `--provider` is still required. `node --test test/play-market.test.js` passes 10/10.

1. **Minor: string-mode matching changed for a committed line with no call** (`server/scripts/play-market.js:224-232`). Before: `narrationLines([B], ['A','B'])` compared every group against the stuck `want` 'A', so B went to `uncommitted` and `lines` was `[]`. Now 'A' is skipped and B becomes a line with `turn: 1`. The new behaviour is arguably better, and `turn` = committed index is the right input for `ratioFor` (greeting is index 0 with `ratioFor(0)`; the k-th reply uses `ratioFor(nextTurns)` = k, `learning-service.js:1009`) — the old matched-count value was only correct when nothing was skipped. But it contradicts the comment and decision 3 ("as before"), and no test pins it. Recommendation: record it in the Outcome/findings and add a string-mode test with a call-less committed line.

2. **Gap: a committed line with no matching call vanishes silently** (`server/scripts/play-market.js:231`, `continue`). Scenario: in step mode, a step commits a line but none of its calls carries that native (canonicalisation drift, or a call tagged to another step): the line is simply dropped, with no trace in the report. leak-scan does catch the line-count mismatch but then skips the whole report ("turns do not match lines"). Recommendation: return `unmatched: [{ turn, native, step }]` (or a count) so a live report shows the drop; test it.

3. **Minor: timing-based assertion in the end-to-end test** (`server/test/play-market.test.js:197`, `report.lines[1].durationMs < 40`). Scenario: on a loaded CI node the correct turn-1 call (fixture narration plus event-loop waits) takes ≥40 ms, so the test fails although attribution is correct. Recommendation: widen the margin (e.g. 300 ms failing call vs `< 150`), or better, have the fixture stamp each output (a call counter in `translation`/narrative) and assert which call each line came from.

4. **Gap: untested step paths.** Retry-in-step is only covered in the unit test; the end-to-end test does not exercise a guard retry inside a stepped say (it would verify that the retry's tag equals the first call's). A call made outside a step (`step: null`, which would appear in `uncommitted` as `step: null`) is uncovered. `--tour`/`--party`, where `playAt` runs several times with a shared `steps` (the indices are global, and only the cursor keeps lines from leaking across scenes), are not covered. Mutation coverage is otherwise fine: the plain/stepped assertion catches removing the step filter in matching, and the orphan case catches removing it in retry grouping. Recommendation: one end-to-end case with a guard retry on a reply (e.g. `EnglishGreeting`-style for a reply), and optionally a two-scene `--party` run that checks each scene's `uncommittedLines`.
