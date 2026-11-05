# Round 038 plan v1: remove a save from the device (A11b)

Round 031 deferred deleting and renaming saves as owner questions. Under the sandbox rules the agent decides and flags
it: removing is built now, renaming is not (labels are "Save N"; nothing asks for names yet). Codex is at its usage
limit (until 20:35 UTC). No server or prompt change, no LLM call.

## Design

1. **Store** (`gameStore.js`): `removeSave(learnerId)`.
   - Refused while loading, for the current save, and for an id not in `saves`.
   - Writes the device record without the slot (`SLOTS_KEY`), then updates `saves`, and drops the learner's in-app
     snapshot. A failed write leaves `saves` unchanged and shows an error.
   - The learner's save file on the server is left as it is: there is no delete endpoint, and the device can no
     longer reach it (it forgets the id). Recorded as a claim boundary.
   - `nextLabel` already reuses the freed number for a later new save.
2. **Saves screen** (`SavesPanel.js`): each non-current card gets a "Remove" text button
   (`accessibleName="Remove Save 2"`). Pressing it shows, in that card, the line "Remove Save 2 from this device? Its
   progress cannot be recovered." with "Remove" (danger style) and "Keep" buttons. Only one card asks at a time;
   switching, starting a new save or returning cancels the question. The current save has no Remove button (switch
   first).
3. **Styles** use `type.*` and `colors.*` (theme test). Danger text on surface is already a checked pair.

## Tests

- Store: removes a non-current slot and writes the record; refuses the current one, an unknown id, and while
  loading; a failed write keeps the slot and sets an error; after removing, a new save takes the freed label.
- Saves screen: Remove → the question → Keep (nothing removed); Remove → Remove calls `onRemove(id)`; no Remove on
  the current card; the question's text names the save.
- All suites; expo-doctor.

## Not in scope

Renaming; deleting the server's save file; undo.
