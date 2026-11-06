# Round 070 findings

## Question

Can the player see the grader's verdict while the NPC's reply is still being written, rather than after both LLM
calls (about 14 s per turn in round 067, up to 25 s), without changing what a turn commits (backlog I1)?

## Finding

**Yes. In a live HTTP run, the verdict was readable 5.3–6.8 s into each turn. The full response came at
11.8–16.1 s, a median of 8.3 s later.** All six early verdicts were identical to the final ones. No progress
reply carried any of the NPC's text.

- **Server.** After the grading is validated, the turn keeps its assessment block in memory (`turnProgress`). That
  block is the same object the response will carry. `GET /api/encounter/progress?attemptId=…` returns it, or
  `null`, and does not wait for the learner's lock. The entry goes when the turn ends, inside the lock, and only the
  run that set it can remove it. Nothing is committed earlier than before. Receipts and replays are unchanged, and
  a replayed attempt never shows progress.
- **App.** While a turn's POST runs, the store polls once a second. It applies the answer only while that send is
  unsettled and is still the latest send. The Assessment box then shows the verdict under "Your answer: “…”" with
  "Not counted until {name} replies.", and the waiting line reads "{name} is replying…". The final response
  replaces it. A failure clears it, and the error shows as before. The sounds still play only on the final response.
- **Trade-off (decision 1).** If the reply or the save fails after grading, the player has seen a verdict for a
  turn that did not count. The box says so while it is provisional, and the retry is graded again.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md): Codex, effort high, bundle
  on stdin. It had 8 findings: 6 accepted, 2 in part (1.2 pre-existing and deferred; 1.7 without a separate
  canonicalization test). The Optional simplification was taken.
- Tests: `server/test/turn-progress.test.js` (9) and `mobile/src/__tests__/turn-progress.test.js` (7). Six of the
  seven mobile tests fail without the app change. The seventh, a fake with no progress call, is meant to pass
  either way.
- Live: `results/progress-live.mjs` spawns `server/server.js` on 127.0.0.1, with a free port and a random
  `PARALLANG_TOKEN`, using codex-cli and Italian. It plays Gerald (2 lines) and Mortimer (4 lines) over HTTP and
  polls progress every 250 ms during each POST. It stops the server in `finally` (checked with `pgrep`).

## Results

| Check | Result |
|---|---|
| Server | 256/256 (247 before; 9 new) |
| Mobile jest | 192/192 (185 before; 7 new) |
| Web client | 12/12 (unchanged; it does not poll) |
| expo-doctor / iOS export | 20/20 / built |
| Live turns with an early verdict | 6/6 (pass needed 5/6) |
| Early verdict equal to the response's | 6/6 |
| NPC text in a progress body | 0/6 |

| Turn (it) | Verdict at | Response at | Verdicts |
|---|---|---|---|
| Gerald: "Vorrei un caffè, per favore." | 5.6 s | 13.9 s | order ✓, no milk → |
| Gerald: "Senza latte, per favore." | 6.0 s | 11.8 s | no milk ✓ (resolved) |
| Mortimer: "Vorrei del prosciutto, per favore." | 5.8 s | 16.1 s | meat →, quantity → |
| Mortimer: "Vorrei del salame, per favore." | 6.3 s | 13.6 s | meat ✓, quantity → |
| Mortimer: "Chilo." | 5.3 s | 15.6 s | quantity → |
| Mortimer: "Due etti, per favore." | 6.8 s | 13.6 s | quantity ✓ (resolved) |

The app polls every second, not every 250 ms, so in the app the verdict appears up to a second later than these
times.

## Decision

I1 is done. The verdict shows as provisional while the reply is written. It is shown in the app and in no other
client.

## Evidence

- [`results/live-it.json`](results/live-it.json): per turn, the polls, both times, the equality check, the NPC-text
  check, the verdicts and the feedback, plus the server's log without the token.
- `server/test/turn-progress.test.js` covers:
  - progress is null while grading, equal to the response while the reply is written, and null afterwards;
  - equality for a held pass, a reveal-capped quality, a resolving turn, and an unordered encounter with a reveal;
  - failures of the reply, the grading and the save, each leaving the save, receipts and version unchanged;
  - two learners at once, another attempt id, and a queued duplicate that replays;
  - HTTP 400 and 401 responses, and the route answering while a turn is held.
- `mobile/src/__tests__/turn-progress.test.js` covers the poll loop, a late poll after a failure, a poll from an
  older send, a save switch, a fake without the call, and the panel's provisional and final states.

## Claim boundary

One live run (Italian, codex-cli, two encounters), with no app in a Simulator. How the provisional box looks and
reads, and whether VoiceOver announces both boxes, are unchecked. The NPC line itself is not streamed.

## Open items

- Owner (Simulator): send a turn and watch the waiting line change to "Gerald is replying…". Check the provisional
  box (answer, verdict, "Not counted until…") and how it turns into the final box. Check it in a long, scrolled
  conversation and with VoiceOver (critique 1.5).
- Owner: is showing a verdict before the turn commits acceptable (decision 1)?
- Pre-existing (critique 1.2): if a POST's response is lost after the server committed, the app's retry fails
  with a version conflict instead of replaying. A fix would reuse the attempt id for a retry of the same text.
