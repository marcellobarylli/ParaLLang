# Critique 1: round 085 plan v1 (the Saves screen refreshes the Spellbook)

- **Dispatched:** 2026-11-06 about 05:13 UTC (exact time unknown)
- **Returned:** before the journal row 4 time
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit any files). Critique the plan in /work/ParaLLang/docs/rounds/085/trail/plan-v1.md for the Expo app in /work/ParaLLang/mobile. Read mobile/src/stores/gameStore.js (refreshSpellbook, openSaves, switchSave, _loadSave, newSave, removeSave), mobile/src/components/SavesPanel.js, mobile/App.js (how the saves view renders) and mobile/src/__tests__/spellbook-refresh.test.js. Look for real defects: races between the refresh and newSave/removeSave/switchSave started from the Saves screen, anything that could show a wrong count or another save's Spellbook, missing tests. Output a numbered list, each item typed Error / Gap / Cut, with one-paragraph reasoning and file:line evidence; then an "Optional" list. Be concise (under 400 words). If the plan is fine, say so."
- **Reviewed input:** `plan-v1.md`, sha256 4745a017…, HEAD 84e763a, working tree: docs/rounds/085/ new
- **Findings:** 5

## Raw output (verbatim)

```text
The plan is mostly sound, but its switch test can't tell whether the epoch check is what drops the late reply, and a remove made from the Saves screen leaves the count stale.

1. **Gap: the switch test says the reply is "dropped (epoch)", but nothing in the test can prove that.** `switchSave` raises the epoch (`gameStore.js:487`). Then one of two things happens:
   - **The old reply lands before `_loadSave`'s `set`.** The epoch check drops it, but nothing else would. The reply is still save A's own Spellbook while save A is the current learner, and the `set` at `:510-514` overwrites it anyway.
   - **The reply lands after that `set`.** The learner check and the object check (`:187`) also drop it.

   So the test can only show what happens on screen, and it should name that instead of the epoch. Save B's Spellbook object is still in the store (`toBe`) and save A's count never shows. Cover both orderings. The current `setup()` has no `currentEncounter` mock (`spellbook-refresh.test.js:20-26`, needed by `gameStore.js:499`) and no two-slot saves record, so the plan should say the fixture grows.

2. **Gap: after a remove, the Saves screen keeps the stale count.** `removeSave` raises the epoch (`:456`), which drops the refresh `openSaves` started. The player stays on the `saves` view and nothing refreshes again. The count shown is the one from before the screen opened, which is the exact staleness this round fixes. Either call `refreshSpellbook()` once `removeSave` finishes (both the success and the failed-delete paths at `:463-480`), or record the limit. Add a test either way.

3. **Gap: a failed new save or switch leaves the count stale too.** In `newSave` (`:445`) and `_loadSave` (`:516`), the catch keeps the old learner on the Saves screen with an error. The epoch raise already dropped the refresh, so the count stays stale. Same fix or record as item 2.

4. **Gap: an encounter still in progress can keep the count stale, and the plan doesn't say so.** `onSaves` is offered whenever the view is the map (`App.js:50`), and that includes a map with an unfinished encounter. If the server restarted, the refresh guard drops its reply (`gameStore.js:189`) and the count stays stale. This was already true in round 084, so it only needs a line under the claim boundary.

5. **Cut: the App render test.** `SavesPanel` gets `dueCount={state.spellbook.dueCount}` passed straight through (`App.js:63`), and the Header shows the same count (`App.js:48`). A store-level test of `dueCount` already covers this. Rendering App with the global `useGameStore` means resetting state the way the background-return test block does (`spellbook-refresh.test.js:145-158`), which isn't cheap.

**Optional**
- Assert that `openSaves` resets `returnView` and the error and notice fields exactly as before. The new call should only add a request.
- Assert that `getSpellbook` is called exactly once per `openSaves`, so no second request sneaks in with it.
- A one-line test that "Return to the map" (`openMap`) refreshes again. It already does at `:198`; the test just records that leaving the Saves screen keeps the guarantee.

No races found that would show another save's Spellbook: every path from the Saves screen raises the epoch before it writes anything.
```
