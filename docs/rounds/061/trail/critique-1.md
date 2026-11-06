# Critique 1: hear the narrator

- **Dispatched:** 2026-11-06 00:25:46 UTC
- **Returned:** 2026-11-06 00:27:30 UTC (recorded on return; the subagent ran 84 s)
- **Model:** a Claude general-purpose subagent (claude-opus-5-5), standing in for Codex (Codex at its usage limit
  until 01:36 UTC); read-only by instruction; agent id a38e86716f6a79ef9
- **Prompt:** adversarial review of `plan-v1.md` against speech.js, PronounceButton.js, DialoguePanel.js,
  BilingualText.js, ambience.js and the mobile tests; whether narration can leak or be empty; accessibility, iOS
  voice language strings, English voices reading target words, the "unavailable" names; numbered findings typed
  Error / Risk / Gap with evidence and a recommendation, then Optional items.
- **Reviewed input:** `plan-v1.md`, sha256 bf9c5e3c…, HEAD 925f4ce, working tree docs/rounds/061/ only
- **Findings:** 8

## Raw output (verbatim)

```text
I found 8 issues in plan v1. The blocking one is a concrete break: one existing jest test will fail once the narrator button is added. I ran nothing; everything below comes from reading the code.

1. **Error: an existing test breaks because the narrator adds a second voice lookup.** In `mobile/src/__tests__/encounter-words.test.js:40`, the first test expects exactly one `getAvailableVoicesAsync` call. Its fixture has a non-empty narrative (`'Gerald polishes a cup.'`, :13). With the plan, the narrator's `PronounceButton` calls `voiceFor('en-GB')`, which is a separate cache key (`speech.js:18-24`). That makes a second native call even though the narrator ends up hidden (the mock only has `alice`). Recommendation: either change the test and say so in the plan, or (better) cache the voice *list* once and pick the voice per tag from it, so N tags still cost one native call. The plan's Tests section should name every existing test it changes.

2. **Risk: the narrative text may squeeze or overflow its row.** The plan turns the narrative into "text plus a `PronounceButton`" (plan Design 2). Today it is a bare `<Text>` in a column (`DialoguePanel.js:68,102`). In an RN `flexDirection: 'row'`, a long Text without `flex: 1`/`flexShrink: 1` runs off-screen or squeezes the button, and larger Dynamic Type sizes make it worse. Recommendation: state the layout (`row`, `alignItems: 'flex-start'`, text `flex: 1`, button not shrinking), or put the button on its own line under the narrative. Since the Simulator isn't available here, list the visual check as an open item for the owner.

3. **Gap: "No button when the narrative is empty" is not defined for missing or whitespace values.** The schema requires `min(1)` (`server/src/llm/schemas.js:11`), but `serializeEncounter` passes `message.narrative` through unchecked (`learning-service.js:345`). Older stored transcripts and test fixtures use `''` (`word-class-cards.test.js:89`, `server/test/word-spans.test.js:16`). If `undefined` reaches `speak()`, it becomes `Speech.speak(undefined, …)` (`speech.js:39`). Recommendation: gate on `typeof narrative === 'string' && narrative.trim()`. Add tests for `undefined` and `'  '`, and render nothing at all in those cases (the italic Text is also empty today).

4. **Risk: an English voice will mispronounce target-language words in the narration.** The rules say narration is English (`content/narration/style_guide.yaml:7`, `prompts/system/base.txt:7`), but the content only bans answer words "in dialogue or narration" (e.g. `content/languages/it/encounters/flick_lotus.yaml:20`). That implies other target words can appear in narration, and LLM narration often quotes the NPC ("Gerald mutters 'buongiorno'"). Errata's corrupted English (`çùršęd`, `ŧhe`, `content/characters/enemies/rift_errata.yaml:10`) and the Rift lore ("the narrative starts to mix both languages", :3) will be read as gibberish. Recommendation: record this as a known limitation (a wrong-pronunciation risk, not a leak) in the plan and decisions row. Optionally add a style-guide rule against quoting target words in narration. Don't try splitting the text by language this round.

5. **Risk: the English fallback can land on an iOS novelty voice or a poor-quality voice.** `findVoice` takes the first voice whose primary subtag matches and ignores `quality` (`speech.js:11-12`). On iOS, `getAvailableVoicesAsync` also returns the en-US novelty voices (Albert, Bad News, Bubbles, Zarvox, …). The plan's "only an en-US voice" case would accept whichever comes first. The language string is BCP 47 (`en-GB`) on iOS. Android can differ, and `findVoice`'s exact-match step compares raw strings, so `en_GB` would miss and fall back to `matches[0]`. Recommendation: normalise `_` to `-` before the exact match, and prefer the Enhanced/Premium voice among the matches. For the narrator, exclude `com.apple.speech.synthesis.voice.*` and `com.apple.eloquence.*` identifiers, or prefer `com.apple.voice.*` / `com.apple.ttsbundle.*`. Add a test with a novelty voice listed first.

6. **Gap: every narrator button has the same accessible name.** Every NPC message gets "Hear the narrator" (`PronounceButton.js:21` uses `label` as given). In a long transcript, VoiceOver's rotor shows many identical buttons, and `getByRole(..., { name: 'Hear the narrator' })` throws once there are two messages. VoiceOver already reads the narrative, so the button is for sighted players and the name is fine as is. Recommendation: accept the name but write tests with `getAllByRole` or a single-message fixture. Also check that the 🔊 glyph's Text is hidden from accessibility, as with the existing buttons.

7. **Risk: the unavailable label and the `name` fallback would be wrong for English.** If the narrator button were ever rendered without `hideWhenUnavailable`, it would say "English pronunciation unavailable" (`PronounceButton.js:21`), and "pronunciation" is the wrong word for narration. With `hideWhenUnavailable` it is never shown, so this is latent. Recommendation: keep `hideWhenUnavailable` mandatory for the narrator. Optionally let `PronounceButton` take an `unavailableLabel`, or give `NARRATOR` the name "the narrator", so that reuse in the Spellbook later (plan Design 4) doesn't produce "English pronunciation unavailable" or "Hear … in English".

8. **Gap: the interplay between narration and chip taps is untested.** `speak()` stops the previous utterance (`speech.js:33-39`). If a player starts a narration and then taps a word chip, the narration is cut off. If they tap the narrator again it restarts (there's no pause, resume or toggle), and nothing shows that it is speaking. That is acceptable, but the plan only says "a new utterance stops the previous one". Recommendation: add one test where the narrator is pressed, then a chip, then the narrator's late `onStopped` fires. The ambience must stay ducked until the latest utterance ends, reusing the generation guard. State that pressing the button again restarts rather than toggles.

On leaks: I see no new leak. The narrative goes out unredacted even on the protected line (`learning-service.js:345`) and is already shown on screen and read by VoiceOver, so hearing it reveals nothing new. Any leak inside a narrative is a content or prompt problem that exists today.

**Optional**
- Name the open questions for `docs/autonomy/decisions.md`: the voice choice (en-GB first), and leaving out auto-read, a narrator "quirk" (rate/pitch) and long-text handling.
- Consider a slightly slower or lower `rate`/`pitch` for the narrator so it sounds different from the NPC words.
- Android `Speech.maxSpeechInputLength` (about 4000 characters) is not an issue for current narratives, but a guard costs nothing.
- Simulator checks to list for the owner: which en-GB voice iOS actually returns (Daniel), the row layout at large Dynamic Type sizes, the ambience ducking during a long narration, and VoiceOver speech overlapping the TTS when the button is activated.
```
