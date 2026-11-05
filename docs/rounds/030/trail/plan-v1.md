# Round 030 plan v1: fragments of *The Journey* (backlog A9)

## Goal

Optional lore passages in the target language, found after an encounter, kept in the Spellbook, "optional to
translate, but they give juicy lore" (parallang_obsidian/CHARACTERS.md, Journathan; prototype.md Phase 3 "Lore
fragments | Hidden text passages with advanced vocabulary, discoverable items"; prototype.md §1 item 7 "Dark
Souls-style environmental storytelling"). Deterministic and authored: no LLM call, no prompt change. Codex is at its
usage limit, so the round must need no live runs.

## Design

1. **Content.** One file per pack, `content/languages/<code>/lore/fragments.yaml`, with a list `fragments`. Each:
   - `id` (snake case, unique), `title` (English), `found_after` (a location encounter id of the pack),
   - `found` (English: where the player finds it), `text` (target language, 3–4 literary sentences: imperfect and
     passato remoto / pretérito, words above the market's level), `translation` (English),
   - `glossary`: 4–8 `{ word, meaning }`, each `word` a form that appears in `text`.
   The file is optional (a pack without it has no fragments), so test fixtures that copy only some folders still load.
2. **Three fragments per pack**, the three Journey episodes in CHARACTERS.md that no encounter uses yet:
   - `journey_first_stitch` after `old_bookshop_bookworm` ("folded inside the battered copy Marginalia sold you"):
     every crossing between branches left a thread; perhaps the first stitch was his.
   - `journey_sirens` after `cracked_fountain_letharger` (scratched into the fountain's rim, at the height of the
     corner of your eye): the Sirens sing at the edge of sight; Journathan tied to the mast to listen without
     steering towards them; the song was one refrain repeated forever (ties to Flick's jingle).
   - `journey_shroud` after `the_rift_errata` (a loose thread left when the Rift narrowed): his wife wove a shroud by
     day and unpicked it by night, holding the branches of the world apart until he came back.
   `title`, `found` and `translation` are the same English text in both packs (tested).
3. **No answers in fragments.** A fragment's `text` and glossary words contain no surface form of any objective
   target of its pack (folded, whole words, as in `containment.test.js`), so it may be shown at any time, including
   during an encounter, without answering an NPC (round 017 rule). The English `translation` and glossary meanings
   are English, so they cannot be a target-language answer.
4. **Server.** Loader: zod schema (strict), `found_after` must name a location encounter (not a party conversation),
   ids unique, each glossary word must occur in the folded text. `content.fragments` frozen list.
   `LearningService.fragments(envelope)`: fragments whose `found_after` is in `world.completedEncounterIds`, in file
   order, each `{ id, title, found, locationName, encounterId, text, translation, glossary }`. The spellbook snapshot
   gains `fragments` next to `containmentFiles`. No save change (derived from completion, like containment files);
   the resolving turn's snapshot already reflects its own completion (round 028).
5. **App.** Spellbook: a "Fragments of The Journey" section after the cards, one card per fragment: title, the found
   line, the text (`accessibilityLanguage` = pack tag) with a PronounceButton, and a "Show translation" button that
   reveals the glossary and the translation (hidden by default: optional to translate). The resolved encounter
   screen (DialoguePanel) shows "You found a fragment of The Journey: <title>. It is in your Spellbook." when the
   current spellbook has a fragment whose `encounterId` is the resolved encounter's id.
6. **Web client** frozen: the extra snapshot field is ignored.

## Tests

- Server: loader accepts both packs (3 fragments each, same ids, `found_after`, English fields equal across packs);
  rejects an unknown or party `found_after`, a duplicate id, a glossary word absent from the text; no fragment holds
  a pack target form (with a planted-answer case to show the check is live); the spellbook snapshot has no fragments
  in a fresh save, gains the Bookshop's on Marginalia's resolving turn and keeps it; a pack without the file loads.
- Mobile: Spellbook renders a fragment with translation hidden, shows it after the button; DialoguePanel shows the
  found note on a resolved encounter with a matching fragment and not otherwise.
- All server, mobile and web tests, web build, expo-doctor, iOS export.

## Out of scope

More fragments (Gerald's Dead Branch coffee, prototype.md §4.2), fragments as Spellbook review cards, fragments
gated on party conversation counts, map markers. Native-speaker review of the texts goes to the owner.
