# Journal: round 194

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-27 21:35 approx. | 21:20:21 | round-opened | Owner | Tilt to look does nothing in conversations on the road; fix and deploy | `interview.md` |
| 2 | 21:37 approx. | 21:20:21 | finding | Claude | Only the dungeon's view (DungeonView, levelView, director) reads the tilt; the road's view never did | `../findings.md` |
| 3 | 21:45 approx. | 21:20:21 | decision | Claude | The road's director turns its line of sight at a hold, as the dungeon's does; RoadView listens to the phone's orientation when the setting is on | `../architecture.md` |
| 4 | 21:50 approx. | 21:20:21 | run | Claude | Client 337 pass (1 new), build passes; in Chromium a fake tilt of 0.2 rad turns the conversation view by 0.18 rad | `../findings.md` |
| 5 | 21:20:21 | 21:20:21 | closed | Claude | Records, status addendum; merged to `main` and pushed on the owner's word ("deploy fixed") | `../architecture.md` |
