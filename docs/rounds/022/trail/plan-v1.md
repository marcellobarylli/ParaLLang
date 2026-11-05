# Round 022 plan v1: conversations with party members (backlog A8b)

Autonomous round (no owner). Round 021 (A8a) lets the player save a defeated, saveable NPC to the party
(`party: [{ characterId, encounterId, joinedAt }]` in save schema 3). A8b: "revisit conversations with party
members" (prototype.md §2.1 item 5: "unlocking deeper conversations over time"; GAME MECHANICS.md: "build a
relationship with them and have more meaningful conversations over time").

## Design

### A party conversation is an encounter (content)

The engine already plays any authored encounter (objectives, grading, hints, Spellbook). A party conversation is an
encounter file with a new field `party_of: <encounter id>` instead of a map location:

- `party_of` names a location encounter (not another party conversation) whose character file is the same and
  `saveable: true`; the loader refuses anything else.
- It has no `location` (schema: `location` required without `party_of`, forbidden with it); the world's "each
  encounter is held by its location" check skips it. It never appears on the map.
- Same objective, vocabulary and ambient rules as other encounters.

### Engine

- `startEncounter(learnerId, { encounterId })` with a party conversation: 409 `NOT_IN_PARTY` unless the character is
  in the party; no location or gate check (the member travels with the player). Without `encounterId` nothing
  changes (default encounter).
- Its narration's location is the player's **current** location (stored on the session at start so later turns
  keep it): "The player approaches Gerald at The Cracked Fountain". No template change; Gerald's pinned prompts
  (his location encounter) stay byte-identical.
- On resolution it is **not** added to `world.completedEncounterIds` (map and Rift gate unchanged); instead the
  member's `conversations` count goes up by one (once per resolution; retries are replayed from
  `processedAssessments` as today).
- Party member in the save: optional `conversations` (non-negative integer, missing = 0); no schema bump (v3 has
  existed only since round 021, and missing reads as 0).
- `partySnapshot` adds `conversations` and `conversationId` (the pack's party conversation for the member's
  encounter, or null; the first by file order if several).
- Serialized encounter adds `partyConversation: true|false`.

### Content: Gerald's coffee break (it, es)

`content/languages/<code>/encounters/gerald_coffee_break.yaml`, `party_of: imp_coffee_greeting`, Gerald's sheet.
Gerald, now in the party, makes the player a coffee on the road and waits for a verdict.

- Objective 1 `praise_coffee`: tell Gerald the coffee is good. it: *buono* (buono, buona, buonissimo,
  buonissima), *ottimo* (ottimo, ottima); es: *bueno* (bueno, buena, buenísimo, buenísima), *rico* (rico, rica,
  riquísimo, riquísima).
- Objective 2 `thank_gerald`: thank him. it: *grazie* (grazie, grazie mille); es: *gracias* (gracias, muchas
  gracias).
- New vocabulary file each: `gerald_break.yaml` (own version, Treccani / RAE and Wiktionary references).
  English-collision check: none of the forms is an English word ("rico" is not; "buona" not).
- Escalation 0.05 per turn as Gerald's; base ratio is his (0.25).
- Negative examples: English-only praise; praise of something else ("The cart is buono"); quoting Gerald;
  thanking someone else; a negated verdict ("Non è buono").

### App

- Party screen: per member "Conversations: N" and a **Talk to Gerald** button when `conversationId` is set.
- Store `talkTo(encounterId)`: start that encounter, open the dialogue view (shares `enterEncounter`'s code path:
  `enterEncounter(encounterId?)`).
- Resolved party conversation: the existing party card shows "Gerald is in your party." (no offer); the party is
  refreshed after resolution so the count updates.

### Tests

- Loader: `party_of` must name a location encounter with the same, saveable character; `location` with
  `party_of` refused; a party conversation is not on the map.
- Service: `NOT_IN_PARTY` before recruiting; start anywhere after; narration names the current location; resolution
  increments `conversations` once and leaves `completedEncounterIds` unchanged; party snapshot fields; invalid
  `conversations` (negative, non-integer) → `SAVE_UNREADABLE`.
- Both packs load; Gerald's golden prompts unchanged.
- Mobile: Talk button and count on the Party screen; `talkTo` opens the dialogue.

### Live data

`play-market.js --party` (new): plays Gerald's encounter, recruits him, walks one step away (Market Entrance), starts
the coffee break and plays scripted lines: it `Delicious!` (English, fails), `È buonissimo!` (variant form,
passes praise), `Grazie mille!` (passes thanks); es `Delicious!`, `¡Está riquísimo!`, `¡Muchas gracias!`. 3 it + 1
es runs (~9 calls each). Record: resolution, verdicts against the script, the narration's language share against
the requested ratio, whether the location named is the current one, and lines that give away an open objective's
answer (e.g. Gerald saying *buono* / *grazie* before the player).

## Claim boundary

Tests, plus a handful of live runs as a smoke check of one authored conversation; no claim about relationship
depth. Not checked in the iOS Simulator.

## Deferred

Deeper conversation tiers unlocked by `conversations`, conversations for Mortimer, Flick and Marginalia (one content
round each, or one together), a relationship score.
