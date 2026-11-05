# Claude subagent critique 1: remove a save from the device

- **Dispatched:** 2026-11-05, after 19:46:39 (journal row 3)
- **Returned:** unknown (the notification came after the draft's first mobile run; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/038/trail/plan-v1.md` against the store, `saveSlots.js`, `SavesPanel.js`, `App.js`, the saves and theme tests and round 031's record: races, the legacy key, an empty record, label reuse, the confirmation's accessibility, privacy; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 400 words
- **Reviewed input:** `plan-v1.md`, sha256 50ae6be1c3c9cea4a52e086b84539ae28afc913c75df657b01d879b1dbf02f77, HEAD 9dc456d, working tree: the draft store action and Saves confirmation were being written while it ran
- **Findings:** 7

## Raw output (verbatim)

```text
Critique of `docs/rounds/038/trail/plan-v1.md`

1. **Error: a removed slot can come back through a race.** `removeSave` awaits `setItem(SLOTS_KEY)` before it updates `saves`, and nothing sets `isLoading` in between. During that gap, two things can happen. A tap on "Continue" on the same card passes `switchSave`'s check that the slot is in `saves`. A tap on "Start a new save" makes `newSave` write `withActive({ slots: get().saves })`, a list that still holds the slot. When the late `_loadSave` runs, `withActive` sees an id it does not know and adds it again as "Save N", now the active save. Fix: before the write, set `isLoading: true` and run `++requestEpoch`. Update `saves` first and put it back if the write fails. Also add a strict variant for `_loadSave` (for example `withKnown`) that returns early when `target` is no longer in `get().saves`. Keep the slot-adding `withActive` for `initialize` only. Test both orders.

2. **Risk: the legacy key can point to a removed id.** In `_loadSave`, `SLOTS_KEY` is written before `LEARNER_KEY`. If the second write fails, `LEARNER_KEY` still holds the previous id, and the player can then remove that save. `removeSave` cannot empty the record: the current save is refused and it is always in `saves`. A corrupt record can still go empty, though. `parseSlots` then returns null, `initialize` falls back to `LEARNER_KEY`, and the removed save comes back as "Save 1". Fix: when `LEARNER_KEY` equals the removed id, `removeSave` rewrites it to the current id. Test this.

3. **Error: the confirmation text is false.** The server keeps the file, and the player's typed answers are still reachable through the id. So "cannot be recovered" is wrong. Fix: "Remove Save 2 from this device? You cannot open it again from this app." State the server file in the claim boundary. Log an open item for a `DELETE /api/learner` endpoint and add a row to `decisions.md`. Leaving the file is acceptable for the local prototype only if the wording is honest.

4. **Risk: a reused label misleads the player.** If "Save 2" is removed and the next new save is also "Save 2", it reads as the old save coming back. Fix: add an optional `nextNumber` counter to the record. `parseSlots` has to keep it, because today it rebuilds the record and drops extra fields. Drop the planned test that expects the freed label to be reused.

5. **Error: VoiceOver focus and button names.** Pressing "Remove" unmounts that button, so VoiceOver focus is lost. The confirm button would also have the same name, "Remove", as the button it replaces. Fix: name the buttons "Remove Save 2 for good" and "Keep Save 2". Move focus to the question with `AccessibilityInfo.setAccessibilityFocus`, or announce it with `announceForAccessibility`. The codebase uses neither yet. After removing, return focus to the Saves heading and set `notice: "Save 2 removed."`. Better still, use `Alert.alert` with a `'destructive'` button: iOS handles focus and announcement itself, and jest can mock it.

6. **Error: there is no danger button style.** `Button` has only the `primary`, `secondary` and `text` variants. Add a `danger` variant with `accentInk` on `danger`; that pair is already checked in `theme.test.js`. Also disable "Remove" and "Keep" while `isLoading` is set.

7. **Suggestion: add the missing store tests.** Removing drops `snapshotsByLearner` for that id. `removeSave` refuses when `learnerId` is null.

Optional: list "Simulator: VoiceOver on the confirmation" as an open item for the owner. Explain somewhere visible why the current save has no Remove button.
```
