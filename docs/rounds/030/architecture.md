# Round 030 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A9 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); `prototype.md` Phase 3
  ("Lore fragments | Hidden text passages with advanced vocabulary, discoverable items") and §1 item 7 ("Dark
  Souls-style environmental storytelling"); `parallang_obsidian/CHARACTERS.md`, Journathan ("Fragments of The
  Journey could be found Dark Souls-style throughout the world, written in the exo-language. Optional to translate,
  but they give juicy lore", and the episodes of the Sirens and the shroud); rounds [013](../013/architecture.md)
  (*The Journey* at the Bookshop), [017](../017/architecture.md) (the Spellbook never answers what the game asks) and
  [028](../028/architecture.md) (containment files, the pattern followed here).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `content/languages/{it,es}/lore/fragments.yaml`, `server/src/content-loader.js`,
  `server/src/learning-service.js`, `mobile/src/components/Spellbook.js`, `mobile/src/components/DialoguePanel.js`,
  `mobile/src/components/PronounceButton.js`, `mobile/App.js`, tests.

## Goal (pre-run)

Optional passages of *The Journey* in the target language, found after an encounter and kept in the Spellbook, with
a glossary of advanced words and an English translation the player can reveal. Authored and deterministic: no LLM
call and no prompt change.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC), as in rounds 027–029.
2. **Three fragments per pack**, the Journey episodes in CHARACTERS.md that no encounter uses yet: the first stitch
   (after Marginalia), the Sirens (after Flick, echoing the jingle) and the shroud (after Errata). Gerald's Dead
   Branch coffee (prototype.md §4.2) waits for relationship tiers.
3. **Found on completion, not on a visit**, and derived from world progress, so the save does not change.
4. **Glossary and translation hidden during an encounter** (critique 1.1): the server leaves them out while an
   encounter is under way; the target-language text stays.
5. **Texts written around the whole vocabulary of the pack**, not only objective targets (critique 1.1, 1.3):
   no surface form of any vocabulary entry, apostrophes split words, and inflected forms of targets checked by hand.
6. **No live runs**: nothing reaches a prompt.

## Design (pre-run)

1. **Content.** `content/languages/<code>/lore/fragments.yaml` holds `fragments`, a list in story order. Each has:
   - `id`, `title` (English) and `found_after` (a location encounter of the pack);
   - `found`, an English line saying where the player finds it;
   - `text`, 3–4 literary sentences in the target language, with `translation` in English;
   - `glossary`, 1–10 `{ word, meaning }` pairs, each `word` a whole-word form in the text.
   The file is optional: a pack without `lore/` loads with no fragments. `existsSync` is used on the single file, not
   `yamlFiles` (critique 1.9).
2. **Loader.** A strict zod schema with unique ids. `found_after` must name an encounter of the pack that is not a
   party conversation. Each glossary word must match whole words in the text, after `foldWords`: accents and case
   are removed, and punctuation and apostrophes become spaces (critique 1.2, 1.9). The result is
   `content.fragments`, frozen.
3. **No answers** (critique 1.1, 1.2, 1.3, 1.10). A test checks every fragment's text and glossary words with
   `foldWords`:
   - they contain no surface form of any vocabulary entry of the pack;
   - no glossary meaning (split on `,` and `;`) equals an accepted translation of an objective target;
   - planted cases ("adesso", and the elided "un'ora") show the check is live.
   The hand check of inflected target forms goes in the findings (e.g. `voleva` and `quería` were replaced because
   "quería un café" is a polite order).
4. **Server.** `LearningService.journeyFragments(envelope, inEncounter)` returns, in file order, the fragments
   whose `found_after` is in `world.completedEncounterIds`. Each is
   `{ id, title, found, encounterId, locationName, text, translation, glossary }`. While an encounter is under way,
   `translation` and `glossary` are `null` and `hidden` is `true`. The spellbook snapshot gains `journeyFragments`
   next to `containmentFiles` (optional rename from the critique). The resolving turn's snapshot already reflects
   its own completion (round 028).
