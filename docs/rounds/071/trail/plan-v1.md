# Round 071 plan v1: a retried turn replays instead of conflicting (round 070, critique 1.2)

## Problem
`sendMessage` (mobile/src/stores/gameStore.js) makes a new attempt id on every send. When the POST's response is lost
after the server committed (Wi-Fi drop, app suspended, a timeout on the phone side), the store keeps the old
encounter version and the draft; the player taps Send again; the server's session is one version ahead, so the
request fails `409 STALE_VERSION` "This encounter changed in another tab. Refresh before retrying." The app has no
tabs and no refresh: the player is stuck in that encounter until they leave to the map and come back (if that even
refreshes it). The server already supports exact replays: a receipt keyed by attempt id with a payload hash of
(encounterId, version, message) returns the committed response with `replayed: true`.

## Design
1. **Reuse the attempt id for the same send.** The store keeps `lastSend = { learnerId, encounterId, version, text,
   attemptId }` for the most recent send that did not succeed. A new send whose learner, encounter id, version and
   trimmed text all equal it reuses its attempt id; anything else makes a new id. On success `lastSend` is cleared.
   Safe both ways: if the server never committed, there is no receipt and the turn runs fresh; if it did, the receipt
   replays the same response (the server checks the payload hash, so a different text could never hit it).
2. **Recover from a stale session.** If a send fails with `STALE_VERSION` or `STALE_ENCOUNTER`, the store fetches
   `api.currentEncounter(learnerId)` and, if still current (epoch, learner), replaces `encounter` and `spellbook`
   with the server's; the draft stays; the error reads "This conversation moved on since your last answer; it has
   been reloaded." (no tabs). If the reload fails, the original error stays. Only when the reloaded encounter is null
   (server restarted, sessions are in memory) the error says "This conversation ended when the server restarted.
   Return to the map to start it again." and the encounter stays as it was.
3. Round 070's poll uses the same attempt id, so a replayed send's progress is null (replays never set progress) and
   the box simply waits for the response.
4. The server is unchanged. The web client is frozen and unchanged.

## Tests (mobile)
- A send that fails with a network error, then the same text again: the second POST carries the same attempt id and
  the replayed response is applied (cue not played for `replayed: true`, as today).
- A different text after a failure, or the same text after the encounter moved (version differs): a new attempt id.
- After a success, the same text again later gets a new attempt id (the version changed anyway).
- STALE_VERSION: the store reloads the current encounter, shows it, keeps the draft and shows the new message; a
  failed reload keeps the original error; a null reload gives the restart message.
- A save switch between the failure and the retry: a new attempt id (learner differs).
- Server (existing): a receipt replays for the same attempt id and payload; add one HTTP test that a lost-response
  retry with the same attempt id and version returns `replayed: true` and the committed encounter, and that the
  same attempt id with another message is `ATTEMPT_REUSE` (already covered? check, add if not).

## Not in scope
Retrying automatically; a refresh button.
