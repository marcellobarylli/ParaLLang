# Round 039 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** round [038](../038/findings.md) open item 1 (the server keeps a removed save, answers
  included). Decided here under the sandbox rules.
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:**
  - server: `server/src/learning-storage.js` (`remove`), `server/src/learning-service.js` (`deleteLearner`),
    `server/src/app.js` (`DELETE /api/learner`);
  - app: `mobile/src/api/learning.js`, the store's `removeSave`, `SavesPanel.js`;
  - tests.
  No prompt change.

## Goal (pre-run)

Removing a save deletes it on the server and on the device, and no request brings it back by accident.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Removing a save deletes it everywhere.** The alert says "This deletes Save 2 and its progress, on this device
   and on the server. It cannot be undone."
2. **The server deletes first.** If it cannot (offline, storage), the save stays on the device and the player can
   try again.
3. **A learner id is enough to delete its save.** This is the same trust model as every write route (with the
   optional `PARALLANG_TOKEN` in front).
4. **Critique by a Claude subagent** (Codex at its usage limit until 20:35 UTC).

## Design (pre-run)

1. **`storage.remove(id)`** unlinks `<id>.json` and any `.<id>.*.tmp` left by a failed write (critique 1.1). Other
   learners' files are untouched. It returns whether the main file existed. A missing file is not an error, and any
   other failure is a retryable `STORAGE_FAILURE`.
2. **`service.deleteLearner(id)`** runs inside the learner's lock, so it waits for a request in flight. It drops the
   in-memory encounter and review challenges, then returns `{ deleted: true, existed }` (critique 1.5).
   `POST /api/learner` is the one path that can create the file again. Every other route loads without creating
   and answers 400 for an unknown learner (critique 1.3).
3. **`DELETE /api/learner`** names the learner in `X-Learner-Id`. A missing or bad header gets 400, and the token
   middleware applies as elsewhere. CORS allows DELETE (checked by the critique).
4. **App.** `removeSave` keeps round 038's lock and list-first update, then:
   - It calls `api.deleteLearner(target)`.
   - A failure restores the list and the floor and writes nothing, with "The server could not delete Save 2, so it
     is still here: …".
   - After the server delete, the device record is written. If that write fails, the slot stays off the list (the
     server copy is gone), the error says "Save 2 was deleted, but this device could not record it yet", and the
     next record write stores the list without it (critique 1.2, in part).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 9f0c2b52…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A temp file from a failed write keeps a copy | + | Accept: remove `.<id>.*.tmp` too; tested | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.2 | Risk | Device write fails after the server delete | + | Accept in part: slot kept off the list with its own message; the next write records it (a restart before any write still lists it: claim boundary) | **Accepted in part** (autonomous, pending owner review) | Design 4 |
| 1.3 | Risk | The recreation claim is untested | + | Accept: queued requests get 400, no file | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.4 | Risk | The in-flight test needs a slow provider | + | Accept in part: a provider that waits 50 ms on grading (timer, not a released promise) | **Accepted in part** (autonomous, pending owner review) | Tests |
| 1.5 | Suggestion | Response shape | + | Accept: `{ deleted: true, existed }` | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.6 | Suggestion | Restore exactly on failure | + | Accept (tested: list and record unchanged) | **Accepted** (autonomous, pending owner review) | Tests |

**Deferred / optional:** the trust model (Owner decision 3); the app does not send `X-ParaLLang-Token` (true before
this round; open item); the alert wording test (taken).

Net change from plan-v1: temp copies deleted, queued requests tested, an explicit response, and the
device-write-failure case.

## Tests (pre-run)

- `delete-learner.test.js`:
  - `remove`: the file and its temp copies go, other learners' files stay; it is idempotent; failures map to
    `STORAGE_FAILURE`; a bad id is refused;
  - HTTP: `DELETE` gives `{ deleted: true, existed: true }`, leaves no file or temp file and no encounter, and the
    learner is unknown afterwards; a second `DELETE` gives `existed: false`;
  - refusals: a missing or bad header gives 400, and no token gives 401 (nothing deleted);
  - ordering: a turn in flight finishes first and the file stays gone; requests queued behind a delete get 400 and
    write nothing.
- Mobile:
  - the server delete runs first; a failed delete keeps the slot and the record;
  - the legacy key moves off the removed id;
  - when the device write fails after the delete, the slot stays off the list and the next switch records it;
  - the alert carries the new wording.
- All suites; web client unchanged.

## Outcome (2026-11-05)

Built as designed, with no Amendments. Server 162/162, mobile 91/91, web client 12/12 and build, expo-doctor 20/20.
See [findings](findings.md).

## Amendment 1 (2026-11-05): post-close review fix

A read-only review of rounds 033–040 by a Claude subagent (no serious bugs found) noted one problem here.
`deleteLearner` cleared the in-memory encounter and review challenges before the unlink, so a failed delete (for
example a read-only disk) dropped a live session whose file stayed. The maps are now cleared only after
`storage.remove` succeeds. Test: a failed delete keeps the encounter. Server 163/163. The review's other notes are
recorded where they belong:
- a slot can reappear after a restart when the device write failed after the server delete (already a claim
  boundary of this round);
- `renderItem` marks lines as shown during render, which is cosmetic only (round 035);
- a cue whose asset fails to load stays silent for the session (round 037).
