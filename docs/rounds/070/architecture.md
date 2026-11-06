# Round 070 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** new backlog item I1, from [round 067](../067/findings.md)'s live tours (timings in its
  reports) and prototype.md's risk table (latency) and Phase 4 goal ("feels good to use").
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js` (`submitDialogue`, `turnProgress`, `progress`),
  `server/src/routes/encounter.js`, `mobile/src/api/learning.js`, `mobile/src/stores/gameStore.js`,
  `mobile/src/components/DialoguePanel.js`, tests, `results/progress-live.mjs`.

## Goal (pre-run)

A turn is one POST that grades (an LLM call), writes the NPC's reply (a second call) and commits both. In round 067's
tours (codex-cli, 58 turns) grading took a median 5.1 s (max 10.6 s) and narration 8.6 s (max 14.9 s), so the
player waits about 14 s, up to about 25 s, with only "{name} is considering the linguistic implications…" on the
screen. Show the verdict and feedback as soon as grading is validated, while the reply is still being written. What
is committed, and when, stays the same, and so do the turn's atomicity, receipts and replays.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **The verdict may show before the turn commits** (critique 1.3). If the reply or the save then fails, the player
   has seen a verdict for a turn that did not count. The box says so while it is provisional ("Not counted until
   {name} replies."). On a failure it is cleared, and the error banner stays as today. Saves stay atomic.
2. **Polling, not streaming.** React Native's fetch cannot read a streaming body reliably, and the NPC line itself
   is not streamed (out of scope). One sequential poll loop per send, every second (critique Optional).
3. **Same trust model as every route** (critique 1.6): the `X-Learner-Id` header and the optional shared
   `PARALLANG_TOKEN`. The progress route adds no new data, only the verdict a few seconds early, and the attempt id
   it needs is a random UUID that only the sending client knows.

## Claim boundary (pre-run)

Server and app logic under fixtures and one live HTTP run (codex-cli, it). Not the Simulator: the layout, VoiceOver
and the feel of the provisional box are open items for the owner. The web client does not poll.

## Deferred (pre-run)

- Critique 1.2 (pre-existing): if a POST's response is lost after the server committed, the app's retry uses a new
  attempt id and the old version, so it fails with a version conflict instead of replaying. This round does not
  change that; it is recorded as an open item. The early verdict is cleared on any failure, and the plan no longer
  claims that a retry is graded afresh.
- Streaming the NPC line.
- Critique 1.5's check in a long, scrolled conversation (Simulator).

## Design (pre-run)

### Server

1. **`turnProgress`**, a `Map` from learner id to `{ run, attemptId, assessment }`, holding only **validated**
   provisional assessments (critique Optional). If there is no entry, the progress is `null`: still grading, unknown,
   finished or failed.
2. In `submitDialogue`, inside the serialized operation (critique 1.4): after `validateAssessment`, the response's
   `assessment` block is built once: overallFeedback, and objectiveResults with `held`, feedback and evidence with
   `quality` and `effectiveQuality`. Effective quality is `capAssistedQuality(quality, assisted)` with today's
   `assisted` rule (unordered: any reveal on the graded objectives; ordered: a reveal on that objective). The block
   and the per-evidence effective qualities are computed **before** the narration call. The staging code after
   narration reuses those values and changes nothing else: timestamps, discovery and scheduling stay in place
   (critique 1.8). The entry is stored with `run`, a fresh object unique to this execution. A `try/finally` around
   the narration and commit deletes the entry only if `turnProgress.get(learnerId)?.run === run`. A replay (a
   receipt hit) and a request refused before grading never set an entry.
3. **`progress(learnerId, attemptId)`** is not serialized, because it must answer while the turn holds the lock. A
   blank `attemptId` gets a 400 validation error. It returns `{ progress: { attemptId, assessment } }`, with the
   assessment when the entry's attemptId matches and `null` otherwise. It reads no save and calls no provider. It
   returns a deep copy.
4. **Route** `GET /api/encounter/progress?attemptId=…`, with the learner header and the token middleware, like the
   other encounter routes.

### App

5. `api.getTurnProgress(learnerId, attemptId)`.
6. **`sendMessage`** keeps its attempt id and a per-send token (`sendSeq`, incremented on every send and on every
   reset that clears the encounter or the save). It sets `earlyAssessment: null`, then runs one sequential loop:
   wait 1 s, `getTurnProgress`, repeat while the POST is unsettled, up to 60 polls. A poll's answer is applied only
   if the POST is still unsettled **and** `sendSeq` is unchanged **and** the epoch and learner still match
   (critique 1.1). A poll error is ignored. If `api.getTurnProgress` is missing (old fakes), there is no loop.
7. When the POST settles, the settled flag is set **first**. Then: on success `assessment` comes from the response
   and `earlyAssessment` is cleared; on failure `earlyAssessment` is cleared and the error is shown as today.
8. **DialoguePanel**: while `isLoading` and `pendingInput` is set, an `earlyAssessment` shows in the Assessment
   box, under the player's pending line (critique 1.5). It has the same content as the final box, plus the line
   "Not counted until {name} replies.". The waiting line becomes "{name} is replying…". The previous turn's
   `assessment` is hidden while an early one shows. When the final assessment arrives, the box keeps its key
   (keyed by content, round 035), so the same verdict does not fade in again. The sounds (round 037) stay on the
   final response.
9. Every place that resets `assessment` to null (a fresh start, a save switch) also clears `earlyAssessment` and
   bumps `sendSeq`.

## Tests (pre-run)

Server (`server/test/turn-progress.test.js`):
- A provider whose narration waits on a gate that the test opens. During narration, `progress` deep-equals the
  final response's `assessment`. Before grading returns (the grading call is gated too), it is `null`. After the
  turn, it is `null`.
- Equality cases (critique 1.8): an ordered `held` result; a reveal-capped quality (ordered); an unordered turn with
  a reveal; a resolving turn.
- Failures (critique 1.7): narration throws; grading invalid; storage save throws. Each leaves `progress` null, the
  save and receipts unchanged and the session's version unchanged, and a later attempt works.
- Isolation: another attempt id and another learner give `null`; two learners' turns run at the same time, each
  sees only its own. A duplicate of the same attempt queued behind the first replays and never sets an entry.
- HTTP through `api()`: 400 without attemptId; the route answers while a turn is held at the narration gate.
- Existing suites unchanged, Gerald's golden prompts included.

Mobile (`mobile/src/__tests__/turn-progress.test.js`, fake timers):
- An early verdict shows with "is replying…" and "Not counted until Gerald replies.". The final assessment
  replaces it, and the provisional line goes.
- A POST failure clears it; a poll that resolves after the POST settled does not bring it back (critique 1.1); a
  poll from send 1 that arrives during send 2 is ignored.
- A save switch or restart during a send clears it.
- A fake without `getTurnProgress` behaves as today.

## Live (pre-run)

`results/progress-live.mjs` spawns the real server from Node on 127.0.0.1, with a random port and a random
`PARALLANG_TOKEN`, codex-cli and `it`. It plays Gerald (2 lines) and Mortimer (4 lines) over HTTP, polling progress
every 250 ms during each POST. It records the time to the first early assessment and to the response, and whether
they are deep-equal. The server is always stopped in `finally` (kill, wait for exit, then `pgrep` checks). About 9
calls.

**Pass:** every early assessment deep-equals its response's; an early one arrived before the response in at least
5 of the 6 turns (a fast narration may beat a poll); no NPC text in any progress body; all suites green.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 b3d80356…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A late poll can restore stale feedback after a failed POST or during a retry | 0 | Accept: per-send token and a settled flag, set before clearing | **Accepted** (autonomous, pending owner review) | Design 6, 7; Tests |
| 1.2 | Error | A failed POST does not imply a fresh grading; a lost response then conflicts on retry | − | In part: pre-existing, out of scope; drop the "graded afresh" claim, clear on any failure, record it as open | **Accepted in part** (autonomous, pending owner review) | Deferred |
| 1.3 | Risk | Disclosure is no longer atomic | 0 | Accept the behaviour explicitly; label the verdict provisional | **Accepted** (autonomous, pending owner review) | Decision 1, Design 8 |
| 1.4 | Gap | Cleanup must be inside the lock and tied to one execution | 0 | Accept: `finally` inside serialized, a unique `run` object | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.5 | Risk | The verdict can look attached to the wrong turn | + | Accept: show it under the pending line, hide the previous assessment, clear on resets; scrolled check to the Simulator | **Accepted** (autonomous, pending owner review) | Design 8, 9; Deferred |
| 1.6 | Risk | "Only the requesting learner's own verdict" overstates authorization | 0 | Accept: state the trust model | **Accepted** (autonomous, pending owner review) | Decision 3 |
| 1.7 | Gap | Failure and concurrency coverage too narrow | + | Accept: grading-invalid, storage failure, concurrent learners, a queued duplicate, delayed polls across failure → retry and resets | **Accepted** in part (autonomous, pending owner review): canonicalization failure shares the narration-failure path and is not tested separately | Tests |
| 1.8 | Gap | Equality needs representative assessments; keep timestamps and scheduling | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design 2, Tests |

**Optional** (taken): a map of validated provisional assessments only, and one sequential poll loop (Design 1, 6;
Decision 2).

Net change: the progress entry holds only a validated assessment, is cleaned inside the lock by its own run, and is
applied by the app only while its own send is unsettled. It shows as provisional under the pending line.

## Outcome (2026-11-06)

All pass criteria met. In the live HTTP run (it, codex-cli), 6 of 6 turns had an early verdict, all equal to the
response's, with no NPC text in progress. The verdict came at 5.3–6.8 s and the response at 11.8–16.1 s. All suites
are green (server 256, client 12, mobile 192). No amendments. See [findings.md](findings.md).
