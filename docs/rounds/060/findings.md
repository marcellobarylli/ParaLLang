# Round 060 findings

## Question

Can the NPC lines the player pays to translate be kept for re-reading, as the owner's note asks ("Translated
sentences and words need to be stored somewhere for voluntary retrieval and practice"), without the Spellbook ever
showing an answer the game is asking for (round 017; backlog C9)?

## Finding

**Yes, checked by server and app tests only.**

- **What is kept.** A paid "Translate sentence" reveal now puts the line in the save (`lines`, the 50 newest, 500
  characters per text) with its speaker, the scene's place, its translation and its vocabulary ids.
- **Where it shows.** The Spellbook lists the lines under "Lines you translated", newest first. Each has a 🔊, and
  its translation sits behind a toggle.
- **When the translation is withheld.** The server withholds it during an encounter, and also while any card in the
  line is due: the line would be that card's answer in context. The critique found this gap. The app checks the
  cards against the clock as well.
- **A consequence.** A line's words are new cards, due at once, so a kept line first shows "The translation waits
  until you review its words." It opens once those cards have been reviewed. The tests show this with Gerald's
  greeting.
- **Receipts.** Stored receipts no longer copy the lines. A replay gets the current lines, so an old receipt cannot
  show translations during a new encounter.
- **Bad entries.** Invalid entries are dropped on load. Only a `lines` value that is not an array makes the save
  unreadable.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 9 findings, 7 accepted (the Error included), 2 in part.
- Checks: `server/test/kept-lines.test.js` (6), `mobile/src/__tests__/kept-lines.test.js` (4), and the full server,
  mobile and client suites. Also expo-doctor and the iOS export.
- No live runs. The kept text is what the provider already returned, and the fixture provider covers it. No
  Simulator.

## Results

| Check | Result |
|---|---|
| Server | 244/244 (238 before; 6 new) |
| Mobile jest | 157/157 (153 before; 4 new, 3 of which fail without the change; the font test's title count is now 10) |
| Web client | 12/12 (it ignores `lines`) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C9 is done. Lines are kept only from paid sentence reveals (decision 1), so a player who never pays for a sentence
keeps none.

## Evidence

- `server/test/kept-lines.test.js` covers:
  - keeping a line, hidden during the encounter and while its cards are due, and shown after their review;
  - no line from a word reveal;
  - a failed save, then a retry that keeps the line once;
  - deduping on folded text plus the speaker, and the caps;
  - tolerant loading;
  - receipts without lines, and a replay that gets the current lines.
- `mobile/src/__tests__/kept-lines.test.js` covers the toggle, the two waiting texts, a card that falls due by the
  clock, and no section for an empty or missing list.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

No one has played it. Two things are untested:

- How often players pay for sentences, and whether the waiting text makes them review. That needs playtests.
- How the section looks on a phone, and how VoiceOver reads it. That needs the Simulator.

Saves written before this round have no lines, and their receipts still hold old snapshots without lines; replays
add the current lines. Removing a save (round 039) deletes its lines with the file.

## Open items

1. **Owner, Simulator:** the "Lines you translated" section (long lines beside the 🔊, the toggle, VoiceOver,
   Dynamic Type).
2. **Owner:** should free translations of past lines be kept too (decision 1)? Is hiding a line until its cards are
   reviewed right (decision 2), or too strict for a reference section?
