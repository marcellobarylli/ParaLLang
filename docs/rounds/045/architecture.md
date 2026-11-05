# Round 045 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G3 (round 023 deferred "unordered objectives"). The engine advances one index: a turn
  closes only the leading run of passed objectives, so an answer to a later objective given first counts for
  nothing. Round 044's critique found such a turn in `022/results/party-es-1.json`.
- **Findings:** [`findings.md`](findings.md), after the build and live runs.
- **Artifact:**
  - `objectives_unordered` in the encounter schema (`server/src/content-loader.js`);
  - `activeObjectives`, `currentObjective`, unordered closing and help capping in
    `server/src/learning-service.js`;
  - the flag on `mortimer_tasting` in both packs;
  - a `content` option in `createRuntime` (test helper);
  - `server/test/unordered-objectives.test.js`.
  No prompt template changes.

## Goal (pre-run)

An encounter can let its objectives be met in any order, and Mortimer's tasting is the first to use it. Every other
encounter behaves exactly as before.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **`objectives_unordered: true`** on an encounter: every passed open objective closes. Default false, which is
   today's behaviour (Gerald's golden prompts unchanged).
2. **The first user is Mortimer's tasting** (it, es): saying you like the slice and asking for more come in either
   order. The tutorial, the Fountain, the reading passages and the other party conversations stay ordered.
3. **The current objective** shown in the app is the first open objective in authored order.
4. **Help in an unordered encounter caps every objective graded that turn** (critique 1.5). Help is taken on the
   current objective, but its translation can serve any open one.

## Design (pre-run)

1. **Session.**
   - `passedObjectiveIds` (starts `[]`; a missing array reads as `[]`) sits beside `objectiveIndex`. For unordered
     encounters the index is the number closed. The ids can only come from open objectives, so they are unique
     (critique 1.1).
   - `activeObjectives(session)`: ordered, the objectives from the index on; unordered, the authored list minus
     the passed ones. `currentObjective` is the first of them.
   - Every former `objectives[objectiveIndex]` (serialize, reveal keys, help) goes through `currentObjective`.
2. **Submit.**
   - Ordered: the leading passes close, as before. Unordered: every passed open objective closes (`closing`).
   - `remaining` comes from the post-turn state, by membership for unordered encounters (critique 1.2). The
     resolution (`remaining` empty), `decision.nextObjectiveId`, the narration's objective list and the staged
     session all derive from it (critique 1.7).
   - SM-2 scheduling uses `closing` (as `advancedObjectiveIds`).
   - The replay lookup still comes first and is unchanged (critique 1.8).
3. **Authored `next_objective`** is only a load-time order check and reaches no prompt. `nextObjectiveId` is the
   server's (critique 1.3).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 81ee2d60…; Codex, effort high (bundle without the draft); raw text in
`trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | Index and passed ids can disagree | + | Accept: ids only from open objectives, index = count, missing array = [] | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.2 | Error | A count cannot select the remaining objectives | + | Accept: membership filtering in `activeObjectives` and for the narration (the draft already did) | **Accepted** (autonomous, pending owner review) | Design 1–2, Tests |
| 1.3 | Risk | Authored `next_objective` contradicts unordered progress | 0 | In part: it is a loader order check only, never in a prompt; `nextObjectiveId` is the server's | **Accepted in part** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | Grading semantics for open lists | − | Reject: the grader already assesses every open objective against the current input in ordered encounters; the validation of complete, unique ids is unchanged | **Rejected** (autonomous, pending owner review) | — |
| 1.5 | Risk | Help on one objective, credit on another | + | Accept: in unordered encounters a reveal caps every graded objective | **Accepted** (autonomous, pending owner review) | Decision 4, Tests |
| 1.6 | Risk | Shared vocabulary scheduled in iteration order | − | Reject: unchanged from ordered encounters (a turn could already close several); Mortimer's two objectives share no target | **Rejected** (autonomous, pending owner review) | — |
| 1.7 | Risk | One staged state for resolution, prompts, current objective, party | + | Accept: all from `remaining`; tests for null current objective and one party increment; the failure path (nothing staged is saved) is unchanged | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.8 | Risk | Replay coverage | + | Accept: replay test (stored response, no provider call, changed payload 409) | **Accepted** (autonomous, pending owner review) | Tests |
| 1.9 | Suggestion | More tests (three objectives, help, failure retry) | 0 | In part: help and replay added; no three-objective unordered content exists | **Accepted in part** (autonomous, pending owner review) | Tests |

Net change from plan-v1: help caps every graded objective in unordered encounters; a replay and help test; the
design states the invariants.

## Tests (pre-run)

`server/test/unordered-objectives.test.js`, on a content copy of Gerald's coffee break with the flag:
- the loader takes the boolean and refuses a string; the shipped packs flag only `mortimer_tasting`;
- thanks first: thanks closes, the current objective stays praise, and the narration prompt drops thanks;
- the next grading sees only praise; a failed turn changes nothing; praise resolves (current objective null, party
  count 1);
- both in one line resolve at once;
- ordered (flag absent): thanks first still closes nothing;
- a replay returns the stored response with no provider call, and a changed payload is 409;
- help on praise, then both in one line: both qualities capped at 2.

All existing suites, including Gerald's golden prompts, unchanged.

## Live runs (pre-run)

codex-cli, after round 026's queued runs. `play-market.js --party --member butchers_stall` in it and es, with the
answers out of order (`--lines`: ask for more first, then the verdict). The bar: both resolve, and the first turn
closes `ask_more` while `like_it` stays current. Read with `leak-scan.js`.
