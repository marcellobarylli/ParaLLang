# Round 039 findings

## Question

Can removing a save also delete it on the server, so the player's answers do not stay behind (round 038 open item
1), without a request bringing it back?

## Finding

Yes, in tests. `DELETE /api/learner` (the learner in `X-Learner-Id`) deletes the save file and any temporary copy a
failed write left behind. It also drops the learner's encounter and review challenges in memory. It runs in the
learner's lock: a turn in flight finishes first, and requests queued behind it get 400 and write nothing. Only
`POST /api/learner` can create the file again, and the app no longer asks for a removed id.

The app deletes on the server first. If that fails, the save stays on the device, nothing is written, and the error
says why. The alert now says "This deletes Save 2 and its progress, on this device and on the server. It cannot be
undone."

The critique's Error was that a temporary file from a failed write keeps a full copy of the save. Deleting only
`<id>.json` would have left it.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 6 findings: 4 accepted and 2 in part.
- A draft was in the working tree before the critique returned (journal row 5).
- The server tests run over real HTTP (127.0.0.1, random token, the existing `createRuntime`).
- Linux compute node. No LLM calls.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 157/157 | 162/162 (new `delete-learner.test.js`, 5 tests) |
| mobile jest | 90/90 | 91/91 (server first, failed delete, device-write failure, new wording) |
| web client vitest, build | 12/12, ok | 12/12, ok (no delete in the frozen client) |
| `npx expo-doctor` | 20/20 | 20/20 |

## Decision

Keep it. Removing a save now deletes it everywhere.

## Evidence

The round's build commit; journal rows 4–9; `server/src/learning-storage.js`, `server/src/learning-service.js`,
`server/src/app.js`, `server/test/delete-learner.test.js`, `mobile/src/stores/gameStore.js`.

## Claim boundary

- Tests only. Deletion is `unlink`: no secure erase, and backups or copies outside `server/data/saves` are not
  touched.
- If the device write fails after the server delete and the app restarts before any other record write, the slot is
  listed again. Continuing it then creates an empty save under the same id.
- The app never sends `X-ParaLLang-Token`, so with a token set, every app call gets 401 (true before this round).

## Open items

1. Owner: is deleting on the server right (versus a trash or export first)? Review the alert text.
2. Owner, Simulator: remove a save against the local server and check that the file in `server/data/saves` is gone.
3. The app does not send `PARALLANG_TOKEN` (an app setting for it would be needed to run the app against a protected
   server).
