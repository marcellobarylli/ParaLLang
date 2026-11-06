# Codex critique 1: a loading line between reviews

- **Dispatched:** 2026-11-06 00:46 (approx., from the journal)
- **Returned:** 2026-11-06 00:47
- **Model:** a Claude (claude-opus-5-5) general-purpose subagent standing in for Codex (Codex at its usage limit until 01:36 UTC), read-only by instruction
- **Prompt:** adversarial read-only review of plan-v1 against ReviewPanel.js, gameStore.js, App.js, learning-flow.test.js; findings typed Error / Risk / Gap with evidence, plus Optional; under 500 words
- **Reviewed input:** `plan-v1.md`, sha256 7b37e461…, HEAD 5aff4b1, working tree docs/rounds/065/ only
- **Findings:** 7 (item 8 is "checked, no issue", not counted)

## Raw output (verbatim)

```text
No blocking Error. The plan's core diagnosis is correct: `startReview` makes "No due review is available." show for the duration of a request after "Continue reviews". It misses the failure and navigation-during-wait paths, and a few tests.

**Findings**

1. **Risk: if the next review fails to load, the screen says nothing is due.** If `createReview` fails, the catch branch sets `error` and `isLoading: false` but leaves both `reviewChallenge` and `reviewResult` null (gameStore.js:273). ReviewPanel then shows "No due review is available." (ReviewPanel.js:25-26) under the error banner, which is false: the item is still due. The plan keeps this on purpose (plan "Change" 2). Recommendation: pass `error` (or a `loadFailed` flag) to ReviewPanel. When there is no challenge, no result and an error, show "The next review could not load." with a "Try again" button (calls `onContinue`) plus the return button. Otherwise the plan moves the false message from the wait to the failure.

2. **Risk: the loading line invites a navigation race that already exists.** `startReview` has no `isLoading` guard and does not bump `requestEpoch` (gameStore.js:264-272). `returnToDialogue` and `openSpellbook` don't bump it either (248-262). The header Spellbook and Party buttons stay enabled while loading (Header.js:13,17). So if the player presses the loading line's return button (or Spellbook) during the wait, the late reply still sets `view: 'review'` or `'spellbook'` and pulls them back. Recommendation: have `returnToDialogue`, `openSpellbook`, `openParty` and `openMap` bump `requestEpoch`, or check after the await that `get().view` is still `'review'`/`'spellbook'`. Add a test for "Return during a held createReview stays on the map".

3. **Gap: the flow test can't fail on the bug today.** The current mock for `/api/spellbook/review` resolves at once (learning-flow.test.js:92-95). The plan's held-open request is the right idea, but the "never shows" assertion has to run while the promise is still pending, through `act`, not only after `findByRole`. Recommendation: hold the promise (like `resolveDialogue` at :206-214) and assert `queryByText('No due review is available.')` is null before resolving.

4. **Gap: no test for "Continue reviews" when nothing is left due.** In that case the view moves to the Spellbook (gameStore.js:272). Recommendation: test that the loading line shows during the hold, the Spellbook heading appears after it, and the no-due text never shows.

5. **Gap: no test of the error path.** Recommendation: a held `createReview` that rejects with 503 should show the alert and whatever text finding 1 settles on.

6. **Risk: the new line may not be announced.** `role="status"` on a `Text` matches the existing pattern (DialoguePanel.js:41), but VoiceOver only announces it when focus lands there. Here the focused "Continue reviews" button unmounts, so focus is lost. Recommendation: put the line first and keep the return button. This needs a Simulator VoiceOver check, which is an open item for the owner.

7. **Risk: the new text can break the style audit.** theme.test.js:30-37 fails on any new text style that has no `fontSize: type.*`. Recommendation: reuse `styles.body` or `styles.muted`.

8. **Checked, no issue:**
   - The App `key` stays `'result'` from result to loading (App.js:57), so the panel doesn't remount mid-wait and `stopSpeech` doesn't fire twice.
   - Save switches can't start from the review view (Saves is map-only, App.js:37), and `_loadSave` clears review state.
   - No unrelated action sets `isLoading` while on the review view.
   - Reviews started from the Spellbook or the drill keep the view on `spellbook` or `map` during the wait, so the new branch isn't reached.

**Optional**

- a. Wait about 300 ms before showing the loading line, so it doesn't flash on fast replies.
- b. Disable the header Spellbook and Party buttons while loading, like Map, Saves and Restart (Header.js:18-20).
- c. After a practice result, "Continue reviews" calls `startReview()` with no id and fetches *due* items, not more practice. The loading text "Finding the next review…" fits, but the button label could be clearer after a practice result.
- d. Make the `!challenge` branch a `ScrollView` with an `aria-label` ("Vocabulary review"), to match the other branches.
```
