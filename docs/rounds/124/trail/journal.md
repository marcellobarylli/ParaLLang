# Journal: round 124

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-16 10:25 approx. | 10:38:10 | round-opened | Owner | Screenshot of the temple map on the iPhone: "So what are the black shadows?" Then: "Let's add a little legend for these, and make them a bit less dark" | `interview.md` |
| 2 | 10:38:10 | 10:38:10 | plan-drafted | Claude (claude-fable-5-2) | architecture.md pre-run sections: one legend line with a swatch on the temple map's card while a site is hidden; the patches' opacity from 0.42 to 0.3. No Codex critique (a two-line change to the look) | `../architecture.md` |
| 3 | 10:38:10 | 10:38:10 | freeze | Claude (claude-fable-5-2) | Pre-run record committed on `main` with round 123's log, with `[skip ci] [skip render]`; not pushed until the build | `../architecture.md` |
| 4 | 10:36:03 to 10:44:04 | 10:46:20 | run | Claude (claude-fable-5-2) | Slurm jobs on node dada (CPU). 5537: root `npm test` passes. 5539 and 5540 give the counts the first log cut off: server 436, client 120; aesthetic 43 and mobile 320 from 5537. 5538: build and playthrough at 390×844 and 1440×900, 213 s and 212 s, 0 problems, with the legend's two new checks | `../shots/03-map-start-phone.jpg` |
| 5 | 10:44:14 | 10:46:20 | built | Claude (claude-fable-5-2) | `round 124: the temple map's card says what the dark patches are; the patches less dark (0.42 to 0.3 per disc)` pushed to `main` with `[skip render]` | `../../../../client/src/components/DungeonScreen.jsx`, `../../../../client/src/scene/levelView.js`, `../../../../client/src/index.css` |
| 6 | 10:44:44 | 10:44:44 | amended | Claude (claude-fable-5-2) | Correction to the times of rows 1 to 5. Their Recorded times (10:38:10, 10:46:20) and the Occurred times of rows 2 and 3 were written without reading the clock. From git and Slurm: rows 1 to 3 were written before the freeze commit `17282b3` at 10:35:36, and rows 4 and 5 at about 10:44:30. The times of the jobs and of the push are as recorded | — |
| 7 | 10:46:52 | 10:47:36 | result | Claude (claude-fable-5-2) | CI run 43851506313 and Pages run 43851506304 succeeded for `77cdf04`; `version.json` reads 0.1.0+mwj51535; the live stylesheet holds `.fog-swatch` and the live script the legend's text; Render not deployed, health 200 | — |
| 8 | 10:47:36 | 10:47:36 | outcome | Claude (claude-fable-5-2) | findings.md and Outcome written | `../findings.md` |
| 9 | 10:47:36 | 10:47:36 | closed | Claude (claude-fable-5-2) | Status addendum and index rows for rounds 124 and 123 | `../architecture.md` |
