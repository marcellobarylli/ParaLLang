# Round 025 plan v1: the Fountain's infohazard (backlog B3, Fountain part)

## Goal
The Cracked Fountain carries the infohazard idea from the owner's notes (parallang_obsidian/LORE.md "Infohazards":
infohazards live in the foreign language and only harm someone who understands it; the Lethargers farm brainrot, a
strain with low harm and very high virulence; the SCP-style containment file in a deadpan voice; symptom "a
catchphrase that attaches to the end of every sentence"). Content only, Italian and Spanish packs; no engine change;
Gerald's pinned prompts unchanged. The Rift part of B3 was round 015 (Errata).

## Design
1. **Flick's jingle becomes a named infohazard** (`content/characters/enemies/letharger_flick.yaml`, shared by both
   packs). Replace the quirk "Hums a jingle that sticks: brainrot it farms, low harm and very high virulence" with:
   "Hums the Fountain jingle, a brainrot strain native to the other language (low harm, very high virulence): it
   tacks the jingle onto the end of its lines like a catchphrase; it only works on listeners who understand it, and
   the player is starting to". The jingle's words are authored per pack (design 2), so the shared quirk names no
   language.
2. **The jingle text, per pack, in the `now` objective's intent** (`content/languages/<code>/encounters/
   cracked_fountain_letharger.yaml`). The narration prompt gets the remaining objectives (`objectives.slice(next)`),
   so the last objective's intent reaches every line, greeting included; it also reaches the grader.
   - it: "The player refuses to put it off and says now, in Italian. Flick keeps humming its jingle, \"Dopo, dopo,
     domani!\" (later, later, tomorrow), a mild brainrot infohazard that makes listeners put things off; humming it
     back is giving in, not insisting on now."
   - es: same with "¡Después, después, mañana!".
   - The jingle uses only `dopo`/`domani` (`despues`/`manana`), entries already in the fountain vocabulary file,
     which are not targets and are the very temptation the `now` objective already refuses ("Domani." fails). It
     contains none of the targets (fermati, fermo, basta, destra, sinistra, dritto, adesso, ora / quieto, basta,
     derecha, izquierda, ahora), so it gives no answer away.
3. **Negative example for `now`** in both packs: "Dopo, dopo, domani!" / "¡Después, después, mañana!", reason
   "Humming Flick's jingle back puts it off; it does not insist on now."
4. **Companion briefing** (new `companion_briefing` on the Fountain encounter, both packs, English, three lines,
   SCP containment-file voice, shown by the app's existing card since round 009):
   - "Containment notice, the Cracked Fountain: one brainrot strain. Harm: low. Virulence: very high."
   - "Vector: a jingle. It only works on people who understand it, which now includes you. Congratulations."
   - "Containment procedure: do not hum along."
5. **Location description** (`content/world/locations/cracked_fountain.yaml`, shared): append "A brass plaque,
   newer than the fountain, reads: PLEASE DO NOT HUM." (narration prompts carry the location name only, so this is
   map text).
6. **Resolved message** (both packs): "... and is gone before you can look straight at it. The fountain is quieter,
   and the jingle has almost left your head."
7. **Deferred:** the Spellbook's containment file per infohazard (LORE.md gameplay hook) becomes a new backlog item
   (B4, needs a Spellbook/app change); the companion redacting a hazard; optional infohazard passages (A9).

## Tests
- `server/test/fountain.test.js`: both packs: the `now` objective's intent contains the pack's jingle, its
  negative examples contain the jingle text, the encounter has a three-line briefing, the jingle's words are
  narration entries and none of the encounter's target forms appears in the jingle (folded, whole word); the start
  snapshot carries the briefing.
- Existing: Gerald's golden prompts unchanged; full server, mobile and web client suites.

## Live runs (codex-cli)
- Baseline on HEAD before the change: `--location cracked_fountain`, it and es, default script (running).
- After: it default script; it with `--lines 'Guarda!|Fermati!|Left.|A sinistra!|Dopo, dopo, domani!|No, adesso!'`;
  es with the Spanish hum in place of "Mañana.".
- Measures: resolved; verdicts as scripted (the hum must fail `now`); lines carrying the jingle (both words);
  share against requested; target answers used by Flick before the player passed them; whether Flick's English
  keeps its feed voice. Pass bar: all resolved, hum fails, jingle in at least half the lines, no answer leak.
