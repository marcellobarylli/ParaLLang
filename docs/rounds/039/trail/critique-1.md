# Claude subagent critique 1: removing a save also deletes it on the server

- **Dispatched:** 2026-11-05, after 19:51:19 (journal row 3)
- **Returned:** unknown (the notification came after the app side's first run; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/039/trail/plan-v1.md` against `app.js`, `learning-storage.js`, `learning-service.js`, the test helpers, the app's API, store and Saves screen, and round 038's record: recreated files, temp files, leaked locks, the header, CORS, the order of server and device writes; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 400 words
- **Reviewed input:** `plan-v1.md`, sha256 9f0c2b52b9f0604c2d4bc96dd377c063bb5c23526db0c35172efc3c0cd389688, HEAD 2b6cd4e, working tree: the draft storage, service, route, server test and app changes were uncommitted while it ran
- **Findings:** 6

## Raw output (verbatim)

```text
I found two real gaps in the plan, both about leftover data or a save quietly coming back. Nothing in it is wrong enough to block the round. I also read the uncommitted `server/src` diff (`remove`, `deleteLearner`, the DELETE route), so some points refer to that code.

1. **Error: a crashed write can leave a full copy of the save behind.** `save()` writes `.<id>.<uuid>.tmp` and then renames it. Its cleanup is best-effort, so a crash or a failed unlink leaves a whole copy of the save, answers included. `remove()` only unlinks `<id>.json`, so "the file is gone" can be true while the data is still on disk. Fix: in `remove()`, `readdir(saveDir)` and also unlink every `.${id}.*.tmp` (ignore ENOENT). Test this with a planted `.tmp` file.

2. **Risk: if the device write fails after the server delete, the save comes back empty without warning.** In step 4 the server delete succeeds, `setItem(SLOTS_KEY)` throws, and the slot stays on the device. If the player later taps it, `_loadSave` calls `createLearner(target)`. Since round 031 that creates a fresh empty save, with no warning. Fix: give this case its own message: "Deleted on the server, but this device could not forget it. Tap Remove again." DELETE is idempotent, so a retry is safe. Add a test for it.

3. **Risk: the plan's recreation claim rests only on the app, and it isn't tested.** The good news: I found no load that creates a file except `createOrRecoverLearner`. Every route that saves first calls `loadEnvelope`, which returns 400 for a missing file, and none of them uses `create: true`. So a `startEncounter`, `moveTo`, `recruit` or `submitReview` queued behind the delete returns 400 and writes nothing. Only a `POST /api/learner` with the id can bring the file back. Fix: test it by queuing `startEncounter` behind a delete and asserting 400 and no file. Say in the record that `POST /api/learner` is the one path that recreates a file.

4. **Risk: the "waits for a turn in flight" test can't be written with the current fixture.** `FixtureProvider` resolves at once. Fix: use a provider that waits on a promise the test releases. Start a dialogue, send the DELETE, release, then assert the turn's save happened first and the file is still gone afterwards.

5. **Suggestion: the plan and the code disagree on the response.** The plan says `{ deleted: true }`; the code returns `{ deleted: true, existed }`. Pick one and test it.

6. **Suggestion: the slot disappears and reappears.** `removeSave` takes the slot out of the list before anything is awaited. With the server call first, a failure brings the slot back. Either keep it in the list until the server succeeds, or test that `saves` and `savesFloor` are restored exactly.

These parts check out:
- **Lock entries:** the `finally` in `serialized` clears them, so none leak.
- **Missing learner header:** `assertLearnerId(undefined)` returns 400.
- **CORS:** `cors()` runs before `requireToken`, and its default methods include DELETE, so a preflight works. The frozen web client never calls DELETE.

Optional:
- A learner id is now enough to destroy a save, the same trust model as the write routes. Note it in the architecture.
- The mobile API never sends `X-ParaLLang-Token`, so with a token set every app call gets 401. That was already true before this round.
- Make sure the `Alert` text test covers the "on the server" wording.
```
