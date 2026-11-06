# Round 062 plan v1: the narrator on the map and the companion card

Backlog: C10b (new), a follow-up to round 061 (a 🔊 per NPC narration). The owner's note wants everything spoken by a
narrator; the other English narrator texts on screen are the map card's location description (with the LLM
atmosphere line, round 053, when on) and the companion briefing at the top of an encounter. No live LLM calls;
app-only; the web client stays frozen.

## Design

1. **`NarratorButton`** (`mobile/src/components/NarratorButton.js`): `PronounceButton` with `language={NARRATOR}`,
   `hideWhenUnavailable`, a `label`, and nothing for blank text. `DialoguePanel`'s `Narration` (round 061) uses it.
2. **Map card.** Beside the location title, a "Hear the place" button reading the description, then the atmosphere
   line if shown for this location (one utterance, the two texts joined by a space).
3. **Companion card.** Beside "Your companion", a "Hear your companion" button reading the briefing lines joined.
   The briefing is authored English (content), and holds no answer (round 009 rules).
4. Same speech rules as round 061 (latest utterance restores the ambience; a chip cuts it). Leaving the map does not
   stop speech today (only the encounter screen calls `stopSpeech` on unmount); the map card calls `stopSpeech` on
   unmount too.

## Tests

- Map: the button reads description + atmosphere (one call); without atmosphere, the description only; no English
  voice, no button. Companion: reads the joined lines; no briefing, no card (unchanged).
- Leaving the map (unmount) stops speech.
- Full suites; expo-doctor; iOS export.

## Live

None.
