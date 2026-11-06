# Round 097 findings

## Question

The scripts that produce the run's live data (`play-market.js`, `verify-cli.js`, `leak-scan.js`) and the prompt
builder had not been reviewed in depth. Do they report what happened?

## Finding

**Three ways the tools could misreport, closed. No committed report was wrong; one scan hit changes.**

- **A retried narration would have been an extra report line.** Since round 078 the server writes an NPC line again
  when it has no target language. Play-market listed every narration call as a line, so a retried greeting would
  have put the rejected English line (which the player never saw) at turn 0. Every later line would have been one
  turn off in its requested ratio and share. The leak scan would then have skipped the whole report, because its
  line count no longer matched the turns. No committed report has a retry (the guard has fired 0 times live).
- **The fix:** play-market now records every call in call order (failed and timed-out ones too) and groups each
  retry with its first call. It matches the groups to the NPC lines the server committed, and reports one line per
  turn, with the rejected text and the timing beside it.
- **The leak scan treated every encounter as ordered.** In Mortimer's tasting, where objectives may be met in any
  order, an objective already passed still counted as open, so a later line that used its words was flagged. The
  grader's own listing order could do the same in ordered encounters. The scan now closes objectives exactly as the
  server does. Over the 149 committed reports this changes one hit: an echo in round 045's Spanish party report is
  gone, and no total changes.
- **`verify-cli` compared verdicts in the grader's order.** A correct grading listed in another order would have
  failed the check. It now matches verdicts by objective.
- **Smaller:** the scan's echo rule now needs one earlier message holding the whole form, as its foreign rule
  already did. This changes no committed report.
- **Deferred:**
  - scanning the narrative, footnote and grader feedback, which the app also shows;
  - three prompt changes for a measured live round: frame earlier player turns as data, give the grader's context
    speakers, keep model answers (`accepted_examples`) out of the narrator's prompt.
- **Rejected for now:** a new word tokenizer for the share estimate, since it would break comparison with earlier
  rounds.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 10 findings (5 accepted, 4 deferred, 1 rejected), critique 10 (2
Error), all accepted. The critique ran the patched scan over every committed report; this round reran it at the
build. Offline: stubs and a real `LearningService`; no LLM. Each fix broken in turn to see a test fail.

## Results

| Check | Result |
|---|---|
| `server/test/play-market.test.js` | 7/7 (4 new): a real service with an English greeting; `recordCalls` tags the retry; one line on turn 0 (the retry kept, the English beside it, the summed time) and the reply on turn 1; the scan reads the report; a timed-out retry keeps the first line (`CLI_INTERRUPTED`); a call with no committed line set aside; identical natives by the service's rule and the deadline; `verify-cli` by objective |
| `server/test/leak-scan.test.js` | 14/14 (3 new): unordered, out of order, a held early pass; Mortimer's tasting in a report; a form split over two messages is not an echo |
| A fix broken → test fails | 9/9 (unordered, the ordered rule, the echo rule, retry grouping, matching by native, the tie rule, the summed time, the retry tag, verify-cli's order) |
| Leak scan over 149 committed reports | one line differs: `party-es.json` (round 045) `mortimer_tasting` line 1 loses `ask_more:mas (echo)`; totals unchanged ([before](results/scan-before.txt), [after](results/scan-after.txt)) |
| Full suites | server 363/363 (356 before), client 12/12 and build, mobile 279/279 |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/scripts/play-market.js` (`recordCalls`, `narrationLines`), `server/scripts/leak-scan.js` (`openObjectives`,
the echo rule), `server/scripts/verify-cli.js` (`observedVerdicts`), `server/src/learning-service.js`
(`CORRECTION_PREFIX`), the tests, [`results/`](results/), [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests with stubs; no live run. The report format gains `retried` on a line and `uncommittedLines` on a scene; older
reports have neither.

## Open items

- Queued live (after 2026-11-09 17:32 UTC): the next tour with the guard on is the first live report a retry could
  appear in; check its `retried` lines and `narrationStats` together.
- Deferred to a measured live round: R1.6–R1.8 (prompt framing of earlier player turns, speakers in the grader's
  context, no model answers in the narrator's prompt); R1.5 (scan narratives and feedback).
