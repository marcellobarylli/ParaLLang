# Review 1: read-only code review of rounds 059–065

- **Dispatched:** 2026-11-06 00:52 (approx.)
- **Returned:** 2026-11-06 00:55 (approx.)
- **Model:** a Claude (claude-opus-5-5) general-purpose subagent standing in for Codex (Codex at its usage limit), read-only by instruction
- **Prompt:** review the server and mobile diff from the parent of the first round-059 commit to HEAD (1e2c140) for correctness bugs (kept lines, word class, speech and AppState, review loading); at most 8 findings with file:line, scenario, confidence; under 600 words
- **Findings:** 3

## Raw output (verbatim)

```text
No serious bugs found in rounds 059–065: no data loss, no old-save crash, no hidden-translation leak. I found two real but minor races in the mobile app and one cosmetic edge. `npm test` passes (server 244/244, mobile jest 182/182, the other suite 12/12). I diffed `3871dd5^..HEAD` over `server/` and `mobile/`, without docs.

**1. A late review reply can still pull the player back into the review screen** (`mobile/src/stores/gameStore.js:269-274`). Medium confidence.
The round 065 check only asks whether the player is on the same screen as when the request started. It never asks whether this is still the latest request. Scenario:
- The player presses Continue on a review result, which starts request A from the review screen.
- They tap Return before A arrives, then start the Rift drill from the map, which opens the review screen for request B.
- If A arrives after B, it passes the check and replaces the drill's challenge with an unrelated review.

The same thing happens going spellbook → map → spellbook: a stale reply opens a review the player abandoned. Two related points:
- A dropped late reply still sets `isLoading: false` and overwrites `spellbook`. That can switch off the loading lock of an action still running, such as a move, which lets the player tap twice. The old code did this too.
- `startReview` has no `isLoading` guard, so tapping the new "Try again" button twice sends two requests.

Fix: a request counter checked alongside `requestEpoch`, plus an `isLoading` guard.

**2. Returning to the app can turn the ambience back up under a voice that is speaking** (`mobile/src/speech.js:40-46`). Low confidence.
When the app becomes active, it asks `isSpeakingAsync()` and turns the ambience back up if that says nothing is speaking. If the player taps a 🔊 straight after returning, `speak` lowers the ambience. The earlier "not speaking" answer can then land after that and raise it again over the voice. Fix: capture `generation` before the query and skip the undock if it has changed. This needs a tap within the query's latency, so it is rare.

**3. A kept line can be cut in the middle of a character** (`server/src/learning-service.js:539`). Low severity.
`keepLine` shortens text to 500 characters with `slice`. A line over 500 characters can be cut inside an emoji or other two-part character, leaving a broken character at the end. It still passes the load check, so this is cosmetic only.

**Checked and fine:** old saves (`lines` optional, bad entries dropped), withoutLines/replayWithLines, hidden translations during encounters (every Spellbook-bearing reply withholds them), speak's stop-during-wait check, unmount stop order and hook order in the map, NarratorButton/speechText on blank text, wordClassText null handling and reviewPartOfSpeech fallback, and the 065 loading/failure states (both submit paths clear reviewChallenge; the failure screen only appears for Continue from the review screen).
```
