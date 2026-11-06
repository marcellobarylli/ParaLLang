# Round 052 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog H2; [round 050 findings](../050/findings.md) (no number lesson behind *sono le* /
  *son las*).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** objective `minutes` in `content/languages/{it,es}/encounters/flick_slow_walk.yaml`, the numbers in
  `content/languages/{it,es}/vocabulary/flick_party.yaml` (v2), offset mapping in `matchCanonicalVocabulary`
  (`server/src/language-engine.js`), tests.

## Goal (pre-run)

Teach the numbers two to twelve where a number is natural: Flick's first party conversation, in which Flick "wants
five more minutes". The player bargains with a number of minutes before getting Flick moving. This comes after the
Fountain (Flick joins the party only after its encounter), so it is **reinforcement for telling the time, not its
prerequisite** (critique 1.1): it puts number cards in the Spellbook and numbers into later play. The Fountain still
accepts *sono le* / *son las* with any number.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Where:** a new first objective `minutes` in `flick_slow_walk` (it, es), before `lets_go` and `together`, ordered
   as today. Not the Fountain (four objectives already), not a deeper tier (a numbers lesson should not wait three
   conversations). A player already past three conversations meets `flick_lotus` instead (stated limit).
2. **Which numbers:** 2–12. One is left out: the Fountain teaches *è l'una* / *es la una*, and "one minute" is *un
   minuto*, so a bare *uno* would not match the natural answer.
   - it: `due`, Mortimer's `tre` (existing id), `quattro`, `cinque`, `sei`, `sette`, `otto`, `nove`, `dieci`,
     `undici`, `dodici`.
   - es: Mortimer's `dos`, `tres` (existing ids), `cuatro`, `cinco`, `seis`, `siete`, `ocho`, `nueve`, `diez`,
     `once`, `doce`.
   New entries go into `flick_party.yaml` (v2), plus a non-target `minuti` / `minutos` entry (forms `minuto`,
   `minuti` / `minuto`, `minutos`), so the word is chipped.
3. **English collisions, accepted knowingly** (critique 1.5): it `due`, es `once`, Italian `sei` ("you are"), the
   name Otto. Chips are matched only in this conversation's NPC `dialogue.native`. The cross-file targets pull
   Mortimer's whole butcher file into this conversation's chips (es `chorizo`, it/es `chili`/`kilo` forms): real
   target-language words that chip only when said. A test pins the exact list of English-word forms among
   `flick_slow_walk`'s narration entries, per language, so a new one is a deliberate change. The overlap test's
   blocklist gets a per-language, per-entry exception for it `due`.
4. **Exposure** (critique 1.2): before the player's first number, Flick says no target-language number. Once the
   player has named one, Flick may haggle back with a different target-language number (it hears more numbers);
   it never gives the answer to an open objective.
5. **What passes** (critiques 1.7, 1.8): the player's own offer of a number of minutes from two to twelve, the number
   as a target-language word, alone or with *minuti* / *minutos*, also as a tentative question ("Tre?") or a
   correction ("Non cinque, due minuti!"). Agreeing to five passes. Agreement slips ("due minuto") pass; feedback
   may correct them in English. Rejected: English-only numbers, digits, numbers outside 2–12 (*cento*), a number that
   is not an offer of minutes ("Sei stanco", "Tre ore"), a refusal, a quotation, talk about the word.
6. **Spelling tolerance** (critique 1.3): `matchCanonicalVocabulary` always folds accents (known since round 010;
   `accent_insensitive` is ignored), so *séis* matches *seis*. Not changed in this round; the grader judges
   spelling. Stated limit.

## Claim boundary (pre-run)

- One provider (codex-cli), two runs per language. The grader's handling of the negative cases is one observation
  each, not a rate.
- Players past three conversations with Flick never meet the objective; the Fountain itself is unchanged.
- No Simulator: the chips and the Spellbook's number cards are not seen on a phone.

## Design (pre-run)

1. **Content** as above. The `minutes` intent says Flick asks in one English sentence for "five more minutes",
   does not introduce itself in its greeting, says no target-language number before the player, and does not say
   *andiamo* / *insieme* (*vamos* / *juntos*) before the player has (critique 1.9: the rule moves up from `lets_go`,
   which keeps it). `lets_go` now says Flick's minutes are up.
2. **Lotus fragment:** its text held «Cinque minuti» / «Cinco minutos», now pack vocabulary (fragment rule). It
   becomes «Un attimo» … e poi un altro attimo / «Un momentito» … y luego otro momentito, with glossary lines.
3. **Errata's containment file** (identical in both packs) held the English "at once" and "once the other five",
   now a Spanish target: "at the same time", "after the other five".
4. **Matcher offsets** (critique 1.4): `matchCanonicalVocabulary` folds the source cluster by cluster (a base
   character with its combining marks) and keeps a map from folded to source indices, so `start`, `end` and
   `excerpt` index the source even when it holds decomposed accents. NFC text gives the same results as today.

## Tests (pre-run)

