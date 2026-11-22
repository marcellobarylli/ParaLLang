# Round 159 architecture

**Conversational round, recorded with the build.** The seventh of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #7, "Dungeon lore encounters: characters who utter deeper truths after the fight"
  (step 9 of the build order); [`docs/lore-book.md`](../../lore-book.md), parts IV, VI and X;
  [round 158](../158/architecture.md), whose untranslatable texts it uses.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/languages/{it,es}/encounters/{old_bookshop_bookworm,high_gate_bambieshart,the_rift_errata}.yaml`
  (`revelation`), `content/languages/{it,es}/lore/truths.yaml`, `server/src/content-loader.js`,
  `server/src/learning-service.js` (`revelationOf`), `client/src/components/DungeonScreen.jsx`,
  `parallang_obsidian/Understood Later.md`, `client/scripts/revelation-check.mjs`, `docs/rounds/159/shots/`.

## Goal

At certain points a character has come to know more of the world's nature. When its encounter is completed, the
narrator delivers a passage of lore that the character utters.

## Design

**A field of the encounter.** An encounter's file may have `revelation: { text }`. The text has the form of a
written passage (round 156): the narrator's line, then the passage, which may be an untranslatable text
(`{truth:<id>}`, round 158). The line follows the issue's own wording, "X utters the following:", with a clause of
what X is doing as it is said.

**Who utters, and what.** Three characters of the dead branch, in both packs. Each text is new, B1 or B2 (harder
than anything on the road's signs), and each comes from a part of the lore book the character has reason to know:

| Character | Where | From the lore book |
|---|---|---|
| Marginalia | The Old Bookshop (Ta Prohm's library) | part IV: what the hero's twenty years of crossings left behind |
| Bambieshart | The High Gate (before the sanctuary) | part VI: the Inflection Point, as he would put it |
| Errata | The Rift (the sanctuary) | part X: the last rumour, of which Errata is the name |

What the three texts say is in the vault note, `parallang_obsidian/Understood Later.md`, with the ten of round 158.
The Kiln plays the same encounters, so the three utter the same there.

**On completion only.** The conversation's view carries `revelation` (`{ id, segments }`) when its state is
`resolved`, and null before. The web client shows it in the finished conversation, set off in a box of its own with
the text on a line by itself, before the conversation's last word (in which Bambieshart is "gone before the nod
ends" and Errata "folds itself up"): they speak, then they go.

**Kept.** In the same save as the resolving turn the revelation is recorded in `told` (as
`revelation_<encounter id>`). The guidebook's "Turmeric text you have found" lists it with the passages of the road,
and the guidebook's entry on turmeric text is entered if this was the player's first.

**Checked at load.** A pack that has untranslatable texts must have the one a revelation names.

## Tests

- `server/test/revelation.test.js` (5 tests): the three encounters in both packs and the form of their text; a
  played conversation with Bambieshart from start to the guidebook; an encounter without one; the same in a dungeon;
  the loader's check.
- `server/test/untranslatable.test.js`: thirteen texts now, every one set in a passage or uttered, all in the vault.
- `client/src/components/__tests__/camera-wiring.test.jsx`: the box, its place before the last word, nothing to tap.
- `client/scripts/revelation-check.mjs` in headless Chromium at a phone's size.

## Claim boundary

The three texts are Claude's Italian and Spanish, unread by a speaker. Seen in headless Chromium, not on a phone.
The lead-in lines are written, not generated: the model that plays the character does not know what the character
will utter, so the conversation before it cannot lead up to it.

## Outcome

See [`findings.md`](findings.md).
