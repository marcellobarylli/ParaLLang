# Round 076 findings

## Question

If the server writes an open encounter's greeting while the player reads the map card, how much sooner does Talk
answer, and is any call wasted?

## Finding

**The prefetch works as designed. The wait at Talk shrinks by about the time the player spends reading.** In a live
Italian run (codex-cli) with a 10 s stay at each place, the mean start took 4.4 s with prefetch on, against 12.1 s
off. One start of six answered at once (4 ms): Gerald's greeting took 6.4 s to write, less than the 8.5 s
available. The other five waited for the rest of their greeting.

The greetings took longer to write than in earlier rounds: 6.4–17.1 s with prefetch (mean 12.5 s), and 9.7–13.9 s
without. So in this run a 10 s stay was usually not enough to hide the whole call. The 8.6 s median from rounds 067
and 072 would have left less to wait.

No call was wasted. Each prefetch arm scheduled 4 arrivals (the launch and three moves) and made 3 calls. All 3
were used, none were left over, and no greeting was fetched twice. The launch arrival at the entrance was replaced
by the first move before its dwell ended, so it cost nothing.

Against the pre-run criteria:

1. **Not met, in the control arm.** 11 of 12 starts succeeded. The failure was a start with prefetch off: the CLI
   returned an invalid structured response after 120 s (`CLI_INVALID_RESPONSE`). The prefetch was not involved. No
   re-run was planned, and none was made.
2. **Met.** Every start with prefetch on waited no longer than max(0, g − 8.5 s) + 1 s.
3. **Met.** No double fetch, and no unused call.
4. **Met.** Without prefetch, the successful starts took 9.7–13.9 s.

The switch stays **off by default** (`PARALLANG_PREFETCH=on`). The cost, one call for each arrival where the player
stays 1.5 s and never talks, is the owner's call.

## Method

As planned in [architecture.md](architecture.md), after Codex's critique (12 findings: 7 accepted, 4 in part, 1
rejected; see the [Second opinion](architecture.md#second-opinion-pre-run) table and [critique 1](trail/critique-1.md);
plan as sent in [plan-v1](trail/plan-v1.md)). The live script is
[`results/prefetch-live.mjs`](results/prefetch-live.mjs). It runs in-process, with a fresh service and learner per
arm, in the order off, on, on, off. The walk is entrance → coffee cart → fountain → butcher's stall, with 10 s at each
place and then a start. It made 12 greeting calls (one of them failed).

## Results

| Arm | Coffee cart | Fountain | Butcher | Calls (used) |
|---|---|---|---|---|
| off #0 | 11.5 s | 13.9 s | 12.0 s | 3 |
| on #1 | 0.004 s (g 6.4 s) | 4.5 s (g 13.0 s) | 4.8 s (g 13.3 s) | 3 (3) |
| on #2 | 8.6 s (g 17.1 s) | 2.9 s (g 11.4 s) | 5.5 s (g 14.0 s) | 3 (3) |
| off #3 | failed at 120 s | 13.2 s | 9.7 s | 3 |

The time is the start's own wait, and g is the time the prefetch took to write that greeting. Each prefetch began
1.50 s after the move.

The greetings, read by hand, are like the tours' greetings: Gerald's espresso ratings, Flick's "Dopo, dopo,
domani!", Mortimer's "Tutto prosciutto!". All 11 passed the schema and canonicalization (the report has the text).

Tests: server 271/271 (13 new in `greeting-prefetch.test.js`), client 12/12, mobile 218/218. A mutation check
showed that the `starting` guard is needed: without it, the "start is saving" test fails.

## Decision

Keep the prefetch, off by default. If it is turned on, a 1.5 s dwell spends nothing on places the player only walks
through, as this walk's launch arrival showed.

## Evidence

[`results/prefetch-it.json`](results/prefetch-it.json) (per start: the wait, the prefetch's delay and generation
time, the allowed residual, the greeting; per arm: every call and `prefetchStats`) and
[`results/prefetch-it.log`](results/prefetch-it.log).

## Claim boundary

One provider, one pack, two pairs of arms, a scripted walk with a fixed 10 s stay. Real reading times, a player who
never talks, concurrent learners (critique 1.1) and the app over HTTP were not measured. The provider was slower
than in earlier rounds.

## Open items

- **Owner:** turn `PARALLANG_PREFETCH` on by default or not. The cost is one call for each arrival where the player
  stays 1.5 s and does not talk before the server restarts.
- **Owner (Simulator):** with `PARALLANG_PREFETCH=on`, walk to a place, read the card for a few seconds, and press
  Talk. The "getting ready to talk…" line (round 073) should be shorter or gone.
