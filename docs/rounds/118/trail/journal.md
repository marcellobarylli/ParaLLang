# Journal: round 118

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-15 08:20 approx. | 08:21:43 | round-opened | Owner | Screenshot of build 7eeadfd in the installed page: the bottom is cut where the strip was. Asked how to reload from the page itself | `interview.md` |
| 2 | 08:21:43 | 08:21:43 | plan-drafted | Claude (claude-fable-5-2) | architecture.md pre-run sections: round 117's fix clipped; a taller document with the content held inside the layout area; a build line and a reload in Settings. No Codex critique (a live regression) | `../architecture.md` |
| 3 | 08:21:43 | 08:21:43 | freeze | Claude (claude-fable-5-2) | Pre-run record committed on `main`, with `[skip ci] [skip render]` | `../architecture.md` |
| 4 | 08:26:35 | 08:31:44 | run | Claude (claude-fable-5-2) | Slurm job 5411 (CPU, dada): build and playthrough with the installed rules and a gap of 62 px, 77 s per size, 0 problems. Job 5412 (CPU, dada): root `npm test` passes (server 418, client 85, aesthetic 20, mobile 320) | `../shots/settings-phone.jpg` |
| 5 | 08:27:22 | 08:31:44 | built | Claude (claude-fable-5-2) | `round 118: the installed page cuts nothing; the build and a reload in Settings` pushed to `main` with `[skip render]` | `../../../../client/src/viewport.js`, `../../../../client/src/index.css`, `../../../../client/src/components/SettingsSheet.jsx` |
| 6 | 08:29:16 | 08:31:44 | result | Claude (claude-fable-5-2) | Pages run 43694594110 succeeded at 08:29:02; `version.json` reads 0.1.0+mwhkp1a3; the live stylesheet holds the new rules; Render still at d01c8a0, health 200. CI run 43694594256 failed in `npm test`; its log is not readable without a GitHub login | — |
| 7 | 08:30:47 | 08:31:44 | run | Claude (claude-fable-5-2) | Slurm job 5413 (CPU, dada): root `npm test` under Node 22.23.5 with `CI=true` passes, so the CI failure is not reproduced | — |
| 8 | 08:31:44 | 08:31:44 | outcome | Claude (claude-fable-5-2) | findings.md and Outcome written | `../findings.md` |
| 9 | 08:31:44 | 08:31:44 | closed | Claude (claude-fable-5-2) | Status addendum and index row; handoff corrected for the installed page. Pushed with CI on, as a second run | `../architecture.md` |
