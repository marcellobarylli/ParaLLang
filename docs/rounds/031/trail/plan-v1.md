# Round 031 plan v1: save slots (backlog A11)

## Goal

Up to three saves on one device, each a separate journey through the market (prototype.md Phase 3 "Save/load
system | JSON persistence, save slots"). The player can start a new save and switch between saves from a Saves
screen. No LLM call, no prompt change.

## Design

1. **A save slot is a learner.** The server already keeps one JSON save per learner id (schema 3: Spellbook, world,
   party), and `POST /api/learner` recovers or creates one. So the server does not change; slots live on the device.
2. **Device record.** AsyncStorage key `parallang.saveSlots`, JSON `{ version: 1, activeId, slots: [{ learnerId,
   label, createdAt }] }`, at most 3 slots. Labels are "Save 1", "Save 2", "Save 3" (the lowest unused number).
   - Migration: with no record but a legacy `parallang.learnerId`, the record becomes one slot "Save 1" holding that
     id. With neither, the first learner the server creates becomes "Save 1".
   - `parallang.learnerId` is still written with the active id, so an older build (or a downgrade) opens the active
     save.
   - A record that does not parse, or does not validate, is treated as missing (the legacy key still holds the
     active id); it is rewritten on the next write.
3. **Store.** `initialize` uses the active slot's id. New actions:
   - `openSaves()`: view `saves` (returns to the map).
   - `newSave()`: refuses at 3 slots, or while loading; `api.createLearner(null)`, then switches to it.
   - `switchSave(learnerId)`: only to a known slot other than the active one; bumps `requestEpoch` (stale responses
     of the old learner are dropped, as in `switchLearnerForTest`), loads world, spellbook and party for the new id,
     restores its in-app snapshot (an encounter held for it in this session), clears review, assessment and draft,
     and lands on the map. The device record is written only after the loads succeed; on failure the current save
     stays active and the error shows.
   - An encounter under way in the old save stays on the server (in memory, per learner); returning to that save
     and entering the location resumes it.
4. **App.** Header: a "Saves" text button (hidden on the onboarding screen and on the Saves screen). The Saves
   screen lists each slot: its label, "Current save" on the active one with its place and Spellbook count, and a
   "Continue" button on the others; "Start a new save" while fewer than 3, otherwise a line "Three saves is the
   most this device keeps."; "Return to the map". Deleting a save is out of scope (the server file would stay; a
   later round with a confirmation step).
5. **Web client** frozen and unchanged (it keeps its single learner).

## Tests

- Store (jest, fake api and storage): legacy key → one slot record; fresh install → "Save 1" after the server's id;
  corrupt record → legacy id used; `newSave` creates a second learner, writes the record and both keys, and lands on
  the map with the new learner's world; `switchSave` back restores the first learner's world and spellbook; a stale
  response from the old learner is ignored; at 3 slots `newSave` does nothing; a failed switch keeps the current
  save and the record unchanged.
- App: the Saves button opens the screen; Continue and Start a new save call the store; the limit line at 3.
- All server, mobile, web tests; expo-doctor; iOS export.

## Out of scope

Deleting or renaming saves, per-save onboarding, cloud sync, exporting a save, the web client.
