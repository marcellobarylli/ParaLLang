# Round 005 plan v1: The Crumbling Market map and navigation

**Goal:** the Crumbling Market becomes an explorable level in the iPhone app: the six locations of prototype.md
§8.2, joined by paths, with fog of war, the player's position and visited places saved, and Gerald's encounter
entered from The Coffee Cart on the map (prototype.md Phase 3, "Map system" and "Location rendering", first slice).

## Problem

The server and app know one place and one encounter. `content-loader.js` loads one hard-wired encounter
(`imp_coffee_greeting`); the app opens straight into Gerald's dialogue (`mobile/App.js`, `gameStore.initialize`
calls `startEncounter`). There is no location content, no world state in the learner save
(`learning-storage.js`, schema version 1: `spellbook` only) and no map screen.

## Proposed change

### Content (shared by all language packs)

- `content/world/locations/<id>.yaml`, one per node: `market_entrance`, `coffee_cart`, `butchers_stall`,
  `cracked_fountain`, `old_bookshop`, `the_rift`. Fields: `id`, `name`, `description` (English narration, the
  Pratchett tone of the style guide), `vocabulary_focus` (from §8.2), `encounter` (an encounter id or `null`),
  `map: { x, y }` (0..1, layout on the map).
- `content/world/connections.yaml`: `start: market_entrance` and undirected `paths: [[a, b], ...]`:
  entrance–coffee_cart, entrance–butchers_stall, coffee_cart–cracked_fountain, butchers_stall–cracked_fountain,
  cracked_fountain–old_bookshop, old_bookshop–the_rift.
- Only `coffee_cart` names an encounter (`imp_coffee_greeting`); the other five are `null` until rounds A3–A7 add
  theirs. The loader checks with Zod and cross-checks: unique ids, paths name known locations and no self-loops,
  `start` exists, every location is reachable from `start`, each non-null `encounter` equals the loaded encounter's
  id, and the encounter's `location` field names the location that holds it.

### Save format

- `SAVE_SCHEMA_VERSION` 2 adds `world: { currentLocationId: string|null, visitedLocationIds: string[],
  completedEncounterIds: string[] }`. A version-1 save is migrated on load by adding an empty `world`
  (`currentLocationId: null`); it is written as version 2 on the next save. Anything else keeps the current
  "unsupported or corrupt, original preserved" error.
- Storage stays content-agnostic. The service treats a `currentLocationId` that is null or not in the content as
  the start location.

### Server

- `server/src/world.js`: pure functions over the loaded world and a save's `world`: `worldSnapshot(world, save)`
  and `assertMove(world, save, toId)`.
- Fog of war: a location is `current`, `visited`, `known` (adjacent to a visited or current location) or hidden.
  Hidden locations and paths touching them are left out of the snapshot. `known` locations show name and map
  position only; `current` and `visited` ones also show the description and `encounter: { id, completed }`.
- `LearningService.getWorld(learnerId)` and `moveTo(learnerId, locationId)`, under the existing per-learner lock.
  A move to the current location is a no-op; a move to an adjacent location sets `currentLocationId` and adds it
  to `visitedLocationIds`; anything else is a 409 `NOT_ADJACENT` (unknown id: 400). The first `getWorld` on a
  fresh save marks the start as visited in the response without writing.
- When `submitDialogue` resolves an encounter, the same staged save adds its id to `completedEncounterIds`.
- Routes: `GET /api/world` and `POST /api/world/move { locationId }`, `X-Learner-Id` as elsewhere.
- The encounter routes are unchanged and do not check the player's location, so the frozen web client keeps
  working. Location-keyed encounter start is round A2.
- Optional `PARALLANG_TOKEN`: when set, every `/api` route except `/api/health` requires the header
  `X-ParaLLang-Token` with that value (401 otherwise). `verify:cli` sets a random token for its ephemeral
  127.0.0.1 server. Unset by default, so the app and web client are unaffected.

### App (`mobile/`)

- New default view `map`. `MapPanel`: the visible nodes placed by `map.x/y` in a square box, paths drawn as
  rotated thin `View`s (no new dependency), the current node highlighted, `known` nodes as "?"-styled names. Tapping
  an adjacent node moves there. Under the map, a location card: name, description, and either "Talk to Gerald"
  (opens the encounter: `startEncounter(learnerId, false)`, view `dialogue`) or "Nothing here wants to talk yet."
  A completed encounter shows a check mark.
- Store: `world`, `loadWorld`, `moveTo`, `enterEncounter`, `openMap`. `initialize` creates or recovers the learner
  and loads the world (no encounter start). After a dialogue response with `encounter.state === 'resolved'`, the
  store reloads the world.
- Header: subtitle shows "The Crumbling Market — <current location>"; a Map button; Restart only in the dialogue
  view. Spellbook and review stay as they are.
- `api/learning.js`: `getWorld`, `moveTo`.

### Data acquisition

- `server/scripts/play-market.js --provider codex-cli`: an in-process playthrough (no port) on a temporary save:
  new learner, world snapshot, a non-adjacent move (expect rejection), entrance → coffee_cart, start Gerald, the
  order in two turns, world shows the encounter completed. It prints JSON: each step's result, Gerald's lines
  (`native`, `translation`), the measured target-language ratio of each line (target-language tokens / all
  tokens, via canonical vocabulary matches) against the requested ratio, grading verdicts and call timings.

## Assumptions

- The CLI providers' live behaviour is unchanged by this round (no prompt changes); `verify:cli` checks that.
- Expo Go ships `react-native` core only; the map uses `View`s, so no native module is added.

## Risks

- The save migration touches every existing learner save. Mitigation: migrate in memory only; tests load a real
  version-1 file and check its spellbook is unchanged.
- The app's flow test assumes it opens on dialogue; it must be updated to go through the map.

## Alternatives considered

- **Generalise the encounter engine first (A2).** Rejected for this round: the map is the visible Phase 3 step and
  needs no engine change; A2 is the next round.
- **Map as a plain list.** Simpler but loses the "map with fog of war" of prototype.md; the positioned map is
  ~100 lines of `View`s.
- **react-native-svg.** A dependency for a few lines; deferred to the visual polish round.
- **Enforce location on encounter start now.** Would break the frozen web client, which starts Gerald on load.

## Out of scope

New encounters (A3–A7), LLM-enhanced atmosphere (A10), save slots (A11), party (A8), lore fragments (A9), tone
changes (B1), the web client (frozen: no map), Simulator runs (no Simulator here).

## Acceptance criteria

1. Server tests: loader rejects a bad path, an unreachable node, a wrong encounter id; world snapshot fog of war;
   move adjacent/non-adjacent/unknown/no-op; persistence across a new service; version-1 save migration with the
   spellbook intact; completion recorded on resolve; token on/off; routes. All existing server tests pass.
2. Mobile tests: store `loadWorld`/`moveTo`/`enterEncounter`; the UI flow goes map → Coffee Cart → Gerald →
   resolved → map shows completed. All existing mobile tests pass (updated for the map start).
3. Web client: vitest and build unchanged and passing.
4. `npx expo-doctor` and `npx expo export --platform ios` pass.
5. Live: `npm run verify:cli -- --provider codex-cli` passes; `play-market.js` completes the walk with the
   encounter resolved, and findings record Gerald's outputs and the measured ratios.
6. `python3 tools/round_log_check.py 005` passes.
