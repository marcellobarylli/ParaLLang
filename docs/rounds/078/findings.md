# Round 078 findings

## Question

Can the server catch an NPC line with no target language and have it written again, without extra calls on normal
lines? prototype.md §11 asks for a check that rejects and retries lines that ignore the ratio, and none existed.

## Finding

**Yes, for the one failure kind seen live.** The rule (at least 4 words, every word also in the line's translation,
no vocabulary of the encounter) flags 2 of the 1,218 distinct NPC lines in every recorded live report (rounds
005–077, it and es). Those 2 are round 048's two all-English Marginalia lines, and the rule has no false positives on
the recorded data. The word rule alone, without the vocabulary check, also flags just those 2.

On a flagged line the server now asks once more. The retry sees the rejected reply and a correction that asks for the
turn's share of the target language. If the retry fails, is still all English or takes over 20 s, the first line is
kept. At the deadline the retry is aborted, so it frees the CLI runner's one slot (Amendment 1, after a review).
Tests cover each branch: 13 guard tests and 1 runner test. 6 fail with the guard removed, and the deadline tests fail
or hang without the abort.

Live (codex-cli), two runs with 14 narration lines checked: 0 flagged, so no extra call. One run was Gerald in Italian
(resolved, 5 calls). The other was Marginalia's folded page in Spanish at tier 3, the conversation that failed in round
048 (resolved, 20 calls). Its line "I have waited a very long time, among the pages…" now has Spanish around it (share
0.47 against 0.45), so round 048's content fix still holds. The retry itself has not run live: no live line triggered
it.

## Method

As fixed in [architecture.md](architecture.md). The offline scan is
[`results/offline-scan.mjs`](results/offline-scan.mjs). It was corrected after critique 1.3: it resolves each line's
encounter by `encounterId` or `definitionId`, matches the 43 lines with no encounter against the whole pack, and
counts lines as distinct by language, encounter, native and translation. The live runs used `play-market.js` (now
reporting `narrationStats`) with `--provider codex-cli`, and with `--party --member old_bookshop --tier 3` and
`TARGET_LANGUAGE=es`.

## Results

| Check | Lines | Flagged | Notes |
|---|---|---|---|
| Offline, every recorded report | 1,218 | 2 | both round 048 (Marginalia's folded page, it and es) |
| Offline, the word rule without the vocabulary check | 1,218 | 2 | the same two |
| Live, Gerald it (03:38:50–03:39:43) | 3 | 0 | shares 0.24 / 0.25 / 0.37 against 0.25 / 0.30 / 0.35 |
| Live, Marginalia folded page es, tier 3 (03:39:58–03:42:44) | 11 | 0 | home encounter 6 lines, conversation 5; shares 0.37–0.71 |

## Decision

Keep the guard on (no flag). It costs a call only on a flagged line. It also covers future content gaps like round
048's, which were caught then only by reading the reports.

## Evidence

[`results/gerald-it.json`](results/gerald-it.json), [`results/party-old_bookshop-es.json`](results/party-old_bookshop-es.json)
(with their `.log` files), `server/test/target-language-guard.test.js`, and the scan's output (re-run with
`node docs/rounds/078/results/offline-scan.mjs`).

## Claim boundary

The rule catches only lines of 4 or more words that all appear in their translation and hold no encounter
vocabulary. It misses an all-English line that rewords its translation, and does not enforce the ratio or judge the
target language. The retry branch is tested with a fake provider only. Whether a real model fixes the line when shown
the correction is not measured.

## Open items

- When a live run first reports `flagged > 0`, read the two lines and record whether the retry fixed it.
- Owner: whether a line under the ratio (not only one with none) should also be retried (decision 1).
