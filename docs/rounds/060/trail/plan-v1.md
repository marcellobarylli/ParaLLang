# Round 060 plan v1: lines you translated, kept in the Spellbook

Backlog: new item C9, from the owner's note `parallang_obsidian/GAME MECHANICS.md` (Main Gameplay Loop, Option A):
"Translated sentences and words need to be stored somewhere for voluntary retrieval and practice (gamify as a
personal spellbook somehow)". Words are in the Spellbook since round 001; translated sentences are not kept
anywhere: encounters live in memory and their transcripts go when the encounter ends. No live LLM calls (Codex at
its usage limit); the web client stays frozen.

## Goal

When the player pays a hint to translate the active NPC line ("Translate sentence"), the line and its translation
are kept in the save and shown in the Spellbook under "Lines you translated", newest first, with a 🔊, for
re-reading between encounters.

## Design

1. **Save.** The envelope gains an optional `lines` array (no schema bump: missing means `[]`; validated when
   present). Each entry: `{ id, encounterId, speaker, native, translation, savedAt }` (strings; `id` the NPC
   message id; `savedAt` ISO). Written in `revealEncounterHelp` when `kind === 'sentence'` and the reveal is charged
   (an already-revealed line is not stored again). Dedupe by `native` text (a later reveal of the same text moves it
   to the front with the new `savedAt`). Capped at the 50 newest.
2. **Snapshot.** `spellbookSnapshot` adds `lines: [{ id, speaker, native, translation, locationName, savedAt, hidden }]`
   newest first. While an encounter is under way (`inEncounter`), `translation` is null and `hidden: true` (as
   fragments, round 030; card meanings, round 017): a kept line might answer the active line's objective. The
   location name comes from the encounter's location, or the member's home for party conversations; an encounter id
   no longer in content gives `locationName: null` (the line is still shown).
3. **App.** A "Lines you translated" section in `Spellbook.js` after the cards: per line, the speaker and place in
   small text, the native line (accessibilityLanguage = the pack's tag) with a `PronounceButton`, and the
   translation in italic, or "The translation waits until the encounter is over." when hidden. No section when the
   list is empty or missing (older server).
4. **Not stored:** unpaid translations of past lines (shown free in the transcript), word reveals (they already make
   Spellbook cards), player lines.

## Tests

- Server: a sentence reveal stores the line (save file and snapshot); a repeated reveal does not duplicate; the
  cap keeps 50 newest; during an encounter the snapshot withholds the translation; a save without `lines` loads; a
  malformed `lines` fails as `SAVE_UNREADABLE`; a word reveal stores nothing.
- Mobile: the section renders lines with the translation between encounters, hides it during one, and is absent
  for an empty or missing list; the 🔊 has the native text.
- All mobile, server and client tests pass; expo-doctor; iOS export.

## Live

None: the stored text is what the provider already returned; the fixture provider covers it.
