# Round 119 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-15 by the owner, not through the round
pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes go into dated
Amendments; results go into the dated Outcome section, added later. The full record (the interview, the draft as
Codex read it, the raw critique, the timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** the owner's request and answers ([`trail/interview.md`](trail/interview.md)); round 115's
  [architecture](../115/architecture.md) (the dungeon this round changes); round 005 (the market's map and fog);
  [`docs/handoff.md`](../../handoff.md) (the live deployment); `parallang_obsidian/LOCATIONS.md` and round 113 (the
  places of the world map).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `content/world/dungeons/ta_prohm.yaml`, `content/world/atlas.yaml`, `server/src/dungeon.js`,
  `server/src/learning-service.js`, `client/src/` (store, director, level view, screen), the tests and
  `docs/rounds/119/shots/`.

## Goal (pre-run)

The web client's dungeon stops being three sites in a fixed order. The player moves freely over a map with fog of
war, in two layers:

1. **The temple map.** Ta Prohm holds all seven Crumbling Market encounters as sites joined by branching paths. The
   top-down view of the temple is the map. The player picks where to walk and the camera walks there.
2. **The world map.** A screen above the temple that shows places. Ta Prohm is the one open place. The others are
   closed or hidden by fog.

This is the first of three integration rounds. The party (round 120) and leveling (round 121) are out of scope. This
round leaves them a place to attach: the party offer to a cleared site, the level gates to sealed sites and closed
places.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- **Map:** both layers (Q1). Offered: the temple as the map; a map above the dungeons; both.
- **Leveling:** levels will unlock places and raise difficulty (Q2). Round 121.
- **Party:** ported as the app has it (Q3). Round 120.
- **Order:** one round per feature, in the order map, party, levels, each deployed (Q4).
- **Autonomy:** the owner is away and said to run on the most reasonable assumption (Q5). Claude therefore decided
  the critique's findings and every choice below, and reports them. After the integration the owner wants the
  placeholder beacons replaced with real characters; that is its own round.

## Second opinion (pre-run)

Critiqued draft: [`trail/plan-v1.md`](trail/plan-v1.md), sha256 2f16b2cc…; Codex, effort high; raw text in
[`trail/critique-1.md`](trail/critique-1.md). The owner was away (Q5), so every disposition is Claude's.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error, high | A move after "Leave" sent `leave: true` only for a retreat to a visited site. From a cleared site whose conversation is being replayed, a move to an unvisited neighbour would be refused | 0 | Accept: every move sends `leave: true` while the store holds a conversation under way | **Accepted** by Claude; the owner was away | Client, Flow |
| 1.2 | Error, high | The `BLOCKED` message was written with Portia's name; at another site it would blame the wrong character | 0 | Accept in part: the draft's line was an example. The message names the character of the site the player stands at | **Accepted in part** by Claude; the owner was away | Server, move |
| 1.3 | Error, medium | "Stay in the temple" had no stated home, and a reload of a complete run always shows the victory screen, so a complete run could become unplayable | 0 | Accept: the victory screen holds "Stay in the temple", also after a reload | **Accepted** by Claude; the owner was away | Client, Flow |
| 1.4 | Cut, high | The camera's turn to "the way on" after a resolve picks a branch the player has not chosen. Codex computed a blend from that pose that passes through a gallery wall | − | Accept: the camera keeps looking at the resolved site until the player picks a walk. Round 116's `onward` goes | **Accepted** by Claude; the owner was away | Camera |
| 1.5 | Cut, medium | A map frame that grows with the fog needs visibility-dependent camera bounds and checks | − | Accept: one fixed frame around all seven sites and their paths | **Accepted** by Claude; the owner was away | Temple map |
| 1.6 | Cut, medium | The server would load and validate the world file although it has no endpoint and enforces nothing | − | Accept: the world file is bundled and tested in the client only | **Accepted** by Claude; the owner was away | Content, world file |
| 1.7 | Cut, medium | The loader's search for a clearing order duplicates the contract test's walk through all seven sites | − | Accept: the loader checks references only | **Accepted** by Claude; the owner was away | Content, loader checks |
| 1.8 | Cut, medium | Labels over the level as buttons are a second control beside the card's "Walk here" buttons | − | Accept: the labels stay display-only. Two sites stand 6 m apart, so their tap targets would overlap on a phone | **Accepted** by Claude; the owner was away | Temple map; Deferred |
| 1.9 | Cut, medium | Dungeon progress cannot change the world's fog while one place has a dungeon | − | Accept: the world's fog comes from the start place and adjacency | **Accepted** by Claude; the owner was away | Rules; World map |

**Deferred:** none (Codex listed no Optional items).

Net change against draft 1: three clarifications, six parts removed, nothing added.

## Design (pre-run)

### What exists

- `content/world/dungeons/ta_prohm.yaml`: three sites and one `route` polyline through them.
- Server (`server/src/learning-service.js`): `GET /api/dungeons/:id`, `POST /api/dungeons/:id/reset`,
  `POST /api/encounter/start` with `dungeonId`, which starts the run's next uncleared site (`NOT_NEXT_SITE`
  otherwise). The save holds `dungeons[id] = { run, cleared: [encounterId] }`. The cleared sites are a prefix of the
  site list.
- The market's map rules in `server/src/world.js` (pure): fog, adjacency, gates, `applyMove`. The dungeon does not
  use them.
- Client: `stores/gameStore.js` (phases attract, overview, approach, walk, encounter, victory),
  `scene/director.js` (the camera, pure; it measures the one route), `scene/levelView.js` (three.js: one ribbon, a
  beacon per site, DOM labels), `components/DungeonScreen.jsx`.
- `client/src/__tests__/dungeon-file.test.js` checks the sites and the route against the level's wall plan. Its
  `blocked` function opens only the east gate passages (`|x| < 1.1`, `z > 0`).

### Content: the dungeon file becomes a graph

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
- The three existing sites keep their places. The four new coordinates and every `via` pass the wall plan as
  written (checked with the plan test's `blocked` before the build). The screenshots may still move them.
- All ring crossings stay on the east axis, through the gate passages the plan test already knows. The new sites
  stand in the courts either side of the axis. The sanctuary site stands inside the first enclosure, 1.7 m before
  the sanctuary's east wall, reached through the inner gate's passage.
- The Crumbling Market's graph is not copied. The temple's concentric plan gives the order: outside the wall, the
  outer court, the third enclosure's court, the second enclosure's court, the sanctuary.
- Loader checks (`content-loader.js`): unique site ids, `start` and `goal` are sites, each path joins two different
  sites and no pair twice, `requires` names other sites, and each encounter is a location encounter in every pack
  (as now). That every site can be reached is shown by the contract test's walk (finding 1.7).

### Content: the world file

`content/world/atlas.yaml`, bundled by the client and not loaded by the server (finding 1.6):

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
owner's, from round 113. A place without `dungeon` is closed and shows its `closed` line. The descriptions and the
`closed` lines are Claude's, in the style guide's voice.

### Rules

For a dungeon run with `at` (the site the player stands at), `visited` and `cleared` (sets of site ids):

- **Fog.** A site is `current` (`at`), `visited`, `known` (joined by a path to a visited site) or `hidden`.
- **Seal.** A site with `requires` is sealed until every listed site is cleared.
- **Pass.** A move from `at` to `to` is allowed when the two are joined by a path, `to` is not sealed, and either
  `at` is cleared or `to` is visited. A character lets the player pass once answered. The player can always go back.
- **Clear.** Resolving a site's encounter in the run clears the site. Playing a cleared site again changes nothing.
- **Complete.** The run is complete when `goal` is cleared. A complete run stays playable: every site is open.
- **Reset.** A new run forgets `cleared` and `visited` and puts the player at `start`.

The world layer uses the fog rule alone, from the file: `start` is the current place, a place joined to it is
known, and the rest are hidden (finding 1.9).

### Server

- **Save.** `dungeons[id] = { run, cleared: [siteId], visited: [siteId], at: siteId }`. `visited` and `at` are
  optional when read. A stored `cleared` entry counts for the site whose `id` or whose `encounter` it equals, so a
  save from rounds 114 to 118 keeps its cleared sites. Unknown ids are dropped. `at` defaults to `start`. `visited`
  always holds `start`, `at` and every cleared site. The schema version stays 3.
- **`GET /api/dungeons/:id`** returns
  `dungeon: { id, name, level, start, goal, sites: [{ id, encounterId, name, at, characterName }], paths }` and
  `progress: { run, at, complete, clearedSiteIds, visitedSiteIds, sites: { [id]: { state, cleared, reachable, gate? } } }`.
  `characterName` is null for a hidden site. `reachable` is the pass rule's answer for a move there now. `gate` is
  `{ sealed, required, completed }` for a site with `requires`. The old fields `nextSiteIndex`, `nextEncounterId`
  and `clearedEncounterIds` go.
- **`POST /api/dungeons/:id/move`** `{ siteId, leave }` applies the pass rule and returns the same view. Errors:
  400 for an unknown site; 409 `NOT_ADJACENT`; 409 `BLOCKED`, whose message names the character of the site the
  player stands at ("Mortimer has not let you pass yet.", finding 1.2); 409 `SEALED`. While this dungeon's own
  conversation is under way it answers 409 `CONVERSATION_UNDER_WAY`, unless `leave` is true, which drops that
  conversation. A move to `at` changes nothing.
- **`POST /api/encounter/start`** with `dungeonId` starts the encounter of the site at `at`. An `encounterId` that
  is not that site's is 409 `NOT_AT_SITE` with `details.siteId`. `NOT_NEXT_SITE` goes. The session rules stay: the
  run's own conversation resumes, another conversation under way is refused without `restart`, a cleared site is
  played again from the start. The session records its `siteId`.
- **Resolve** clears the session's site. The market's `completedEncounterIds` is updated as before, which round
  120's party offer needs.
- **Reset** as in Rules. A conversation this dungeon started is dropped (as now).
- The dungeon rules are pure functions in a new `server/src/dungeon.js`, shaped like `world.js`.

### Client

#### Flow

```
attract --Enter--> world --Enter Ta Prohm--> overview (the temple map)
overview --Go down / Continue--> approach (to `at`) --> encounter (site not cleared) | site (cleared)
overview | site | encounter (resolved) --pick a reachable site--> walk --> encounter | site
encounter (ongoing) --Leave--> site          site --Talk / Back to the conversation--> encounter
encounter (goal resolved) --Leave the temple--> victory
victory --Play again--> world        victory --Stay in the temple--> overview
```

- `site` is a new phase: the player stands at a site with no conversation open. The dock shows the site, whether it
  is cleared, "Talk to … again" (or "Back to the conversation" after Leave) and the ways on.
- The ways on are one button per neighbouring site: "Walk to The Library", "Walk to an unexplored place" for a
  known site the player has not visited, disabled with the reason for a sealed or blocked one. The resolved banner
  shows the same buttons, and a "Map" button opens the overview.
- A pick sends the move, then starts the walk. An uncleared target's encounter is requested when the camera sets
  off, and the dialogue opens when the camera has arrived and the encounter is loaded (as now). At a cleared target
  the camera's arrival opens the `site` card.
- No pick is offered while a conversation is open. "Leave" goes to `site`. Every move sends `leave: true` while the
  store holds a conversation under way (finding 1.1).
- The victory screen holds "Play again" and "Stay in the temple", also when a reload opens it (finding 1.3).
- Round 115's Decision 1 stays: a site start sends `dungeonId` alone and takes the site from the reply.
- A reload resumes: victory if the run is complete; the approach to `at` if the run has progress (a cleared site, or
  a visited site besides `start`); otherwise attract.
- A server from before this round answers without `progress.at`. The client then says the server is being updated
  and offers a retry. Pages and Render deploy from one push at different speeds.

#### The temple map (overview)

- The camera frames one fixed box around all seven sites and their paths (finding 1.5).
- One ribbon per path, drawn only when both ends are visible. A label per visible site: its number, and its name
  for the current site. Hidden sites have no label and no ribbon. A dark patch lies over each hidden site in the
  top-down view (a flat disc with a soft edge, above the roofs). The labels are display-only (finding 1.8).
- The overview card lists the visible sites: number, name, character, state (here, cleared, unexplored, sealed
  n of 6) and a "Walk here" button on each reachable one.
- The top bar's pips are one per site.

#### The world map

A card over the attract orbit, in the PS1 look: an SVG of the visible places and paths, the current place marked,
closed places dimmed with their `closed` line, Ta Prohm's "n of 7 cleared", and "Enter Ta Prohm". `src/atlas.js`
bundles the file as `src/dungeon.js` bundles the dungeon, and a pure `atlasView(atlas)` applies the fog.

#### Camera (`scene/director.js`)

- The director takes the graph. `walk(from, to)` follows the path's polyline in that direction and stops `STANDOFF`
  (4 m) short of the target, looking at it. It starts with a blend from the pose the camera holds to the start of
  the path: 1.6 s from a hold at a site, 3.6 s from the overview.
- `approach(site)` ends 4 m short of the site on the first path listed for it, or on `entrance` for the start site
  (raised, as now).
- After a resolve the camera keeps looking at the site (finding 1.4). Round 116's turn to the way on (`onward`)
  goes; the steps in and the verdict beats stay.
- The overview pose is fixed.

## Claim boundary (pre-run)

Checked with a fixture provider and headless Chromium. Nobody plays the seven sites against the live model in this
round, and nothing runs on an iPhone. Mortimer, Flick, Marginalia and Errata have been played live in the market
(rounds 010 to 015), not from a dungeon start.

## Deferred (pre-run)

- The party offer at a cleared site (round 120). Levels and XP, level gates on sites and places (round 121).
- Real characters at the sites in place of the beacons (the owner's request in Q5; after round 121).
- Errata's forced review before the fight (`drill_before`). Round 114 switched drills off for dungeon starts; this
  round keeps that.
- Travel over several sites in one pick. Tapping a site on the level itself (finding 1.8).
- A second open place, and with it a server record of where the player is in the world.
- The dungeon in the iPhone app.

## Tests (pre-run)

- **Rules** (`server`, pure): fog, seal, pass, clear, complete and reset over the real file; a save from round 118
  (`cleared` holding encounter ids, no `at`) reads as the same cleared sites.
- **Loader**: each new check refuses its bad file.
- **Server routes** (`dungeon.test.js`): move errors and successes, start at `at`, `NOT_AT_SITE`, leave, resolve
  clears, the goal completes, reset, the view's shape.
- **Dungeon file** (`client`): every site clear of walls; every path walkable in the plan (`blocked`), crossing
  rings only through east passages; each walk's standoff point is clear.
- **World file** (`client`): unique place ids, paths between places, `start` is a place, `dungeon` names the bundled
  dungeon; the fog shows Ta Prohm current, its two neighbours known and The Bone Dome hidden.
- **Director** (`client`, Node): a walk in each direction of every path stays at eye height, joins without a jump,
  never looks at itself, and ends 4 m short; the overview holds every site in view at phone and desktop aspect
  ratios.
- **Store** (`client`, mocked API): the flow above, including a retreat from an uncleared site, Leave and resume,
  a move after Leave from a replayed cleared site, a blocked pick, an old server, a reload at each kind of state,
  and the round 115 races (stale replies).
- **Screen** (`client`, jsdom): the world card, the map card, the ways on, the site card, the victory card's two
  buttons.
- **Contract** (`server/test/web-client.test.js`): the client's store plays all seven sites against the real server
  along one legal order and reaches victory; a new store resumes.
- **Playthrough and pictures** (`client/scripts/dungeon-shots.mjs`, in a Slurm job): the built client in headless
  Chromium with the fixture provider plays the seven sites, takes the world map, the temple map at three fog
  states, a walk and each site at 390×844 and 1440×900, and asserts that no dialogue shows while the camera travels.
- Every existing suite passes: root `npm test` (in a Slurm job) and `npm run build -w client`.

## Ship (pre-run)

The work is on the branch `round-119-map`. The round ends with a merge to `main`, which deploys the client to
GitHub Pages and the server to Render (Q4). The Render deploy wipes every save on the free plan. The deploy is
checked from the cluster as `docs/handoff.md` describes.

## Amendment 2026-11-15: what the build settled (Claude, during the build)

The owner was away (Q5). Each item is a detail inside the agreed design, or a correction the tests forced. They
change the sentences of the Design named here.

- **A walk starts with a turn on the spot.** The Design says a walk "starts with a blend from the pose the camera
  holds to the start of the path". The existing blend swings the camera around the point it looks at. On a half
  turn in a gate passage that carries it through the piers. A walk now goes in a straight line to the path's start
  while its line of sight turns (`turnPoses`). A walk back along the path the camera came by starts where the
  camera stands. A new director test walks all 60 combinations of arriving and leaving and fails if the camera is
  ever inside the wall plan.
- **A known neighbour is named.** The Design says "Walk to an unexplored place" for a site the player has not
  visited. Two such neighbours would carry the same label, so the button reads "Walk to The Library · unexplored",
  as the market's map names a known place.
- **A sealed site is refused as `SEALED`** also when the character at the player's site has not let them pass. The
  seal is the reason that lasts.
- **A move is sent again with `leave`** when the server answers `CONVERSATION_UNDER_WAY`. After a reload at a
  cleared site the server may hold a conversation the store never saw.
- **A reload resumes only from the title.** The Design says a complete run opens the victory screen and a run with
  progress the approach. That now holds while the title shows. A player who has gone on to a map before the server
  answered is left there.
- **No walk while a site start is with the server** (Talk on the site card), and the run is read again when the map
  opens.
- **From 1100 px the temple map's card is a side panel**, as the dialogue is, so the map has the screen's height.

## Amendment 2026-11-15: fixes from Codex review 1 (Claude, after the build)

A post-build review by Codex read the diff `365044e..5c60a49` and returned six findings; the raw text is in
[`trail/review-1.md`](trail/review-1.md). All six were real and are fixed. The owner was away (Q5), so every
disposition is Claude's. R1.3 and R1.4 name defects Claude had found and fixed while the review ran.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error, high | A page still running the build of rounds 115 to 118 reads the dungeon, meets the new shape and fails with "Cannot read properties of undefined". The owner's installed page keeps old builds (round 118) | + | Accept, with a narrower fix than a versioned contract: the map is read at `GET /api/dungeons/:id/map`, and the old path answers 426 `CLIENT_OUTDATED` with "This page is older than the server. Open Settings and tap "Reload the page".", which the old page shows on its route card | **Accepted** by Claude; the owner was away | `server/src/app.js`, `client/src/api/encounter.js`; `dungeon.test.js` |
| R1.2 | Error, high | "Go down to The Root Court" from the map carried the camera through the third enclosure's gallery roof: the blend comes down on a slant | + | Accept: from the sky the camera crosses to the point above where it will stand while it is above everything, and comes down there (`dropPoses`). Used for every approach and for a walk picked on the map | **Accepted** by Claude; the owner was away | `director.js`; `director.test.js` (the way down, 46 descents at two screen shapes) |
| R1.3 | Error, medium | A failed read of the run after the last answer left a resolved site blocking: the map showed nothing reachable | 0 | Accept: the run is read again when the map opens | **Accepted** by Claude; the owner was away | `gameStore.js` (`openMap`); `dungeon-flow.test.js` |
| R1.4 | Error, medium | A start that names another site (another tab moved the player) left the map at the old site, so the way back was not offered | 0 | Accept: the run is read again when a start names another site | **Accepted** by Claude; the owner was away | `gameStore.js` (`loadSite`); `dungeon-flow.test.js` |
| R1.5 | Error, medium | "Stay in the temple" stayed enabled while "Play again" was with the server, and a move made then could answer after the reset and put the old run back | 0 | Accept: Stay waits for the reset, and a move's reply from the run before a reset is dropped | **Accepted** by Claude; the owner was away | `gameStore.js` (`runEpoch`, `stay`), `DungeonScreen.jsx`; `dungeon-flow.test.js` |
| R1.6 | Error, low | The screen test accepted a move without `leave`, and its fake server did not hold a player in a conversation | 0 | Accept: the fake server refuses such a move as the server does, and the test walks out of a conversation and asserts `leave: true` | **Accepted** by Claude; the owner was away | `dungeon-screen.test.jsx` |

**Deferred:** none. Codex found no defect in the server's rules, the save migration, the session's site, clearing
and reset, the client-only build and the Docker files (by inspection), or the 390 px layout.

R1.1 changes the Design's Server section: the view is at `GET /api/dungeons/:id/map`. R1.2 changes the Camera
section: an approach no longer blends to its site on a slant, so the first approach to The Face Gate is a descent
over the avenue and no longer the crane shot of round 115.

## Outcome (2026-11-15)

Built as designed, with the two Amendments above. The web client's dungeon is a map of seven sites under a world
map: the player picks where to walk, the fog lifts as paths lead on, a character lets the player pass once
answered, and The Sanctuary opens when the six other sites are cleared. The map is read at
`GET /api/dungeons/:id/map` and not at the path the Design names (review R1.1). Every suite passes (server 426,
client 101, aesthetic 20, mobile 320), and the built client plays all seven sites in headless Chromium at 390×844
and 1440×900 with a fixture provider. The claim boundary held: nobody played against the live model, and no phone
was used. See [`findings.md`](findings.md) and [`shots/`](shots/).
