# Round 017 plan v1: the Spellbook stops giving answers away, and shows notes (backlog D3)

## Problem

Round 001's audit ("Broken"): Spellbook cards show the English meaning of words that are still protected in the NPC's
current message, so a player reads for free the hint the companion's budget is meant to charge for. Two more leaks of
the same kind exist today in the app (`mobile/src/components/Spellbook.js`):

1. A **due** card shows its meaning right above its Review button, and the review asks for exactly that meaning.
   Every newly discovered word is due at once (`initialSchedule` sets `dueAt` to the discovery time), so the first
   review of every word can be read off the card.
2. The review flow can pick a word that is in play: `createReviewChallenge` without an id takes the first due card,
   and its result (or "Show answer") gives the meaning mid-encounter.

Round 003 item 5 also deferred showing vocabulary `note`s: entries carry an authored `note` (and an `example`), the
server drops the note from the card and the app shows neither.

## Change

Server (`server/src/learning-service.js`), additive to the card shape:

- A card carries `note` (the entry's note, or null) and `inPlay` (boolean): true while the learner's active
  encounter is ongoing and the word is in its current NPC message with its meaning not yet revealed (the same rule
  `serializeEncounter` uses to hide `meaning`). The card keeps `meanings`, `example` (the frozen web client reads
  `meanings`).
- `createReviewChallenge` without an id skips in-play cards; with the id of an in-play card it refuses with 409
  `IN_PLAY` ("Finish this line of the encounter first, or ask your companion."). Snapshots built from a staged
  encounter pass that encounter, so `inPlay` matches the encounter returned with it.

App (`mobile/src/components/Spellbook.js`):

- In play: the card shows the target word, part of speech and the line "In play: answer, or ask your companion for
  a hint." No meanings, no note, no example English, no Review button.
- Due (and not in play): target, part of speech, the example's target sentence only, "Meaning hidden until you
  review it." and the Review button. The meaning, note and example English are seen in the review result or
  "Show answer" (scored as now).
- Otherwise: meanings, note and the example (target and English), as reference.

Web client: frozen, unchanged; it keeps showing meanings on cards (it never used `inPlay`); its review button can now
get 409 `IN_PLAY` for an in-play word, which it shows as an error like other conflicts.

## Not changed

Prompts, content, grading, SM-2, the encounter payload, Gerald's golden prompts. No live LLM runs (no prompt or
content change); the in-play rule is deterministic and tested in process.

## Tests

- Server: a card's `inPlay` is true for a word in the protected current message, false after a companion reveal of
  that word, after the encounter resolves, and for words only in earlier messages; `note` comes from content;
  review without id skips in-play cards; review with an in-play id is 409 `IN_PLAY`.
- Mobile: Spellbook renders the three card states (in play: no meaning, no Review; due: no meaning, example target
  only, Review; not due: meaning, note, example English).
- Full suites: server, mobile, web client and build, expo-doctor, iOS export.

## Claim boundary

Hides answers in the app's Spellbook; the API still sends meanings (single-player prototype). Not checked in the iOS
Simulator.
