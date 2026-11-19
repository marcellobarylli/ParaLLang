# Journal: round 132

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-19 21:30 approx. | 21:30:06 | round-opened | Owner | Settings does not scroll; the pinned objective card leaves a thin wedge of text; the box should follow the opening line and fold into a bar when scrolled past; the panel should drag from the whole screen down to nothing | `interview.md` |
| 2 | 21:30:06 | 21:30:06 | plan-drafted | Claude | architecture.md pre-run sections: Settings scrolls inside; one objective box after the opening line with a folding bar when it is out of view; a handle that drags the panel between the top bar and nothing. No Codex critique (the cloud session has no Codex) | `../architecture.md` |
| 3 | 21:30:07 | 21:30:07 | freeze | Claude | Pre-run record committed on `claude/inspiring-hypatia-xoybb3` with `[skip ci] [skip render]` | `../architecture.md` |
| 4 | 21:30:07 to 21:39:43 | 21:39:43 | run | Claude | Cloud session container. Client suite 209 passing, build succeeds. `client/scripts/layout-check.mjs` in headless Chromium at 393×852 with touch: 23 checks, 0 problems, after two failing runs in which the bar did not come | `../shots/05-bar-unfolded.jpg` |
| 5 | 21:30:07 to 21:39:43 | 21:39:43 | amended | Claude | The observer of crossings missed the jump to the end of the text after a turn; the box is measured on scroll and on every change instead | `../architecture.md` |
| 6 | 21:39:43 | 21:39:43 | built | Claude | `round 132: Settings scrolls; the objective box follows the opening line and folds into a bar when scrolled past; the conversation panel drags from the top bar down to its grip` committed as `16ec3f9` | `../../../../client/src/components/DialoguePanel.jsx`, `../../../../client/src/components/SheetHandle.jsx`, `../../../../client/src/index.css` |
| 7 | 21:39:43 | 21:39:43 | outcome | Claude | findings.md and Outcome written | `../findings.md` |
| 8 | 21:39:43 | 21:39:43 | closed | Claude | Status addendum and index row; merged to `main` with `[skip render]` | `../architecture.md` |
