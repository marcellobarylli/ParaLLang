# Round 010 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 node 3 ("A Charcutier who insists everything is
  'jamón'", meats, quantities, numbers); backlog A4 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md);
  [round 006](../006/architecture.md) (encounters are content), [round 009](../009/architecture.md) (per-encounter
  narration matching).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/` (character, two encounters, two vocabulary files, the location),
  `server/scripts/play-market.js`, tests.

## Goal (pre-run)

The Butcher's Stall gets its encounter, a Charcutier who insists everything is ham, in the Italian and Spanish packs,
as content only. Gerald and Portia play as before; the frozen web client is unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Mortimer the Charcutier:** booming, generous, certain and wrong about taxonomy; he calls every cut by the
   target-language word for ham (prosciutto / jamón), his hat included, trusts only his honest scales, and rates meat
   in his English like an influencer ("certified ham", "ham-adjacent"). Difficulty 2, `base_target_ratio` 0.3,
   +0.05 per turn, saveable.
2. **Two objectives:** `name_meat`, ask for a meat that is not ham by its real name (it salame, salsiccia, pollo; es
   chorizo, salchicha, pollo; asking for ham does not pass); `quantity`, a number or a half with a unit of weight
   (required group the unit: it etto, chilo, grammi; es kilo, gramos; numbers it tre, cento, mezzo; es dos, tres,
   cien, medio are targets but not required, so "un chilo" passes; a bare unit does not, by the rubric).
3. **Ham is authored vocabulary** (he says it constantly) but not a passing target.
4. **No Italian `due` entry and no `chili` variant** (critique 1.1): both are English words ("due", "chili") that
   matching would chip in Mortimer's English. "Due etti" still passes through *etti*.
5. **No companion briefing**, and no tutorial gate: a player may reach Mortimer before Portia (critique 1.4).
6. **Reference URLs** as round 009 (not opened from the container).
7. **Second opinion:** see the table.

## Claim boundary (pre-run)

The round can claim: the encounter loads and plays in both packs in-process (fixture grader) and live as reported,
including the live verdicts on ham and a bare unit. It cannot claim teaching quality as judged by a learner or the
owner, that the reference URLs resolve, or anything in the iOS Simulator.

## Deferred (pre-run)

The party (A8, Mortimer is saveable), a tutorial gate, prices and a price-comprehension objective, Simulator checks.

## Design (pre-run)

- `content/characters/enemies/charcutier_mortimer.yaml`; `content/world/locations/butchers_stall.yaml`
  `encounter: butchers_stall_charcutier`.
- Per pack `encounters/butchers_stall_charcutier.yaml` and `vocabulary/butcher_meats.yaml` (`butcher-meats-it-v1`,
  `butcher-meats-es-v1`). Vocabulary it (10): prosciutto, salame, salsiccia, pollo, etto, chilo, grammi, tre, cento,
  mezzo. es (10): jamon, chorizo, salchicha, pollo, kilo, gramos, dos, tres, cien, medio. Plurals as surface variants
  (salsicce, etti, grammo; salchichas, kilos, gramo); no `chili`, no `media`.
- `resolved_message`: "Mortimer weighs your order twice, wraps it in paper labelled with the wrong word, and lets you
  go."
- `play-market.js`: a `butchers_stall` script with the negative cases first (critiques 1.3, 1.5): it "Vorrei del
  prosciutto, per favore.", "Vorrei del salame, per favore.", "Chilo.", "Due etti, per favore."; es "Quiero jamón,
  por favor.", "Quiero chorizo, por favor.", "Kilo.", "Medio kilo, por favor."
- `server/test/encounters.test.js`: the Bernard fixture's content copy removes the real Spanish butcher encounter and
  vocabulary file (same location, same `jamon` id). No engine or app changes.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 cb1bb21e…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Italian `due` and `chili` are English words and would be chipped | − | Accept | **Accepted** (autonomous, pending owner review) | Decision 4 |
| 1.2 | Error | The real-pack test's combined version assertion breaks | 0 | Accept | **Accepted** (autonomous, pending owner review) | Tests |
| 1.3 | Error | The ham-negative live run has no script | 0 | Accept: in the butcher script | **Accepted** (autonomous, pending owner review) | Design |
| 1.4 | Error | "The tutorial has introduced the mechanics" is not guaranteed | − | Accept: drop the claim, no gate | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.5 | Gap | Nothing checks that a bare unit fails | + | Accept: "Chilo." / "Kilo." in the live script | **Accepted** (autonomous, pending owner review) | Design |
| 1.6 | Cut | Client tests, build and iOS export for a content-only change | − | Partly: drop the iOS export; keep mobile and web tests and the web build (the run's quality bar) | **Partly accepted** (autonomous, pending owner review) | Tests |
| 1.7 | Cut | Three identical Italian runs | − | Partly: two Italian runs and one Spanish, each with the negative cases (sampling varies run to run) | **Partly accepted** (autonomous, pending owner review) | Tests |

Net change from plan v1: −1 entry, −2 variants, −1 iOS export, −2 live runs (and the separate ham run folded into
the script), +2 negative script lines per language.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: all existing tests, with the real packs holding three encounters each and the
   combined version including `butcher-meats-<code>-v1` (critique 1.2). New `server/test/butcher.test.js` in both
   packs: the encounter loads at `butchers_stall`; a player walks there from the start and plays it with a test
   grader (ham alone fails `name_meat`; salame / chorizo passes; un chilo / medio kilo passes `quantity`) to
   resolution; the map marks it complete; Mortimer's line gets chips only from his own file.
2. `npm run test:mobile`; web client tests and build (unchanged code).
3. Live, codex-cli: `play-market.js --location butchers_stall` twice in Italian and once in Spanish. Findings: the
   verdict on each scripted line (ham and the bare unit should fail), resolution, share, dictation, feedback leaks,
   representative lines.

## Amendment 2026-11-05: the grading rubric shows surface forms (autonomous, after the first live runs)

**Why.** In both Italian runs the grader passed "Due etti, per favore." with no vocabulary evidence, and the server
rejected the verdict (`INVALID_GRADING`, "passed an objective without the required Italian evidence"), so the
encounter could not resolve. The grading prompt says to report a vocabulary id only when "its authored surface form
is present", but the rubric (`targetData` in `server/src/llm/prompt-builder.js`) has listed only the canonical
`target` ("etto") since round 001, never the authored `surface_variants` ("etti"). Gerald's scripted answers always
used canonical forms, so this never showed.

**Change.** The grading rubric's targets gain `forms` (the entry's `surface_variants`), and the grading rule reads
"when one of its authored forms (`target` or any of `forms`) is present". The narration prompt's learning data is
unchanged, so Gerald's pinned narration prompts stay byte-identical. A test checks both. Gerald's grading prompt does
change, so `verify:cli` (codex-cli, Italian) is re-run alongside the three butcher runs.

**Decision.** Autonomous, pending owner review: a prompt fix rather than a content workaround (making "etti" the
target), because every plural or alternative spelling in every pack had the same problem.
