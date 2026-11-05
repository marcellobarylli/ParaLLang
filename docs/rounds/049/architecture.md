# Round 049 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G7; [round 048 findings](../048/findings.md) (NPCs say other conversations' targets).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/scripts/leak-scan.js` (`foreignFormsFor`, per-scene `foreign`), tests in
  `server/test/leak-scan.test.js`, `docs/rounds/049/results/measure.mjs`. No live LLM calls, no content change.

## Goal (pre-run)

Measure how often NPC lines carry a target that a party conversation teaches, outside that conversation
("other-target exposure"), and read what those words are, before deciding whether any content rule is needed.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **No automatic decision rule** (critiques 1.3, 1.5, 1.6). plan-v1's "under 5% closes G7" is dropped. An exact
   form of another conversation's target is not proof that a word is taught early (*grazie* is everyday
   vocabulary), and exact matching is only a lower bound. The decision is taken by reading the per-owner table of
   the current-content cohort (round 048's reports), word by word: an everyday word an NPC would say anyway, or a
   lesson word that gives a later conversation away.
2. **The metric is called other-target exposure** (`foreign` in the code), counted apart from the four leak kinds.

## Design (pre-run)

1. `foreignFormsFor(content, encounterId)`: whole forms (target and `surface_variants`) of every entry a party
   conversation targets, minus entries the scene's encounter targets **and minus forms equal (folded) to one of the
   scene's own forms** (critique 1.3, shared surfaces). Each form has owner and entry id.
2. Per scene: `foreign: [{ line, hits: [{ owner, id, form, echo, english }] }]`, computed for every line
   independently of the existing early return (critique 1.8); `foreignLines` counts lines with at least one fresh,
   non-English hit, once per line whatever the number of owners (critique 1.1).
3. **Echo per message** (critique 1.7): a hit is echo only if one earlier player message holds the whole form by
   itself (not the joined text). The four existing kinds keep their joined-text echo (unchanged, noted).
4. **English look-alikes** (critique 1.2): a hit whose form is in `FOREIGN_ENGLISH` (`amigo`, borrowed by English,
   round 047 critique 1.4) is marked `english` and not counted.
5. **Rates** (critiques 1.1, 1.4, 1.6): `summarize` reports `foreignLines` and `partyLines` / `partyForeignLines`
   from party-conversation scenes only. `measure.mjs` tabulates by cohort (the report's round), language, scene
   encounter and owner, with sample sizes; owner counts are not additive (a line can hit two owners).
6. Existing kinds, their counts and output rows are unchanged; `foreign` rows are appended.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 66d02165…; Codex, effort high (a bundle on stdin, no file access); raw
text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Numerator and denominator cover different scenes | + | Accept: party rates from party scenes only; a line counts once | **Accepted** (autonomous, pending owner review) | Design 2, 5 |
| 1.2 | Error | Exact matches can be English look-alikes | + | Accept: `FOREIGN_ENGLISH` marks and excludes them; a regression test | **Accepted** (autonomous, pending owner review) | Design 4, Tests |
| 1.3 | Error | Another conversation's target is not premature teaching | + | Accept: named exposure; shared surfaces removed; a word-by-word reading decides | **Accepted** (autonomous, pending owner review) | Decision 1, 2, Design 1 |
| 1.4 | Risk | Today's content on old reports | + | Accept: tables by cohort; the decision reads round 048's cohort (current content) | **Accepted** (autonomous, pending owner review) | Decision 1, Design 5 |
| 1.5 | Error | An exact-only lower bound cannot close G7 | + | Accept: the claim is narrowed to exact forms; no threshold closure | **Accepted** (autonomous, pending owner review) | Decision 1 |
| 1.6 | Risk | Pooling hides concentrated failures | + | Accept: by language, encounter and owner, with sample sizes | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.7 | Risk | Joined-text echo matches across messages | + | Accept for foreign hits (per message); the existing kinds unchanged, noted as an open item | **Accepted in part** (autonomous, pending owner review) | Design 3 |
| 1.8 | Risk | Foreign-only lines behind the early return | + | Accept: computed before it; a foreign-only test | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.9 | Risk | Aggregation and output compatibility unprotected | + | In part: Spanish, variants, shared surfaces, zero-hit and summary cases; existing kinds' counts asserted unchanged. No CLI output test (`main` is not exported) | **Accepted in part** (autonomous, pending owner review) | Tests |

Net change from plan-v1: no 5% rule (a reading of the current cohort decides), party-only rates, per-message echo,
English look-alikes and shared surfaces excluded, tables by cohort, language, encounter and owner.

## Tests (pre-run)

`server/test/leak-scan.test.js`: a flick_lotus line "Eccomi, sono sveglio!" is a foreign-only line (owner
`marginalia_folded_page`) and leaves the four kinds at 0; its own *coraggio* is not foreign; Spanish *¡Gracias,
amigo!* in flick_lotus counts *gracias* (owner `gerald_coffee_break`) and marks *amigo* english; a gerald_coffee_break
line "Grazie!" is not foreign there; an echo needs one earlier message holding the whole form (messages "amico" and
"mio" do not echo "amico mio"... the form is "amico", so: a message "Sei mio amico" echoes, a message "amic" does not);
`summarize` carries `foreignLines`, `partyLines`, `partyForeignLines`; a line with a leak and a foreign hit keeps its
leak kind and counts.
