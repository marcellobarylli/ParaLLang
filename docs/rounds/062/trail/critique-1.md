# Critique 1: the narrator on the map and the companion card

- **Dispatched:** 2026-11-06 00:31:45 UTC
- **Returned:** 2026-11-06 00:33:48 UTC (recorded on return; the subagent ran 73 s)
- **Model:** a Claude general-purpose subagent (claude-opus-5-5), standing in for Codex (Codex at its usage limit
  until 01:36 UTC); read-only by instruction; agent id a65e93dee2b621122
- **Prompt:** adversarial review of `plan-v1.md` against speech.js, PronounceButton.js, DialoguePanel.js,
  MapPanel.js, App.js, ambience.js, the mobile tests and the location and briefing content (leaks, target words read
  in English, a move under a playing utterance, stopSpeech and the ambience); numbered findings typed Error / Risk /
  Gap with evidence and a recommendation, then Optional items.
- **Reviewed input:** `plan-v1.md`, sha256 c09993ba…, HEAD 39d0944, working tree docs/rounds/062/ only
- **Findings:** 7

## Raw output (verbatim)

```text
I found 7 findings and 3 optional items. Nothing in the plan is an outright Error. The biggest gap: moving to another node leaves the old place's description playing under the new card, and the plan's unmount-only stop does not cover that. Reading the texts aloud leaks no answers: nothing spoken goes beyond what is on screen.

1. **Gap: moving to another location does not stop the description being read.**
   - Evidence: `MapPanel.js:60,73-76` shows the card for `here`, which is derived from `world.currentLocationId`. A move only updates `world`, so `MapPanel` stays mounted (`App.js:45`). Plan item 4 adds `stopSpeech` on unmount only. Until the utterance ends, the British voice keeps reading the old location's text under the new card.
   - Recommendation: add `useEffect(() => () => { stopSpeech(); }, [here?.id])`, which also covers unmount. Test it: rerender with another `currentLocationId` and expect `Speech.stop` to be called.

2. **Risk: the new hook in MapPanel must sit above the early return.**
   - Evidence: `MapPanel.js:57-58` calls `useState` and then returns early with `if (!world) return …`. A `useEffect` added below that line breaks the rules of hooks when `world` goes from null to loaded, and the effect would never be set up on the "Finding the Crumbling Market…" render.
   - Recommendation: state in the plan that the effect goes next to `useState`, before the `!world` return. Add a test that renders with `world=null`, then with a world, then unmounts.

3. **Risk (pronunciation model): `MERCATO` gets read in an English voice.**
   - Evidence: `content/world/locations/market_entrance.yaml:4`. The description is world-level (it does not depend on the language pack) and includes "MERCATO". `mercato` is an Italian ambient chip word (`content/languages/it/encounters/market_entrance_tutorial.yaml:21`), not an objective answer, so there is no leak.
   - The problem is that the narrator voice says a word from the language being learned with English pronunciation, and on the Spanish pack the word is not even Spanish. The all-caps words (MERCATO, MARKET, PLEASE DO NOT HUM at `cracked_fountain.yaml:5`) may also come out spelled letter by letter or stressed oddly on iOS.
   - Recommendation: accept this and record it as a known limit, or keep a short list of words to drop or lowercase for speech. At minimum, list "listen to market_entrance and cracked_fountain on device" as a Simulator open item for the owner.

4. **Gap: an atmosphere line that arrives after the button is pressed is not read.**
   - Evidence: `gameStore.js:423-428`. Atmosphere is cleared on each change of the state key, then filled in asynchronously, possibly after a retry. A press during that window reads the description only. The card is `aria-live="polite"` (`MapPanel.js:73`), so the new line appears and VoiceOver may announce it, but the narrator never reads it.
   - Recommendation: build the text when the button is pressed (it already is via props), document "reads what is shown at press time", and test it: press before the atmosphere arrives, then after, and expect two different `speak` texts. Do not auto-respeak.

5. **Risk (no interference, but pin it): `stopSpeech` on map unmount versus the ambience.**
   - Evidence: `speech.js:56-60` (`duck(false)` and a generation bump), `ambience.js:70-74` (`duckAmbience` only sets the volume of the wanted player), and `gameStore.js:402-406`. The ambience follows `world.currentLocationId` and `soundsOn`, not the view, so going from the map to the encounter keeps the same loop. Unmounting just restores full volume, which is correct.
   - The one real interaction is on a move: `setAmbience(newId)` creates the new player with `volume = ducked ? DUCKED : …` (`ambience.js:34`). If the old description is still playing, the new loop starts ducked and stays ducked until that utterance ends. Finding 1 fixes this too.
   - Recommendation: add an ambience test: speak on the map, move node, then expect the new player at `AMBIENCE_VOLUME` and `Speech.stop` called.

6. **Gap: the companion briefing joins lines that are really in the companion's voice, and the tests do not pin the join.**
   - Evidence: `DialoguePanel.js:25-29`. The content (`it`/`es` `market_entrance_tutorial.yaml:17-19`, `cracked_fountain_letharger.yaml:17-19`, `the_rift_errata.yaml:21-23`) is all English with no objective answers, so there is no leak. One line says "my allowance", which is first person, read by the narrator voice. The schema allows 1 to 4 non-empty strings (`server/src/content-loader.js:81`) but does not require final punctuation, so a line without a full stop would run into the next one.
   - Recommendation: join with a space after making sure each line ends in punctuation, or pass a newline-joined string. Assert the exact joined string in the test. Optionally label the button "Hear the briefing" so the narrator voice does not pretend to be the companion.

7. **Gap: the test plan misses the existing suites that render `MapPanel` and the round 061 label.**
   - Evidence: `MapPanel` is rendered in `atmosphere.test.js`, `map-gate.test.js`, `theme.test.js`, `drill.test.js` and `party.test.js`. `jest.setup.js:2-6` mocks voices as `[]`, so the button stays hidden and every new map test needs its own `getAvailableVoicesAsync` mock. `narrator.test.js` finds the button by the name `'Hear the narrator'`.
   - Recommendation: the `NarratorButton` refactor must keep `label="Hear the narrator"` for `Narration`. Run the five map suites plus `narrator.test.js` unchanged. Give the map and companion buttons distinct accessible names so they can be told apart from per-turn narration buttons (the companion card and the narrations sit in the same `FlatList`, `DialoguePanel.js:62`).

**Optional**
- Read the location name before the description ("The Coffee Cart. A cart on three wheels…"), as a narrator would.
- The folded YAML description (`>`) ends in `\n`. Trim it before joining with the atmosphere line so the test's expected string is stable.
- Leaving the Review or Spellbook views still does not stop their word pronunciations. That is out of scope here, but worth a backlog line now that the map gets an unmount stop.
```
