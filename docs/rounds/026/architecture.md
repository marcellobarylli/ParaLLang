# Round 026 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog E1 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md) (rounds
  [009](../009/findings.md), [014](../014/findings.md), [019](../019/findings.md), [020](../020/findings.md),
  [023](../023/findings.md), [025](../025/findings.md)): Portia's lines and greeting run short of the requested
  share and content fixes failed; Flick's party lines run short; Mortimer and Marginalia run over.
- **Findings:** [`findings.md`](findings.md), after the runs.
- **Artifact:** `prompts/system/base.txt`, `server/src/llm/prompt-builder.js`, the golden fixture
  `server/test/fixtures/gerald-prompts-r026.json`, tests, [`results/`](results/) (tours, greeting replays, scripts).

## Goal (pre-run)

NPC lines land nearer the requested target-language share, both under and over, by making the shared language-mix
rule concrete. A template change: it affects every encounter, and Gerald's pinned prompts are regenerated on
purpose. No content change, no change to the answer rules.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **One variable only.** The rule changes the language mix and nothing else. The refrain clause (critique 1.2) and
   the open-answer sentence (1.4) of plan-v1 are dropped. Refrains are measured, not instructed.
2. **A worked example, not a second quota** (critique 1.1): "in a 20-word line, about K words" with
   K = round(ratio × 20), no floor (0.05 → 1, 0.25 → 5, 0 → 0), so the two numbers agree.
3. **The A/B rests on paired greeting replays** (critique 1.6): the same greeting prompt for every encounter,
   rendered with the old and with the new rule, sent alternately, two replays per encounter, variant and language.
   The full tours before and after are integration checks and a second, unpaired measure.
4. **Keep or revert by a bar set now** (critique 1.7, below). If the bar fails, revert by Amendment, as round 020 did.

## Claim boundary (pre-run)

The share estimate (`notInTranslation`) is rough (critique 1.3): English words missing from a paraphrased
translation count as target language. It is backed by a hand count of target-language words in the greetings, which
is not blinded. Two replays per cell and one tour per side are small samples. Nothing is claimed about learning
effects or the app.

## Deferred (pre-run)

A rolling per-encounter budget in place of a per-line rule (critique 1.8). A reviewed case set for low and high
ratios and scarce vocabulary (1.9). Refrain-aware accounting (1.2). Blinded annotation (1.3).

## Design (pre-run)

1. `server/src/llm/prompt-builder.js`: the system template gets `language.wordsPer20 = Math.round(targetRatio * 20)`
   beside `language.targetRatio`.
2. `prompts/system/base.txt`: the line "- Target approximately {{language.targetRatio}}% {{language.name}} in
   dialogue." becomes two lines:
   - "- Language mix: about {{language.targetRatio}}% of the words in each dialogue line are {{language.name}}, the
     greeting included (in a 20-word line, about {{language.wordsPer20}} words). Stay within about 10 points of it,
     under or over."
   - "- Reach it with short, whole {{language.name}} phrases (greetings, questions, reactions, remarks) that the
     English around them explains, not a single {{language.name}} formula inside a long English line."
3. Gerald's golden prompts are regenerated as `server/test/fixtures/gerald-prompts-r026.json`, the test points to
   it, and r012 is deleted after the freeze.
4. [`results/greeting-replay.mjs`](results/greeting-replay.mjs): for each encounter of a pack (the tour's six and the
   four party conversations), it renders the greeting messages exactly as `startEncounter` does
   (`buildNarrationMessages` with the encounter's base ratio, location name, ambient entries). The old variant is the
   HEAD template text; the new one swaps in the two lines above, written out in the script. It calls the provider
   with the narration schema and records each output's share. A test checks that, after the build, the script's
   new variant equals what `buildNarrationMessages` renders.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 cb51faf0…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | "about 5%" and "1 in every 10" disagree; the floor turns 0 into 10% | 0 | Accept: a 20-word example, K = round(ratio × 20), no floor; test 0, 0.05, 0.25, 0.6 | **Accepted** (autonomous, pending owner review) | Decision 2, Design 1–2, Tests |
| 1.2 | Error | The refrain clause contradicts the metric | 0 | Accept in part: drop the clause (one variable); report the Fountain's share with and without its refrain | **Accepted in part** (autonomous) | Decision 1, Live runs |
| 1.3 | Error | `notInTranslation` cannot reliably show improvement | 0 | Accept in part: add a hand count of target-language words in every greeting (both sides); blinded token annotation deferred | **Accepted in part** (autonomous) | Claim boundary, Live runs |
| 1.4 | Risk | "Never names an open answer" changes answer policy too | 0 | Accept: drop it | **Accepted** (autonomous) | Decision 1 |
| 1.5 | Risk | Surface-form scans cannot show "no new leaks" | 0 | Accept: read every line flagged by the scan and every greeting | **Accepted** (autonomous) | Live runs |
| 1.6 | Risk | Tours before and after compare different states | + | Accept in part: paired greeting replays (identical prompts but for the rule) are the A/B; tours remain as integration checks | **Accepted in part** (autonomous) | Decision 3, Design 4 |
| 1.7 | Risk | An aggregate bar can hide regressions | 0 | Accept: per-language and per-encounter bars, set below | **Accepted** (autonomous) | Live runs |
| 1.8 | Risk | Per-line quotas clash with short natural lines | 0 | Accept in part: the replays test the shortest lines (greetings); a rolling budget is deferred | **Accepted in part** (autonomous) | Deferred |
| 1.9 | Suggestion | Behavioural cases, repeated paired generations | 0 | Accept in part: two paired replays per cell; no reviewed case set | **Accepted in part** (autonomous) | Design 4, Deferred |

Net change: a 20-word worked example in place of "per ten"; the refrain and answer clauses are dropped; the A/B
moves to paired greeting replays with hand counts; the bars are per language and per encounter.

## Tests (pre-run)

- Golden test on the r026 fixture (rendered greeting and turn for it and es).
- New: the system prompt renders "about 25%" and "about 5 words" for 0.25, "about 1 words" is not produced for
  0 (0 → "about 0 words"), and 0.05 → 1, 0.6 → 12. The replay script's new variant equals the built template's output.
- Full server, mobile and web client suites.

## Live runs (pre-run)

codex-cli, sequential, never two live jobs at once.

1. Baseline tours on HEAD f3efed7 (it, es), started before the plan (journal row 2).
2. Paired greeting replays: 10 encounters × 2 languages × 2 variants × 2 replays = 80 calls, alternating variants.
3. After the build: tours it and es.

Measures: mean share against requested, mean absolute gap |share − requested|, lines more than 0.10 under and
over, per encounter and language; the hand-counted target-language words per greeting; the scan for open targets
plus reading the flagged lines and all greetings; tour pass (all resolved, Rift sealed then open).

**Keep the rule if, in the paired replays:** the mean absolute gap falls in both languages; Portia's greeting share
rises by at least 0.05 in both; no encounter's gap rises by more than 0.10 in either language; and the hand count
agrees in direction with the estimate. In the tours after the build: both pass, with no new open-answer line found
by reading. **Otherwise revert by Amendment.**
