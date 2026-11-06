# Round 061 plan v1: hear the narrator

Backlog: new item C10, from the owner's note `parallang_obsidian/GAME MECHANICS.md` ("it is very important that
everything is spoken by a quirky narrator (or neutral one)") and prototype.md Phase 4 (TTS: "provider TTS for
narrator (if budget allows)"). Today the app speaks only target-language words (rounds 030, 055). No live LLM
calls; app-only; the web client stays frozen.

## Goal

Each NPC message's narration (English) can be heard on demand through the device's speech voice.

## Design

1. **Narrator voice.** A constant `NARRATOR = { tag: 'en-GB', name: 'English' }` in `mobile/src/speech.js`: a
   British voice first (the Pratchett register of the style guide), else any English voice (`findVoice` already
   falls back on the primary subtag).
2. **Button.** In `DialoguePanel`, the narrative row becomes the narrative text plus a `PronounceButton`
   (`text={message.narrative}`, `language={NARRATOR}`, `label="Hear the narrator"`, `hideWhenUnavailable`). No
   button when the narrative is empty.
3. **Behaviour** reuses `speak()`: a new utterance stops the previous one (a word or the narrator), the ambience
   is ducked, and leaving the screen stops speech (round 055).
4. **Not in this round:** reading every new narration automatically (needs a switch and a decision on timing with
   chip taps; owner question), narrator voice in the Spellbook or for fragments.

## Tests

- A narrative with an English voice available shows "Hear the narrator"; pressing it speaks the narrative with
  `language: 'en-GB'` and the voice's identifier. With only an en-US voice, that voice is used. With no English
  voice, no button. An empty narrative has no button.
- All mobile, server and client tests; expo-doctor; iOS export.

## Live

None.
