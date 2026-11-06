# Round 097 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (review, plan as sent, raw
critique, journal) is in `trail/`; it is not needed to implement this round.

- **Source:** an independent read-only review, at HEAD f42b40b, of the live-run scripts (`server/scripts/`) and the
  prompt builder, [`trail/review-1.md`](trail/review-1.md): 3 Error, 5 Gap, 2 Minor.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/scripts/play-market.js`, `leak-scan.js`, `verify-cli.js`, `server/src/learning-service.js`
  (one constant), tests.

## Goal (pre-run)

A play-market report has one line per NPC line the player saw, on its own turn, with any retry recorded beside it;
the leak scan reads such reports and closes objectives as the server does; `verify-cli` matches verdicts by
objective.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **R1.1 (critique 1.2–1.6, 1.8): retried narrations in the report.**
   - **The wrapper** becomes an exported `recordCalls(provider, raw)`. It pushes an entry when a call starts and
     fills in its output (or error) and duration when the call ends, so the entries are in call order. Each entry
     is tagged `retry` when its last message starts with `CORRECTION_PREFIX`, a constant now exported from
     `learning-service.js` and used by `correctionNote`.
   - **Grouping:** an exported `narrationLines(calls, committedNatives, { ratioFor, share, lacksTarget,
     retryMs })` groups each narration call with the nearest following retry.
   - **Matching:** groups are matched in order to the committed transcript's NPC natives (trimmed), not by
     position. A group whose first or retry native equals the next committed native is that turn's line. When both
     equal it, the service's rule decides: the retry is kept if it has an output, no error, a duration within
     `retryMs`, and does not lack target language.
   - **Unmatched groups** (a call whose turn was not committed) are listed in `uncommittedLines`, not in `lines`.
   - **A retried line** carries `retried: { kept: 'first' | 'retry', rejectedNative, durationMs }`, and its
     `durationMs` is the sum of both calls (what the player waited).
   - **Where narration calls come from:** the start's greeting and each say. Prefetch and atmosphere are off in
     play-market, and recruit and the drill make none. Switching prefetch on would need this grouping revisited.
2. **R1.2:** follows from 1: `lines` holds only committed lines, so the scan's count holds. No `rejected` rule is
   added (critique 1.7).
3. **R1.3: the scan's order rule** is `openObjectives(objectives, turns, k, { unordered = false } = {})`, matching
   `submitDialogue`.
   - Unordered: every objective that passed in an earlier turn is closed.
   - Ordered: each turn closes the leading run of still-open objectives, in authored order, that passed in that
     turn (verdicts looked up by id), so a held early pass stays open.
   - `scanReport` passes the encounter's `objectives_unordered`.
   - One committed report's scan changes (critique 1.1): `docs/rounds/045/results/party-es.json`, `mortimer_tasting`
     line 1 loses the word hit `ask_more:mas` (an echo). The line stays `near` and no totals change.
4. **R1.4: `verify-cli` by objective id:** an exported `observedVerdicts(objectives, results)`.
5. **R1.9: echo by one earlier message** (`messages.some`) for exact and word hits. It changes no committed report.
6. **Deferred or rejected:**
   - R1.5 (scan the narrative, footnote and feedback): deferred. The Optional to add the narrative as an uncounted
     kind is deferred too.
   - R1.6–R1.8 (prompt framing, grader context speakers, `accepted_examples` to the narrator): deferred to a
     measured live round.
   - R1.10 (the share tokenizer), with the Optional NFC part: rejected for now, to keep shares comparable across
     rounds.

## Design (pre-run)

As in the decisions. `play-market.js`: `recordCalls`, `narrationLines`, `playAt` builds its lines from them with the
final encounter's transcript; `leak-scan.js`: `openObjectives` option, `scanReport` passes it, echo by message;
`verify-cli.js`: `observedVerdicts`; `learning-service.js`: `CORRECTION_PREFIX`.

## Claim boundary (pre-run)

Tests with stubs and a real `LearningService`; no live run. Committed reports are unchanged on disk; their scan
changes only as stated in Decision 3.

## Second opinion (pre-run)

Source review: [`trail/review-1.md`](trail/review-1.md) (10 findings). Critiqued draft: `trail/plan-v1.md`, sha256
5a2a3154…; a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error | A retried narration is an extra line and shifts later turns | + | Accept | **Accepted** (autonomous decision, pending owner review) | Decision 1 |
| R1.2 | Error | The leak scan drops a report with a retried line | + | Accept (by 1) | **Accepted** (autonomous, pending owner review) | Decision 2 |
| R1.3 | Error | The scan treats unordered objectives as ordered | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 3 |
| R1.4 | Gap | `verify-cli` compares verdicts in the grader's order | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| R1.5 | Gap | The scan reads only `dialogue.native` | 0 | Defer | **Deferred** (autonomous, pending owner review) | Decision 6 |
| R1.6 | Gap | Earlier player turns unframed for the narrator | 0 | Defer: live round | **Deferred** (autonomous, pending owner review) | Decision 6 |
| R1.7 | Gap | The grader's context has no speakers | 0 | Defer: live round | **Deferred** (autonomous, pending owner review) | Decision 6 |
| R1.8 | Gap | The narrator sees `accepted_examples` | 0 | Defer: live round | **Deferred** (autonomous, pending owner review) | Decision 6 |
| R1.9 | Minor | Echo joins all earlier messages | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 5 |
| R1.10 | Minor | The share tokenizer is rough | − | Reject for now: comparability | **Rejected** (autonomous, pending owner review) | Decision 6 |
| 1.1 | Error | One committed report's scan changes | 0 | Accept: stated | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.2 | Error | Matching by position drifts; record calls at start; match by native | + | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.3 | Gap | Identical natives: the service's rule decides | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.4 | Gap | Export the correction prefix | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.5 | Gap | Test through the wrapper and a real service, with a timed-out retry | + | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Gap | A retried line's duration | 0 | Accept: the sum, and the retry's own | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.7 | Cut | The `rejected` rule is dead | − | Accept: dropped | **Accepted** (autonomous, pending owner review) | Decision 2 |
| 1.8 | Gap | Say where narration calls come from | 0 | Accept | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.9 | Gap | R1.3 matches the server; test a held pass | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.10 | Gap | R1.4 is fine | 0 | Accept: no change | **Accepted** (autonomous, pending owner review) | Decision 4 |

**Optionals:** the narrative as an uncounted kind: deferred; NFC in the tokenizer: rejected (comparability); the
deferrals of R1.6–R1.8: agreed.

## Tests (pre-run)

- `server/test/play-market.test.js`:
  - A real `LearningService` (Spanish fixture) with a stub whose first greeting is English only. The provider is
    wrapped by `recordCalls`; a start and one say give `narrationLines` two lines. Turn 0 is the retry
    (`retried.kept: 'retry'`, the English native rejected, `durationMs` the sum), turn 1 is the reply.
  - A report built from them is scanned, not skipped.
  - A stub retry that hangs until aborted (`narrationRetryMs` 50) keeps the first (`retried.kept: 'first'`).
  - An uncommitted call (a narration with no committed native) goes to `uncommittedLines`.
  - Identical natives decided by the rule.
- `server/test/leak-scan.test.js`:
  - Unordered (Mortimer's tasting: `ask_more` passes while `like_it` fails, then `like_it`): both closed.
  - Ordered verdicts listed out of authored order still close.
  - A held pass (`[a:fail, b:pass]` then `[a:pass]`): `b` stays open.
  - A two-word form split over two messages is a leak, not an echo.
  - The existing tests pass unchanged.
- `verify-cli`: `observedVerdicts` gives `[true, false]` for results listed in reverse.
- The scan over every committed report before and after the change: only the stated hit differs.
- Mutations; full suites.
