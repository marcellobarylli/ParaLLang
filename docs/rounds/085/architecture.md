# Round 085 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Source:** round 084's handoff in `docs/autonomy/STATE.md`. The Saves screen shows "Current save · {place} ·
  {dueCount} due for review" from the store's Spellbook (`mobile/src/components/SavesPanel.js`), but `openSaves`
  does not refresh it. The screen opens from the map, which refreshed on opening; a long stay on the map (cards fall
  due by the clock) leaves the count stale. Every action on the Saves screen (new save, switch, remove) raises the
  request epoch, which drops a refresh in flight, so the screen can also stay stale after a remove or a failure.
- **Offline round:** no LLM call. Critic: a fresh read-only subagent (Codex limited until 2026-11-09 17:32 UTC).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/src/__tests__/spellbook-refresh.test.js`.

## Goal (pre-run)

While the Saves screen is open, its due count is the server's for the current save: after opening it, after a
remove, and after a failed new save or switch, under round 084's guards.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Four triggers more:** `openSaves`; the end of `removeSave` (each of its three outcomes: removed, server
   refused, device write failed; critique 1.2); the failure of `newSave` and of `_loadSave` while its epoch is
   still current (critique 1.3). A successful switch or new save already loads the server's Spellbook.
2. **Same guards as round 084:** latest call wins, same learner and epoch, no newer Spellbook written since, no
   meanings while an encounter is ongoing; never loading, never an error. Other saves' due counts are not shown and
   stay so.

## Design (pre-run)

1. `openSaves`: the same `set` as today, then `get().refreshSpellbook()`.
2. `removeSave`: `get().refreshSpellbook()` after the final `set` of each of the three outcomes (the epoch is
   removeSave's own, so the reply applies unless a later action intervened).
3. `newSave` catch and `_loadSave` catch: inside the existing `epoch === requestEpoch` branch, after the `set`.

## Claim boundary (pre-run)

Jest only. Not shown: the Saves screen in the Simulator after a long stay on the map (owner). As in round 084, a
refresh is dropped while the app holds an ongoing encounter the server no longer reports (e.g. after a server
restart), so the count may stay stale in that case (critique 1.4).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 4745a017…; a fresh general-purpose subagent (claude-opus-5-5),
read-only, in place of Codex; raw text in [`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Gap | The switch test cannot prove the epoch drops the reply; both orderings; the fixture lacks `currentEncounter` and two slots | 0 | Accept: assert the screen outcome (B's Spellbook object kept) for both orderings; grow the fixture | **Accepted** (autonomous decision, pending owner review) | Tests |
| 1.2 | Gap | A remove raises the epoch, dropping the open refresh; the screen stays stale | + | Accept: refresh at the end of each remove outcome; test | **Accepted** (autonomous, pending owner review) | Decision 1, Design 2 |
| 1.3 | Gap | A failed new save or switch leaves the count stale | + | Accept: refresh in both catches, epoch-current only; test | **Accepted** (autonomous, pending owner review) | Decision 1, Design 3 |
| 1.4 | Gap | An ongoing encounter the server forgot keeps the count stale | 0 | Accept: a line in the claim boundary (round 084's guard) | **Accepted** (autonomous, pending owner review) | Claim boundary |
| 1.5 | Cut | The App render test duplicates a store test | − | Accept: cut | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / taken Optionals:** "`getSpellbook` called exactly once per `openSaves`" and "`openSaves` resets the same
fields" taken into Tests; "return to the map refreshes" not taken (round 084's test covers `openMap`).

Net change: three more refresh points (remove, failed new save, failed switch) and a test per ordering.

## Tests (pre-run)

`mobile/src/__tests__/spellbook-refresh.test.js` (fixture grows `currentEncounter`, `deleteLearner` and a two-slot
saves record):
- `openSaves()` shows view `saves`, `returnView` `map`, no error or notice, calls `getSpellbook` once, and after a
  tick `dueCount` 1; never `isLoading`;
- a switch from the Saves screen with the refresh in flight: the old reply resolving before and after the new save
  loads leaves the new save's Spellbook object in the store;
- a remove: the count is refreshed after the removal, after a refused delete and after a failed device write;
- a failed new save and a failed switch: the count is refreshed, the error stays.
Full suite (`npm test`).
