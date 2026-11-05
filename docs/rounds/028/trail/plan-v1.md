# Round 028 plan v1: containment files in the Spellbook (backlog B4)

## Goal
The Spellbook keeps a deadpan SCP-style containment file for each infohazard the player has met
(parallang_obsidian/LORE.md, "Gameplay hooks": "The Spellbook keeps a containment file for every infohazard you
encounter, written in the deadpan SCP voice"; properties: Virulence, Harm, Incubation, Vector, Containment). Two
infohazards exist: Errata at the Rift (round 015) and Flick's jingle at the Cracked Fountain (round 025). No LLM or
prompt change: the files are shown in the app, never sent to the model.

## Design
1. **Content**, per language pack (the jingle's name is target language): an optional `containment_file` block on a
   location encounter (`party_of` encounters may not have one; the loader refuses it):
   - `designation` (e.g. "CM-001"), `name`, `class`, `virulence`, `harm`, `incubation`, `vector`, `containment`
     (one string each), `notes` (1–3 strings). Strict Zod schema; designations unique across the pack.
   - Cracked Fountain (it): CM-001, "Dopo, dopo, domani!" (es: "¡Después, después, mañana!"), class "Brainrot
     (mild)"; virulence "Very high. It spreads from host to host faster than it can be filed."; harm "Low. Hosts put
     things off, beginning with reading this file."; incubation "Immediate on understanding. Listeners who do not
     understand it are unaffected, and slightly smug about it."; vector "Song: a three-word jingle, hummed at the
     end of every sentence by Flick the Letharger."; containment "Do not hum along. Do not translate it for anyone
     who has not asked. If humming begins, do the thing you were putting off."; notes "Recovered at the Cracked
     Fountain, whose plaque reads PLEASE DO NOT HUM." and "Native speakers of the other language are immune. The
     author of this file is not."
   - The Rift (both packs, English): CM-002, "Errata", class "Rift-born (corruption)"; virulence "Unknown. It does
     not spread so much as leak, through the seam where the two languages touch."; harm "Moderate. The host's own
     language turns çùršęd. It reads anyone whose name it learns."; incubation "Begins as soon as the host
     understands one of its sentences. The host understands quite a lot by now."; vector "Speech, in both languages
     at once, slightly wrong in each."; containment "Do not understand it more than necessary. Do not tell it who you
     are."; notes "Recovered at the Rift, once the other five encounters were filed." and "It talks in fragments of
     this file. This file would prefer that it did not."
2. **When met: the hazard's location has been visited** (`world.visitedLocationIds` plus the current location, as
   the map computes it). No save change. Alternative considered: "the encounter was started", which needs a new save
   field (schema 4), since sessions are not persisted.
3. **Server.** `spellbookSnapshot` gains `containmentFiles`: the met files, sorted by designation, each
   `{ encounterId, locationName, designation, name, class, properties: { virulence, harm, incubation, vector,
   containment }, notes }`. Every response that carries a spellbook carries them. Shown during encounters too: a
   test guarantees no file contains any surface form of any objective target in its pack (folded, word-bounded, as
   the narration matcher folds), so a file never answers an NPC.
4. **Mobile.** The Spellbook screen lists "Containment files" below the cards when there are any: designation and
   name as a heading, class, the five properties as label/value rows, then the notes. `openSpellbook` refreshes the
   spellbook from the server in the background (as `openMap` refreshes the world), because moving to a location
   returns only the world and the file would otherwise appear only after the next spellbook-bearing response.
5. **Web client:** frozen; it ignores the new field.

## Tests
- Server: both packs load with the two files; the loader rejects a file on a party conversation, a duplicate
  designation, a missing property, an unknown key; no file contains a target form of the pack (all encounters);
  the snapshot lists no file at the start, the Fountain's after moving there (in-process and through `api()` on
  `/api/spellbook`), and the Rift's only once it is visited; old saves with visited locations show the files.
- Mobile: the Spellbook renders a file's heading, properties and notes; no section without files; `openSpellbook`
  refreshes and keeps the view if the refresh fails (error shown, as `openMap`).
- Full suites, expo-doctor, iOS export.

## Not here
Simulator check (layout, VoiceOver reading order of the label/value rows) → owner. Owner review of the file texts.
Companion redaction of hazards (LORE) and more hazards: later.
