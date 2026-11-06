# Round 069 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** [round 060](../060/architecture.md) (backlog C9, kept lines) and its
  [findings](../060/findings.md), which were checked by fixture tests only; STATE.md's first next candidate.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `results/kept-lines-live.mjs` (in-process live script), its reports. No product code unless a check
  fails.

## Goal (pre-run)

Check round 060's kept lines end to end with real provider output (codex-cli, it and es): a paid sentence reveal of
a real NPC line reaches the save and the Spellbook unchanged, is hidden during the encounter and while its cards are
due, opens after their review, and survives a restart of the service.

Offline, before the plan: 1,170 NPC lines in earlier rounds' live reports are at most 377 characters (translations
355; medians 142 and 147), so the 500-character cap (`LINE_TEXT_LIMIT`) has never cut a recorded line.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A script, not a product change.** The live check is a round-local script, like round 068's
   `atmosphere-live.mjs`; a failing check becomes a fix with a test by Amendment.
2. **Gerald and Mortimer in one save, per pack**, so lines from two places accumulate and the newest-first order and
   dedupe are seen across encounters. Mortimer's scripted failures give extra NPC lines to reveal.

## Claim boundary (pre-run)

Server behaviour with real codex-cli text in two of six encounters, two packs. Not the app's rendering, the
Simulator, VoiceOver or claude-cli.

## Deferred (pre-run)

- Lines from free translations (an owner question from round 060).
- Re-hiding a line when a reviewed card falls due again (critique 1.8): needs a controlled clock; the fixture tests
  in `server/test/kept-lines.test.js` cover the due rule.
- Text dedupe of two different messages with the same folded text (critique 1.6): fixture-tested only; a repeat
  reveal of one message (step 4) tests charging, not dedupe.

## Design (pre-run)

`results/kept-lines-live.mjs`, in-process (real `LearningService`, `JsonLearningStorage` in a `makeTempDir` dir
removed at the end, `--provider codex-cli`, JSON on stdout, exit 1 if a check fails). Per pack, one save: walk to
the Coffee Cart, then the Butcher's Stall (`route()`), and in each:

1. Start the encounter. At Mortimer's start, every line kept so far is hidden with `translation: null`
   (in-encounter rule; critique 1.4).
2. Reveal the greeting by sentence: `charged`; the response's newest line has the greeting's id, speaker, native,
   the location's name, `translation: null`, `hidden: true`, vocabularyIds equal to its chipped words in order.
3. The raw save file holds the provider's native and translation equal to `.slice(0, 500)` of the dialogue fields
   (UTF-16 units; critique 1.9) and the scene's `locationId`.
4. The same reveal again: not charged, the save's line count unchanged (charging only, not dedupe; critique 1.6).
5. A word reveal of the greeting's first chip, if any: charged or `HINTS_EXHAUSTED`; either way the save's line
   count is unchanged (critique 1.2).
6. Play play-market.js's scripted lines. After each reply that leaves the encounter **ongoing**, reveal the newest
   line by sentence (critique 1.1); `HINTS_EXHAUSTED` is recorded and the save must be unchanged. A charged reveal
   must be newest first.
7. After the resolve: `inEncounter` false, and each line is hidden exactly when one of its vocabularyIds is a card
   in the Spellbook that is due (the code's oracle, critique 1.5), with `translation: null` iff hidden.
8. Review every due card named by a kept line with its first accepted translation (local grading). Assert each
   review was correct and that card is no longer due (critique 1.5); then every line shows exactly the save's
   translation, and the lines' ids equal the charged reveals, newest first.
9. After both encounters: a new `LearningService` on the same storage returns the same lines.

The report records, per encounter, the transitions actually seen (critique 1.4): lines hidden after the resolve,
lines opened by review, lines with no card at all, reveals refused.

## Pass criteria (pre-run)

- **Pass**: all four encounters resolve, every check holds, and in each pack at least one **later** (non-greeting)
  line was revealed and kept (critique 1.3), and at least one line went from hidden after the resolve to shown after
  review (critique 1.4).
- **Inconclusive**: a provider failure or an unresolved encounter; that pack is re-run once and both attempts kept
  (critique 1.7). Two such attempts in a pack, or missing coverage above, is inconclusive, not a pass.
- **Fail**: any check false. A fix then goes in by Amendment with a fixture test.
- Expected calls: about 16 (codex-cli).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 29502670…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Revealing after the resolving reply is refused (state not ongoing) | 0 | Accept: reveal only while ongoing | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.2 | Error | The word reveal after a paid sentence may hit the hint limit | 0 | Accept: either outcome, save unchanged | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.3 | Gap | No threshold for later reveals; could pass on greetings only | + | Accept: at least one later line per pack | **Accepted** (autonomous, pending owner review) | Pass criteria |
| 1.4 | Risk | Visibility checks can pass vacuously | + | Accept: record transitions; require hidden→shown per pack; check kept lines hidden at the next start | **Accepted** in part (autonomous, pending owner review): no partial-review multi-card case (its cards are reviewed in one pass) | Design 1, 8; Pass criteria |
| 1.5 | Error | "Reviewed" is the wrong oracle; hiding follows due cards in the Spellbook | 0 | Accept: oracle from cards; assert reviews clear due | **Accepted** (autonomous, pending owner review) | Design 7, 8 |
| 1.6 | Gap | A repeat reveal tests charging, not dedupe | 0 | Accept: narrow the claim; dedupe stays fixture-tested | **Accepted** (autonomous, pending owner review) | Design 4, Deferred |
| 1.7 | Risk | Reruns need an inconclusive outcome | 0 | Accept | **Accepted** (autonomous, pending owner review) | Pass criteria |
| 1.8 | Gap (Optional) | Re-hiding when a card falls due again is untested | 0 | Defer: needs a controlled clock; fixture-tested rule | **Deferred** (autonomous, pending owner review) | Deferred |
| 1.9 | Risk (Optional) | Corpus lengths do not test the cap; slice is UTF-16 units | 0 | Accept: state `.slice(0, 500)`, claim only "never reached" | **Accepted** (autonomous, pending owner review) | Goal, Design 3 |

Net change: reveals only while ongoing, refusals tolerated, the oracle from due cards, coverage thresholds and an
inconclusive outcome.

## Tests (pre-run)

No product code, so no new unit tests; the full server, client and mobile suites must stay green. The script is the
check; it must parse (`node --check`).

## Outcome (2026-11-06)

Pass on the pre-run criteria: it 30/30 and es 28/28 checks, all four encounters resolved, 3 later lines kept and 5
(it) / 3 (es) lines opened by review, one refused reveal per pack with the save unchanged. The first Italian attempt
stopped on a script bug (it read a withheld translation from the serialized transcript); the fixed script is the
one in `results/`. No product change. See [findings.md](findings.md).
