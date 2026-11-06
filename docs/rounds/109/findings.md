# Round 109 findings: the owner's notes against the game's content

## Question

Which characters and lore elements of the owner's notes (`parallang_obsidian/`) are not yet in the game's content,
and which of them can be added without a live LLM run?

## Finding

Nearly every element the Crumbling Market prototype can hold is in content. Journathan's notes had two parts no
content held, the Odyssey's frame (the man of many tongues; nobody remembers whether the story or the hero came
first) and the Pratchett option (an ageing hero still technically on his way home, tired of his own motto); they are
now two fragments of *The Journey*, filed on the first completion of the Entrance tutorial and Gerald's encounter.
The clearest gaps left are characters with no place yet (the Wizard of Just in Case, the Trepanners) and lore with
no mechanic yet (mushrooms and spores, Orwell's simplified language, the Inflection Point and Collision).

## Method

Offline. Each note (`CHARACTERS.md`, `LORE.md`, `Anulus Mirabilis.md`, `GAME MECHANICS.md`, `PLOT & QUESTS.md`,
`LOCATIONS.md`) read against `content/` with `grep` for each element; the notes are unchanged. The two fragments are
authored in both packs (same English), checked by the fragments' answer check (`server/test/answer-check.js`: no pack
form, no word or 4-letter stem of an objective target, no glossed target meaning) and reviewed by a fresh read-only
subagent ([`trail/review-1.md`](trail/review-1.md)).

### The audit

| Note | Element | In content | Next |
|---|---|---|---|
| CHARACTERS | The Companion, translates for the player | Companion help, briefing cards (rounds 001, 009) | — |
| CHARACTERS | The Lethargers, attention fragmentation | Flick at the Cracked Fountain (011), brainrot jingle (025) | — |
| CHARACTERS | The Wizard of Just in Case (self-writing will, mood ring, thousands of tiny wizards) | None | Gap: needs a place and an encounter (a later level or a seventh node), live runs |
| CHARACTERS | The Trepanners (inflating brains) | None | Gap: as above; a Bookshop-adjacent cameo would need a character-sheet change, measured live |
| CHARACTERS | Journathan, *The Journey*, Cyclops, Sirens, the shroud, Dark Souls fragments | Marginalia's sheet and passages (013), seven fragments (030–033) | — |
| CHARACTERS | Journathan's frame (*polytropos*, the story wrote the hero) | **This round:** `journey_proem` | — |
| CHARACTERS | Journathan today (Pratchett option, the motto) | Marginalia's quirk (013); **this round:** `journey_still_on_his_way` | — |
| LORE | Words have power; spells are foreign words | Onboarding statement (027), the Spellbook | — |
| LORE | Branches, strings, the first stitch | `journey_first_stitch`, `journey_shroud`, the keystone inscription (082) | — |
| LORE | Rifts, Collision, çùršęd language | The Rift and Errata (014–015) | — |
| LORE | Dead branches | `journey_dead_branch` (032) | Angkor Wat level: later |
| LORE | Mushrooms and spores (dream a new language) | None | Gap: a fragment or inscription candidate (no live run) |
| LORE | Eldritch root language | None (the note doubts it) | — |
| LORE | Memes; bilinguals as vectors | Marginalia's quirk; the tone layer (007) | — |
| LORE | Antimemes | None (a question in the note) | — |
| LORE | Infohazards: properties, containment, companion, Lethargers' strains | Containment notice and files CM-001, CM-002 (025, 028) | Companion redacting a hazard: a mechanic, not built |
| LORE | 4th wall | Errata, the onboarding archway, the proem | — |
| LORE | Orwell & language | None | Gap: no character or place yet |
| LORE | The Lands, the founding myth, the portal | None | Plot opening: later |
| Anulus Mirabilis | Internet realm, web scrapers, four animal protagonists | Flick only, loosely | Later; the note is undecided |
| GAME MECHANICS | Pratchett × meme tone, footnotes | Style guide (007), footnotes (081, B5 open live) | B5's live re-measure, queued |
| GAME MECHANICS | Word and sentence translation, R/G/B classes, spoken words, Spellbook, forced repetition | Rounds 001, 055–060, 029 | — |
| GAME MECHANICS | Companion limited during events | Hint limits per objective (001) | — |
| GAME MECHANICS | Inflection Point, Collision (narrative turns to the exo-language, translated back) | None | Gap: a world-state mechanic, needs live runs |
| GAME MECHANICS | Fog of war, levels unlocked by progress | Map (005), Rift gate (014) | — |
| PLOT & QUESTS | Begin in the home country | None (the game opens at the market) | Later |
| LOCATIONS | A self-contained Painted World level | The Crumbling Market | Angkor Wat, the Bone Dome: later levels |
