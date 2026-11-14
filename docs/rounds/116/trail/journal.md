# Journal: round 116

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-14 unknown | 23:06:40 | round-opened | Owner | Replied to round 115's report: decide the open questions yourself, and make sure the gameplay integrates with the camera transitions | `interview.md` |
| 2 | 23:06:40 | 23:06:40 | plan-drafted | Claude (claude-fable-5-2) | architecture.md pre-run sections; no Codex critique of the plan (the owner asked for no questions tonight) | `../architecture.md` |
| 3 | 23:06:40 | 23:06:40 | freeze | Claude (claude-fable-5-2) | Pre-run record committed on branch `round-115-dungeon` | `../architecture.md` |
| 4 | 23:12:16 | 23:15:44 | run | Claude (claude-fable-5-2) | Slurm job 5400 (CPU, node dada): build and playthrough with the new coupling assertions, 0 problems at both sizes. Its pictures showed the last site's onward look meeting the inner gate's wall, and the objective card's two lines run together | — |
| 5 | 23:15:44 | 23:15:44 | result | Claude (claude-fable-5-2) | Changed after job 5400: at the last site the camera turns to the sanctuary at eye level, through the inner gate's door, not up at the tower; the objective card's lines are blocks | `../../../../client/src/scene/director.js` |
| 6 | 23:15:20 | 23:15:44 | run | Claude (claude-fable-5-2) | Slurm job 5402 (CPU, dada): root `npm test` passes (server 418, client 69, aesthetic 20, mobile 320). Job 5401 (CPU, dada): build (app 230 kB, level chunk 626 kB) and playthrough with coupling assertions, 75 s per size, 0 problems | `../shots/3-resolved-desktop.jpg` |
| 7 | 23:15:44 | 23:15:44 | built | Claude (claude-fable-5-2) | `round 116: the conversation moves the camera (a step in per closed objective, a beat per verdict, a turn to the way on at a resolve); wiring test and playthrough assertions` | `../../../../client/src/scene/director.js`, `../../../../client/src/components/__tests__/camera-wiring.test.jsx`, `../../../../client/scripts/dungeon-shots.mjs` |
