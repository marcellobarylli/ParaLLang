# Round 202 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message and choice; round 196 (the narrator reads aloud, in the device's voice),
  whose decision 1 this reverses for the narrator.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/narrator-voice.js` (new), `server/src/app.js` (`POST /api/narrate`, the health check),
  `server/server.js`; `client/src/api/narrate.js` (new), `client/src/speech.js`, `client/src/narratorVoice.js`;
  tests in `server/test/narrator-voice.test.js` (new) and `client/src/__tests__/speech.test.js`; `render.yaml`,
  `.env.example`.

## Decisions

1. **The narrator's voice is hosted.** `POST /api/narrate { text }` (behind the access code; at most 1500
   characters) asks Gemini's text-to-speech (`gemini-3.8-flash-tts`, the prebuilt voice Charon, with one line of
   direction: a warm, dry, unhurried storyteller who says foreign words as a native does) and answers with a WAV: the
   model's 16-bit PCM at 24 kHz with a header put on it. `NARRATOR_TTS_MODEL` and `NARRATOR_VOICE` change the model
   and the voice. The key is `GEMINI_API_KEY`, or a friend's own when they sent one.
2. **A clip is kept by its text**, on the server (120) and in the page (24): the written passages come round again.
3. **A narration is one clip.** Its parts are marked `told`; where the speaker has a hosted voice, a run of told
   parts is read as one clip, the words of the language in it included (round 196 switched to the language's device
   voice for each word). The character's line follows in the device's voice when the clip ends. A stop drops a clip
   still on its way.
4. **The device's voice is the fallback**, per narration: no clip within 12 seconds, a clip that will not play, or
   none from the server. When the server says it has no voice the page does not ask again that visit; when the voice
   is busy or its allowance is spent, not for five minutes.
5. **iOS:** the page's one audio player plays a silent sample inside the first tap, so later clips may play on
   their own.
6. **The health check** (`GET /api/health`) says under `narrator` whether the server has a key for it, the model and
   voice, and how its last call went (`ok`, or `failed (status: Google's reason)`).
7. **Unchanged:** the characters' lines are the device's voices; "Narrator reads aloud" and the Voice volume apply.

## Tests

Root `npm test`; `npm run build -w client`. Google and the browser's audio player are faked in all of them.

## Status

Built and tested with fakes. **No call to Google was made and nothing was heard**: the session has no Gemini key
and cannot reach Google's API or its documentation. On the session branch `claude/hopeful-babbage-aq05na`; not merged to `main` or deployed: the owner asked for the
voice, not yet for its deploy. The first real call will be the owner's first narration after it.
