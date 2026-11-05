# Round 023 plan v1: party conversations for Mortimer, Flick and Marginalia (backlog A8c)

Autonomous round (no owner). Round 022 added party conversations (`party_of` encounters, graded, started anywhere
once the member joined, counted per member) with Gerald's coffee break as the only content. A8c gives the three
other saveable characters one conversation each, in both packs. Content only, plus a play-script option.

## Content

Each: `content/languages/<code>/encounters/<id>.yaml` with `party_of: <home encounter>`, the home encounter's
character file, escalation 0.05, two ordered objectives, and a new vocabulary file `<member>_party.yaml` (own
version; Treccani / RAE and Wiktionary references). The scene is in the first objective's intent (it reaches the
narration prompt, as in round 022). Negative examples on every objective: English-only, negated, quoted, someone
else's words, wrong referent.

### Mortimer: `mortimer_tasting` (party_of `butchers_stall_charcutier`)

Mortimer, travelling with the player, hands over a slice from his travelling hamper and wants a verdict.

1. `like_it`: say you like it. it *mi piace* (mi piace, mi piacciono); es *me gusta* (me gusta, me gustan).
   Constraint: the player's own liking of the food (not "ti piace?" back, not "non mi piace").
2. `ask_more`: ask for more. it *ancora* (ancora, ancora un po'); es *más* (más, un poco más).
   Note: *más* folds to "mas" for matching; no English word.

### Flick: `flick_slow_walk` (party_of `cracked_fountain_letharger`)

Flick, who never does anything now, wants to stay put "for five more minutes"; the player gets it moving.

1. `lets_go`: say let's go. it *andiamo*; es *vamos*.
2. `together`: say together. it *insieme*; es *juntos* (juntos, juntas).

### Marginalia: `marginalia_fragment` (party_of `old_bookshop_bookworm`)

Marginalia reads the player a two-line fragment of *The Journey* (authored in the intent, in the target language,
beginner level) and asks what they thought.

1. `praise_story`: say it was wonderful. it *meraviglioso* (meraviglioso, meravigliosa); es *precioso* (precioso,
   preciosa). Agreement with the referent (la storia → meravigliosa / preciosa; il racconto / el cuento → masculine).
   Avoided: *bella* ("Bella" is an English name), *bonito* (an English fish name).
2. `read_again`: ask her to read it again. it *di nuovo* (phrase); es *otra vez* (phrase).

Fragments (in the intent):
- it: "Journathan parlò con il mare in due lingue. Il mare rispose in una sola: la sua."
- es: "Journathan habló con el mar en dos lenguas. El mar respondió en una sola: la suya."

## Play script

`play-market.js --party [--member <home location>]` (default `coffee_cart`): wins the member's home encounter with
its existing script, recruits, walks to the start (or a neighbour if home is the start) and plays the conversation
with scripted lines (English first, should fail; then objective 1; then objective 2):

- Mortimer: it `I like it.`, `Mi piace!`, `Ancora, per favore!`; es `I like it.`, `¡Me gusta!`, `¡Más, por favor!`
- Flick: it `Let's go together.`, `Andiamo!`, `Insieme.`; es `Let's go together.`, `¡Vamos!`, `Juntos.`
- Marginalia: it `It was wonderful.`, `Meravigliosa!`, `Di nuovo, per favore!`; es `It was wonderful.`,
  `¡Preciosa!`, `¡Otra vez, por favor!`

## Tests

- Both packs load; each saveable character has exactly one party conversation; the Rift's review still excludes
  party vocabulary; vocabulary version strings updated.
- No surface form of the new entries is an English word in a small blocklist test (rico, rica, bella, bonito, lee,
  piano, chili, soy, due, media).
- Gerald's golden prompts unchanged.

## Live data

One it and one es `--party --member` run per member (6 runs, ~12–14 calls each, sequential): resolution, verdicts as
scripted, share against requested, answers given away before they were passed.

## Claim boundary

Smoke check of authored content; no rates. Reference URLs not opened (no web access). Not checked in the Simulator.
