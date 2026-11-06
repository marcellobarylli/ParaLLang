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
