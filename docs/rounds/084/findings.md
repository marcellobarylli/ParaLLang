# Round 084 findings

## Question

Does the app show a Spellbook that has changed by the clock alone (cards falling due), and can it be refreshed
without overwriting a newer Spellbook or showing meanings during an encounter?

## Finding

**It did not, and now it does on three triggers.** Before this round the app fetched `GET /api/spellbook` only at
startup and on a save switch. SM-2 intervals are whole days, so a card reviewed today falls due tomorrow with no
action: an app left open or in the background overnight showed "0 due" on the header badge and the Saves screen,
listed the card as not due, and kept showing the translation of a kept line whose card had fallen due (round 060
hides it), until an action returned a Spellbook.

The store's `refreshSpellbook()` now runs behind the screen when the Spellbook or the map opens and when the app
returns to `active` from `background`. The reply applies only if it is the latest refresh, for the same learner and
epoch, if no action wrote a Spellbook since, and, while the app holds an ongoing encounter, only if the server also
knows of it (`inEncounter: true`). The last check came from the critique: the server keeps ongoing encounters in
memory, so a restarted server would have answered with all meanings while the player was still in a conversation.

## Method

As in [architecture.md](architecture.md). The plan was critiqued by a fresh read-only subagent in place of Codex
(usage limit until 2026-11-09 17:32 UTC): 7 findings, 6 accepted, 1 in part, one Optional taken. Offline, no LLM
call. Each guard was removed in turn to see that a test fails without it.

## Results

| Check | Result |
|---|---|
| `mobile/src/__tests__/spellbook-refresh.test.js` | 8/8: open Spellbook and map show a newly due card; reply after an action dropped; older of two refreshes dropped in either order; reply for a left save dropped; failure and malformed reply change nothing, no error; encounter check; no learner, no call; App: background→active refreshes, inactive→active does not, listener removed on unmount |
| Guard removed → test fails | object check, sequence check, epoch check, encounter check: each 1 failure. The first version of the order test resolved the newer reply first and missed the sequence check; it now also resolves the older one first |
| Full suites | server 301/301, client 12/12, mobile 235/235 (227 before) |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the refresh on the three triggers (autonomous decision, pending owner review).

## Evidence

`mobile/src/stores/gameStore.js` (`refreshSpellbook`, `openSpellbook`, `openMap`), `mobile/App.js` (the `AppState`
effect), the new test file, and the critique in [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Jest only. Shows the store applies a fresh Spellbook on these triggers under the guards above. Not shown: the iOS
`AppState` sequence on a device or in the Simulator, and a refresh while the app stays in the foreground across a
due time (no timer, by decision).

## Open items

- Owner (Simulator): review a card, set the Mac's clock a day ahead (or wait), send the app to the background and
  back: the header badge shows the due card; the same by opening the Spellbook or the map.
- Owner: whether a foreground timer is wanted (a player who keeps the app open on the map across a due time sees
  it only on the next trigger).
