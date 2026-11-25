# Journal: round 184

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-25 22:35 approx. | 22:50:00 | round-opened | Owner | Music heard only after the microphone; narration's words spoken on a tap | `interview.md` |
| 2 | 22:40 approx. | 22:50:00 | decision | Claude | Cause: iOS treats Web Audio as "ambient", muted by the silent switch; recording switches the session to play-and-record. Fix: `navigator.audioSession.type = 'playback'` | `../architecture.md` |
| 3 | 22:42 approx. | 22:50:00 | decision | Claude | The narration's words are said by the browser's speech voice, not a model call (no latency, no cost, no preloading) | `../architecture.md` |
| 4 | 22:48 approx. | 22:50:00 | run | Claude | Client 328 pass (4 new); build passes; not heard on an iPhone | `../findings.md` |
| 5 | 22:50:00 | 22:50:00 | closed | Claude | Records, status addendum; on the branch, not merged | `../architecture.md` |
