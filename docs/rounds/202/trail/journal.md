# Journal: round 202

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 22:32 approx. | 22:45:00 | round-opened | Owner | The narrator's voice on an iPhone is completely robotic; can it be better | `interview.md` |
| 2 | 22:34 approx. | 22:45:00 | finding | Claude | Looked up: Safari gives a page only Apple's basic voices; enhanced and premium voices downloaded in Settings do not reach it. Gemini has a text-to-speech model listed as free on the free tier | `../findings.md` |
| 3 | 22:36 approx. | 22:45:00 | decision | Owner | Gemini's voice on the server's existing key | `interview.md` |
| 4 | 22:38 approx. | 22:45:00 | decision | Claude | The server reads a narration with `gemini-3.8-flash-tts` (voice Charon) and sends a WAV; the page plays it and reads with the device's voice when there is none | `../architecture.md` |
| 5 | 22:44 approx. | 22:45:00 | run | Claude | Root `npm test` and the client build pass, with Google and the audio player faked; no call to Google was made (no key and no route to it from the session) | `../findings.md` |
| 6 | 22:45:00 | 22:45:00 | closed | Claude | Records, status addendum; pushed to the session branch, not to `main`: this round's message did not ask for a deploy | `../architecture.md` |
| 7 | 23:10 approx. | 23:10:00 | deployed | Claude | Merged to `main` with round 204 and pushed on the owner's word ("Then deploy") | `../architecture.md` |
