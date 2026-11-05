# Round 010 plan v1: The Butcher's Stall (backlog A4)

## Goal

The Butcher's Stall gets its encounter: a Charcutier who insists everything is ham (prototype.md §8.2 node 3,
vocabulary focus meats, quantities, numbers), in the Italian and Spanish packs, as content only (round 006 engine,
round 009 per-encounter narration matching). Gerald and Portia play as before.

## Decisions (autonomous, pending owner review)

1. **Mortimer the Charcutier.** Booming, generous, absolutely certain, wrong about taxonomy: he calls every cut on
   his stall by the target-language word for ham (prosciutto / jamón), including the sausages, the chicken and his
   own hat. His scales are honest (the location description), and he trusts only them. Meme layer in his English:
   rates cuts as "certified ham", "ham-adjacent". Difficulty 2, `base_target_ratio` 0.3, +0.05 per turn, saveable.
2. **Two objectives, like Gerald's:**
   1. `name_meat`: ask for a meat that is not ham. it [salame, salsiccia, pollo]; es [chorizo, salchicha, pollo].
      Asking for prosciutto / jamón does not pass (he would only agree); naming the real cut is the point of the joke
      and the comprehension test.
   2. `quantity`: say how much, a number (or un/mezzo, un/medio) and a unit of weight. Required group: the unit
      (it [etto, chilo, grammi]; es [kilo, gramos]); the numbers (it due, tre, cento, mezzo; es dos, tres, cien,
      medio) are targets but not required, so "un chilo" / "un kilo" pass; the grammar constraints require a
      quantity, not a bare unit.
3. **Ham is vocabulary, not a target to pass:** prosciutto / jamón is authored (he says it constantly, so it should
   get a chip) and appears in `name_meat`'s negative examples.
4. **Reference URLs** as round 009 (Treccani, Wiktionary, RAE, Cambridge patterns; not opened from the container).

## Content

- `content/characters/enemies/charcutier_mortimer.yaml` (shared).
- `content/world/locations/butchers_stall.yaml`: `encounter: butchers_stall_charcutier`.
- Per pack `encounters/butchers_stall_charcutier.yaml` and `vocabulary/butcher_meats.yaml`
  (`butcher-meats-it-v1`, `butcher-meats-es-v1`). Vocabulary it (11): prosciutto, salame, salsiccia, pollo, etto,
  chilo, grammi, due, tre, cento, mezzo. es (10): jamon, chorizo, salchicha, pollo, kilo, gramos, dos, tres, cien,
  medio. Surface variants include plurals (salsicce, etti, chili, grammo; salchichas, kilos, gramo).
- `resolved_message`: "Mortimer weighs your order twice, wraps it in paper labelled with the wrong word, and lets you
  go."
- No `companion_briefing` (the tutorial has introduced the mechanics).

## Code

- `server/scripts/play-market.js`: a `butchers_stall` script (it "Vorrei del salame, per favore.", "Due etti, per
  favore."; es "Quiero chorizo, por favor.", "Medio kilo, por favor.").
- `server/test/encounters.test.js`: the Bernard fixture sits at `butchers_stall` and uses id `jamon`, so its content
  copy removes the real Spanish butcher encounter and vocabulary file before adding the fixture.
- No engine or app changes.

## Tests

1. `node --test server/test/*.test.js`: real packs hold three encounters each; new `butcher.test.js` in both packs:
   loads at `butchers_stall`; a player walks there from the start and plays it to resolution with a test grader
   (ham alone fails `name_meat`; "salame"/"chorizo" passes; "un chilo"/"medio kilo" passes `quantity`); the map marks
   it complete; Mortimer's lines get chips only from his own file.
2. `npm run test:mobile`, web client tests and build, iOS export (no app changes; quality bar).
3. Live, codex-cli: `play-market.js --location butchers_stall` three times in Italian and once in Spanish; one run in
   Italian with ham first ("Vorrei del prosciutto.") to see the negative case live. Findings: verdicts, share,
   dictation, feedback leaks, representative lines.

## Claim boundary

Can claim: the encounter loads and plays in both packs in-process and live as reported. Cannot claim: teaching
quality as judged by a learner or the owner, reference URLs, the Simulator.
