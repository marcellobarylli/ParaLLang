# Round 207 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; round 206 (the notes above a marked transcript), whose decision 2 this
  replaces.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/narrator-voice.js` (`NARRATOR_STYLE`, `NARRATOR_VOICE`); `render.yaml` and
  `.env.example` (the default voice named).

## Decisions

1. **As silly as possible.** The notes ask for a giddy, doddering, wildly theatrical old buffoon: squeaky highs and
   booming lows, a voice cracking with excitement, gasps, giggles and snorts, overblown drama on small things,
   mock-sinister whispers bursting into shouts, lurching pace with absurdly long pauses. Foreign words still said as a
   native speaker says them; only the transcript is spoken.
2. **The voice is Puck** (Google's "upbeat"), in place of Charon. `NARRATOR_VOICE` still overrides it.

## Tests

`npm test -w server` (618).

## Status

Built and tested with Google faked; nothing was heard. Merged to `main` and pushed; Render deploys the server from
`main`.