5. **App, Spellbook.** A "Fragments of The Journey" section comes after the cards and is shown even when there are
   no cards. Each fragment is a card with:
   - its title and its found line;
   - the text (`accessibilityLanguage` from the pack tag), with a PronounceButton labelled "Hear the fragment in
     <language>" (new optional `label` prop, critique 1.7);
   - a "Show translation" / "Hide translation" toggle with `accessibilityState.expanded`, which shows the glossary
     (each word in a nested target-language `Text`) and the translation (critique 1.8).
   While hidden by the server, the card says "The translation waits until the encounter is over."
6. **App, resolved encounter.** `DialoguePanel` gets a `fragments` prop from `state.spellbook.journeyFragments`
   (critique 1.5). When a fragment's `encounterId` is the resolved encounter's, the existing `role="status"` area
   adds "A fragment of The Journey from here is in your Spellbook: <title>." The wording does not say "found", so it
   stays true on replays (critique 1.6).
7. **Web client** stays frozen; it ignores the new field.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 dd4c3c87…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | Translation and glossary give meanings away during an encounter; leak check only on targets | + | Accept: hide both during an encounter; check against every vocabulary form of the pack | **Accepted** (autonomous, pending owner review) | Decisions 4, 5; Design 3, 4 |
| 1.2 | Error | The fold keeps apostrophes and misses elision | + | Accept: `foldWords` splits on apostrophes; planted "un'ora" | **Accepted** (autonomous, pending owner review) | Design 2, 3 |
| 1.3 | Risk | Inflected forms of targets pass | + | Accept: hand check, recorded in findings; `voleva`/`quería` replaced | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.4 | Risk | The target list makes natural prose hard | 0 | Accept in part: texts drafted and checked before the app work; keep three per pack, they pass | **Accepted in part** (autonomous, pending owner review) | Decision 2 |
| 1.5 | Error | DialoguePanel has no spellbook data | + | Accept: `fragments` prop from App | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.6 | Risk | "You found" repeats on replays | + | Accept: wording true on every resolution, tested | **Accepted** (autonomous, pending owner review) | Design 6 |
| 1.7 | Risk | PronounceButton's label reads the whole passage | + | Accept: optional `label` prop | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.8 | Suggestion | Accessible toggle; glossary words tagged with the language | + | Accept | **Accepted** (autonomous, pending owner review) | Design 5 |
| 1.9 | Suggestion | Test gaps (in-encounter snapshot, elision, substring glossary word, missing `lore/`, Rift resolving turn, mobile hidden state) | + | Accept all | **Accepted** (autonomous, pending owner review) | Tests |
| 1.10 | Suggestion | Glossary meanings must not equal a target's accepted translation | + | Accept: tested; "tuttora" and "todavía" glosses changed from "still" | **Accepted** (autonomous, pending owner review) | Design 3 |

**Deferred / optional:** snapshot field renamed `journeyFragments` (taken); explicit sort (rejected: file order is
story order and is tested); English `title`/`found` lines are left out of the leak check (they are English);
empty-Spellbook rendering (taken, tested).

Net change from plan-v1: translation and glossary hidden during encounters, a stricter fold and leak check, a
`fragments` prop and replay-safe wording, accessibility fixes, more tests.

## Tests (pre-run)

- Server (`server/test/lore-fragments.test.js`):
  - Both packs load three fragments with the same ids and `found_after`, and the same English `title`, `found` and
    `translation`.
  - The loader refuses an unknown `found_after`, a party conversation as `found_after`, a duplicate id, and a
    glossary word that is absent or only a substring ("nome" in "nomea"). A pack copy without `lore/` loads with
    `fragments` empty.
  - Leak check as in Design 3, with the planted cases.
  - Spellbook snapshot: empty in a fresh save. Marginalia's resolving turn returns `journey_first_stitch` with its
    translation. During a later encounter it is hidden. A completed Rift files `journey_shroud`.
- Mobile: the Spellbook renders a fragment with its translation hidden, shows it after the toggle (label and
  expanded state), shows the hidden note when the server hides it, and renders with no cards. DialoguePanel shows
  the note for a matching resolved encounter and not otherwise. The PronounceButton label.
- All server, mobile and web tests, web build, expo-doctor, iOS export.
