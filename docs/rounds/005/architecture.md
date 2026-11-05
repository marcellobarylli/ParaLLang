# Round 005 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present and not through the round pipeline. Sections marked *pre-run* must not be
edited after the commit that holds them. Changes go into dated Amendments; results go into the dated Outcome section,
added later. The full record (drafts, raw critiques, timeline) is in `trail/`; it is not needed to implement this
round.

- **Design source:** [`prototype.md`](../../../prototype.md) §8.2 (six points of interest) and §10 Phase 3 ("Map
  system", "Location rendering"); [round 004](../004/architecture.md) (the app in `mobile/`, the frozen web client);
  `parallang_obsidian/LOCATIONS.md` ("a self-contained level … move around points of interest") and
  `GAME MECHANICS.md` ("a world map that has a fog of war"); the autonomous backlog item A1 in
  [`docs/autonomy/STATE.md`](../../autonomy/STATE.md).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `content/world/`, `server/src/world.js`, server loader, storage, service, app and scripts,
  `mobile/` (map view, store, API), tests.

## Goal (pre-run)

The Crumbling Market becomes an explorable level in the iPhone app: the six locations of prototype.md §8.2, joined by
paths, with fog of war, the player's position and visited places saved, and Gerald's encounter entered from The
Coffee Cart on the map.

## Owner decisions (pre-run)

No owner was present. Each choice below is an **autonomous decision, pending owner review**, also listed in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Scope.** The map first, with Gerald as the only encounter; the five other locations are explorable and show
   "Nothing here wants to talk to you yet." Generalising the encounter engine is the next round (A2).
2. **World content is shared** by every language pack (English narration under `content/world/`).
3. **Encounter start does not check location** on the server, so the frozen web client (which starts Gerald on
   load) keeps working. The app only offers "Talk to Gerald" at The Coffee Cart.
4. **Optional `PARALLANG_TOKEN`.** Required by the sandbox rule that every server bound during the run is
   token-protected; unset by default.
5. **Second opinion.** Codex critique 1 did not run (sandbox failure); critique 2 dispositions are in the table below.

## Claim boundary (pre-run)

The round can claim: the world content loads and validates; the server's world API, fog of war, moves and save
migration behave as tested; the app's map flow works in jest (React Native Testing Library); the iOS bundle builds;
and the live CLI runs reported in findings. It cannot claim anything about how the map looks or feels in the iOS
Simulator or on a device: there is no Simulator in this environment.

## Deferred (pre-run)

- New encounters (A3–A7), location-keyed encounter start (A2), LLM-enhanced atmosphere (A10), save slots (A11),
  the party (A8), lore fragments (A9), tone changes (B1).
- The web client gets no map (frozen).
- react-native-svg for drawn paths (visual polish round).
- Codex optional items: none were listed.

## Design (pre-run)

### Content

- `content/world/locations/<id>.yaml`, one per node: `market_entrance`, `coffee_cart`, `butchers_stall`,
  `cracked_fountain`, `old_bookshop`, `the_rift`. Fields: `id` (must match the file name), `name`, `description`
  (English, the style guide's dry tone), `vocabulary_focus` (prototype.md §8.2), `encounter` (an encounter id or
  `null`), `map: { x, y }` in 0..1.
- `content/world/connections.yaml`: `start: market_entrance`; two-way `paths`: market_entrance–coffee_cart,
  market_entrance–butchers_stall, coffee_cart–cracked_fountain, butchers_stall–cracked_fountain,
  cracked_fountain–old_bookshop, old_bookshop–the_rift.
- The loader (`loadWorld` in `content-loader.js`, Zod plus cross-checks) rejects: unknown path ends, self-loops, an
  unknown start, locations unreachable from the start, a location naming an encounter other than the loaded one,
  and an encounter not held by exactly the location its `location` field names.

### Save format

- `SAVE_SCHEMA_VERSION` 2 adds `world: { currentLocationId: string|null, visitedLocationIds: string[],
  completedEncounterIds: string[] }`. A version 1 save gains an empty `world` in memory on load and is written as
  version 2 on its next save; its Spellbook is untouched. A malformed `world` is `SAVE_UNREADABLE`, original kept.
- Storage stays content-agnostic: a null or unknown `currentLocationId` means the start location.

### Server

- `server/src/world.js` (pure): `worldSnapshot(world, progress)` and `applyMove(world, progress, id)`.
- Fog of war: each location is `current`, `visited`, `known` (a neighbour of a visited or current location) or
  hidden. Hidden locations and paths touching them are left out. `known` locations show name, map position and
  `adjacent` only; `current` and `visited` ones add the description, vocabulary focus and
  `encounter: { id, completed } | null`.
- A move to the current location writes nothing; a move to a neighbour saves the new current location and adds
  **both the origin and the destination** to `visitedLocationIds` (critique 2.2); a non-neighbour is 409
  `NOT_ADJACENT`; an unknown or missing id is 400.
- When `submitDialogue` resolves an encounter, the same staged save adds the **content** encounter id
  (`this.content.encounter.id`, not the session UUID; critique 2.5) to `completedEncounterIds`.
- Routes `GET /api/world` and `POST /api/world/move { locationId }`, with `X-Learner-Id` as elsewhere, served by
  `LearningService.getWorld` and `moveTo` under the per-learner lock.
- `PARALLANG_TOKEN`: when set, every `/api` route except `/api/health` needs `X-ParaLLang-Token` (401
  `UNAUTHORIZED` otherwise). `verify:cli` and the test servers use a random token and send it.

### App

- Default view `map`: `MapPanel` places the visible nodes by `map.x/y` in a square, draws paths as rotated thin
  `View`s, marks the current node, and lets the player tap an adjacent node to walk there. The location card shows
  the name, description, "Words here: …", and either "Talk to Gerald" (or "… again" with "✓ Encounter complete")
  or "Nothing here wants to talk to you yet."
- Store: `initialize` creates or recovers the learner and fetches **the world and the Spellbook** (critique 2.3),
  no encounter start. `moveTo`, `enterEncounter` (`startEncounter(learnerId, false)`, then the dialogue view),
  `openMap` (refetches the world). A resolved dialogue refetches the world.
- Spellbook and review return to the screen they were opened from (`returnView`), labelled "Return to Gerald" or
  "Return to the map" (critique 2.4, narrower fix). Restart shows only in the dialogue view; Map shows outside the
  map view; the header subtitle names the current location.

### Live data

- `server/scripts/play-market.js --provider <cli> [--out file]`: an in-process playthrough (no port) on a
  temporary save: world at start, a rejected non-adjacent move, the walk to The Coffee Cart, Gerald's greeting, the
  two-turn order, the map showing the encounter completed. It reports every raw LLM output, grading verdicts and
  timings, and two **estimates** of each line's target-language share (tokens absent from the English translation;
  tokens covered by canonical vocabulary), next to the requested ratio. The estimates are not an acceptance gate
  (critique 2.6).

