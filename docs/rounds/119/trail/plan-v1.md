# Round 119 plan, draft 1: the map in the dungeon, in two layers

For a Codex critique before the build. The repository is ParaLLang, at `main` (`365044e`). Read
`docs/rounds/115/architecture.md` for the dungeon this round changes, and `docs/handoff.md` for the live deployment.

## Goal

The web client's dungeon stops being three sites in a fixed order. The player moves freely over a map with fog of
war, in two layers:

1. **The temple map.** Ta Prohm holds all seven Crumbling Market encounters as sites joined by branching paths. The
   top-down view of the temple is the map. The player picks where to walk and the camera walks there.
2. **The world map.** A screen above the temple that shows places. Ta Prohm is the one open place. The others are
   closed or hidden by fog.

The party (round 120) and leveling (round 121) are out of scope. This round leaves them a place to attach: the
party offer to a cleared site, the level gates to sealed sites and closed places.

## Owner decisions

- Both layers (Q1). Offered: the temple as the map; a map above the dungeons; both.
- Levels will unlock places and raise difficulty (Q2). Round 121.
- The party is ported as the app has it (Q3). Round 120.
- One round per feature, in the order map, party, levels, each deployed (Q4).

Every other choice below is Claude's.

## What exists

- `content/world/dungeons/ta_prohm.yaml`: three sites and one `route` polyline through them.
- Server (`server/src/learning-service.js`): `GET /api/dungeons/:id`, `POST /api/dungeons/:id/reset`,
  `POST /api/encounter/start` with `dungeonId`, which starts the run's next uncleared site (`NOT_NEXT_SITE`
  otherwise). The save holds `dungeons[id] = { run, cleared: [encounterId] }`. The cleared sites are a prefix of the
  site list.
- The market's map rules in `server/src/world.js` (pure): fog (`visited`, `known`), adjacency, gates
  (`requires_completed`), `applyMove`. The dungeon does not use them.
- Client: `stores/gameStore.js` (phases attract, overview, approach, walk, encounter, victory),
  `scene/director.js` (the camera, pure; it measures the one route), `scene/levelView.js` (three.js: one ribbon, a
  beacon per site, DOM labels), `components/DungeonScreen.jsx`.
- `client/src/__tests__/dungeon-file.test.js` checks the sites and the route against the level's wall plan. Its
  `blocked` function opens only the east gate passages (`|x| < 1.1`, `z > 0`).

## Content

### The dungeon file becomes a graph

```yaml
id: ta_prohm
name: Ta Prohm
level: taprohm
start: face_gate
goal: sanctuary
entrance: [[0, 96], [2.5, 70]]          # the avenue, for the first approach to the start site
sites:
  - { id: face_gate,        encounter: market_entrance_tutorial,   name: The Face Gate,        at: [3.5, 63] }
  - { id: buttress_tree,    encounter: butchers_stall_charcutier,  name: The Buttress Tree,    at: [17, 42] }
  - { id: root_court,       encounter: imp_coffee_greeting,        name: The Root Court,       at: [6, 21.5] }
  - { id: sunlit_court,     encounter: cracked_fountain_letharger, name: The Sunlit Court,     at: [-11, 23.5] }
  - { id: library,          encounter: old_bookshop_bookworm,      name: The Library,          at: [-26, 26] }
  - { id: before_sanctuary, encounter: high_gate_bambieshart,      name: Before the Sanctuary, at: [0.3, 11.2] }
  - { id: sanctuary,        encounter: the_rift_errata,            name: The Sanctuary,        at: [0.3, 5.4],
      requires: [face_gate, buttress_tree, root_court, sunlit_court, library, before_sanctuary] }
paths:
  - { between: [face_gate, buttress_tree],       via: [[0.3, 60.5], [0.3, 52], [0.3, 46]] }
  - { between: [face_gate, root_court],          via: [[0.3, 60.5], [0.3, 52], [0.3, 33], [0.3, 25.5], [5.5, 25.5]] }
  - { between: [buttress_tree, root_court],      via: [[0.3, 38], [0.3, 25.5], [5.5, 25.5]] }
  - { between: [root_court, sunlit_court],       via: [[0.3, 22.5]] }
  - { between: [sunlit_court, library],          via: [[-20, 25]] }
  - { between: [root_court, before_sanctuary],   via: [[0.3, 20.8]] }
  - { between: [sunlit_court, before_sanctuary], via: [[0.3, 20.8]] }
  - { between: [before_sanctuary, sanctuary],    via: [] }
```

- `route` goes. A path is the polyline `[a.at, ...via, b.at]` and is walked in either direction.
- The three existing sites keep their places. The four new coordinates and every `via` are first guesses. The plan
  test and the screenshots fix them during the build.
- All ring crossings stay on the east axis, through the gate passages the plan test already knows. The new sites
  stand in the courts either side of the axis. The sanctuary site stands inside the first enclosure, 1.7 m before
  the sanctuary's east wall, reached through the inner gate's passage.
- The Crumbling Market's graph is not copied. The temple's concentric plan gives the order: outside the wall, the
  outer court, the third enclosure's court, the second enclosure's court, the sanctuary.
