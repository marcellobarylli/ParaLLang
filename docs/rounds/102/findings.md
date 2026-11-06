# Round 102 findings

## Question

After a server restart, a resent answer whose first reply was lost replays its receipt, but the server no longer
holds the conversation. Can the app stop showing that conversation as if it were still open, without wiping what the
player started meanwhile?

## Finding

**Yes. The app now reads the conversation the server holds after a replay and acts on it at once.**

- **The server holds nothing** (a restart): back to the map with "This conversation is no longer open…". The answer
  was graded and its card scheduled on the server; only the conversation is gone. A screen the player opened during
  the read (Spellbook, Party) stays; Return from it leads to the map.
- **The server holds another conversation** (ongoing or resolved): that one is shown with a new line, "Your answer was
  graded, but the server now holds another conversation, shown here."
- **A resolved replay stands**, with its verdict: the resolve is real, and the map's refresh after it already ran.
- **Only while the store still shows the replayed conversation.** A start or a help reload during the read wins
  (critique 1.1: without this check, a party conversation started during the read would have been dropped).
- Before, the phantom stayed until the next Send, which failed `STALE_ENCOUNTER` and only then went to the map.

## Method

As in [architecture.md](architecture.md). `_reloadStale`'s two branches are now `_applyLatest`, shared with the
replay path; the replay path passes `leaveView`, so the map is taken only from the dialogue. Critique: a fresh
read-only subagent in place of Codex (limited until 2026-11-09 17:32 UTC); 9 findings, all accepted. Offline; jest
mocks of the API.

## Results

| Check | Result |
|---|---|
| New tests (`mobile/src/__tests__/send-retry.test.js`, round 102 block) | 9 new, 19/19 in the file: no conversation → map, closed; an opened Spellbook stays; another conversation, ongoing and resolved; a resolved replay stands (verdict, world refresh); a start during the read wins; a help reload during the read keeps its line; a failed read keeps the replay; no read after a non-replayed send |
| Mutations | 5 of 5 fail a test (the closed branch on the replay path, the ongoing condition, the still-shown check, a forced map view, the whole branch) |
| Full suites | server 382/382, client 12/12, mobile 301/301 |

## Decision

Keep the change (autonomous decision, pending owner review). No server change: keeping encounters across a restart
would mean persisting in-memory state.

## Evidence

`mobile/src/stores/gameStore.js` (`_applyLatest`, the replay branch in `sendMessage`, `STALE_REPLAY_OTHER`), the
tests above, [`trail/critique-1.md`](trail/critique-1.md), round 099's [architecture](../099/architecture.md)
(decision 12).

## Claim boundary

Store behaviour under jest mocks; no live server restart, no Simulator. The new line's wording was not seen on a
phone.

## Open items

- **Simulator (owner):** stop the server during a send, restart it, send the same answer again: the map with the
  closed line.
- **`STALE_CLOSED`'s wording** says "Return to it on the map", which does not fit a party conversation (critique
  Optional 1; shared with `_reloadStale`, not new).
