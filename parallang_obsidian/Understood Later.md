2026-11-22

Status: #idea
Upstream: [[LORE]]
Tags: #lore #spoilers

---
# Understood Later

*Content the player meets early and understands only later. Everything on this page is a spoiler: it is what the
game's untranslatable text says. Written by Claude in round 158 (GitHub issue #4) from "What the book does not say" in
`docs/lore-book.md`; nothing in the game reads this note, and the game holds no English for any of these.*

## How it works in the game

- Deep truths about the world exist **only in the language being learned**. They sit inside the narrator's written
  passages in **turmeric** text.
- Nothing translates them: no hint, no tap, no Spellbook card, no companion. The server has no English for them.
- The first one enters a guidebook entry, **Turmeric text**: "Turmeric coloured text cannot be translated. It holds
  fragments of the truth of the world; to understand you must become a proficient speaker."
- The guidebook keeps every passage of this kind the player has met, so that it can be read again with more of the
  language.
- The deeper the truth, the harder the language. The plain statements are A1 sentences; the last one needs the
  imperfect subjunctive.
- The telling follows Dark Souls 1: a message somebody left, where only a traveller would see it, and no word about
  who wrote it.

## The texts

Each is set into one passage of `content/narration/passages.yaml`. The Italian and Spanish are in
`content/languages/<code>/lore/truths.yaml`.

| Level | Where the player finds it | Italian | Spanish | What it says |
|---|---|---|---|---|
| A2 | Cut into a tree at the edge of a forest, after two conversations | Torna indietro! Oltre giace la scia di un punto. | ¡Vuelve atrás! Más allá yace la estela de una puntada. | Go back! Beyond lies the wake of a stitch. (The owner's line, from issue #4.) |
| A1 | On a milestone in a meadow, the distance scraped off | La strada non è una strada. | El camino no es un camino. | The road is not a road. |
| A1 | On a stone in the middle of a ford | Qui passa un filo. | Por aquí pasa un hilo. | A thread passes here. |
| A1 | In charcoal on a cairn at the top of a pass | Ogni luogo è un nodo. | Cada lugar es un nudo. | Every place is a knot. |
| A2 | In wet sand on a shore, once the learner is at A2 | Chi impara una parola dà un punto. | Quien aprende una palabra da una puntada. | Whoever learns a word makes a stitch. |
| A2 | On the painted-over arm of a fingerpost, at A2 | Non hai camminato su una strada. Hai camminato su una tela. | No has caminado por un camino. Has caminado sobre una tela. | You did not walk on a road. You walked on a web. |
| B1 | Under a guild notice, in older paint, at B1 | Le strade non furono costruite: furono cucite. | Los caminos no fueron construidos: fueron cosidos. | The roads were not built: they were sewn. |
| B1 | Carved along a ferry's rail, at B1 | La tela non finisce dove finisce il mondo: è cucita a un'altra. | La tela no termina donde termina el mundo: está cosida a otra. | The web does not end where the world ends: it is sewn to another. |
| B1 | On a slab of rock in the highlands at B1, and on a lintel of Ta Prohm's library | Dove vedi una radice, un tempo c'era una strada; dove vedi una strada, un giorno ci sarà una radice. | Donde ves una raíz, hubo una vez un camino; donde ves un camino, habrá un día una raíz. | Where you see a root, there was once a road; where you see a road, there will one day be a root. |
| B1 | Inside the door of a hut at the snow line, at B1 | Se tutti i fili si tendessero insieme, i due mondi si toccherebbero, e nessuna parola avrebbe più senso. | Si todos los hilos se tensaran a la vez, los dos mundos se tocarían, y ninguna palabra tendría ya sentido. | If all the threads were pulled tight together, the two worlds would touch, and no word would mean anything any more. |

## What they add up to

Read in order of difficulty, the texts say what no character knows:

1. The roads are not roads. They are threads, and every place is a knot where threads meet.
2. The player has been walking on a web, and adds to it: each learned word is a stitch.
3. The web was sewn, not built, and it is sewn to another world's.
4. A road and a root are the same thing at different ages (the dead branch's roots are old threads).
5. Enough threads pulled tight and the two worlds touch: Collision.

## Open

- *Tela* is cloth, a canvas and a weave; a spider's web is *ragnatela*. *Tela* was chosen for the weaving sense. A
  speaker should check all ten.
- Whether the last text (Collision) is too plain for a road sign, and belongs in a dungeon instead (issue #7).
- The Spanish is Claude's, like the Italian.



---
# References
- `docs/lore-book.md`, "What the book does not say"
- GitHub issues #4, #5, #6, #7