- Loader checks (`content-loader.js`): unique site ids, `start` and `goal` are sites, each path joins two different
  sites and no pair twice, `requires` names sites, the graph is connected, every site is reachable from `start`
  under the rules below when the sites are cleared in some order, and each encounter is a location encounter in
  every pack (as now).

### The world file

`content/world/atlas.yaml`, shared by every pack:

```yaml
start: ta_prohm
places:
  - { id: ta_prohm,           name: Ta Prohm,           dungeon: ta_prohm, map: { x: 0.42, y: 0.60 }, description: "…" }
  - { id: angkor_wat,         name: Angkor Wat,         map: { x: 0.68, y: 0.38 }, description: "…", closed: "…" }
  - { id: micromort_mountain, name: Micromort Mountain, map: { x: 0.20, y: 0.25 }, description: "…", closed: "…" }
  - { id: the_bone_dome,      name: The Bone Dome,      map: { x: 0.88, y: 0.15 }, description: "…", closed: "…" }
paths: [[ta_prohm, angkor_wat], [ta_prohm, micromort_mountain], [angkor_wat, the_bone_dome]]
```

Angkor Wat and The Bone Dome are the owner's (`parallang_obsidian/LOCATIONS.md`). Micromort Mountain is the
owner's, from round 113. A place without `dungeon` is closed and shows its `closed` line. The loader validates the
file (ids, paths, `dungeon` names a loaded dungeon).

## Rules

For a dungeon run with `at` (the site the player stands at), `visited` and `cleared` (sets of site ids):

- **Fog.** A site is `current` (`at`), `visited`, `known` (adjacent to a visited site) or `hidden`.
- **Seal.** A site with `requires` is sealed until every listed site is cleared.
- **Pass.** A move from `at` to `to` is allowed when the two are joined by a path, `to` is not sealed, and either
  `at` is cleared or `to` is visited. A character lets the player pass once answered; the player can always go back.
- **Clear.** Resolving a site's encounter in the run clears the site. Playing a cleared site again changes nothing.
- **Complete.** The run is complete when `goal` is cleared. A complete run stays playable: every site is open.
- **Reset.** A new run forgets `cleared` and `visited` and puts the player at `start`.

The world layer uses the fog rule alone: a place is visited when it is `start` or its dungeon's run has progress,
known when adjacent to a visited place, hidden otherwise.

## Server

- **Save.** `dungeons[id] = { run, cleared: [siteId], visited: [siteId], at: siteId }`. `visited` and `at` are
  optional when read. A stored `cleared` entry counts for the site whose `id` or whose `encounter` it equals, so a
  save from rounds 114 to 118 keeps its cleared sites. Unknown ids are dropped. `at` defaults to `start`. `visited`
  always holds `start`, `at` and every cleared site. The schema version stays 3.
- **`GET /api/dungeons/:id`** returns
  `dungeon: { id, name, level, start, goal, sites: [{ id, encounterId, name, at, characterName }], paths }` and
  `progress: { run, at, complete, clearedSiteIds, visitedSiteIds, sites: { [id]: { state, cleared, reachable, gate? } } }`.
  `characterName` is null for a hidden site. `reachable` is the pass rule's answer for a move there now. The old
  fields `nextSiteIndex`, `nextEncounterId` and `clearedEncounterIds` go.
- **`POST /api/dungeons/:id/move`** `{ siteId, leave }` applies the pass rule and returns the same view. Errors:
  400 unknown site; 409 `NOT_ADJACENT`, `BLOCKED` ("Portia has not let you pass yet."), `SEALED`. While this
  dungeon's own conversation is under way it answers 409 `CONVERSATION_UNDER_WAY`, unless `leave` is true, which
  drops that conversation. A move to `at` changes nothing.
- **`POST /api/encounter/start`** with `dungeonId` starts the encounter of the site at `at`. An `encounterId` that
  is not that site's is 409 `NOT_AT_SITE` with `details.siteId`. `NOT_NEXT_SITE` goes. The session rules stay: the
  run's own conversation resumes, another conversation under way is refused without `restart`, a cleared site is
  played again from the start. The session records its `siteId`.
- **Resolve** clears the session's site. The market's `completedEncounterIds` is updated as before.
- **Reset** as in Rules; a conversation this dungeon started is dropped (as now).
- The dungeon rules are pure functions in a new `server/src/dungeon.js`, shaped like `world.js`.
- No endpoint and no save field for the world layer. With one open place the server has nothing to enforce, and
  the client derives the view from the bundled file and the dungeon's progress. The loader still validates the file.

## Client

### Flow

```
attract --Enter--> world --Enter Ta Prohm--> overview (the temple map)
overview --Go down / Continue--> approach (to `at`) --> encounter (site not cleared) | site (cleared)
overview | site | encounter (resolved) --pick a reachable site--> walk --> encounter | site
encounter (ongoing) --Leave--> site          site --Talk / Back to the conversation--> encounter
encounter (goal resolved) --Leave the temple--> victory --Play again--> world ; --Stay in the temple--> overview
```

