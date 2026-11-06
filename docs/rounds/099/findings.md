# Round 099 findings

## Question

Rounds 093–098 changed the save's receipts, the LLM runner and adapters, the live-run scripts and the app's store.
Does a second, independent read of that code find bugs the rounds' own tests missed?

## Finding

**One real bug in the app, five minor ones, two minor ones in the server; all fixed but two.**

- **The bug (store, round 096):** a player whose answer was sent but whose reply was lost, and who then asked for
  help, had the conversation reloaded at the server's newer version. The answer stayed in the box, and pressing Send
  graded it again as a new turn: duplicate evidence, an extra escalation step, and the first verdict never shown.
  Now help in that state leaves the conversation as it is and says "Your last answer may have reached the server.
  Send it again to see its verdict." The resend uses the same version and attempt id, so the server replays the turn
  (it checks receipts before the version) or answers stale, and the send's own reload runs. No automatic resend: the
  critic showed it needed three more fixes and sent an answer the player had not pressed Send for.
- **Minor, store:** a lost save's notice was forgotten if the load failed after the server recreated the save (now
  remembered until shown); one write counter let a recruit drop the post-resolve world read and a move drop a party
  read (now one counter each); a review reply landing after the player left the screen showed an error or played a
  cue on the map (now applied silently); after a review error was dismissed the screen said "No due review is
  available." with no way on (now "No review is loaded." with Try again); an empty party reply threw an unhandled
  error.
- **Minor, server:** a timeout or cancel landing in the grace after a CLI's non-zero exit replaced its failure, so a
  stated quota failure read as "slow" (any exit is now final); a code-less Codex `error` event hid a later coded
  `turn.failed` (the first coded failure now wins).
- **Rejected:** a probe before the runner's group kill after the child is reaped (Linux keeps the PID while it is a
  live group's id; a probe races the same way). **Deferred:** play-market matching narration calls by text only (only
  a rare uncommitted line's timing can be wrong), and a replayed send after a server restart showing a conversation
  the server no longer holds (round 071's path).

## Method

As in [architecture.md](architecture.md). Two fresh read-only subagents reviewed the server and the store at HEAD
6cc3a5f ([review 1](trail/review-1.md): 4 findings; [review 2](trail/review-2.md): 6 findings); a third critiqued the
fix plan ([critique 1](trail/critique-1.md): 9 findings, all but one accepted, one deferred). Codex is at its usage
limit until 2026-11-09 17:32 UTC. Offline: jest with mocked APIs, node tests with fake runners and `/bin/sh`
children; each new test was run against the old code.

## Results

| Check | Result |
|---|---|
| `mobile/src/__tests__/store-help-pending.test.js` (new) | 13/13; on the old store 10 fail (the 3 that pass guard unchanged behaviour: the 096 reload without a pending answer, help's reload failing, a retry after a dismissed stale card) |
| `server/test/llm-exit-final.test.js` (new) | 6/6; on the old code 4 fail (timeout and cancel in the exit grace, the coded Codex event on both parse paths) |
| `review-loading.test.js` | the panel's last branch offers Try again |
| Full suites | server 372/372 (366 before), client 12/12, mobile 292/292 (279 before); no `parallang-*` entry in `/tmp`, no stray `sleep 30` |

## Decision

Keep all fixes (autonomous decisions, pending owner review; [decisions.md](../../autonomy/decisions.md)).

## Evidence

`mobile/src/stores/gameStore.js` (`STALE_HELP_PENDING`, `lostSaves`, `worldWrites`, `partyWrites`, `onCard`),
`mobile/src/components/ReviewPanel.js`, `server/src/llm/cli-runner.js` (`failAndTerminate`),
`server/src/llm/adapters/codex-cli.js` (`pickFailure`), the two new test files, the [reviews](trail/review-1.md) and
[critique](trail/critique-1.md).

## Claim boundary

Tests with mocks and fake CLIs; no Simulator and no live run. The store mocks do not model the server's receipt
order; the tests assert the resend's version and attempt id, and the order was read in `learning-service.js`.
Whether real Codex ever emits a code-less `error` before a coded `turn.failed` is unknown offline.

## Open items

- Simulator (owner): the help-pending line after a lost send, then Send showing the replayed verdict; the review
  screen's Try again after dismissing an error.
- Live round: play-market per-step matching (review 1 R1.4); raw Codex events for R1.2 (with round 095 R1.5).
- Deferred: a replayed send after a server restart (critique 1.3).
