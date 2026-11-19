# Journal: round 126

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-19 15:35 approx. | 15:37:06 | round-opened | Owner | Characters voiced by type, the player's voice recognised as text, the cheapest and easiest way; Sonnet as the default model; what a turn spends its time on | `interview.md` |
| 2 | 15:37:06 | 15:37:06 | plan-drafted | Claude | architecture.md pre-run sections: the browser's speech synthesis and recognition in the web dungeon; a `voice` on each character sheet; `claude-cli` defaults to `sonnet`. No Codex critique (the cloud session has no Codex) | `../architecture.md` |
| 3 | 15:37:06 | 15:37:06 | freeze | Claude | Pre-run record committed on `claude/inspiring-hypatia-xoybb3` with `[skip ci] [skip render]` | `../architecture.md` |
| 4 | 15:38:00 to 15:43:40 approx. | 15:44:33 | run | Claude | Cloud session container. Server suite 438 passing, client 172, build succeeds. `client/scripts/voice-check.mjs` in headless Chromium at 390×844 against the real server code with the fixture provider: 14 checks, 0 problems. Mobile suite and `dungeon-shots.mjs` not run | `../shots/01-conversation.jpg` |
| 5 | 15:43:48 | 15:44:33 | built | Claude | `round 126: character voices by type and a spoken answer in the web dungeon (the browser's own speech); the Claude CLI defaults to Sonnet` committed on `claude/inspiring-hypatia-xoybb3` as `c9a2ce7` | `../../../../client/src/speech.js`, `../../../../client/src/components/InputBar.jsx`, `../../../../server/src/config.js` |
| 6 | 15:44:33 | 15:44:33 | outcome | Claude | findings.md and Outcome written | `../findings.md` |
| 7 | 15:44:33 | 15:44:33 | closed | Claude | Status addendum and index row; not merged to `main`, not deployed | `../architecture.md` |
