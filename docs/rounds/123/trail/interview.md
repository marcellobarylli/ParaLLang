# Interview: round 123

### Q1 (2026-11-15, 20:28 UTC approx.): the owner's instruction (no question was asked)
- **Options offered:** none.
- **Answer:** "Let's lock the following for the next round, but I also like from PS1 errors that they had to work with limited resources so we don't we want to avoid rendering the same thing we wanna avoid rendering new places so we want to be able to reuse our assets as much as possible, which means new game plus should be a feature so that you can play a level play through all the places in the world map but every time you go through it you're missing something because you're already seeing languages that are for like language content that is too high-level for you to understand you know you'll have to return it later on when you understand better that's only logged for now"

The answer reads as dictated speech. Claude's reading, which the owner has not confirmed:

- "PS1 errors" is "the PS1 era".
- **Constraint.** The game works with limited resources, as PS1 games did. It reuses the assets it has and avoids
  building new places to render.
- **Feature.** New Game Plus. The player plays through all the places on the world map more than once. On each pass
  some of the target-language content is above their level and they do not understand it. They come back to it on a
  later pass, when they understand more.
- **Scope now.** "Only logged for now": this is the subject of the next round. Nothing is designed or built yet.

Left for this round's interview (nothing below is decided):

- What "all the places in the world map" means while Angkor Wat, Micromort Mountain and The Bone Dome are closed and
  have no dungeon. Reusing assets suggests they would play on the Ta Prohm level; the owner has not said so.
- What the content above the player's level is (a character's lines, inscriptions, sealed sites) and what measures
  "understands better" (the level, the Spellbook's known words).
- What a new pass keeps and what it resets. Today's "Play again" (`resetDungeon` in
  `server/src/learning-service.js`) clears the run's sites and counts the run up by one; XP, the Spellbook and the
  party stay.
