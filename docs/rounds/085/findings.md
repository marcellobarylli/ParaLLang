# Round 085 findings

## Question

Does the Saves screen's "N due for review" show the server's count for the current save while the screen is open?

## Finding

**Not before this round; now on opening it and after each Saves action that leaves the player there.** Round 084
refreshed the Spellbook when the Spellbook or the map opened, but not the Saves screen, so a long stay on the map
left its count stale. The critique found a second gap: every Saves action (new save, switch, remove) raises the
request epoch, which drops a refresh in flight, and a remove or a failed new save or switch leaves the player on the
Saves screen with nothing refreshing again. `openSaves`, the three ends of `removeSave` (removed, refused by the
server, not recorded on the device) and the failure branches of `newSave` and `_loadSave` now call round 084's
`refreshSpellbook()`, with its guards unchanged. A successful switch or new save already loads the new save's
Spellbook.

## Method

As in [architecture.md](architecture.md). The plan was critiqued by a fresh read-only subagent in place of Codex
(usage limit until 2026-11-09 17:32 UTC): 5 findings, all accepted; two Optionals taken. Offline, no LLM call. Each
of the store's eight refresh calls was removed in turn to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| New tests in `mobile/src/__tests__/spellbook-refresh.test.js` | 5/5: opening refreshes once, resets the same fields, never loading; a switch with the refresh in flight keeps the new save's Spellbook object, old reply landing before and after the load; a remove refreshes after each of its three outcomes, keeping the error; a failed new save and a failed switch refresh the current save, keeping the error |
| A refresh call removed → test fails | each of the 8 (`openMap`, `openSpellbook`, `openSaves`, `newSave` catch, three `removeSave` ends, `_loadSave` catch): 1–3 failures |
| Full suites | server 301/301, client 12/12, mobile 240/240 (235 before) |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the refreshes (autonomous decision, pending owner review).

## Evidence

`mobile/src/stores/gameStore.js` (`openSaves`, `newSave`, `removeSave`, `_loadSave`), the test file, and the
critique in [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Jest only. Not shown: the Saves screen in the Simulator. As in round 084, a refresh is dropped while the app holds
an ongoing encounter the server no longer reports (after a server restart), so the count may stay stale then.

## Open items

- Owner (Simulator): review a card, move the Mac's clock a day ahead while the map is open, open Saves: the current
  save shows "1 due for review"; remove another save and check the count stays right.
