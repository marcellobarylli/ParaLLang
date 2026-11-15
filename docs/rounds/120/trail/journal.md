# Journal: round 120

Append only. Times are UTC. Occurred is when the event happened; Recorded is when the row was written.

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 2026-11-15 09:35 approx. | 10:56:30 | round-opened | Owner | The second of the three integration rounds the owner asked for in round 119: the party in the dungeon. The owner is away and said to run autonomously | `interview.md` |
| 2 | 10:57:18 | 10:57:18 | plan-drafted | Claude (claude-fable-5-2) | Draft 1: the app's party ported to the dungeon client (the offer after a saveable site, the invitation on the site card, a Party panel, a `party` phase for a member's conversation); the server adds `saveable` to the map's sites | `plan-v1.md` |
| 3 | 10:57:18 | 10:57:18 | critique-dispatched | Claude (claude-fable-5-2) | Critique 1 sent to Codex, effort high, read-only. Input `plan-v1.md`, sha256 173c5609d19f918c7c32db2595c7679008227345fd6cc6d3a50bd3e04a9a25e8, HEAD 113f661 on branch round-120-party, working tree: only `docs/rounds/120/` untracked | `plan-v1.md` |
| 4 | 11:07:07 | 11:07:58 | critique-returned | Codex, effort high | Critique 1: 9 findings (Errors: the store's site merge drops `saveable`; a site start silently replaces an unfinished party conversation; the story hint points to a Spellbook that shows no stories; Talk is shut on the title screen; a party talk after the goal loses "Leave the temple"; an older party read can undo a newer one. Cuts: the read after a recruit, repeated server tests, the map read after a party conversation) | `critique-1.md` |
| 5 | 11:08:44 | 11:08:44 | disposition | Claude (claude-fable-5-2) | The owner was away. All nine findings accepted; 1.2 in part (the error, not the fix: the promise that an unfinished party conversation can always be resumed is narrowed to "until another conversation starts") and 1.3 cut further (no story hint at all) | `../architecture.md` |
| 6 | 11:08:44 | 11:08:44 | plan-revised | Claude (claude-fable-5-2) | architecture.md pre-run sections from draft 1 with the nine findings. Net: five corrections, one narrowed promise, four parts removed, nothing added | `../architecture.md` |
