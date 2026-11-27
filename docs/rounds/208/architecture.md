# Round 208 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's messages in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's messages; round 206 (the notes above a marked transcript), round 207 (reversed).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/narrator-voice.js`, `server/src/app.js`; `client/src/display.js`,
  `client/src/stores/gameStore.js`, `client/src/components/SettingsSheet.jsx`, `client/src/components/DungeonScreen.jsx`,
  `client/src/api/narrate.js`, `client/src/index.css`; tests; `render.yaml`, `.env.example`.

## Decisions

1. **Round 206's narrator again:** the old, slightly silly, whimsical, charming storyteller. Round 207's
   unrestrained notes and the voice Puck are gone.
2. **"Narrator's voice" in Settings** (Audio, under "Narrator reads aloud"): Charon (the default), Gacrux or
   Algenib. It is stored with the display preferences (`narratorVoice`).
3. **The page sends the voice** with the text to `POST /api/narrate`, and keeps clips by voice and text. The server
   takes only the listed names (`NARRATOR_VOICES`); any other is its default voice (`NARRATOR_VOICE`, Charon, or the
   environment's), and it keeps clips by voice.

## Tests

`npm test -w server` (619); `npm exec --workspace client -- vitest run` (351); `npm run build -w client`.

## Status

Built and tested with Google faked; not heard, and the picker not seen in a browser. Merged to `main` and pushed;
GitHub Pages deploys the page and Render the server from `main`.
