# Round 107 findings: play-market matches narration calls within their step

## Question

Can a failed step's narration call take a report line (round 099 review 1 R1.4)? If so, can play-market match each
line to a call of the step that committed it, without a live run?

## Finding

It could: with text-only matching, a say that failed after the provider answered (here a reply that failed the
schema) gave its call to the next committed line whenever the natives were equal, so that line reported the failed
call's time (and could report its retry). Calls and committed lines now carry their step, and `narrationLines`
matches within the step; the failed call is `uncommitted` with its `step`. A line's `turn` is now its index among the
committed NPC lines (before, the count of lines matched so far: the same unless a committed line had no call), and a
committed line no call matches is listed in `unmatchedLines` instead of vanishing (review R1.1, R1.2).

## Method

Offline. `server/scripts/play-market.js`: `recordCalls(…, { stepOf })`, the step index in `step()`, committed lines
`{ native, step }` in `playAt`, `narrationLines` within the step, an injected provider for tests.
`server/test/play-market.test.js`: a unit test of the matching (steps, plain strings, retries), `recordCalls`
tagging, and `playMarket` itself run in-process on the Spanish Coffee Cart with a fixture provider whose first reply
fails the schema after 40 ms, every reply having the same native. A fresh read-only subagent reviewed the build.

## Results

- The in-process run: steps say ✗ (PROVIDER_FAILURE), ✓, ✓; lines on turns 0, 1, 2 from calls 1, 4 (the guard's
  retry, kept, with the English call 3 beside it) and 5; the failed call 2 in `uncommittedLines` with its step; no
  `unmatchedLines`.
- A committed line with no call is listed in `unmatched`; a call made outside a step is never a line.
- With plain strings the old behaviour stands (the first call with the text takes the line).
- Mutations (no step filter; no step condition on retries; committed lines without steps) each fail a test.
- Suites: server 395/395, client 20/20, mobile 303/303.

## Decision

Keep per-step matching (autonomous decision, pending owner review; decisions row for round 107).

## Evidence

`server/test/play-market.test.js`, [`trail/review-1.md`](trail/review-1.md).

## Claim boundary

Fixture provider only; multi-scene runs (`--tour`, `--party`) are not run in a test (each scene matches only its own
calls and lines); no live report was produced with the new matching (Codex limited until 2026-11-09 17:32 UTC).
Reports written before this round used text-only matching; their lines are as round 097 described.

## Open items

- The next live report: check `uncommittedLines` carry a `step`, every line's step is a successful one, and read any
  `unmatchedLines`.
