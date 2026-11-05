# Round 021 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog A8 in [`docs/autonomy/STATE.md`](../../autonomy/STATE.md); prototype.md §2.1 item 5,
  §5 (save format `party`), §8 ("[SAVE / LEAVE choice]") and the Phase 3 table; GAME MECHANICS.md ("he can be saved
  instead of killed (Pokemon style)").
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** server (save schema 3, party API, start route fix), app (offer card, map invite, Party screen),
  tests, `play-market.js --recruit`.

## Goal (pre-run)

A8 is split. **A8a (this round):** after a saveable NPC is defeated the player can save them to the party or leave;
the party is in the learner save and shown in the app. **A8b (next):** revisit conversations with party members
(LLM, a new prompt template, relationship), with live runs.

Also fixed: `POST /api/encounter/start` dropped `encounterId`, so over HTTP the app started Gerald (the pack's default
encounter, with no location check) at every location. Every encounter test since round 006 called the service
in-process or started without an id.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Split A8** into recruitment (A8a) and revisit conversations (A8b): recruitment is deterministic and needs no
   provider; conversations need a prompt template and live runs.
2. **Leave is not final.** Leave writes nothing; a defeated saveable NPC can be invited later from their location
   card on the map. Alternative: a final refusal (Pokémon-like stakes); rejected so that a missed tap does not cost
   the content A8b builds on.
3. **Membership is by character** (`characterId`), not by encounter; the app compares by character id.
4. **Recruiting is allowed while another encounter is under way**: it changes nothing the encounter protects
   (no meanings, no provider call).

## Design (pre-run)

### Save, schema 3

- `SAVE_SCHEMA_VERSION` 2 → 3; new top-level `party: [{ characterId, encounterId, joinedAt }]`, join order.
- Migration in memory, written as v3 on the next save: v1 → empty world and empty party; v2 → empty party.
- Validation (`SAVE_UNREADABLE`, original file kept): `party` an array; each member an object with string
  `characterId` and `encounterId`, ISO `joinedAt`; `characterId` unique.

### Server

- Start route passes `encounterId: req.body?.encounterId ?? null`; the service's checks are unchanged (unknown or
  non-string id → 400, `NOT_HERE`, `SEALED`; omitted id → the default encounter anywhere, for the frozen web client).
- Serialized encounter: `character: { id, name, saveable }`.
- World snapshot, visited locations' `encounter`: adds `characterId` and `saveable` (critique 1.1, 1.2).
- `partySnapshot(envelope)`: members whose saved encounter exists in the loaded pack **and** still names the saved
  character (1.3), as `{ characterId, name, encounterId, locationId, locationName, joinedAt }`; others stay in the
  save, hidden.
- `GET /api/party` → `{ party }`.
- `POST /api/party/recruit { encounterId }`, inside the learner lock, on a cloned envelope, answering only after
  the save (1.4):
  - unknown or non-string id → 400 `VALIDATION_ERROR`;
  - character not saveable (Portia, Errata) → 409 `NOT_SAVEABLE`;
  - encounter not in `world.completedEncounterIds` → 409 `NOT_DEFEATED`;
  - character already in the party → 200 `{ party, joined: false }`, no write;
  - otherwise append, save → 200 `{ party, joined: true }`. A failed save leaves the party as it was.
- No prompt, content or provider change: Gerald's pinned prompts stay byte-identical.

### App (`mobile/`)

- API `getParty`, `recruit(encounterId)`.
- Store: `party` (loaded with world and Spellbook at initialize), `notice`; `recruit` captures learner and request
  epoch before awaiting and drops stale results (1.6), ignores taps while loading; `openParty` (view `party`, returns
  where it was opened from); learner switch resets the party.
- Resolved encounter with a saveable character not in the party: card "*Name* could join your party." with
  **Save *Name*** and **Leave** (opens the map); once saved, "*Name* is in your party."
- Map location card, completed encounter with a saveable character not in the party: the same card without Leave.
- Party screen: members (name, where met) or "No one has joined you yet. …"; a Party button with the count in the
  header.
- Web client: untouched (frozen).

### Tests

- Server: start route with an id at the right place (Portia at the entrance) and the wrong place (`NOT_HERE`), a
  malformed id (400), omitted id still the default (1.7); recruit over HTTP after resolving Gerald (joined, then
  idempotent, GET lists him), `NOT_DEFEATED`, `NOT_SAVEABLE`, unknown id; two concurrent recruits append once; a
  failed save leaves the party empty; recruiting during an ongoing encounter leaves its version unchanged and makes
  no provider call (1.8); membership survives a new service on the same save dir; migration v1 and v2 → v3 keeps
  Spellbook, receipts and world (1.5); invalid party shapes (not an array, null member, duplicate character, bad
  timestamp) → `SAVE_UNREADABLE` with the file unchanged; a member whose encounter now names another character is
  hidden; `saveable` and `characterId` in the world snapshot.
- Mobile: party at initialize; Save in the resolved card recruits and shows the member; Leave opens the map; map
  invite only for completed saveable encounters (not Portia); Party screen empty and filled; a recruit answered after
  a learner switch is dropped.

### Live data

No prompt or content change, so no share or grading measures. One live `play-market.js --location coffee_cart
--recruit` run (5 calls): recruits after the resolution and reports the party.

## Claim boundary (pre-run)

Server and app logic under tests and one live run. Nothing is checked in the iOS Simulator (layout, taps and
VoiceOver of the cards and the Party screen go to the owner's list).

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 2c0b93e3…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | The map cannot know saveability: the world snapshot's encounter has no `saveable` | + | Accept: add `saveable`; test no invite for Portia | **Accepted** (autonomous) | Design, Server; Tests |
| 1.2 | Risk | Membership is by character but the app would compare encounter ids | + | Accept: expose `character.id` and `characterId`, compare by character | **Accepted** (autonomous) | Decision 3; Design |
| 1.3 | Risk | A saved encounter that now names another character would show the wrong NPC | 0 | Accept: hide members whose character id no longer matches; test | **Accepted** (autonomous) | Design, `partySnapshot`; Tests |
| 1.4 | Risk | Concurrency and failed-write coverage missing | 0 | Accept in part: concurrent recruits and a failed save are tested; a lost response is already safe to retry (idempotent `joined: false`), not tested separately | **Accepted in part** (autonomous) | Design, recruit; Tests |
| 1.5 | Suggestion | Migration and corruption tests too narrow | 0 | Accept in part: v1 and v2 migration, four invalid shapes, file unchanged; "missing party" is the v2 migration case | **Accepted in part** (autonomous) | Tests |
| 1.6 | Risk | Recruit needs stale-response protection; party missing from learner snapshots | + | Accept: epoch and learner guard, reset on switch; duplicate taps blocked by `isLoading`; one learner-switch test | **Accepted** (autonomous) | Design, App; Tests |
| 1.7 | Suggestion | Start route compatibility tests | 0 | Accept in part: omitted id, malformed id, right and wrong place over HTTP; sealed and restart are already tested in-process on the same service path | **Accepted in part** (autonomous) | Tests |
| 1.8 | Suggestion | Test recruiting during an ongoing encounter; persistence; Leave then invite | + | Accept: all three (Leave → map invite in the app test) | **Accepted** (autonomous) | Decision 4; Tests |

**Deferred:** Party ↔ Spellbook/review navigation tests (Optional): the Party screen uses the Spellbook's
return rule unchanged.

Net change from v1: the world snapshot and encounter carry character id and saveability, membership is compared by
character, and the test list grows.
