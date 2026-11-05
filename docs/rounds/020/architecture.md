# Round 020 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog E1 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); round
  [019 findings](../019/findings.md) (ambient words did not raise Portia's share; her lines are one target-language
  formula plus English paperwork humour).
- **Findings:** [`findings.md`](findings.md), after the runs.
- **Artifact:** `content/characters/enemies/archway_portia.yaml`, a test, `results/`.

## Goal (pre-run)

Portia's lines move towards their requested share of target language (0.20 at the greeting, +0.05 a turn) by a
change to her character sheet alone, with no answer to an open objective modelled.

**Hypothesis.** Her sheet's quirks are all English-framed paperwork and manners, so the narrator writes the jokes in
English around one formula. A quirk that puts short formalities in the target language, using her free vocabulary,
raises the share. Exploratory: a handful of runs (critique 1.7).

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Content before template.** Only Portia's sheet changes; the shared language rules and greeting template stay
   (they would change every NPC and Gerald's pinned prompts).
2. **Revert if it fails.** If the success criterion below is not met, the quirk is removed in the same round (an
   Amendment) and E1 becomes a template question.
3. **Round 019's after-runs are the baseline** (same model, script and settings, run 10 minutes earlier; critique
   1.7 asked for contemporaneous runs).

## Claim boundary (pre-run)

Rough share measures on 3 Italian and 1 Spanish scripted runs plus 1 variant: whether the share moves by a visible
margin, not a small-effect estimate. Manual token labelling (1.6) is not done; absolute target-token counts are
reported instead.

## Design (pre-run)

Add one quirk to `archway_portia.yaml` (shared by both packs), keeping the four there:

> "Conducts her formalities in the dialogue's target language, in short phrases: welcomes, approvals and remarks
> about the market, using her free vocabulary, never the words the visitor still has to say; she addresses visitors
> informally, and her grumbling asides stay in English"

- "the dialogue's target language" rather than "the visitor's language" (1.2); "short phrases" and the asides in
  English keep beginner context (1.3); "never the words the visitor still has to say" is the explicit guard (1.1);
  "informally" keeps the tu / tú register the ask-back objective needs (1.4).
- Gerald's pinned prompts do not change (his sheet is separate).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 83f92471…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | "Words she has been given" includes the objectives' answers | + | Accept: name free vocabulary, forbid the visitor's words | **Accepted** (autonomous) | Design |
| 1.2 | Risk | "Visitor's language" can mean English | + | Accept: "the dialogue's target language" | **Accepted** (autonomous) | Design |
| 1.3 | Risk | The quirk may overshoot the ratio and strip English context | 0 | Accept in part: "short phrases"; report lines over requested + 0.15 and token counts | **Accepted in part** (autonomous) | Design, Live runs |
| 1.4 | Risk | Formalities invite sono / come ti chiami and formal Lei | 0 | Accept: guard wording, informal register; read every line against all open objectives | **Accepted** (autonomous) | Design, Live runs |
| 1.5 | Gap | Spanish has no gate | 0 | Accept in part: Spanish leak list from its objectives; one run, exploratory | **Accepted in part** (autonomous) | Live runs |
| 1.6 | Gap | Share measure depends on the translation | 0 | Accept in part: report absolute target tokens and totals; no manual labelling | **Accepted in part** (autonomous) | Claim boundary, Live runs |
| 1.7 | Gap | Thresholds against old runs cannot establish the effect | 0 | Accept in part: round 019's after-runs are contemporaneous; framed as exploratory | **Accepted in part** (autonomous) | Decision 3, Goal |
| 1.8 | Gap | Only happy paths are scripted | 0 | Accept in part: one English-first variant run | **Accepted in part** (autonomous) | Live runs |
| 1.9 | Gap | Prompt inclusion says nothing about verdicts | 0 | Accept: verdicts and transitions checked on every live transcript | **Accepted** (autonomous) | Live runs |

Net change: the quirk names free vocabulary and forbids the visitor's words, uses "target language", stays short and
informal; the runs add an English-first variant, Spanish leak checks and absolute token counts.

## Tests (pre-run)

- `server/test/ambient-vocabulary.test.js`: Portia's narration prompt (both packs) contains the new quirk; her
  grading prompt does not mention it.
- All suites: server, mobile 25/25, web client 12/12 and build.

## Live runs (pre-run)

codex-cli, sequential: 3 Italian tutorial runs, 1 Spanish, 1 Italian variant
`--lines 'Hello!|Ciao!|Mi chiamo Robin.|E tu?'` (the English greeting must fail without dictation).

- Per line: both share measures, tokens, absolute target tokens (tokens × not-in-translation), requested ratio, the
  line verbatim; lines over requested + 0.15 counted.
- Leaks: Portia saying, before the matching objective is passed, ciao / buongiorno, sono / mi chiamo / io sono, tu /
  come ti chiami (Spanish: hola / buenos días, soy / me llamo / yo soy, y tú / cómo te llamas) as a model answer;
  feedback leaks; verdicts and transitions as scripted.
- **Success:** Italian line mean (not in translation) ≥ 0.22 and greeting mean ≥ 0.15, verdicts as scripted, no new
  leaks. Otherwise decision 2.
