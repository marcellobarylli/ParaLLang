# Round 178 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-24 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 144 (the browser's copy of the save), round 175 (the game menu).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/slots.js`, `client/src/components/SaveSlots.jsx`, `client/src/stores/gameStore.js`
  (`slot`, `openSlots`, `switchSlot`, `clearSlot`), the menu row in `DungeonScreen.jsx`, `client/src/index.css`.

## Decisions

1. **A slot is a namespace in the browser.** Each slot keeps its own learner id, copy of the save, place last entered
   and title landscape (`parallang.learnerId`, `.save`, `.placeId`, `.title`). Slot 1 uses the keys as they were, so
   the save every player has today is slot 1, untouched; slots 2 and 3 suffix them (`parallang.learnerId.2`).
   Settings, display and the access code are shared. The server is unchanged: a slot is another learner.
2. **The store sees its slot's keys only.** `createGameStore` wraps the storage it is given (`slottedStorage`), so
   every read and write of a per-learner key is the slot's own and no other code changes.
3. **Switching reloads.** Menu, Save slots: three rows (conversations, words, date saved); Play or New game stores the
   choice (`parallang.slot`) and reloads the page into it; an empty slot makes a new learner. A slot not in use can
   be emptied after a second press (its keys are removed; its save on the server is left, unreachable).

## Tests

`npx vitest run` in `client/` (308; `slots.test.js` new: the keys, the summaries, choosing and emptying, and a store
in slot 2 that makes a new learner and leaves slot 1's alone); `npm test -w server` (592); `npx vite build`; the sheet
in headless Chromium at 390 × 844 ([shot](shots/save-slots.png)).

## Status

Built, tested, seen in headless Chromium; merged to `main` and pushed on the owner's word ("then merge and deploy").
