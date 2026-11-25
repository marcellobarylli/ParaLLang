# Round 184 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; WebKit bugs 237322, 251532 and 252746 (Web Audio is "ambient" on iOS and
  the silent switch mutes it; `navigator.audioSession.type = 'playback'` stops that); MDN, AudioSession `type`.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/audioSession.js` (new), `client/src/ambience.js`, `client/src/titleMusic.js`,
  `client/src/speech.js`, `client/src/components/DungeonScreen.jsx`, `client/src/components/DialoguePanel.jsx`,
  `client/src/components/NarrativeText.jsx`, and their tests.

## Decisions

1. **Why the music waited for the microphone.** iOS Safari plays Web Audio in an "ambient" audio session, which the
   ringer's silent switch mutes. The title track is an audio element, which the switch does not mute, so the title
   was heard; the generated chords that follow it were not. Recording moves the page to "play-and-record", which the
   switch does not mute either, so the chords were heard after the first use of the microphone.
2. **The fix.** The ambience and the title music set `navigator.audioSession.type` to `'playback'` (Safari 16.4 and
   later; other browsers are left alone). The listener sets `'play-and-record'` while it listens and puts the type
   back after. Every touch or key (not only the first click) reaches the ambience: the first starts it, later ones
   wake a context iOS suspended or interrupted (`resume()`).
3. **The narration's words.** A tap on a yellow word that shows its meaning also says the word, in the language's
   plain voice of the browser's speech (the voice the characters already use), when Character voices is on. The
   tap that hides the meaning is silent.
4. **Not built: a model call per word.** A text-to-speech API call adds a round trip (a few hundred ms) and a cost per
   tap, and preloading every word's sound adds the upfront loading the owner wants to avoid. The browser's voice
   answers at once, offline, for nothing. A cloud voice with a cache remains possible if the browser's Italian voice
   is found too poor.

## Tests

`npm exec --workspace client -- vitest run` (328; 4 new). `npm run build -w client` passes.

## Status

Built and tested with fakes, on `claude/loving-lamport-s6pjlu`; not merged, not deployed, not heard on an iPhone.
