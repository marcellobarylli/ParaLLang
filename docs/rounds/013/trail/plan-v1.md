# Round 013 plan v1: The Old Bookshop and *The Journey* (backlog A6, with B2)

## Goal

The Old Bookshop gets its encounter: a lore-heavy NPC with a reading passage (prototype.md §8.2 node 5, abstract
nouns and reading comprehension), in the Italian and Spanish packs, as content only, and the passage is the first
in-game fragment of *The Journey* and its hero Journathan (parallang_obsidian/CHARACTERS.md; backlog B2).

## Decisions (autonomous, pending owner review)

1. **Marginalia the Bookworm.** An elderly, bespectacled bookworm the size of a sofa who has eaten through most of the
   shop's stock and annotates everything, customers included. She sells a book only to someone who has understood
   a passage of it, and reads aloud from *The Journey*. Meme layer in her English: "no spoilers", "tl;dr", rates
   reading comprehension. Lore in her quirks: *The Journey* is named after Journathan, or he after it, nobody
   remembers which (4th wall); he is "the man of many tongues", one of the first bilinguals; "it's about the journey,
   not the destination" is a line he cannot stand. Difficulty 3, `base_target_ratio` 0.35, +0.05 per turn,
   saveable.
2. **Two reading-comprehension objectives**, each with its authored passage in the objective's `intent` (the
   narration prompt's learning data carries it, so she reads it; content only):
   1. `home`. Passage it: "Questa è la storia di Journathan, l'uomo dalle molte lingue. Il suo viaggio verso casa dura
      vent'anni." es: "Esta es la historia de Journathan, el hombre de muchas lenguas. Su viaje a casa dura veinte
      años." Question: where is Journathan going? Required it [casa]; es [casa]. Fails: English "Home.", a wrong
      detail ("Vent'anni." / "Veinte años."), "Un libro.".
   2. `name` (the Cyclops episode, the first recorded translation trick). Passage it: "Il Ciclope chiede il suo
      nome. Journathan risponde: «Il mio nome è Nessuno.»" es: "El Cíclope le pregunta su nombre. Journathan
      responde: «Mi nombre es Nadie.»" Question: what name did he give? Required it [nessuno]; es [nadie]. Fails:
      "Journathan." (his real name), English "Nobody.".
   Reusing the passage's words is expected (reading comprehension); a grammar constraint says so, so the grader
   does not reject a correct answer as a quotation. Reciting the whole sentence back does not pass.
3. **Vocabulary** (abstract nouns and the passage's key words): it storia, viaggio, casa, lingua (lingua, lingue),
   anni (anno, anni), nome, nessuno; es historia, viaje, casa, lengua (lengua, lenguas), anos (target años; años,
   año; accent-sensitive, because folded "anos" is a different, rude word), nombre, nadie. Not authored: it `venti`
   (English "venti", the coffee size), es `veinte` kept out for symmetry.
4. **No companion briefing**, no gate (as rounds 010–011). The Rift gate is A7.

## Content

- `content/characters/enemies/bookworm_marginalia.yaml` (shared);
  `content/world/locations/old_bookshop.yaml` `encounter: old_bookshop_bookworm`.
- Per pack `encounters/old_bookshop_bookworm.yaml` and `vocabulary/bookshop_journey.yaml`
  (`bookshop-journey-<code>-v1`).
- `resolved_message`: "Marginalia annotates you as 'promising', sells you a battered copy of The Journey, and goes
  back to eating the poetry section."

## Engine and script changes

None in the engine. `play-market.js` gets an `old_bookshop` script (the route helper from round 011 walks the three
moves): it "Un libro.", "Home.", "A casa!", "Journathan.", "Nessuno!"; es "Un libro.", "Home.", "¡A casa!",
"Journathan.", "¡Nadie!".

## Tests

1. `node --test server/test/*.test.js`: existing tests updated for five encounters per pack and the combined version
   with `bookshop-journey-<code>-v1`. New `server/test/bookshop.test.js` in both packs: walk there (three moves),
   play with a test grader (book, English and the real name fail; casa and nessuno / nadie pass) to resolution; map
   marked complete; her line gets chips only from her own file; the passage reaches the narration system prompt.
2. `npm run test:mobile`; web client tests and build.
3. Live, codex-cli: `play-market.js --location old_bookshop` twice in Italian, once in Spanish. Findings: verdicts
   per line, whether she reads the passages, resolution, share, menus and dictation, feedback leaks.
