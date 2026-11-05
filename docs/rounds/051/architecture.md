# Round 051 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog H1; [round 050 findings](../050/findings.md) (open item 2).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `held` in `server/src/learning-service.js`, an ORDER line in `server/src/llm/prompt-builder.js`
  (grading), a held note in the narration decision, `mobile/src/components/DialoguePanel.js`, tests.

## Goal (pre-run)

In an ordered encounter, an objective that the grader passes but that does not close (an earlier objective failed)
is no longer reported as a success by the grader's feedback, the app or the narrator, and the player is told to say
it again after the earlier one.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No banking** (critique 1.1). A held pass is not credited later; the player says it again (alone or with the
   earlier objective). Every text says so: "say it again after …", never "it will count".
2. **The frozen web client is not changed** (critique 1.8): it still shows ✓ for a held result. A stated scope limit;
   the app is the client under development.
3. **Legacy replays** (critique 1.6): attempts processed before this round replay their stored response unchanged
   (no `held`); new attempts store `held` in the response, so a replay returns it without regrading.

## Design (pre-run)

1. **`held`** (critique 1.4): after the closing loop, in an ordered encounter, every result with `passed: true` whose
   objective is not in `closing` gets `held: true`, in `decision.objectiveResults` (narration) and in the response's
   `assessment.objectiveResults`. The field is present only when true. Unordered encounters never hold; a resolving
   turn has none (everything closed). `passed` keeps the grader's verdict; Spellbook evidence is recorded as today
   (correct usage, `passed: true`), and only closing advances objectives (critique 1.7).
2. **Grading ORDER line** (critiques 1.1, 1.2, 1.5): `buildGradingMessages({ …, ordered })` appends, with a leading
   newline like `ambientLine`, only when `ordered` and more than one objective is supplied: "ORDER: these objectives
   count only in the order given. An objective after one that does not pass stays open whatever its verdict: its
   feedback must not call it a success or say it will count later; say in English that the player must say it again
   once the earlier objective is met. Treat it as not passed for every rule above, in `feedback` and
   `overall_feedback`: never write a {{language}} expression that would satisfy it." Single-objective and unordered
   calls are byte-identical to today. Gerald's grading prompt (two ordered objectives) gains the line on purpose (no
   grading prompt is pinned).
3. **Narration held note** (critique 1.3): when a held result exists, `decision.held_note` = "A held objective was
   said correctly but does not count: an earlier objective comes first. Do not celebrate it or treat it as done, and
   do not give its answer; the player must say it again after the earlier objective." Absent otherwise, so Gerald's
   pinned narration prompts (`gerald-prompts-r026.json`) stay identical.
4. **App**: a held result shows `…` and ends with " (say it again after the earlier objective)"; `assessmentKey`
   includes `held` (Optional item).

## Tests (pre-run)

- Service (Fountain fixture): "Adesso!" at `time` → `now` held in the response and in the narration call's decision
  with `held_note`; [pass, fail, pass] "Fermati, adesso!" at the start → `stop` closes, `now` held, `direction` and
  `time` not; a combined answer at `time` → no held, both close; after a held `now`, closing `time` alone leaves
  `now` open; a replay of the held attempt returns `held` and adds no evidence (critiques 1.4, 1.6, 1.7, 1.9).
- Unordered (`mortimer_tasting` fixture) never holds.
- Prompts: the ORDER line for an ordered multi-objective grading call; full grading messages byte-equal to a build
  without the line for a single objective and for unordered (critique 1.5); Gerald's pinned narration test passes.
- Mobile: `DialoguePanel` shows `…` and the note for a held result, ✓ otherwise.

## Live (pre-run)

codex-cli, `play-market.js --location cracked_fountain` (its script holds "Adesso!" at `time`), 1 × it, 1 × es, then
`npm run verify:cli -- --provider codex-cli` (Gerald). Read the held `now`'s feedback, `overall_feedback` and Flick's
next line.

## Success (pre-run)

All tests pass. In both live runs: verdicts as scripted; the held objective's feedback and `overall_feedback` do not
call it a success or promise later credit and give no target expression for it; Flick's next line does not treat
"now" as achieved (critique 1.9). verify:cli passes.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 36aac9f8…; Codex, effort high (a bundle on stdin, no file access); raw
text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The wording promises deferred credit | + | Accept: "say it again", never "will count" | **Accepted** (autonomous, pending owner review) | Decision 1, Design 2–4 |
| 1.2 | Error | Held answers escape answer protection | + | Accept: held counts as not passed for both feedback fields | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.3 | Risk | The narration note is only descriptive | + | Accept: behavioural note | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | The leading-run rule is not fully tested | + | Accept: held from `closing`; [pass, fail, pass] test | **Accepted** (autonomous, pending owner review) | Design 1, Tests |
| 1.5 | Risk | Conditional text may change bytes | + | Accept: leading-newline pattern, full-message equality tests | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.6 | Risk | Replays bypass the fix | + | Accept: legacy replays unchanged, new ones store held; replay test | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.7 | Risk | Spellbook evidence needs assertions | + | Accept in part: evidence kept and not duplicated on replay; no change to scheduling | **Accepted in part** (autonomous, pending owner review) | Design 1, Tests |
| 1.8 | Risk | The web client keeps ✓ | 0 | Accept as a stated scope limit (frozen client) | **Accepted in part** (autonomous, pending owner review) | Decision 2 |
| 1.9 | Error | Success omits narration | + | Accept: narration in success; lifecycle test | **Accepted** (autonomous, pending owner review) | Success, Tests |

**Optional:** `held` in `assessmentKey` (accepted, Design 4); reading feedback and narration for leaks (in Live).

Net change from plan-v1: no-banking wording, held is not passed for answer protection, a behavioural narration note,
more lifecycle and replay tests, narration in the success criteria.
