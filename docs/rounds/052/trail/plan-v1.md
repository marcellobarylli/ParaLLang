# Round 052 plan v1: numbers 2–12 in Flick's slow walk (backlog H2)

Autonomous round (no owner present), Claude (claude-opus-5-5). Backlog H2: the Fountain's time objective (round 050)
asks for *sono le …* / *son las …* but no encounter teaches the hours; only Mortimer's *tre* / *cento* (it) and
*dos* / *tres* / *cien* (es).

## Goal

Teach the numbers two to twelve in a place where a number is natural: Flick's first party conversation
(`flick_slow_walk`), where Flick already "wants five more minutes". The player bargains with a number of minutes
before getting Flick moving.

## Decisions

1. **Where:** a new first objective `minutes` in `flick_slow_walk` (it, es), before `lets_go` and `together`
   (ordered, as today). Not the Fountain (already four objectives; round 050 chose no number lesson there), not a
   new tier (a numbers lesson should not wait three conversations). The deeper tier `flick_lotus` is unchanged; a
   player past three conversations does not meet this objective (stated limit).
2. **Which numbers:** 2–12, the hours other than one (the Fountain already teaches *è l'una* / *es la una*, and
   "one minute" is *un minuto* / *un minuto*, so a bare *uno* would not match the natural answer).
   - it: `due`, Mortimer's `tre` (existing id, cross-file target), `quattro`, `cinque`, `sei`, `sette`, `otto`,
     `nove`, `dieci`, `undici`, `dodici`.
   - es: Mortimer's `dos` and `tres` (existing ids), `cuatro`, `cinco`, `seis`, `siete`, `ocho`, `nueve`, `diez`,
     `once`, `doce`.
   New entries go into `flick_party.yaml` (version v2) in each pack, plus a non-target entry `minuti` / `minutos`
   (noun, "minutes", surface `minuto`/`minuti`, `minuto`/`minutos`) so the word is chipped.
3. **English collisions, accepted knowingly:** it `due`, es `once` (and `sei` = "you are" in Italian, `otto`,
   `nove` are minor). Chips are matched only in this conversation's NPC `dialogue.native`, so an English "at once"
   or "due to" in Flick's party lines would be chipped as a number. Measured: across 120 earlier live reports
   "once" appears ~60 times, almost all "For once" in resolution narratives (not dialogue). The overlap test's
   English blocklist (which holds `due`) gets an explicit, commented exception for `due` (it) and the list gains
   nothing for `once` (it is not in it). Leaving out two and eleven would break the hours.
4. **Cross-file targets:** targeting Mortimer's `tre` / `dos` / `tres` pulls the whole butcher vocabulary file into
   Flick's party narration chips (the loader takes whole files). Accepted: those are real target-language words
   and only chip when said.
5. **Objective `minutes`:** prompt "Flick, now in your party, has sat down and wants five more minutes. Bargain:
   tell it how many minutes it gets, using an Italian number." Intent: Flick asks for five more minutes in English,
   never says a target-language number itself, and in its greeting does not introduce itself (it is a party
   member). Required group: one group of all eleven ids. Grammar constraints: a number of minutes in the target
   language as the player's own offer (a bare number or with *minuti*); reject English-only numbers, digits alone
   ("2"), refusals, quotations. Accepted examples: "Due minuti!", "Dieci minuti, non di più.", "Tre." Negative
   examples: "Two minutes.", "2 minuti" (digits), "Flick dice cinque." The existing `lets_go` intent loses "wants to
   stay five more minutes" (now in `minutes`) and says the minutes are up.
6. **Grading of five:** *cinque* / *cinco* (agreeing to five) passes; the objective is to say a number, not to win.

## Tests

- Overlap test passes with the new entries (exception for `due` documented); stem check over fragments
  (`lore-fragments.test.js`) passes or fragments are rewritten (not the test).
- Pinned counts and versions updated on purpose (party entry count, `vocabulary.version` pins, stems list).
- A service test: the `minutes` objective passes on "Sette minuti" and on Mortimer's "tre" (cross-file id), records
  Spellbook evidence for the matched entry, and fails on "Two minutes" with a fixture grader; ordered with
  `lets_go`.
- `play-market.js` script for `flick_slow_walk`: four lines (English fail, a number with *minuti*, let's go,
  together); one es variant line uses Mortimer's *tres*.
- Gerald's pinned prompts unchanged.

## Live

codex-cli, `play-market.js --party --member cracked_fountain` 2 × it, 2 × es (one run each with `--lines` using a
bare number, a plural variant, and Mortimer's number). Then `leak-scan.js` on the reports. Read Flick's lines: does
Flick say a target-language number before the player (leak), are English "once"/"due" chipped.

## Success

All tests pass; in the live runs the verdicts are as scripted, no Flick line states a target number before the
player's first number, and the conversation still resolves in its three objectives' order.
