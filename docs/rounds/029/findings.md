# Round 029 findings

## Question

Can the game force spaced repetition before the Rift boss (backlog C1), as a short drill that always ends, cannot
deadlock, and tells the player what to do?

## Finding

Yes, in tests. Before the first fight, the Rift asks for one review per answer slot (a coffee, a meat, stop, now,
"my name is", Nobody) whose Spellbook cards are all due. That is at most six reviews, and each review schedules its
card at least a day out, so the drill always ends.
- Starting the fight before then is refused with 409 `DRILL_REQUIRED` and the count.
- If another conversation is under way, the message names it, and the map offers a way back to it, since reviews
  are closed while it runs.
- The drill counts again a day later, until the Rift is completed.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit,
  and returned two reports on the same draft:
  - [Critique 1](trail/critique-1.md): 8 findings, 3 Errors, all accepted. They reshaped the design: groups instead
    of ids, the drill computed by the server inside the spellbook, the check moved after the resume branch, and the
    blocking conversation named.
  - [Critique 2](trail/critique-2.md): 11 findings, handled in Amendment 1. Restarting an active Rift session is no
    longer drilled, and stale cards are skipped by the no-id review pick.
- Tests on the Linux compute node. No live LLM runs. The tour script's drill step ran only offline (`clearDrill` in
  `drill.test.js`). The live tour is queued with round 026's after-build tours.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 142/142 | 148/148 (`drill.test.js` ×6: loader, per-group set with stale and non-target cards, 409 and drill-first reviews, no drill elsewhere/completed, ongoing elsewhere, resume and restart, a day later, HTTP) |
| mobile jest | 47/47 | 51/51 (`drill.test.js` ×4) |
| web client vitest, build | 12/12, ok | 12/12, ok |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

## Decision

Keep it. Backlog C1 is done, apart from the live tour and the Simulator check.

## Evidence

The round's build commit; journal rows 6–9; `server/test/drill.test.js`, `mobile/src/__tests__/drill.test.js`.

## Claim boundary

Tests only. The drill's length in a real playthrough is not measured, and the live tour will report it as
`drillCards`. In a playthrough within one session, the drill will mostly hold words the player only saw in NPC
lines. Words the player produced at a passed objective are scheduled for the next day. A drill card can be cleared
with "Show answer" (critique 2.8). That still forces an exposure, and the reveal is scheduled as a failure.

## Open items

1. Next live run: `play-market.js --tour` (it, es) must report `drillCards` as an array (an exit-code criterion now).
   Record its length.
2. Owner, Simulator: the drill note at the Rift, the review loop from the map and back, and the finish-first case.
3. Owner: decide whether a reveal should count as a drill review, and whether replays of the Rift should drill.
