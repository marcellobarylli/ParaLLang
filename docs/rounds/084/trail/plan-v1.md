# Round 084 plan v1: the Spellbook refreshed when it can have changed by time alone

## Problem

The app fetches the Spellbook (`GET /api/spellbook`) only at startup (`initialize`) and after a save switch.
Otherwise it takes the Spellbook from actions that return one (start, send, help, review, move). SM-2 intervals
are in days, so cards fall due by the clock alone: an app left open (or in the background) overnight still shows
"0 due" in the header badge and on the Saves screen, the Spellbook lists due cards as not due, and kept lines whose
cards fell due still show their translation (round 060's rule hides them). Opening the Spellbook or the map does not
fix it; only an action does.

## Plan

1. **Store: `refreshSpellbook()`** in `mobile/src/stores/gameStore.js`. Fetches `api.getSpellbook(learnerId)` behind
   the screen (never sets `isLoading`, never shows an error: a failed refresh leaves the Spellbook as it was, as the
   Party refresh of round 043 does). The reply is applied only if, since the request was sent:
   - the learner and the request epoch are unchanged (a save switch or reset drops it), and
   - `get().spellbook` is still the same object (no action wrote a newer Spellbook meanwhile; every write replaces
     the object, so a reference check covers all present and future writers without a counter), and
   - the reply is an object with a `cards` array.
   It also updates `snapshots` for the learner (keeping its encounter), as `moveTo` does.
   No request while another refresh is in flight for the same learner (one at a time; a second call returns).
2. **Callers:** `openSpellbook` (before the reply the screen shows the held Spellbook), `openMap` (it already
   refetches the world; the badge sits on the map header) and the app's return to the foreground.
3. **Foreground:** `App.js` subscribes once to `AppState` `change`; on `active` it calls `refreshSpellbook()`.
   Removed on unmount.
4. **During an encounter:** the server's snapshot already withholds meanings while an encounter is ongoing
   (`inEncounter`), so a refresh during one is safe; the reference check keeps it from overwriting the send's newer
   Spellbook.

## Tests (mobile jest)

- After `initialize`, the server's Spellbook gains a due card; `openSpellbook()` → the store's `dueCount` is 1 and
  `view` is `spellbook`; same through `openMap()`.
- A refresh whose reply arrives after an action wrote a Spellbook is dropped (deferred promise; an action sets a new
  object meanwhile).
- A refresh whose reply arrives after a save switch is dropped.
- A failed refresh leaves the Spellbook and `error` unchanged.
- Two `openSpellbook` calls while one refresh is in flight make one request.
- App: an `AppState` `active` change calls `getSpellbook` again (mocked `AppState.addEventListener`); the
  subscription is removed on unmount.

## Out of scope

Refreshing on a timer while the app stays in the foreground; the world and party (they change only by actions,
which already return or refetch them; the party is refreshed on opening its screen since round 043).

## Claim boundary

Offline, jest only. Shows the store applies a fresh Spellbook on these three triggers without overwriting a newer
one. Not shown: the iOS foreground event on a device (Simulator, owner).
