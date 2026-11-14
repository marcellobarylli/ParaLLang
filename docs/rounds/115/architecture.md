# Round 115 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-14 by the owner, not through the round
pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes go into dated
Amendments; results go into the dated Outcome section, added later. The full record (the owner's request, timeline)
is in `trail/`; it is not needed to implement this round.

- **Design source:** round 114's [Design section](../114/architecture.md#design-pre-run) (Goal 1, agreed with the
  owner and unchanged); [`docs/handoff.md`](../../handoff.md) (the brief, the constraints and the live deployment);
  round 114's [findings](../114/findings.md) (what the server already does); the 3D level in `aesthetic/`
  ([README](../../../aesthetic/README.md)).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/` (the dungeon screen), `aesthetic/` (two exports, the workspace join), `server/test/`
  (the web-client contract test), `Dockerfile`, `docs/rounds/115/shots/`.

## Goal (pre-run)

The web client's first screen is the Ta Prohm dungeon crawl: three encounter sites played in order, five camera
transitions, the existing dialogue at each site and a victory screen. It is playable in a phone browser against the
hosted server.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- **Scope:** the whole feature in `docs/handoff.md` (Q0). The owner asked no further questions and was asked none.
- **Design:** round 114's Design section, which the owner agreed in round 114. This round does not reopen it.

Choices this round leaves to the builder are listed under Design as Decisions. They are Claude's.

## Design (pre-run)

### What exists

- `content/world/dungeons/ta_prohm.yaml`: three sites and the ground route.
- Server: `GET /api/dungeons/:id`, `POST /api/dungeons/:id/reset`, `POST /api/encounter/start` with `dungeonId`.
- Client: the settings (`api/settings.js`), `createLearningApi`, `SettingsSheet`.
- `docs/rounds/114/trail/level-wip.patch`: a camera director, `dungeon.js`, a dungeon flow for the store, and
  `aesthetic` joined to the root workspaces. It is a starting point; this round reviews each part before keeping it.

### Workspace

`aesthetic` joins the root npm workspaces and `client` depends on `@parallang/aesthetic` and `three`.
`aesthetic/package-lock.json` goes; the root lockfile pins its dependencies. `aesthetic` exports `taProhmHeightAt`
and its `isClear` (as `taProhmIsClear`). The root `npm test` also runs the `aesthetic` tests. The `Dockerfile` copies
`aesthetic/package.json`, because `npm ci` needs every workspace's manifest.

### Client modules

| File | Role |
|---|---|
| `src/dungeon.js` | The bundled dungeon file (a YAML transform in `vite.config.js`), so attract and overview need no server |
| `src/scene/director.js` | The camera director. Pure: no DOM and no three.js |
| `src/scene/levelView.js` | The three.js host: renderer, the Ta Prohm world, the PS1 pipeline, the route line, site beacons |
| `src/components/DungeonView.jsx` | The canvas, the numbered site labels, the fallback without WebGL |
| `src/components/DungeonScreen.jsx` | The screen per phase: attract, overview, travel caption, the dialogue sheet, victory |
| `src/stores/gameStore.js` | `createGameStore({ api, storage, dungeon })`, the dungeon flow |
| `src/stores/useGameStore.js` | The app's store, made with the bundled dungeon |

`gameStore.js` imports no YAML and no three.js, so `server/test/web-client.test.js` keeps importing it in plain Node.

### Flow

```
attract --Enter--> overview --Start--> approach --camera there and encounter loaded--> encounter
encounter --resolved, "Walk on"--> walk --camera there and encounter loaded--> encounter   (twice)
encounter (site 3) --resolved, "Leave the temple"--> victory --Play again--> overview
```

- The client connects when the page loads, so a sleeping server wakes while the attract screen shows.
- The site's encounter is requested when the camera sets off. The dialogue opens when both the camera has arrived
  and the encounter is loaded.
- **Decision 1.** A site start sends `dungeonId` without `encounterId`. The server then starts the run's next site,
  and the client takes the site from the reply. A second tab can therefore never ask for the wrong site.
- **Decision 2.** `CONVERSATION_UNDER_WAY` on a site start is answered once with `restart: true`. The dungeon is the
  web client's only screen, so a market conversation left over from the old client has no other way out.
- **Decision 3.** `NOT_NEXT_SITE` with no next site means the run is complete: the client shows the victory screen.
- **Decision 4.** The walk starts on a button ("Walk on to …"), after the player has read the last reply and the
  resolved message. Round 114 says "when the encounter resolves, the camera moves"; the button is the moment the
  player says they have read it.
- **Decision 5.** The tutorial's companion briefing and each encounter's resolved message are shown in the dialogue
  sheet. The old screen hard-coded Gerald's name in five places; those read the character's name now.
- A reload resumes: victory if the run is complete, the next site's approach if at least one site is cleared, the
  attract screen otherwise.
- With no server URL, or a server that does not answer, attract and overview work and "Start" shows the problem with
  a button to the settings.

### Camera director

A pose is `{ position, target }`. Every state starts from the pose the camera holds, so states join without a jump.

1. **Attract:** orbit at about 35° pitch around the level's centre, one turn in 100 s, far enough to hold the whole
   outer enclosure at the view's aspect ratio.
2. **Overview:** about 85° pitch (top-down; a small tilt keeps `lookAt` defined), framing the route and the
   enclosures around it. East, where the visitor enters, is at the bottom of the screen.
3. **Approach:** down to the site, from 11 m at about 23° pitch, then a slow drift.
4. **Walk:** along the route polyline at eye height (1.6 m) above `taProhmHeightAt`, 3.2 m/s with eased ends. The
   camera looks at the point 4 m ahead on the route, never beyond the site. It stops 4 m before the site, looking
   at it. The patch's walk ended with the look-at point on the camera itself; this is fixed.
5. **Victory:** back out to the orbit, starting from the yaw the camera holds.

The route line and three beacons are three.js objects in the level's scene. In the overview the line draws over the
roofs. The numbers and site names are DOM labels placed by projecting each site to the screen, so they stay sharp at
240 lines and are read by a screen reader.

### Layout

Phone first. The canvas fills the screen. A top bar holds the title, the run's three pips, the Spellbook button and
the gear. The dialogue is a bottom sheet of at most 62% of the height, with the input pinned to its foot; at 1100 px
and wider it is a 440 px side panel. The Spellbook and the review open as a sheet over the level. Tap targets are
44 px or larger. three.js and the level load as a separate chunk after the first paint.

### Without WebGL

If the renderer cannot start (an old browser, the jsdom tests), the screen shows a still backdrop, and the camera
"arrives" at once. The game stays playable.

## Claim boundary (pre-run)

The build is checked by unit tests, the existing suites, a contract test against the real server with a fixture
provider, and a scripted playthrough in headless Chromium (software WebGL) with the same fixture provider, which
also takes the screenshots. Nobody plays the dungeon against the live model in this round unless the owner supplies
the hosted token. Real phones are not tested: frame rate on a phone GPU and iOS Safari's behaviour are unverified.

## Deferred (pre-run)

- Encounter assets at the sites (characters, props).
- The iPhone app's dungeon.
- Angkor Wat as a second dungeon.
- A service worker and offline play; scripted dialogue for a server-less demo.
- Free camera control (drag to look around) during an encounter.

## Tests (pre-run)

- **Director** (`client`, Node): each state starts at the pose the camera held (no jump); the walk stays at eye
  height above the ground and inside the gate passages; the look-at point never coincides with the camera; the
  overview holds every route point inside the view at phone and desktop aspect ratios.
- **Dungeon file** (`client`): every site stands on clear ground (`taProhmIsClear`), and no route segment crosses a
  gallery or the outer wall except through an east gate passage.
- **Store** (`client`, mocked API): attract → overview → approach → encounter → walk → … → victory; the dialogue
  waits for both the camera and the encounter; a reload resumes; `CONVERSATION_UNDER_WAY` restarts once; a missing
  server is explained; a failed send keeps the draft.
- **Screen** (`client`, jsdom, no WebGL): the playthrough through the real components, the settings sheet, the
  Spellbook and a review.
- **Contract** (`server/test/web-client.test.js`): the client's store plays the three sites against the real server
  and reaches the victory state; a new store resumes the run.
- **Playthrough and screens:** `client/scripts/dungeon-shots.mjs`, in a Slurm job, plays the built client in headless
  Chromium against an in-job server (token-protected, fixture provider) and captures attract, overview, approach,
  walk and victory at 390×844 and 1440×900 into `docs/rounds/115/shots/`.
- All existing suites keep passing: `npm test` at the root, and `npm run build -w client`.
- The Dockerfile's install step is run in a scratch copy (Docker cannot run on the cluster).

## Amendment 2026-11-14: site 3 on the axis, later sites approached at eye level (Claude, during the build)

The owner was not asked: these are placements and camera details inside the agreed design, found by the new plan
test and by reading the first screenshots (journal rows 4 and 6). They change two sentences of the Design above.

- **The route had a flaw.** The committed route ran 0.3 m from the second enclosure's gate pavilion (waypoints at
  z 14.3). The plan test (`client/src/__tests__/dungeon-file.test.js`) found it.
- **Site 3 moved from [2.6, 11] to [0.3, 11.2].** At [2.6, 11] the site stood against the inner gate's pavilion wall,
  and the camera faced blank stone from 2.4 m. On the axis the camera stops inside the second enclosure's gate
  passage and sees the site before the inner gate. The route is now straight from [0.3, 20.8] to the site, and the
  two waypoints with the flaw are gone. Round 114 says sites stand on ground that the level's `isClear` accepts.
  `isClear` is the level's planting rule and calls the axis not clear so that nothing is planted on it. Site 3 now
  fails `isClear` for that reason only. The plan test checks every site and every route point against the walls,
  pavilions, the gopura, the sanctuary and the library instead.
- **Only the first site is approached from above.** Design item 3 says an approach ends 11 m out at about 23°. The
  build ends the first site's approach 9.5 m back on the route and 2.8 m above eye height. The later sites stand in
  courts and gate passages with no room above, so an approach to them (a reload in the middle of a run) ends where
  a walk to them ends: 4 m short of the site, at eye height.
- **Additions the Design did not name.** The camera frames the part of the screen the dock leaves free
  (`client/src/scene/insets.js`): the projection's axis moves to the middle of that area, so a site is not hidden
  behind the bottom sheet. From the air the fog backs off (the level's fog is set for the ground) and vertex snapping
  is off (it opens seams in the ground). Each site has a beacon (a crystal, a ring, a shaft of light) until the
  encounters have assets. The route is drawn as a ribbon and only in the overview. The store asks the server for
  the Spellbook when it opens. `prefers-reduced-motion` skips the camera moves.

## Amendment 2026-11-14: fixes from Codex review 1 (Claude, after the build)

A post-build review by Codex read the diff `40c471d..7c8f24f` and returned five findings; the raw text is in
[`trail/review-1.md`](trail/review-1.md). All five were real and are fixed. The owner was not asked: each fix keeps
the design and closes a defect. Each fix has a test that fails on the code as reviewed.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| R1.1 | Error, high | `.dockerignore` excluded all of `aesthetic/`, so the Dockerfile's new `COPY aesthetic/package.json` would fail every image build, and Render's with it | + | Accept: let the manifest alone into the build context | **Accepted** by Claude; the owner was not asked | `.dockerignore`; `client/src/__tests__/pages.test.js` checks every `COPY` source against it |
| R1.2 | Error, medium | A read of the finished run that answers after "Play again" put the old run's progress back, so "Start" showed the victory screen | + | Accept: the newest read wins, and a reset outdates the reads before it | **Accepted** by Claude; the owner was not asked | `gameStore.js` (`progressRequest`); `dungeon-flow.test.js` |
| R1.3 | Error, medium | A reset that answers after new settings moved the screen and cancelled the new server's site start | + | Accept: the reset's reply is dropped after new settings | **Accepted** by Claude; the owner was not asked | `gameStore.js` (`playAgain`); `dungeon-flow.test.js` |
| R1.4 | Error, medium | A Spellbook read sent before a conversation opened could replace the conversation's Spellbook and show meanings during it | + | Accept: a read is not applied over a newer Spellbook, and the screen hides meanings while a conversation is open or opening | **Accepted** by Claude; the owner was not asked | `gameStore.js` (`spellbookVersion`), `DungeonScreen.jsx`; both test files |
| R1.5 | Error, medium | A failed "Start over" set an error only the travel caption shows | + | Accept in part: the failure shows in the banner over the conversation. A restart whose reply is lost is not detected; the next answer is then refused with the server's message and "Start over" works again | **Accepted in part** by Claude; the owner was not asked | `gameStore.js` (`loadSite`); `dungeon-flow.test.js` |

**Deferred:** none. Codex's closing note: no further defect verified in the camera maths, StrictMode and disposal,
the Pages chunk and YAML import, or the phone CSS; the iOS keyboard stays unverified.

R1.1 would have stopped the Render deploy on the first push to `main`. The round's own check of the Docker install
step ran in a scratch copy of the manifests and could not see the build context.

## Outcome (2026-11-14)

Built as designed, with the two Amendments above. The web client's one screen is the Ta Prohm dungeon: the title
over a slow orbit, the route from above with the three numbered sites, an approach to site 1, a walk at eye height to
each next site, the dialogue as a bottom sheet (a side panel from 1100 px) and a victory screen with "Play again".
A reload resumes the run. Every suite passes (server 418, client 62, aesthetic 20, mobile 320), and the built client
plays the whole run in headless Chromium at 390×844 and 1440×900 with a fixture provider. The claim boundary held:
nobody played against the live model, and no real phone was used. The work is on the branch `round-115-dungeon` and
is not merged, because a push to `main` deploys. See [`findings.md`](findings.md) and [`shots/`](shots/).
