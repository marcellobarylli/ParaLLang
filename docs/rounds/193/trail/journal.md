# Journal: round 193

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 21:15 approx. | 21:11:51 | round-opened | Owner | The ground just below the player warps as the camera moves; play-test, fix and deploy | `interview.md` |
| 2 | 21:18 approx. | 21:11:51 | run | Claude | A glide played in Chromium, four frames 0.25 s apart: the near ground smears into diagonal streaks that move between frames | `before.png` |
| 3 | 21:20 approx. | 21:11:51 | finding | Claude | The PS1 shader's affine texture mapping on the 6 m ground quads under the camera | `../findings.md` |
| 4 | 21:22 approx. | 21:11:51 | decision | Claude | Perspective-correct mapping near the camera, fading to affine between 5 and 16 m | `../architecture.md` |
| 5 | 21:24 approx. | 21:11:51 | run | Claude | The same glide again: the streaks are gone; aesthetic 95, client 336 pass, build passes | `after.png` |
| 6 | 21:11:51 | 21:11:51 | closed | Claude | Records, status addendum; merged to `main` and pushed on the owner's word ("fix it and deploy") | `../architecture.md` |
