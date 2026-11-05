# Round 012 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** backlog E3 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); live data from
  [round 010](../010/findings.md) (Mortimer's menu, 3/3) and [round 011](../011/findings.md) (Flick, 1/4); the
  round 007 no-dictation rule ([round 007](../007/architecture.md)).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/narration/style_guide.yaml`, `server/test/fixtures/gerald-prompts-r012.json`, tests.

## Goal (pre-run)

NPCs no longer offer an open objective's passing target words as options to choose from, so the player recalls the
word instead of picking it from a list. A narration-prompt change only; verdicts, grading and the app are unchanged.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **One style rule** after the round 007 no-dictation rule: "Never offer an open objective's target words as
   options to choose from: no list and no either/or question built from them (no 'X, Y or Z?' menu of the targets).
   Ask an open question instead, or name what is wrong without naming the answer." The round 007 sentence "Target-
   language words may appear naturally in the character's own questions and remarks" stays.
2. **Portia's "Come ti chiami?" stays allowed** (round 009 open item 3): hearing the question and reusing it is
   modelled input in the gentlest encounter, not a menu.
3. **Words still appear naturally** (Mortimer's prosciutto, Flick's dopo / domani, Gerald's caffè); only menus of an
   open objective's passing targets are banned.
4. **Second opinion:** see the table.

## Claim boundary (pre-run)

The round can claim the menu rate in the live runs as reported, against the round 010–011 baseline at the same
prompt otherwise. Small samples (a handful of runs); it cannot claim a rate in general, other providers, or teaching
quality as a learner or the owner would judge it.

## Design (pre-run)

- `content/narration/style_guide.yaml`: the rule (filled into `prompts/system/base.txt`, STYLE block, since round
  007).
- Gerald's pinned narration prompts change on purpose: `server/test/fixtures/gerald-prompts-r012.json` regenerated
  with the test's arguments (the generator was first checked to reproduce `gerald-prompts-r007.json` byte for byte at
  HEAD 88442bd), the r007 file removed, and the golden test asserts the new rule is in the rendered prompt.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 24ea76fc…; Codex, effort high, code inlined on stdin;
raw text in [`trail/critique-1.md`](trail/critique-1.md). Dispositions are autonomous decisions by Claude, pending
owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Cut | Mobile and web suites and build for a YAML-only change | − | Reject: the run brief requires every suite before a non-wip commit | **Rejected** (autonomous, pending owner review) | Tests |

Net change from plan v1: none.

## Tests (pre-run)

1. `node --test server/test/*.test.js` (golden fixture regenerated), `npm run test:mobile`, web client tests and
   build.
2. Live A/B, codex-cli. Baseline: round 010's after runs (butcher 3/3 menus) and round 011 (fountain es 1/1, it
   0/3). After: `play-market.js --location butchers_stall` 2× it, 1× es; `--location cracked_fountain` 1× es;
   `--location coffee_cart` 1× it and `--location market_entrance` 1× it (regressions: both resolve, no dictation;
   Portia's question noted). Every NPC line is read and classified: a menu of an open objective's targets yes/no,
   dictation yes/no. Success: no menus in the after butcher and fountain runs, and every run resolves with the
   same scripted verdicts.

## Outcome (2026-11-05)

Built as designed. Live codex-cli, six runs: every run resolved with the scripted verdicts of rounds 009–011, and no
NPC offered a menu of an open objective's targets in the four butcher and fountain runs (baseline 4/4 at the same
prompt without the rule). After the ham request Mortimer now asks an open question ("Che cosa desidera?", "¿Qué
carne quieres?"). Gerald and Portia played as before, without dictation. Tests: server 88/88, mobile 20/20, web
client 12/12 and build. Process slip: the freeze commit also carried the staged removal of the r007 fixture, so the
golden test fails at that one commit (journal row 9). See [findings](findings.md).
