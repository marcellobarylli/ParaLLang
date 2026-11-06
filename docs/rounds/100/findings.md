# Round 100 findings

## Question

Besides the NPC's line, the player reads its English narrative and, after each turn, the grader's overall and
per-objective feedback. In the committed live reports, how often do these name a target form of an objective the
player has not yet met?

## Finding

**Never since round 008.**

- **Narratives:** 0 of 1166 hold an open objective's form (it 713, es 453).
- **Grader feedback:** 8 of 942 turns do, all at Gerald's cart in rounds 005–007. Every one is the no-milk hint, for
  example "Add “senza latte” to specify no milk." That is the leak round 008 fixed with a grading rule (backlog
  D5). From round 008 on there are none: 0 of 637 turns in rounds 008–050 and 0 of 289 from round 051 (rounds
  005–007 had 16 feedback turns in all).
- **English words:** one more feedback text, from round 052, names *once* ("eleven" in Spanish, also an English
  word). It is counted apart, not as a leak.
- **No fix is needed.** The narration and grading rules hold in every committed report. The scan now checks
  these texts whenever a live round runs.

| Language, era | Narratives (fresh) | Feedback turns (fresh, English only) |
|---|---|---|
| it, before 051 | 531 (0) | 420 (8, 0) |
| it, from 051 | 182 (0) | 151 (0, 0) |
| es, before 051 | 287 (0) | 233 (0, 0) |
| es, from 051 | 166 (0) | 138 (0, 1) |

All 942 feedback turns matched their grading, so no grading was left unmatched.

## Method

As in [architecture.md](architecture.md). The scan looks for exact forms of the objectives still open when the text
is shown, counting one hit per text and objective:
- **Narratives** are checked against the objectives open at their line.
- **Feedback** for turn j is checked against those still open after turn j. A form the player wrote in that turn
  counts as an echo.
- **Pack forms that are also English words** are marked and counted apart.
- **Footnotes are not scanned.** Reports record them before the server's filter, and no committed report has one.

The plan was critiqued by a fresh read-only subagent in place of Codex (limited until 2026-11-09 17:32 UTC). It
raised 8 findings, all accepted. Three were Errors: the footnotes, the English-word set and the feedback's echo
window. Its own scratch scan gave the same answer. Everything ran offline.

## Results

| Check | Result |
|---|---|
| The four existing kinds over 149 reports | the printed kind lines are the same before ([`results/scan-before.txt`](results/scan-before.txt)) and after ([`results/scan-after.txt`](results/scan-after.txt)) |
| New tests (`server/test/leak-scan.test.js`) | 6 new, 20/20 in the file: narratives open and closed and a replay greeting; feedback for the passed objective, a later open one, and a held pass echoed; the resolving turn; an unordered encounter; an English form; grading matching with a failed attempt and identical feedback; eras |
| Mutations | 5 of 6 fail a test: the echo window, the open set after the turn, English marking, unused gradings, the unordered rule. The sixth (first form per objective) is equivalent: one hit per objective either way |
| Full suites | server 378/378, client 12/12, mobile 292/292 |

## Decision

Keep the extended scan and make no content or prompt change (autonomous decision, pending owner review).

## Evidence

`server/scripts/leak-scan.js` (`scanExtras`, `ENGLISH_FORMS`, `eraOf`), the [results](results/scan-after.txt) (the
`extra-*` lines list every hit), [`trail/critique-1.md`](trail/critique-1.md), and round 008's
[findings](../008/findings.md) for the feedback rule.

## Claim boundary

This covers committed reports only, read against today's content.
- **Exact forms only:** an inflected form is missed.
- **Provisional feedback is not scanned:** what the player sees from a failed attempt, before its reply, has no
  report line.
- **Recent rounds are few:** 289 feedback turns and 348 narratives from round 051 on, mostly Italian tours and party
  conversations.

## Open items

- **Next live rounds (after 2026-11-09 17:32 UTC):** read the `extra-*` lines of every new report.
- **Round 081's firmer footnote rule:** when it is measured, scan the footnotes as kept by the server, applying its
  filter to the reported text.
