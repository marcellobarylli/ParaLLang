# Round 011 plan v1: The Cracked Fountain (backlog A5)

## Goal

The Cracked Fountain gets its encounter: a Letharger who tries to distract the player with riddles (prototype.md
§8.2 node 4, vocabulary focus time, directions, commands), in the Italian and Spanish packs, as content only (round
006 engine, round 009 per-encounter narration matching, round 010 rubric forms). It ties in the notes' Lethargers
(attention fragmentation, brainrot as a mild infohazard they farm). Gerald, Portia and Mortimer play as before.

## Decisions (autonomous, pending owner review)

1. **Flick the Letharger.** A small gnome-like creature that dances in the corner of your vision, throws tiny
   firecrackers, and is never where you look (parallang.md / CHARACTERS.md "The Lethargers"). It wants you to do
   everything "later" and to keep watching it. Riddles in its English, posed as distractions ("Riddle me this: which
   corner am I in?"). Meme layer in its English: "just one more", "five more minutes", "this is so random", rates
   the player's attention span. Brainrot tie-in (LORE.md Infohazards, GAME MECHANICS.md): its catchphrase "just one
   more" is a mild infohazard; the character sheet says it farms brainrot, low harm, very high virulence; the
   narrator may note the player catching themselves humming its jingle. No new mechanics (B3 does infohazard
   content properly). Difficulty 2, `base_target_ratio` 0.3, +0.05 per turn, saveable.
2. **Three objectives, one per vocabulary focus, each a riddle the player answers by taking control:**
   1. `stop` (commands): tell it to stop / hold still. it [fermati, fermo, basta]; es [detente, quieto, basta].
      `guarda` / `mira` (look) are authored (it keeps saying them) but do not pass.
   2. `direction` (directions): it is lost (Lethargers lose their way, being distracted); tell it which way to go.
      it [destra, sinistra, dritto]; es [derecha, izquierda, recto]. Any direction passes; there is no single right
      answer (the riddle is the distraction, the direction is the comprehension test). A bare English direction or a
      question back does not pass.
   3. `now` (time): it says the player can do it later, tomorrow; the player insists on now. it [adesso, ora];
      es [ahora]. `dopo`, `domani` / `después`, `mañana` (later, tomorrow) are authored but are negative examples:
      agreeing to later does not pass.
3. **No telling time** ("sono le tre"): numbers live in the butcher's file and a clock reading would need a numbers
   objective; left for later.
4. **English collisions checked** (round 010 trap): none of the targets or variants is a common English word. Not
   authored: es `para` (stop, but also the preposition "for": Spanish narration would chip it wrongly), es `ya`,
   es `derecho` (straight / right / law, ambiguous).
5. **No companion briefing**, no gate (as round 010).
6. **Reference URLs** as rounds 009–010 (Treccani, Wiktionary, RAE; not opened from the container).

## Content

- `content/characters/enemies/letharger_flick.yaml` (shared).
- `content/world/locations/cracked_fountain.yaml`: `encounter: cracked_fountain_letharger`.
- Per pack `encounters/cracked_fountain_letharger.yaml` and `vocabulary/fountain_riddles.yaml`
  (`fountain-riddles-it-v1`, `fountain-riddles-es-v1`).
  - it (11): fermati, fermo (variants fermo, ferma, fermi), basta, guarda, destra, sinistra, dritto (variant
    diritto), adesso, ora, dopo, domani.
  - es (11): detente, quieto (variants quieto, quieta, quietos), basta, mira, derecha, izquierda, recto, ahora,
    despues (target después, accent-insensitive), manana (target mañana, accent-insensitive).
- `resolved_message`: "Flick holds still for almost a whole second, points the way you told it, and is gone before
  you can look straight at it. The fountain is quieter."

## Engine and script changes

- `server/scripts/play-market.js`: the fountain is two steps from the start, and the script moves straight to the
  location (NOT_ADJACENT). Walk the shortest path (BFS over `content.world.neighbours`) instead. Add a
  `cracked_fountain` script with negatives first: it "Guarda!" (a command, not stop), "Fermati!", "Left.", "A
  sinistra!", "Domani.", "No, adesso!"; es "¡Mira!", "¡Detente!", "Left.", "¡A la izquierda!", "Mañana.", "¡No,
  ahora!".
- No engine or app changes.

## Tests

1. `node --test server/test/*.test.js`: existing tests updated for four encounters per pack and the combined version
   with `fountain-riddles-<code>-v1`. New `server/test/fountain.test.js` in both packs: the encounter loads at
   `cracked_fountain`; a player walks there (two moves) and plays with a test grader (look fails stop; stop passes;
   English direction fails; left passes; tomorrow fails now; now passes) to resolution; the map marks it complete;
   Flick's line gets chips only from its own file.
2. `npm run test:mobile`; web client tests and build (unchanged code).
3. Live, codex-cli: `play-market.js --location cracked_fountain` twice in Italian and once in Spanish. Findings: the
   verdict on each scripted line, resolution, share, dictation (NPC listing the answers: backlog E3), feedback
   leaks, representative lines.
