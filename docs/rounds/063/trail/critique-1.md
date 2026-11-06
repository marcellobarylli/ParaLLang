# Critique 1: speech stops when the Review or Spellbook view goes

- **Dispatched:** 2026-11-06 00:36:19 UTC
- **Returned:** 2026-11-06 00:37:55 UTC (recorded on return; the subagent ran 54 s)
- **Model:** a Claude general-purpose subagent (claude-opus-5-5), standing in for Codex (Codex at its usage limit
  until 01:36 UTC); read-only by instruction; agent id a7747a41a55c968db
- **Prompt:** adversarial review of `plan-v1.md` against App.js, Spellbook.js, ReviewPanel.js, PronounceButton.js,
  DialoguePanel.js, MapPanel.js, speech.js, ambience.js and tests (remounts that would wrongly cut speech, Spellbook →
  Review, the result key, hook order, test gaps); numbered findings with evidence and a recommendation, then Optional.
- **Reviewed input:** `plan-v1.md`, sha256 5c43fd82…, HEAD 4778c9f, working tree docs/rounds/063/ only
- **Findings:** 5

## Raw output (verbatim)

```text
The plan is basically sound, but it has one real bug to fix first. It sits in `speak()` and undermines the unmount stops the plan adds, as well as the existing ones from rounds 055 and 062. Every concern you asked about checks out as harmless, so it is not repeated as a finding below.

**Findings**

1. **Error: a tap followed quickly by leaving the screen still speaks, and the ambience stays lowered.**
   - Evidence: `mobile/src/speech.js` lines 42-48. `speak` moves `generation` forward, then waits on `speech.stop()`. After the wait it calls `duck(true)` and `speech.speak(...)` without checking `generation` again.
   - What goes wrong: on the phone, `Speech.stop` takes a moment to finish. If the Spellbook or Review screen unmounts in that moment, its `stopSpeech()` runs first: it moves `generation` on, restores the ambience and stops the voice. Then `speak` carries on, lowers the ambience and starts the word over the next screen.
   - Why it stays lowered: `restore` checks `mine === generation`, and `mine` is now out of date. So the ambience never comes back up until the next utterance.
   - Recommendation: add `if (mine !== generation) return;` right after `await speech.stop()`, before `duck(true)`. This also fixes the same gap behind `DialoguePanel.js:14` and `MapPanel.js:62`.

2. **Gap: the planned tests would pass even with bug 1 in place.**
   - Evidence: the plan says only "`Speech.stop` called after the press". The jest mock's `stop` returns at once, so the window in bug 1 never opens. `narrator-places.test.js:51-57` has the same weakness.
   - Recommendation: add one test in `speech.js` (or `encounter-words.test.js`) with a `stop` that does not return until the test releases it:
     - call `speak`, then `stopSpeech`, then release the stop;
     - assert that `speech.speak` was never called and the last `duck` call was `false`.
   - In the component tests, also assert that the last `duck` call is `false` after unmount, not just that the stop count went up.

3. **Risk (accept and record it): choosing Review from a Spellbook card cuts the word being spoken.**
   - Evidence: `Spellbook.js` `onReview` calls `startReview` (`gameStore.js:264-272`). The view changes to `'review'`, so `FadeIn key={state.view}` (`App.js:43`) unmounts the Spellbook.
   - Assessment: harmless. The Review card shows the same word with its own 🔊. Say in the plan that this is intended.

4. **Gap: plan design step 2 describes something that already exists.**
   - Evidence: `App.js:57` already has `key={state.reviewChallenge?.id ?? 'result'}`.
   - What that key does today:
     - On answer or reveal, the store sets `reviewChallenge: null` and fills `reviewResult` (`gameStore.js:284`, `297`). The key changes from the challenge id to `'result'`, the panel remounts, and the voice stops.
     - On "Continue reviews", the key changes from `'result'` to the next id, and the panel remounts again.
   - Recommendation: reword step 2 as "relies on the existing key" so the round log does not claim it as a change.

5. **Gap: the "no challenge" render you plan to test only appears briefly.**
   - Evidence: `startReview` first sets `reviewResult: null` while `reviewChallenge` is still null (`gameStore.js:267`). The panel keeps the `'result'` key and shows "No due review is available." until the next challenge arrives. If no challenge comes back, the view goes to `'spellbook'` (line 272).
   - Assessment: keep the unit test, since it pins down the hook order. But treat that render as a loading state, not a screen players see.

**Concerns that check out**
- **Hook order:** `ReviewPanel` calls `useState` at the top. A `useEffect` placed straight after it, before `if (result)`, is valid. `Spellbook` has no early return.
- **Spellbook opened from an encounter, then closed:** `DialoguePanel` speaks nothing when it mounts. React runs the Spellbook's removal cleanup before the new screen's mount effects in the same commit. So the Spellbook's stop cannot cut a voice the encounter starts.
- **Spellbook staying open:** a `startReview` that finds no challenge keeps `view: 'spellbook'` and does not remount it, so nothing is cut wrongly.
- **Speakers outside these two screens:** every 🔊 lives in `ReviewPanel`, `Spellbook`, `DialoguePanel` or `MapPanel`. After this round, all four stop the voice when they unmount.

**Optional**
- One store-level or `App` test that goes Spellbook → Review → answer → Continue → Return. It would check that each step stops the voice exactly once and leaves the ambience restored.
- Moving to the background (`AppState`) does not stop speech. That is out of scope here, but worth a backlog note.
- The "No due review is available." flash during "Continue reviews" exists today and is cosmetic. Showing a loading line when `isLoading && !challenge && !result` would remove it.
```
