# Round 071 findings

## Question

Sometimes a dialogue response is lost after the server committed the turn. Can the player's resend then recover,
instead of failing with "This encounter changed in another tab. Refresh before retrying." in an app that has neither
tabs nor a refresh button (round 070, critique 1.2)?

## Finding

**Yes, checked by tests only.**

- **The same answer replays.** The app now keeps the attempt id of each send that did not succeed, by learner,
  encounter, version and text. Resending the same answer reuses that id, so the server replays the committed turn
  (`replayed: true`, no new LLM call, no change to the save). If the server never committed, the same id simply runs
  the turn. Answer A, then B, then A again keeps A's id. Ids are kept in memory only.
- **A stale session reloads.** Sometimes the server answers `STALE_VERSION` or `STALE_ENCOUNTER` anyway, for example
  after a second client moved the conversation on. The app then fetches the current encounter while the loading
  state stays on. It shows the encounter with "This conversation had moved on, so it was reloaded. Your answer was
  not sent; it is still in the box." If the conversation is gone, the app returns to the map with "This conversation
  is no longer open. Return to it on the map to start again." If the reload itself fails, the original error stays.
- **Stricter guards.** A response or reload is applied only if the learner, the encounter id and version, and the
  latest send are all unchanged. Before this round the check covered only the version (critique 1.2), so an old
  response could have replaced another conversation that had the same version.
- **After a replay**, the app checks the server once and takes a newer version of the same conversation if there is
  one. This matters only with a second client on the same save.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md): Codex, effort high, bundle
  on stdin, 9 findings. 7 were accepted, 1.1 in part, and 1.9 (persisting retry ids across relaunches) was deferred.
- Tests: `mobile/src/__tests__/send-retry.test.js` (9 tests; 8 fail without the change, and the ninth, another
  learner getting its own id, held before too) and `server/test/send-retry.test.js` (1 test, over HTTP).
- No live runs: the path is deterministic and makes no new LLM calls.

## Results

| Check | Result |
|---|---|
| Server | 257/257 (256 before; 1 new) |
| Mobile jest | 201/201 (192 before; 9 new) |
| Web client | 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

Round 070's open item 3 is done. A resent answer replays a committed turn, and a stale or closed conversation
recovers.

## Evidence

- `mobile/src/__tests__/send-retry.test.js` covers:
  - a replay with the same id and no cue;
  - A → B → A, and a new id after a success;
  - another learner getting its own id;
  - `STALE_VERSION` and `STALE_ENCOUNTER` reloads, with the draft, assessment and snapshot checked;
  - a closed conversation, and a failed reload;
  - a late reload after a save switch;
  - a replay followed by a newer server version;
  - a response for a replaced conversation with the same version.
- `server/test/send-retry.test.js` checks four things over HTTP. A replay makes no provider call and leaves the save
  file byte-identical. The same id with another text gets `ATTEMPT_REUSE`. A new id at the old version gets
  `STALE_VERSION`.

## Claim boundary

Store logic and server replay, under fixtures. There was no real network loss and no Simulator. Retry ids do not
survive an app relaunch, but a relaunch reloads the current encounter from the server anyway.

## Open items

- Owner (Simulator): turn Wi-Fi off, send an answer, then turn it on and send again. The turn should appear once,
  with no second NPC reply. Also check that the two new messages read well in the error banner.