- `site` is a new phase: the player stands at a site with no conversation open. The dock shows the site, whether it
  is cleared, "Talk to … again" (or "Back to the conversation" after Leave) and the ways on.
- The ways on are one button per neighbouring site: "Walk to The Library", "Walk to an unexplored place" for a
  known site the player has not visited, disabled with the reason for a sealed or blocked one. The resolved banner
  shows the same buttons, and a "Map" button opens the overview.
- A pick sends the move, then starts the walk. An uncleared target's encounter is requested when the camera sets
  off, and the dialogue opens when the camera has arrived and the encounter is loaded (as now). At a cleared target
  the camera's arrival opens the `site` card.
- A pick during an ongoing conversation is not offered. "Leave" goes to `site`, where a move back to a visited
  neighbour sends `leave: true`.
- Client Decision 1 of round 115 stays: a site start sends `dungeonId` alone and takes the site from the reply.
- A reload resumes: victory if the run is complete; the approach to `at` if the run has progress; otherwise attract.
- A server from before this round answers without `progress.at`. The client then says the server is being updated
  and offers a retry. Pages and Render deploy from one push at different speeds.

### The temple map (overview)

- The camera frames the visible sites and their paths, with a minimum extent, so the map grows as fog clears.
- One ribbon per path, drawn only when both ends are visible. A label per visible site: its number, and its name
  for the current site. Hidden sites have no label and no ribbon. A dark patch lies over each hidden site in the
  top-down view (a flat disc with a soft edge, above the roofs).
- The overview card lists the visible sites: number, name, character, state (here, cleared, unexplored, sealed
  n of 6) and a "Walk here" button on each reachable one. The card is the control a screen reader and the jsdom
  tests use. The labels over the level are buttons too.
- The top bar's pips are one per site.

### The world map

A card over the attract orbit, in the PS1 look: an SVG of the visible places and paths, the current place marked,
closed places dimmed with their `closed` line, Ta Prohm's "n of 7 cleared", and "Enter Ta Prohm". `src/atlas.js`
bundles the file as `src/dungeon.js` does, and a pure `atlasView(atlas, progressByDungeon)` applies the fog.

### Camera (`scene/director.js`)

- The director takes the graph. `walk(fromId, toId)` follows the path's polyline in that direction and stops
  `STANDOFF` (4 m) short of the target, looking at it. It starts with a blend from the pose the camera holds to the
  start of the path: 1.6 s from a hold at a site, 3.6 s from the overview.
- `approach(siteId)` ends 4 m short of the site on the first path listed for it, or on `entrance` for the start
  site (raised, as now).
- After a resolve the camera turns to the first path to a neighbour not yet visited, or stays on the site when
  there is none. At the goal it turns to the level's middle (as now).
- The overview pose is computed from the visible sites.

## Tests

- **Rules** (`server`, pure): fog, seal, pass, clear, complete and reset over the real file; a save from round 118
  (`cleared` holding encounter ids, no `at`) reads as the same cleared sites.
- **Loader**: each new check refuses its bad file.
- **Server routes** (`dungeon.test.js`): move errors and successes, start at `at`, `NOT_AT_SITE`, leave, resolve
  clears, the goal completes, reset, the view's shape.
- **Dungeon file** (`client`): every site clear of walls; every path walkable in the plan (`blocked`), crossing
  rings only through east passages; each walk's standoff point is clear.
- **Director** (`client`, Node): a walk in each direction of every path stays at eye height, joins without a jump,
  never looks at itself, and ends 4 m short; the overview holds every visible site in view at phone and desktop
  aspect ratios.
- **Store** (`client`, mocked API): the flow above, including a retreat from an uncleared site, Leave and resume,
  a blocked pick, an old server, a reload at each kind of state, and the round 115 races (stale replies).
- **Screen** (`client`, jsdom): the world card, the map card, the ways on, the site card.
- **Contract** (`server/test/web-client.test.js`): the client's store plays all seven sites against the real server
  along one legal order and reaches victory; a new store resumes.
- **Playthrough and pictures** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): the built client in headless
  Chromium with the fixture provider plays the seven sites, takes the world map, the temple map at three fog
  states, a walk and each site at 390×844 and 1440×900, and asserts that no dialogue shows while the camera travels.
- Every existing suite passes: root `npm test` (in a Slurm job) and `npm run build -w client`.

## Claim boundary

Checked with a fixture provider and headless Chromium. Nobody plays the seven sites against the live model in this
round, and nothing runs on an iPhone. Mortimer, Flick, Marginalia and Errata have been played live in the market
(rounds 010 to 015), not from a dungeon start.

## Deferred

- The party offer at a cleared site (round 120). Levels and XP, level gates on sites and places (round 121).
- Errata's forced review before the fight (`drill_before`). Round 114 switched drills off for dungeon starts; this
  round keeps that.
- Travel over several sites in one pick.
- A second open place, and with it a server record of where the player is in the world.
- Assets at the sites. The dungeon in the iPhone app.

## Ship

The work is on the branch `round-119-map`. The round ends with a merge to `main`, which deploys the client to
GitHub Pages and the server to Render. The Render deploy wipes every save on the free plan.
