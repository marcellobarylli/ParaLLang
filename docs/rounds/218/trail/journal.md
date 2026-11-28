# Journal: round 218

Append only. Times are UTC.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-28 | 12:00 | round-opened | Owner | The title's radio; review the last commits; the A1 to A2 gate shows nothing; the gate in Angkor Wat; no narration over the world event; deploy | `interview.md` |
| 2 | 2026-11-28 | 12:20 | run | Claude | The gate played in headless Chromium (developer's jump, then the full path through the gate's three conversations with the breathing on): it works there; the faint green the owner saw is the level's backdrop, shown when the level's code or its WebGL start fails | `../findings.md` |
| 3 | 2026-11-28 | 12:30 | decision | Owner | Asked: the gate that changes the level is to be in Angkor Wat; the blank screen was the green backdrop | `interview.md` |
| 4 | 2026-11-28 | 12:40 | decision | Claude | Both gates that end a level (A1 to A2, A2 to B1) stand in Angkor Wat; the other gates keep their turn. Angkor Wat is opened by the gates only, not the world map | `../architecture.md` |
| 5 | 2026-11-28 | 13:05 | review | Claude | A subagent reviewed rounds 214 to 217: five faults (the share reset on a reload, a level moving another slot's share, the level question lost on a reload before setting out, the breathing not ending when switched off, the language choice dropping the level); all fixed | `../findings.md` |
| 6 | 2026-11-28 | 13:30 | run | Claude | Server 632, client 391, aesthetic 96, mobile 320 pass; gate-check and pull-check 0 problems; the title, and a missing level chunk, seen in Chromium | `../findings.md` |
| 7 | 2026-11-28 | 13:40 | closed | Claude | Merged to `main` and pushed on the owner's word ("then deploy") | `../architecture.md` |
| 8 | 2026-11-28 | 13:50 | decision | Owner | Angkor Wat is reused for every change of level: A2 to B1 and any later one. The rule already does so (`endsLevel`: the next unit's level is another); no code changed | `../architecture.md` |