## Second opinion (pre-run)

Critique 1 did not run: Codex's read-only sandbox (bwrap) cannot start inside the Apptainer container, so it read
nothing ([critique-1](trail/critique-1.md), 0 findings). Critique 2 reviewed the same text
([`trail/plan-v2.md`](trail/plan-v2.md), sha256 824161b0…, identical to [`plan-v1.md`](trail/plan-v1.md)) with the
code inlined on stdin; Codex, effort high; raw text in [`trail/critique-2.md`](trail/critique-2.md). Dispositions
are autonomous decisions by Claude, pending owner review.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 2.1 | Error | Paths written as `entrance` instead of `market_entrance` | 0 | Accept | **Accepted** (autonomous, pending owner review) | Design: Content |
| 2.2 | Error | The first move loses the start from the visited list, re-fogging its neighbours | 0 | Accept: save origin and destination | **Accepted** (autonomous, pending owner review) | Design: Server |
| 2.3 | Error | The app no longer gets the Spellbook at startup | + | Accept: fetch it with the world | **Accepted** (autonomous, pending owner review) | Design: App |
| 2.4 | Error | Spellbook/review return buttons go to an empty dialogue and Restart bypasses the map | 0 | Accept with a narrower fix: return to the screen they were opened from; Restart only in dialogue | **Accepted, narrower fix** (autonomous, pending owner review) | Design: App |
| 2.5 | Error | Completion would record the session UUID, not the content id | − | Keep completion (needed for the map's check mark and later Rift gating), keyed by `content.encounter.id` | **Accepted, completion kept** (autonomous, pending owner review) | Design: Server |
| 2.6 | Error | Canonical-vocabulary coverage is reported as a language ratio | − | Accept in part: the run brief asks for the language ratio, so keep it as two labelled estimates, not an acceptance gate | **Accepted in part** (autonomous, pending owner review) | Design: Live data |
| 2.7 | Cut | Token auth unrelated to the level | − | Reject: the sandbox rules require any bound server (verify:cli, test servers) to be token-protected | **Rejected** (autonomous, pending owner review) | Decision 4 |
| 2.8 | Cut | The live playthrough script duplicates verify:cli | − | Reject: the run brief requires live playthroughs with recorded LLM outputs; the script walks the map and is reused by later rounds | **Rejected** (autonomous, pending owner review) | Design: Live data |
| 2.9 | Cut | `vocabulary_focus` has no consumer | − | Reject: show it on the location card ("Words here: …") | **Rejected, consumer added** (autonomous, pending owner review) | Design: App |

Net change from plan v2: +1 startup fetch, +1 return-view field, one label line; no step removed.

## Tests (pre-run)

1. `node --test server/test/*.test.js`: all existing tests plus `world.test.js` (content loads for `it` and `es`;
   the loader's seven rejections; fog at the start; moves adjacent, non-adjacent, unknown, no-op; persistence across
   a new service; version 1 migration with the Spellbook intact, unknown location fallback, malformed world
   rejected; completion on resolve through HTTP; token required except health) and `play-market.test.js` (the share
   estimates).
2. `npm run test:mobile`: all existing tests, updated to start on the map, plus store tests for moving, entering,
   return views, a failed move and the refresh on resolve; the UI flow walks map → Coffee Cart → Gerald → resolved →
   map with "✓ Encounter complete".
3. Frozen web client: `npm exec --workspace client -- vitest run` and `npm run build -w client`.
4. `cd mobile && npx expo-doctor` and `npx expo export --platform ios`. Before this round, expo-doctor reports 19/20:
   the SDK version check wants expo 58.0.23 and react-native-safe-area-context ~5.11.1 (newer releases since round
   004); this round changes no dependency.
5. Live (codex-cli): `npm run check:provider -- --provider codex-cli`, `npm run verify:cli -- --provider
   codex-cli`, and `node server/scripts/play-market.js --provider codex-cli`, Italian; outputs saved under
   `docs/rounds/005/results/`.
6. `git diff --check`; `python3 tools/round_log_check.py 005`.

## Outcome (2026-11-05)

Built as designed, with the critique 2 dispositions. Server 73/73, mobile 18/18, the frozen web client 12/12 and
its build, the iOS bundle; `expo-doctor` 19/20 from upstream releases (no dependency changed). Live with codex-cli
in Italian: the map playthrough resolved Gerald and marked the encounter complete on the map; `verify:cli` passed
9/9. Gerald dictated the answer in one line, and the echo scored quality 2; that goes to B1. The build was drafted
before the freeze while the critique ran (journal row 7). Nothing was checked in the iOS Simulator. See
[findings](findings.md).
