# Round 039 plan v1: removing a save also deletes it on the server

Round 038 open item 1: a removed save's file stays on the server with the player's answers. Decided here (sandbox
rules): removing a save deletes it on the server first, then on the device. Codex is at its usage limit (until 20:35
UTC). No prompt change, no LLM call.

## Design

1. **Storage** (`JsonLearningStorage.remove(learnerId)`): `unlink` the save file; a missing file is success
   (idempotent); other errors are a retryable `STORAGE_FAILURE`.
2. **Service** (`deleteLearner(learnerId)`), inside `serialized(learnerId)` so it waits for any turn in flight for that
   learner: drops the in-memory encounter and review challenges, removes the file, returns `{ deleted: true }` (also
   when there was no file).
3. **Route** `DELETE /api/learner` with the `X-Learner-Id` header (as every other learner route); behind the optional
   `PARALLANG_TOKEN` like the rest. Invalid id: 400 as elsewhere.
4. **App** (`api.deleteLearner`, `removeSave`): the server delete runs first, under the round 038 lock. If it fails
   (offline, storage), the slot stays on the device and the error says so ("…the server could not delete it; it is
   still here."). Only after it succeeds is the device record written. The alert's message becomes "This deletes
   Save 2 and its progress, on this device and on the server. It cannot be undone."
5. **Recreation guard**: `POST /api/learner` with a deleted id would create a fresh empty save (round 031 recovers
   saves the server lost). The device no longer lists the id, so the app never asks; no server change.

## Tests

- Storage: `remove` deletes the file, is idempotent, maps other errors to `STORAGE_FAILURE`.
- Service/HTTP (`api()` helper, through the real routes): create, play to an active encounter, `DELETE` → 200
  `{ deleted: true }`, the file is gone, `GET /api/world` for that id then behaves as for an unknown learner, a second
  `DELETE` is 200; missing or bad header → 400; with a token set, no token → 401; a delete waits for a turn in flight
  (serialized).
- Mobile: `deleteLearner` sends `DELETE /api/learner` with the header; `removeSave` calls it first; a failed delete
  keeps the slot and writes nothing; the alert's new message.
- All suites; web client unchanged (frozen; no delete there).
