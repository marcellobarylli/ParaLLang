# Journal: round 121

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-15 09:35 approx. | 11:48:03 | round-opened | Owner | The third of the three integration rounds the owner asked for in round 119: levels. The owner is away and said to run autonomously | `interview.md` |
| 2 | 11:30 approx. | 11:48:03 | plan-drafted | Claude (claude-fable-5-2) | Draft 1: XP for objectives, resolves and due reviews; a derived level; `requires_level` on the Library and the Sanctuary; a ratio bonus per level; the level in the top bar | `plan-v1.md` |
| 3 | 11:48:03 | 11:48:03 | critique-dispatched | Claude (claude-fable-5-2) | Critique 1 sent to Codex, effort high, read-only. Input `plan-v1.md`, sha256 65b15faa45b5b2268d490cb549734ad3a4d5660295885eec037d327dcc5be1bd, HEAD 448ccad on branch round-121-levels, working tree: only `docs/rounds/121/` untracked | `plan-v1.md` |
| 4 | 11:58:55 | 11:59:47 | critique-returned | Codex, effort high | Critique 1: 7 findings (Errors: the client's cached map keeps a level seal shut after XP from a party talk or a review; a complete run's map would call open places sealed; "Opens at level 6" on places that stay closed; the Library's level is met earlier on one route than the draft says. Cuts: progression stored in receipts, a second cap on the ratio, a new module) | `critique-1.md` |
| 5 | 12:00:36 | 12:00:36 | disposition | Claude (claude-fable-5-2) | The owner was away. All seven findings accepted; 1.3 cut further (no levels on the world map at all) | `../architecture.md` |
| 6 | 12:00:36 | 12:00:36 | plan-revised | Claude (claude-fable-5-2) | architecture.md pre-run sections from draft 1 with the seven findings. Net: three corrections, one narrowed sentence, three parts removed, progression out of the receipts | `../architecture.md` |
