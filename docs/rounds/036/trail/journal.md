# Journal: round 036

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 19:36:19 | 19:36:33 | round-opened | Claude (claude-opus-5-5), autonomous | Round 036 opened: a source line on each Journey fragment in the Spellbook (round 033 open item, critique 1.6); Codex at its usage limit until about 20:35 UTC | — |
| 2 | 19:36:19 | 19:36:33 | plan-drafted | Claude (claude-opus-5-5), autonomous | plan-v1 | `plan-v1.md` |
| 3 | unknown | 19:36:33 | critique-dispatched | Claude (claude-opus-5-5), autonomous | plan-v1, sha256 eb9ffcb7…, HEAD 51534f5, tree clean but docs/rounds/036/; to a fresh Claude subagent (general-purpose, claude-opus-5-5, read-only, repo access), dispatched between 19:36:19 and this row (autonomous decision, pending owner review) | `plan-v1.md` |
| 4 | unknown | 19:38:14 | critique-returned | Claude subagent (claude-opus-5-5), read-only | 7 items (2 Risks, 1 Suggestion, 4 checks); returned after the draft's first test run | `critique-1.md` |
| 5 | 19:38:14 | 19:38:14 | disposition | Claude (claude-opus-5-5), autonomous | 1.1–1.3 accepted, 1.4–1.7 noted (autonomous decisions, pending owner review) | `../architecture.md` |
| 6 | 19:38:14 | 19:38:14 | plan-revised | Claude (claude-opus-5-5), autonomous | Net change: no source line for an older server's conversation fragment; one lookup; toldBy pinned for Gerald (also hidden) and Mortimer | `../architecture.md` |
| 7 | 19:38:14 | 19:38:14 | freeze | Claude (claude-opus-5-5), autonomous | Pre-run record committed (round 036: pre-run record); the draft and the accepted fixes were already in the working tree, tested (server 157/157, mobile 79/79), and are committed separately | `../architecture.md` |
