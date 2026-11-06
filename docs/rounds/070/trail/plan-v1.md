# Round 070 plan v1: the verdict before the NPC's reply (backlog I1)

## Problem
A player turn is one `POST /api/encounter/dialogue`. The server grades the answer (one LLM call), then generates the
NPC's reply (a second call), then commits both atomically and responds. Round 067's live tours (codex-cli, 58
turns): grading median 5.1 s (max 10.6 s), narration median 8.6 s (max 14.9 s). The app shows only "{name} is
considering the linguistic implications…" for the whole ~14 s (up to ~25 s). The verdict and the grader's feedback
exist after ~5 s. prototype.md's risk table names latency ("Stream responses… show text appearing"); Phase 4's goal
is that the prototype "feels good to use".

## Goal
Show the verdict and the feedback as soon as grading is validated, while the NPC's reply is still being written,
without changing what is committed, when, or the turn's atomicity, receipts and replays.

## Design
### Server
1. `LearningService.turnProgress`: an in-memory `Map` keyed by `learnerId` → `{ attemptId, phase, assessment }`.
   One entry per learner (turns are serialized per learner, so at most one turn runs).
   - Set to `{ phase: 'grading', assessment: null }` once `submitDialogue` passes its checks (version, state, not a
     replay) and before the grading call.
   - Set to `{ phase: 'replying', assessment }` right after `validateAssessment` succeeds, where `assessment` is the
     exact object the final response will carry under `assessment` (overallFeedback, objectiveResults with `held`,
     feedback, vocabularyEvidence with `quality` and `effectiveQuality`). To make that possible, the response's
     `assessment` block is built before the narration call (effective quality depends only on the current reveals,
     which are known then); the staging code reuses it.
   - Deleted in a `finally` when the turn ends, success or failure, only if the entry still belongs to that attempt.
2. `progress(learnerId, attemptId)`: **not** serialized (it must answer while the turn holds the learner's lock).
   Returns `{ progress: { attemptId, phase, assessment } }` when the entry matches the attempt id, else
   `{ progress: { attemptId, phase: 'none', assessment: null } }` (unknown, finished, or another attempt). A missing
   attemptId is a 400. It reads no save and calls no provider.
3. Route `GET /api/encounter/progress?attemptId=…` with the `X-Learner-Id` header (and the existing token
   middleware). Returns 200 with the body above.
4. What it can reveal: only the requesting learner's own verdict, a few seconds before the same data arrives in the
   POST response. Nothing about the NPC line. It never exposes the narration.

### App (`mobile/`)
5. `api.getTurnProgress(learnerId, attemptId)`.
6. `sendMessage` keeps its attempt id in a variable, starts the POST, and while it is pending polls
   `getTurnProgress` every 1 s (first poll after 1 s; stops when the POST settles, on epoch or learner change, or
   after 60 polls). A poll failure is ignored (the POST decides). When a poll returns `phase: 'replying'` with an
   assessment, the store sets `earlyAssessment` (only if the epoch, learner and encounter version still match).
7. The DialoguePanel shows `earlyAssessment` in the Assessment box while loading, and the waiting line changes to
   "{name} is replying…". When the POST returns, `assessment` replaces it and `earlyAssessment` is cleared; the box
   is keyed by content (round 035), so the same verdict does not fade in twice.
8. When the POST fails, `earlyAssessment` is cleared: the error banner says the answer can be retried, and a retry is
   graded again (it may differ). No early cue: the pass/resolve sounds (round 037) stay on the final response.
9. The web client is frozen and does not poll; it keeps working unchanged.

## Tests
Server:
- With a provider whose narration call waits on a promise the test controls: during the narration call,
  `progress` returns `replying` and an assessment deep-equal to the final response's `assessment`; during the
  grading call it returns `grading`; after the turn, `none`.
- A narration failure: after the POST fails, `none`; the next attempt is graded afresh; no receipt.
- Another attempt id, or another learner: `none`. A replayed attempt id never sets progress.
- HTTP through `api()`: the route needs the learner header and attemptId, and answers while a turn is running.
- Gerald's golden prompts unchanged.
App:
- With a fake API whose `sendDialogue` waits and whose `getTurnProgress` answers `replying`: the early verdict shows
  with "is replying…", then the final assessment replaces it once; a POST failure clears it; a late poll after the
  POST settled does not bring it back; jest fake timers for the 1 s polls.

## Live check
`results/progress-live.mjs`: spawn the real server on 127.0.0.1 with a random port and `PARALLANG_TOKEN`, codex-cli,
it; start Gerald and Mortimer, play 4–6 scripted turns while polling `progress` every 250 ms, record time to the
early verdict and to the response, and check that each early assessment deep-equals the response's. The server is
always stopped (`finally`, kill and wait for exit). About 8–10 calls.

Pass: every early assessment equals its response's; the verdict arrives earlier than the response in every turn
that returns one; no leak of the NPC line; all suites green.

## Not in scope
Streaming the NPC line itself (needs a streaming provider path and transport); the web client.
