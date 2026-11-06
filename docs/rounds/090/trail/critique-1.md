# Critique 1: round 090 plan v1 (fixes from a review of rounds 029–039)

- **Dispatched:** 2026-11-06 about 06:14:45 UTC
- **Returned:** about 06:17:10 UTC (exact time unknown; 144 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no network, no LLM calls). Critique the plan /work/ParaLLang/docs/rounds/090/trail/plan-v1.md (repo /work/ParaLLang: Node server in server/, Expo app in mobile/, YAML packs content/languages/{it,es}/). Read: mobile/src/stores/gameStore.js (initialize, _loadSave, newSave, switchSave, removeSave, refreshSpellbook, leaksMeanings, snapshots, the slot helpers withActive/parseSlots/withoutSlot), mobile/App.js (Header props, MapPanel ongoing, SavesPanel props), mobile/src/components/Spellbook.js (cardState, Card, lineHiddenBy), mobile/src/components/SavesPanel.js, mobile/src/components/ReviewPanel.js (does the review show anything of other cards), server/src/learning-service.js (spellbookSnapshot, lineEntryIds, keptLines, deleteLearner, currentEncounter route handler), server/src/learning-storage.js (remove), and the existing tests in mobile/src/__tests__/ (saves, spellbook, kept-lines) and server/test/ (spellbook, kept-lines, save removal). Look for: does each fix close its issue; R1.1: a resolved or stale encounter from the server, the onboarding screen, the epoch checks, what else breaks when encounter is set at startup (meanings hidden? the store refusing snapshots); R1.2: false hides (English homographs, very short forms, articles inside examples, the card's own inflections matched as other entries), cost, whether the app or the server is the right place, phrases vs words; R1.3: what each store action does with learnerId null (refreshSpellbook, the epoch, the record's activeId, the onboarding flag, the Party/Spellbook buttons with no learner), and a device with only the broken save; whether rejecting R1.4 is reasonable; missing tests. Numbered list typed Error / Gap / Cut with brief reasoning and file:line evidence, then Optional. Under 450 words."
- **Reviewed input:** `plan-v1.md`, sha256 9ecbeae5…, HEAD 7dc6133, working tree: docs/rounds/090/ new
- **Findings:** 11

## Raw output (verbatim)

```text
The plan needs changes before it is built. The most serious problem is in R1.3: removing an unreadable save deletes a file whose error message promises it was kept. R1.1, R1.2 and R1.5 close their issues with smaller corrections. Rejecting R1.4 is reasonable.

1. **Error (R1.3).** Every SAVE_UNREADABLE message ends "The original file was preserved" (server/src/learning-storage.js:71–128). The plan's argument is "DELETE unlinks without reading" (storage.js:140–153), so Remove destroys that file for good. One case ("unsupported format", :71) can be a valid save from a newer server. The broken save should be quarantined (renamed aside) or carry its own warning before it is removed.

2. **Error (R1.3).** `newSave` with no learner writes `kept = { ...record, activeId: learnerId }` with activeId null (gameStore.js:453). `parseSlots` then falls back to `slots[0]` (saveSlots.js), which is usually the broken save. The plan says "the new slot becomes the record's active one" but does not change this line. Both the guards (`!learnerId` at :445 and :501) and `kept` must change.

3. **Gap (R1.3).** The fix shows Saves after any failed start, including "server down". Continue and New then only add more errors. That is harmless but should be stated. More fixes are needed:
   - The onboarding screen never shows on such a device, because `_loadSave` sets `onboarding: null` (:529).
   - Tests are missing for a device with only the broken save and a legacy-key id that is not in the record (`withActive` creates a "Save 1" in memory only).
   - Party and Spellbook already show with no learner, which is not new.

4. **Gap (R1.1).** `currentEncounter` returns any encounter the server holds, including resolved ones (learning-service.js:761–764). Storing a resolved one is fine for `ongoing` (App.js:59). But `returnToEncounter` only checks that `encounter` exists (:383), and `_startNamed`'s `fresh` check (:169) changes behaviour. Tests are needed for a resolved encounter.

5. **Error (R1.1).** "The Spellbook stays getSpellbook's": it and `currentEncounter` run in parallel and can disagree. `initialize` sets the Spellbook without the `leaksMeanings` guard (:22, :108–110). Use `current.spellbook` when it exists, as `_loadSave` does (:524).

6. **Gap (R1.1).** Once an encounter is held from startup, a later server restart makes `refreshSpellbook` refuse every refresh (:194). This already happens after any turn. Name it, and test that the snapshot keeps the encounter.

7. **Gap (R1.2), false hides.**
   - `inflectsForms` matches any word of length L to L+2 that shares the form's prefix minus its last letter (service.js:34–35). Examples: *otto* hits *ottimo*, *casa* hits *caso* and *cassa*.
   - Entries with the same written form (such as *sei*) list each other in `formCardIds` because only the card's own id is excluded.
   - English homographs do not matter, because only target-language text is matched.
   - These are accepted as decision 2 for kept lines. The plan should state that and measure the false-hide rate on both packs.

8. **Gap (R1.2), cost and placement.** The server is the right place, since it knows the pack. But cards, examples and lines share one 500-entry cache (:41). Content is fixed, so compute each entry's two lists once at load instead.

9. **Gap (R1.2).** Not covered: the reverse case, where a readable *caffè* plus a readable *nero* answer a due *caffè nero*. Notes (Spellbook.js:181) could also name a due word's meaning. The plan names both, but the drill can then be answered from the Spellbook, so treat it as a known leak, not a boundary. ReviewPanel shows only its own challenge, so it needs no change.

10. **Cut (R1.4).** The rejection is sound. A cheaper partial fix: a known slot that comes back `recovered: false` could tell the player it started fresh.

11. **Gap (R1.5).** Add a test that a delete during a send in flight leaves no progress entry for that learner.

**Optional:** a server test that removing a SAVE_UNREADABLE save keeps (or quarantines) the original file, and an app test that `newSave` from the failed state persists the new id as `activeId`.

The plan is /work/ParaLLang/docs/rounds/090/trail/plan-v1.md.
```
