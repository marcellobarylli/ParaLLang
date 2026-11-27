# Round 196 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 126 (character voices), round 130 (narration with target-language
  words), round 156 (the narrator's passages), round 166 (the passage stays until the character is ready).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/speech.js`, `client/src/narratorVoice.js` (new), `client/src/components/DungeonScreen.jsx`,
  `client/src/components/Road.jsx`, `client/src/components/SettingsSheet.jsx`, `client/src/display.js`,
  `client/src/stores/gameStore.js`, `server/src/road/characters.js`, `server/src/content-loader.js`,
  `client/scripts/narrator-voice-check.mjs` (new); tests in `client/src/__tests__/speech.test.js`,
  `client/src/components/__tests__/camera-wiring.test.jsx`, `server/test/road.test.js`.

## Decisions

1. **The browser's own speech synthesis, for the narrator too.** It is free, runs on the device and needs no key or
   server call; the characters already use it. A hosted voice (a paid text-to-speech API) would sound more like an
   actor but costs per character read and needs a key on the server; not built.
2. **The narrator's voice** (`NARRATOR`): English, British first (Daniel, Arthur, Oliver, Google UK English Male, …,
   then any English voice), pitch 0.9 and rate 0.88. It reads the English of the narration; the target-language words
   in it (a line's `narrativeWords`, a passage's `truth` segments) are said in the language's plain voice.
3. **What it reads:** the italic narrative before each character line, then the line; and the travel passage on the
   road and in the dungeons, once when it is shown. A line that arrives while the passage is still being read waits
   for it; otherwise a new line stops what was being read, as before.
4. **The voice space.** A road character's `voice` gains `pick` (0 to 1): which of the device's voices of the
   language, taken in name order. Pitch is drawn from 0.55 to 1.65 (was 0.8 to 1.3) and rate from 0.82 to 1.22 (was
   0.9 to 1.1), each on its own (`VOICE_SPACE`). `kind` stays, for a client without `pick`; authored characters are
   unchanged.
5. **"Narrator reads aloud"** in Settings' Audio, on by default, under Character voices (it needs them on).

## Tests

`npm exec --workspace client -- vitest run` (341; 4 new), `npm test -w server` (615; 1 new), client build,
`node client/scripts/narrator-voice-check.mjs <outDir>`.

## Status

Built, tested in Node and in headless Chromium with a fake speech engine; not heard on a phone. Merged to `main` and
pushed on the owner's word; GitHub Pages deploys the page and Render the server from `main`.
