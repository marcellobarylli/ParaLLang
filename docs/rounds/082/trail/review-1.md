# Review 1 (post-build, substitute for Codex): inscriptions build

- **Dispatched:** 2026-11-06 04:43 UTC
- **Returned:** 2026-11-06 04:48 UTC (notification; 257 s run)
- **Model:** a fresh general-purpose subagent (Claude, claude-opus-5-5), read-only by instruction
- **Prompt:** review commit 5eaa705 against docs/rounds/082/architecture.md for deviations, answer leaks, stale store
  state (every place that sets spellbook or world, the snapshots map), other callers of the move response, React
  issues, and tests that do not test their claim; at most 8 items with severity, evidence, scenario, fix
- **Reviewed input:** commit 5eaa705 (HEAD), working tree: docs/autonomy/STATE.md modified, docs/rounds/082/findings.md new
- **Findings:** 3 (all low)

## Raw output (verbatim)

```text
I found no high or medium bugs in 5eaa705. It matches the round 082 design on every point I checked, and I found no route where an inscription's translation or glossary reaches the player during an encounter. The three items below are low severity. I ran only `server/test/inscriptions.test.js` (7 of 7 pass); I did not run the full suites.

**What holds up:**
- **Map:** `worldSnapshot` adds only `{ id, where, text }`. It runs after the early return for known nodes, so unvisited places get nothing (`server/src/world.js:53,66`).
- **Spellbook during an encounter:** the hiding follows the same rule as the fragments. Every route that returns a Spellbook (`/api/encounter/start`, the move, reviews, the encounter that is under way) builds it through `spellbookSnapshot`, which checks the encounter held in memory. The move builds it from the staged save, so a new place's inscription and the Rift's drill are correct at once.
- **Store:** `moveTo` updates both the `spellbook` state and the per-learner `snapshots` entry, and keeps the old Spellbook when an older server sends none. Only a move changes the visited set, so no other place that sets `world` leaves the inscriptions stale.
- **Other callers:** `server/scripts/play-market.js:209,213,267` only reads `.world`. `leak-scan.js` never sees a move response. The web client in `client/` doesn't call the move route or check the Spellbook's shape.
- **React:** in `MapPanel` the `Inscription` subcomponent is keyed by `here.id` and has no hook below the early return. The jest test would catch a missing key.
- **Content:** I re-checked every inscription word against every objective's `accepted_examples`, which is wider than the design's check. The only overlaps are function words (it *non*, *per*, *del*; es *las*, *esta*), none of them a target. *non* sits at the fountain, where one accepted answer is "Adesso, non domani."

**Findings:**

1. **Low: a test claim the test does not check.** `server/test/inscriptions.test.js:439-440` asserts "file order, not visit order". But the walk is entrance, then cart, then entrance, and file order is also entrance then cart, so the visit order and file order are the same. The test would still pass if `inscriptions()` returned visit order. Fix: visit `butchers_stall` before `coffee_cart` (both are next to `market_entrance`) and assert `['keystone', 'menu_board', 'chopping_block']`.

2. **Low: replayed receipts bring back old inscriptions and drill.**
   - **Evidence:** `withoutLines` (`server/src/learning-service.js:50-54`) now stores each receipt's full inscriptions, translations included (lines 903, 1178). `replayWithLines` (692-698) refreshes only `lines` on a replay.
   - **Scenario:** a send fails after the server committed it. While the send is not in flight the player can move, so suppose they reach a new place, then retry with the same attempt ID. The replay restores the Spellbook as it was when the receipt was stored, and the store adopts it (`gameStore.js:263`). The new place's inscription then disappears from the Spellbook and the old drill comes back until the next Spellbook fetch.
   - **Also:** every receipt now carries about six inscriptions, and receipts are never trimmed.
   - **Not new:** a stored Spellbook with meanings visible already existed for cards and fragments.
   - **Fix:** in `replayWithLines`, also copy `inscriptions` and `drill` from `current`, and strip `inscriptions` in `withoutLines` the way `lines` is stripped.

3. **Low: the store's move success path checks only `learnerId`, not `requestEpoch`.**
   - **Evidence:** `mobile/src/stores/gameStore.js:135`. The failure path (line 138) does check `epoch`.
   - **Scenario:** this is the A, then B, then A switch that `saves.test.js:167-173` simulates for a failing move. A successful reply that lands late passes the check. It used to overwrite only `world`; it now also overwrites `spellbook` and the `snapshots` entry, replacing the Spellbook that `_loadSave` (line 481) or a later review just set with an older one.
   - **Reach:** in normal use `isLoading` blocks a switch while a move is in flight, which is why this is low.
   - **Fix:** `if (epoch !== requestEpoch || get().learnerId !== learnerId) return;`

I changed nothing in the repo. `git status` shows `docs/autonomy/STATE.md` modified and `docs/rounds/082/findings.md` untracked; I didn't touch either.
```
