# Round 209 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's messages in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's messages; round 208 (the voice picked in Settings).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/narrator-voice.js`, `client/src/display.js`; tests; `render.yaml`, `.env.example`.

## Decisions

1. **Algenib is the default** narrator voice, on the server (`NARRATOR_VOICE`) and in the page.
2. **Three female voices** join the menu: Sulafat, Vindemiatrix and Aoede.
3. **The notes follow the voice:** for a female voice the storyteller is "she", with a grandmotherly wobble; for the
   others "he", grandfatherly (`narratorStyleFor`).

## Tests

`npm test -w server` (620); `npm exec --workspace client -- vitest run` (351); `npm run build -w client`.

## Status

Built and tested with Google faked; not heard. Merged to `main` and pushed on the owner's word; GitHub Pages deploys
the page and Render the server from `main`.