- Every number id of each pack matches its form through the real index (all eleven, both packs), `minuto` and
  `minuti` / `minutos` match the minutes entry, and `flick_slow_walk`'s narration entries include Mortimer's file
  (critique 1.11).
- The pinned English-word list of `flick_slow_walk`'s narration forms (critique 1.5).
- A service test with a fixture grader: "Sette minuti" passes `minutes` and records evidence for `sette`; "Tre."
  passes and records Mortimer's `tre`; "Two minutes." fails; the objective order holds (critique 1.10: plumbing
  only; the real grader is tested live).
- Matcher: decomposed "é due" gives the excerpt `due` at the right offsets; NFC results unchanged.
- Pinned counts and versions updated on purpose; the fountain test's "Sono le dieci e mezza" now also matches
  `dieci`; the Rift test counts entries reachable from location encounters (Mortimer's `tre` is a party target now).
- Gerald's pinned narration prompts unchanged.

## Live (pre-run)

codex-cli, `play-market.js --party --member cracked_fountain`, its script now: "Five more minutes? No." (English,
fails), "Due minuti!" / "¡Dos minutos!", the let's-go and together lines. 1 × it, 1 × es. Then `--lines` variants,
1 × it, 1 × es: "Sei stanco." (not an offer, fails) / "Tres horas." (fails), "Non cinque, tre minuti." / "Diez
minutos, ni uno más." (passes; Mortimer's id in it), "Andiamo!" / "¡Vamos!", "Insieme." / "Juntos.". Then
`leak-scan.js` on the reports; read Flick's lines for a number before the player's and for chipped English.

## Success (pre-run)

All tests pass. In the four live runs: every conversation resolves, the verdicts are as scripted, no Flick line holds
a target-language number before the player's first number, and *andiamo* / *vamos* do not appear before the player
says them.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 b75aa69d…; Codex, effort high (a bundle on stdin, no file access); raw
text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The lesson comes after the Fountain's time objective | + | Accept: framed as reinforcement, not a prerequisite | **Accepted** (autonomous, pending owner review) | Goal |
| 1.2 | Risk | One answer does not teach eleven numbers | + | Accept in part: Flick may haggle back with numbers after the player's first | **Accepted in part** (autonomous, pending owner review) | Decision 4 |
| 1.3 | Error | `accent_insensitive: false` is ignored | 0 | Accept as a stated limit (known since round 010); the grader judges spelling | **Accepted** as a stated limit (autonomous, pending owner review) | Decision 6 |
| 1.4 | Error | Folded offsets drift on decomposed text | + | Accept: cluster-wise folding with an index map, test | **Accepted** (autonomous, pending owner review) | Design 4, Tests |
| 1.5 | Risk | Collision checks miss the narration entries (kilo, chorizo, sei, Otto) | + | Accept: pinned English-word list over the narration entries; specific exception | **Accepted** (autonomous, pending owner review) | Decision 3, Tests |
| 1.6 | Risk | Boundary cases (due-to, hyphens) | 0 | Reject the extra matcher tests: whole-word matching is tested since round 001; semantic grading handles meaning | **Rejected** (autonomous, pending owner review) | — |
| 1.7 | Risk | A number can pass without being an offer | + | Accept: range and meaning in the constraints, examples for corrections | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.8 | Question | Grammar tolerance | + | Decide: agreement slips and tentative questions pass, feedback may correct | **Accepted** (autonomous, pending owner review) | Decision 5 |
| 1.9 | Risk | The answer-protection rule sits in `lets_go` only | + | Accept: also in `minutes` | **Accepted** (autonomous, pending owner review) | Design 1 |
| 1.10 | Risk | A fixture grader cannot validate grading | 0 | Accept in part: fixture tests are plumbing; negative and correction cases go live | **Accepted in part** (autonomous, pending owner review) | Tests, Live |
| 1.11 | Risk | Coverage underspecified | + | Accept in part: all eleven ids through the real index; exact live scripts | **Accepted in part** (autonomous, pending owner review) | Tests, Live |

**Deferred:** Spanish example "Diez minutos, nada más" (kept "ni uno más", natural); references for the numerals and
*minuto* (already in the draft, Wiktionary); the overlap test's description (updated in the test).

Net change from plan-v1: reinforcement framing, Flick may haggle after the player's first number, range and meaning
in the grading constraints, the protection rule in `minutes`, a matcher offset fix, a pinned English-word list.

## Amendment 1 (2026-11-05): the variant runs wait for Codex's reset

The two scripted runs (it, es) were played. The first variant run (it) failed before the slow walk: Codex reached its
usage limit at about 23:14 UTC, on the Fountain's last line, so Flick was never recruited (its report is kept as
`results/variant-it-provider-limit.json`). Codex's message gives the reset as 01:36 UTC on 2026-11-06. The round
stays open. The variant runs (it, es) are queued for the next iteration, with the same `--lines` as in Live. Nothing
else in the design changes.

## Outcome (2026-11-06)

All four live runs met the success criteria: every conversation resolved with the scripted verdicts, no Flick
number or *andiamo* / *vamos* came before the player's, and the slow walk had no leaks. See
[findings.md](findings.md).
