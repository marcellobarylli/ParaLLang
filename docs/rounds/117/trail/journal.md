# Journal: round 117

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-15 unknown | 07:56:16 | round-opened | Owner | First run on the phone against the live server works after entering the token; "The only fix needed is the bottom band" | `interview.md` |
| 2 | 07:56:16 | 07:56:16 | plan-drafted | Claude (claude-fable-5-2) | architecture.md pre-run sections: the strip is the iOS home-screen layout bug; the shell takes `100vh` when installed. No Codex critique (a two-rule fix) | `../architecture.md` |
| 3 | 07:56:16 | 07:56:16 | freeze | Claude (claude-fable-5-2) | Pre-run record committed on `main`, with `[skip ci] [skip render]` | `../architecture.md` |
| 4 | 07:57:21 | 08:08:04 | run | Claude (claude-fable-5-2) | Slurm jobs 5407 (root `npm test`: server 418, client 70, aesthetic 20, mobile 320, all passing) and 5408 (build and playthrough, 75 s per size, 0 problems; the installed rule applied without its condition fills the window). Jobs 5404 to 5406 were the same with a wrong filter, a wrong call and two failed attempts to emulate `display-mode` | — |
| 5 | 08:04:38 | 08:08:04 | built | Claude (claude-fable-5-2) | `round 117: the installed page fills the screen on iOS` pushed to `main` with `[skip render]` | `../../../../client/src/index.css`, `../../../../client/src/components/DungeonScreen.jsx` |
| 6 | 08:06:08 | 08:08:04 | result | Claude (claude-fable-5-2) | Pages run 43692812152 succeeded at 08:05:57; `version.json` reads 0.1.0+mwhjvclm; Render shows no new deployment (still d01c8a0) and health 200 | — |
| 7 | 08:06 approx. | 08:08:04 | answer | Owner | Asked for a translucency slider in Settings (Q1), then for grey panels with hard corners in a PS1 menu look (Q2) | `interview.md` |
| 8 | 08:08:04 | 08:08:04 | amended | Claude (claude-fable-5-2) | Two Amendments: the browser check without emulation; the opacity slider and the PS1 look | `../architecture.md` |
