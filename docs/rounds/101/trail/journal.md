# Journal: round 101

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-06 about 08:22:00 | 08:14:55 | round-opened | Claude (claude-opus-5-5), autonomous | Round 101 opened (iteration 29): round 044's open item 2, NPC-line hits on optional frame words and English forms counted apart from leaks | — |
| 2 | 08:14:55 | 08:14:55 | plan-drafted | Claude (claude-opus-5-5), autonomous | Plan v1: frame targets and English forms marked; a fifth kind `soft` | `plan-v1.md` |
| 3 | 08:14:55 | 08:14:55 | critique-dispatched | Claude (claude-opus-5-5), autonomous | A fresh general-purpose subagent, read-only, critiques plan-v1 (HEAD 215ee2c, working tree: docs/rounds/101/ new) | `plan-v1.md` |
| 4 | 08:15:07 | 08:15:07 | plan-revised | Claude (claude-opus-5-5), autonomous | Before dispatch: Decision 3's order sentence cleaned up (the draft held a self-correction); the critic reads this version, sha256 2b273e00… | `plan-v1.md` |
| 5 | about 08:27:00 | 08:17:40 | critique-returned | Claude (general-purpose subagent, claude-opus-5-5), read-only | 6 findings (2 Error: the English set hides real *basta* / *ciao* leaks; Mortimer's numbers are needed by the grammar constraint; 4 Gap) and 3 Optional | `critique-1.md` |
| 6 | 08:18:15 | 08:18:15 | disposition | Claude (claude-opus-5-5), autonomous | All 6 accepted; Optionals taken in part. Net change from v1: frame words listed by id (no Mortimer numbers), only *espresso* as English, `near` before `soft`, the old sum printed | `../architecture.md` |
| 7 | 08:18:15 | 08:18:15 | freeze | Claude (claude-opus-5-5), autonomous | Freeze commit: architecture.md pre-run sections, decisions row, index row | `../architecture.md` |
| 8 | about 08:30:00 | 08:20:56 | result | Claude (claude-opus-5-5), autonomous | Before: round 100's scan of 149 committed reports, copied (`scan-before.txt`); per-line kinds kept in /tmp for the diff. Occurred time approximate | `../results/scan-before.txt` |
| 9 | 08:20:56 | 08:20:56 | built | Claude (claude-opus-5-5), autonomous | Built: `FRAME_TARGETS`, `isFrame`, `NPC_ENGLISH_FORMS`, ids in `formsFor` and exact hits, `scanLine`'s `soft` option, the `soft` kind, the comparable print and eras; 4 new tests; 6 of 6 mutations fail a test; server 382/382, client 12/12, mobile 292/292 | `../architecture.md` |
| 10 | 08:20:56 | 08:20:56 | result | Claude (claude-opus-5-5), autonomous | After: 65 lines leak → soft, no other change; it leak 50 (+soft 48 = 98), es 12 (+soft 17 = 29); from round 051: it leak 6, es 0 | `../results/scan-after.txt` |
| 11 | 08:20:56 | 08:20:56 | outcome | Claude (claude-opus-5-5), autonomous | Question answered offline: no content change | `../findings.md` |
| 12 | 08:20:56 | 08:20:56 | closed | Claude (claude-opus-5-5), autonomous | Round 101 closed; status addendum and index row | `../architecture.md` |
