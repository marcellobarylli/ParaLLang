# Journal: round 129

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-19 16:59 approx. | 16:59:11 | round-opened | Owner | A strict refusal of "Bungiorno! Me chiamo Luigione. Come te chiame?" with no correction; beginner mode: recognise the attempt, correct it, one heart a response at most, move on, an optional try at the correction | `interview.md` |
| 2 | 16:59:11 | 16:59:11 | plan-drafted | Claude | architecture.md pre-run sections: a beginner grading prompt with `attempted` and `correction`; three hearts a conversation; a practice box checked in the app. No Codex critique (the cloud session has no Codex) | `../architecture.md` |
| 3 | 16:59:11 | 16:59:11 | freeze | Claude | Pre-run record committed on `claude/inspiring-hypatia-xoybb3` with `[skip ci] [skip render]` | `../architecture.md` |
| 4 | 17:00 to 17:05 | 17:05:43 | run | Claude | Cloud session container. Server suite 452 passing, client 193, build succeeds. `client/scripts/beginner-check.mjs` in headless Chromium at 390×844 with a scripted grader: 10 checks, 0 problems. The first picture showed the correction card running off the right edge; the card's column is now bounded | `../shots/03-practice.jpg` |
| 5 | 17:05:07 | 17:05:43 | built | Claude | `round 129: beginner mode, a mistake is understood, corrected for one heart and the player moves on; a practice box checked in the app` committed as `2363b42` | `../../../../prompts/language/grading_beginner.txt`, `../../../../server/src/learning-service.js`, `../../../../client/src/components/CorrectionCard.jsx` |
| 6 | 17:05:43 | 17:05:43 | outcome | Claude | findings.md and Outcome written | `../findings.md` |
| 7 | 17:05:43 | 17:05:43 | closed | Claude | Status addendum and index row; merged to `main`, server included | `../architecture.md` |
| 8 | 2026-11-19 17:20 approx. | 17:20:51 | amended | Owner | After playing: English must be usable, alone or mixed, and corrected like a mistake. The beginner prompt counts an English answer as an attempt and translates it in the correction; the narrator is told not to remark on the language; the microphone gets a switch between the target language and English. Server 453 and client 194 passing | `../architecture.md` |
