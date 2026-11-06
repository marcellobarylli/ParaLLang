# Round 085 plan v1: the Saves screen refreshes the Spellbook

**Source:** round 084's handoff. The Saves screen shows "Current save · {place} · {dueCount} due for review" from the
store's Spellbook (`mobile/src/components/SavesPanel.js`). Round 084 refreshes the Spellbook when the Spellbook or
the map opens and on a return from the background, but `openSaves` (`mobile/src/stores/gameStore.js`) does not. The
Saves screen opens from the map, which refreshed on opening; a long stay on the map (cards fall due by the clock)
leaves the count stale.

**Offline:** no LLM call.

## Goal

Opening the Saves screen shows the server's current due count for the current save, under round 084's guards.

## Decision

`openSaves` calls `get().refreshSpellbook()` after its `set`, as `openSpellbook` does. Same guards (latest call
wins, same learner and epoch, no newer Spellbook written, no meanings while an encounter is ongoing), never loading,
never an error. Other saves' due counts are not shown today and stay so.

## Tests

In `mobile/src/__tests__/spellbook-refresh.test.js`:
- after `initialize`, the server gains a due card; `openSaves()` shows view `saves` and, after a tick, `dueCount` 1;
  no `isLoading`, no `error`;
- a switch started from the Saves screen while the refresh is in flight: the late reply for the old save is dropped
  (epoch), the new save's Spellbook stays;
- the SavesPanel's text on the rendered screen reads "1 due for review" after the refresh (App render, if cheap;
  else the panel with the store's count).
Full suite (`npm test`).

## Claim boundary

Jest only; the Simulator check (owner) is the Saves screen's count after a long stay on the map.
