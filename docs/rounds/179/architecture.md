# Round 179 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-24 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 178 (save slots), round 039 (`DELETE /api/learner`).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/api/encounter.js` (`deleteLearner`), `client/src/slots.js` (`learnerOf`, `clearSlot`'s
  `current`), `client/src/stores/gameStore.js` (`deleteSlot`), `client/src/components/SaveSlots.jsx`.

## Decisions

1. **Delete** (a slot not in use): the slot's save is deleted on the server (`DELETE /api/learner`, which removes the
   file and, with GitHub saves, its copy there) and its keys in the browser. Before (round 178), "Empty" only forgot
   the slot in the browser and left the save on the server.
2. **Start over** (the slot in use): the same deletion, then the page reloads into a new game in that slot. This is
   resetting progress.
3. **Confirmation.** Both take a second press, under a line that says what will be lost.
4. **A server out of reach.** The slot is emptied in the browser all the same, and the sheet says that the server's
   copy was left there.

## Tests

`npx vitest run` in `client/` (310; 2 new: delete another slot, start over the slot in use, and a server out of
reach); `npx vite build`; the confirmation in headless Chromium ([shot](shots/start-over.png)). The server's route is
round 039's, with its tests (`server/test/delete-learner.test.js`).

## Status

Built, tested, seen in headless Chromium; merged to `main` and pushed on the owner's word ("implemented and deploy").
