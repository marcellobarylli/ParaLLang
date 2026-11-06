# Review 1: round 109's fragments and test edits

- **Dispatched:** 09:25:30 UTC
- **Returned:** before 09:28:02 UTC (notification read then)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only; Codex limited until 2026-11-09 17:32 UTC
- **Prompt:** review the working-tree diff (two fragments, test updates) for 1. Italian/Spanish correctness and
  translation, 2. fit with the owner's Journathan notes and existing content, 3. answer give-aways the check misses,
  4. weakened or missing tests, 5. app/server dependencies on fragment order or count. Severities Error, Minor, Gap,
  Style; under 600 words.
- **Reviewed input:** working tree on HEAD fc17f14 (changed: the two fragments.yaml files, lore-fragments,
  party-conversation, party-tiers, rift-boss tests)
- **Findings:** 10 numbered (1.1–1.4, 2.1–2.2, 4.1–4.4): 2 Error, 3 Minor, 2 Gap, 3 Style

## Raw output (verbatim)

```text
I found one lore Error, one Spanish Error, and a few Minor and Gap items. The answer check has no blind spots I could find for these two fragments. The four named tests pass (33/33), as does the full server suite (396/396).

**1. Language and translation**

1.1 **Error.** `content/languages/es/lore/fragments.yaml:179`: "un viejo héroe de rodillas que crujen". *De rodillas* means "kneeling", so this first reads as "an old hero on his knees". Fix: "Hoy es un viejo héroe al que le crujen las rodillas, técnicamente todavía en camino." The glossary words *rodillas* and *crujen* are still in that text.

1.2 **Minor.** `it/lore/fragments.yaml:178`: "tecnicamente sempre in cammino". *Sempre* reads as "always" before it reads as "still". *Ancora* is ruled out because it is a pack target. Fix: "tuttora in cammino". *Tuttora* is already used in `journey_first_stitch`, and no target word shares its stem.

1.3 **Style.** In "vagò venti inverni" and "vagó veinte inviernos", "per venti inverni" and "durante veinte inviernos" read more naturally. The bare form is acceptable as epic register.

1.4 **Style.** Glossary differences:
- The es entry "camino" is glossed "road, way", but in the motto it means "journey". Suggest "road, way; here the journey".
- The it entry "racconta" is glossed "tells of", but es "lo cuenta" is glossed "tells of him". Align them.

Everything else is correct: grammar, accents (cántame, vagó, héroe, adónde), the idioms (*conta il percorso, non la meta* / *lo que importa es el camino, no el destino*), the English in both packs, and every glossary word appears in its text.

**2. Fit with the notes and existing content**

2.1 **Error (lore contradiction).** The opening sentence "Journathan non è mai arrivato" / "Journathan nunca llegó" contradicts `journey_old_dog` (it:156, "Journathan tornò sulla sua isola…"). That fragment has him home, recognised by the dog, and the shroud waits for his return. The notes only say "still *technically* on his way home". Fix, in the notes' "the story wrote the hero" spirit:
- it: "Il libro lo fa tornare sulla sua isola; lui giura di non essere mai arrivato."
- es: "El libro lo hace volver a su isla; él jura que nunca llegó."
- en: "The book has him come back to his island; he swears he never arrived."

I checked these stems by hand against the target list (no *casa*, *ancora* or similar), but they still need a run of the answer check.

2.2 **Minor.** The proem is titled "The first lines", but `old_bookshop_bookworm.yaml:19` has Marginalia read "the opening of The Journey" with different words ("el hombre de muchas lenguas. Su viaje a casa dura veinte años"). That makes two openings. Suggest renaming the proem (e.g. "Painted over the archway"), or noting it as another telling.

Everything else fits: the twenty winters, the branches, the man of many tongues, which came first, and the motto with the sigh all match `CHARACTERS.md` and `bookworm_marginalia.yaml:12-14`.

**3. Answer give-aways**

I found no give-aways in either the target-language or the English text.
- Neither text contains *casa* or *nessuno*/*nadie*, which are the Bookshop answers.
- The Gerald `found` text avoids coffee and espresso.
- The title word "Still" only overlaps *fermo*/*quieto* in English, and every answer is given in the target language.
- One note: during the Bookshop question "where is Journathan going?", `journey_still_on_his_way` is on screen and says that when asked where he's going he answers "the journey, not the destination". That is a decoy, not a leak.

**4. Tests**

4.1 **Style.** `server/test/party-conversation.test.js:277` keeps the message "not on Gerald's defeat, nor the first two breaks", which is now misleading. Change it to "Dead Branch: not on Gerald's defeat, nor the first two breaks".

4.2 **Minor (weakened).** `party-tiers.test.js:89` and `:139` now filter on `unlockedAt !== undefined`, so a stray extra fragment would pass unnoticed. Assert the full list instead, including `['journey_still_on_his_way','imp_coffee_greeting']`.

4.3 **Gap.** The proem is only ever filed from a seeded completed list (`lore-fragments.test.js` and `rift-boss.test.js`). No test resolves the tutorial through the API and checks that the resolving turn files `journey_proem`. Gerald's side is covered by real resolutions (`lore-fragments.test.js:219-222`), and both new fragments are shown withheld during an encounter (rift-boss fragmentLog[0], party-conversation fourth break).

4.4 **Gap.** No mobile test checks `fragmentNote` for a location fragment and a conversation fragment that come from the same home (`imp_coffee_greeting` vs `gerald_coffee_break`).

The remaining edits are correct reindexing (`f[4]`, lookup by id) and keep their earlier meaning.

**5. App and server dependencies**

I found nothing that breaks.
- `mobile/src/components/DialoguePanel.js:127` `fragmentNote` matches on `encounterId === 'imp_coffee_greeting'` with no `unlockedAt`. It will now correctly say "…from here is in your Spellbook: Still on his way.", and Gerald's conversation fragments carry the `gerald_*` ids, so the two don't collide.
- `storyProgress` (`server/src/learning-service.js:1233`) and `PartyPanel.storyHint` only count `after_conversations` fragments, so they are unchanged.
- `Spellbook.js` just lists the fragments.
- Nothing in `client/src` uses fragment order or count.

I edited no files.
```
