# Round 102 plan v1: a replayed send after a server restart

**Source:** round 099 critique 1.3 (deferred, decision 12). Encounters live only in the server's memory
(`learning-service.js` `this.encounters`), receipts persist in the save. After a server restart, a resent answer
whose first reply was lost replays its receipt (receipt checked before `validateVersion`): the app shows the replayed
encounter, ongoing, at v+1. The follow-up `currentEncounter` read (gameStore.js `sendMessage`, round 071) returns
`encounter: null`, and its id check skips it, so a conversation the server no longer holds stays on screen; the next
Send gets `STALE_ENCOUNTER` and only then returns to the map (and that Send's answer is lost to the box).

The same holds when the server holds another conversation (another client started one, or a restart then a start).

## Decisions

1. **When.** Only after a replay (`result.replayed`) whose replayed encounter is `ongoing`, under the existing guard
   (same send, epoch, learner, not loading), and the read answered: `latest.encounter` is null or has another id.
   A replayed `resolved` encounter stands as now (the verdict and the resolve are real; the world/party refresh still
   runs; the map follows on the player's Return).
2. **What.** The same two branches as `_reloadStale`, from the read already made (no second read): factor
   `_applyLatest(learnerId, latest, { message, keep })` out of `_reloadStale` and call it.
   - null → the closed branch: encounter null, view map, `STALE_CLOSED`.
   - another id → that conversation shown, with a new line `STALE_REPLAY_OTHER`: "Your answer was graded, but
     another conversation is open now; it is shown here." (STALE_RELOADED would say the answer was not sent.)
   - In both, the replayed verdict is cleared (it belongs to a conversation no longer shown), the draft stays empty
     (the answer was graded), retry ids are already cleared by the success path.
3. **Read failure** keeps the replayed state (as now).
4. **No server change.** Keeping encounters across restarts is a larger change (persisting in-memory state); out of
   scope.

## Tests (mobile/src/__tests__/send-retry.test.js)

- lost send, resend replays ongoing v2, read gives `encounter: null` → view 'map', encounter null, error
  STALE_CLOSED, assessment null, draft ''.
- same with another id ongoing → that encounter shown, STALE_REPLAY_OTHER, assessment null.
- replay resolved + read null → the resolved encounter stays, assessment kept, getWorld called.
- read throws → replayed state stands (exists? add if not).
- not replayed + read never called (existing).
- Mutations: drop the null branch; drop the ongoing condition.
