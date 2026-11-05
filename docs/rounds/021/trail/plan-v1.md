# Round 021 plan v1: party recruitment (backlog A8a) and the start route's encounterId

Autonomous round (no owner). Backlog A8 ("Party system: save defeated (saveable) enemies, revisit conversations
with party members", prototype.md Phase 3) is split: **A8a** (this round) is the SAVE / LEAVE choice after a
saveable NPC is defeated, party membership in the learner save, and a Party screen in the app. **A8b** (next round)
is revisit conversations with party members (LLM, new prompt template, relationship), with live runs.

## Bug found while planning

`server/src/routes/encounter.js` calls `service.startEncounter(learnerId, { restart })` and drops
`req.body.encounterId`. The app sends `encounterId` (mobile/src/api/learning.js), so over HTTP every location starts
the pack's default encounter (Gerald) with no location check. All encounter tests since round 006 call the service
in-process or start without an id, so no test caught it. Fix: pass `encounterId: req.body?.encounterId ?? null`; an
HTTP test starts Portia at the Market Entrance and gets 409 `NOT_HERE` for Mortimer there.

## Design

### Save (schema 3)

- `SAVE_SCHEMA_VERSION` 2 → 3. New top-level `party: [{ characterId, encounterId, joinedAt }]`.
- Migration: v1 → v3 (empty world, empty party), v2 → v3 (empty party). Written as v3 on next save.
- Validation: `party` is an array; each member has string `characterId` and `encounterId`, ISO `joinedAt`;
  `characterId` unique. Otherwise `SAVE_UNREADABLE` (original preserved), like the world block.

### Server

- `serializeEncounter` adds `character.saveable` (boolean from the character sheet).
- `partySnapshot(envelope)`: members whose encounter exists in the loaded pack, in join order:
  `{ characterId, name, encounterId, locationId, locationName, joinedAt }`. Members from content that has since gone
  are kept in the save but not shown.
- `GET /api/party` → `{ party }`.
- `POST /api/party/recruit { encounterId }` (serialized per learner):
  - unknown or non-string encounterId → 400 `VALIDATION_ERROR`;
  - character not saveable (Portia, Errata) → 409 `NOT_SAVEABLE`;
  - encounter not in `world.completedEncounterIds` → 409 `NOT_DEFEATED`;
  - character already in the party → 200 `{ party, joined: false }`, no write;
  - else append `{ characterId, encounterId, joinedAt: now }`, save, → 200 `{ party, joined: true }`.
  - Allowed with an active encounter of any state: recruiting changes nothing the encounter protects.
- No LLM call, no prompt or content change: Gerald's pinned prompts stay byte-identical.

### Leave is not final (autonomous decision)

prototype.md §8 shows "[SAVE / LEAVE choice]" at the resolution. Leave writes nothing; the player can still invite a
defeated saveable NPC later from that NPC's location card on the map. Alternative: record a refusal and make it final
(Pokémon-like stakes); rejected for a learning game where a missed tap should not cost content that A8b builds on.

### App (mobile/)

- API: `getParty`, `recruit(encounterId)`.
- Store: `party` (loaded with world and Spellbook at initialize), `recruit(encounterId)` (sets party, a short
  `notice` "Gerald joined your party."), `openParty` (view `party`, returns to the view it was opened from, like the
  Spellbook).
- DialoguePanel, resolved and `character.saveable` and not in the party: a card "Gerald could join your party."
  with **Save Gerald** (recruit) and **Leave** (open the map). When in the party: "Gerald is in your party."
- MapPanel location card: for a completed encounter with a saveable NPC not in the party, an "Invite Gerald to your
  party" button; when in the party, "Gerald is in your party."
- PartyPanel (new): the members (name, where you met them), or "No one has joined you yet. Defeat someone worth
  keeping." Header gains a **Party** button with the member count.
- Web client: untouched (frozen). It ignores the new `saveable` field.

### Tests

- Server: route fix (HTTP start with encounterId at the right / wrong place); recruit over HTTP after resolving
  Gerald (joined true, then idempotent false, GET lists him with location name); NOT_DEFEATED before resolution;
  NOT_SAVEABLE for Portia; unknown id 400; save v2 → v3 migration keeps spellbook and world and adds `party: []`;
  invalid party → SAVE_UNREADABLE; `saveable` in the serialized encounter; members of unknown encounters hidden.
- Mobile: party loaded at initialize; Save in the resolved card calls recruit and shows the member; Leave opens the
  map; map invite for a completed saveable location; Party screen empty and filled states.
- Existing: world.test.js expects schemaVersion 2 after migration → 3.

### Live data

No prompt or content change, so no share or grading measures. One live `play-market.js --location coffee_cart`
run (5 calls) with a new `--recruit` flag that recruits after resolution and reports the party, to confirm the flow
with a real provider end to end.

## Claim boundary

Server and app logic under tests and one live run; nothing checked in the iOS Simulator (layout, taps, VoiceOver of
the new cards and screen go to the owner's list).
