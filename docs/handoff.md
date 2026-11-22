# Handoff (2026-11-15): the hosted setup and the dungeon

For the next agent. Start at [STATUS.md](../STATUS.md); this file holds what the round records do not: the live
deployment, and how to deploy and work on round 115's dungeon.

## The live deployment

The web client is on GitHub Pages and the server runs on Render, calling Claude through the owner's subscription.
The owner did the setup steps on 2026-11-14 and the whole chain was checked the same day.

| What | Where |
|---|---|
| Web client | https://marcellobarylli.github.io/ParaLLang/ |
| Server | https://parallang.onrender.com (health: `/api/health`, no token needed) |
| Pages deploy | `.github/workflows/deploy.yml`, on every push to `main` and by hand ("Run workflow") |
| CI | `.github/workflows/ci.yml`, on every push and pull request |
| Render service | `parallang`, created from the `render.yaml` blueprint; `autoDeploy: true` |
| Server URL for the build | repository variable `VITE_API_BASE` = `https://parallang.onrender.com` |
| Secrets | Render environment: `CLAUDE_CODE_OAUTH_TOKEN`, `PARALLANG_TOKEN`. Neither is in the repo |

### How a change ships

A push to `main` does two things at once:

1. GitHub Actions runs `npm test` (server, client, mobile), builds the client with `VITE_API_BASE` and publishes
   `client/dist` to Pages. A failing test blocks the deploy. A newer run cancels an older one (`concurrency: pages`).
2. Render rebuilds the Docker image from the same commit and restarts the server. This wipes every save on the free
   plan (see Limits).

`VITE_API_BASE` is read at build time, so a change to it needs a new Pages run. The access token is never built in:
each browser enters it once in the gear sheet and keeps it in `localStorage`.

### Checked on 2026-11-14

- Pages run [43644067625](https://github.com/marcellobarylli/ParaLLang/actions/runs/43644067625) deployed. The site
  returns 200, `version.json` reads `0.1.0+mwgxkvzg`, and the built bundle points at `parallang.onrender.com`. The
  first run (43623552819) failed only at `configure-pages`, because Pages was not yet set to "GitHub Actions".
- The server answers `/api/health`. Without the token it refuses with 401 `UNAUTHORIZED`.
- `tools/check_hosted.py` passed: learner created, Gerald's encounter started in 15.4 s, one turn answered by the
  model in 25.7 s (version 1 → 2, difficulty 0.25 → 0.30), learner deleted.

### Checking the chain

```
PARALLANG_TOKEN=<the value in Render> python3 tools/check_hosted.py
```

It opens no port, so it may run on the login node. Each run makes two model calls on the owner's subscription. Ask
the owner for the token; it is not in the repo.

### Limits

- The free plan sleeps after about 15 idle minutes. The first request then waits about a minute.
- Saves live in `/data/saves` inside the container and are lost on every redeploy, which means every push to `main`.
  A paid plan with the commented `disk` block in `render.yaml` keeps them.
- With the `claude-cli` provider, an encounter start takes about 15 s and a turn about 25 s. That was measured on the
  account's default model. From round 126 the provider asks for Sonnet unless `LLM_MODEL` is set; the new times are
  not measured.
- Anyone with the token spends the owner's subscription. To rotate it, change `PARALLANG_TOKEN` in Render (the
  service restarts) and re-enter it in each browser's gear sheet.
- The Claude CLI in the image is pinned to 2.1.325 in the `Dockerfile`.

### What an agent can do from the cluster

- Read Actions runs and jobs through the public GitHub API with `curl` (`gh` is not installed), for example
  `curl -s https://api.github.com/repos/marcellobarylli/ParaLLang/actions/runs?per_page=5`.
- Call the hosted server with the token, as `tools/check_hosted.py` does.
- It cannot see Render's dashboard or logs, run Docker, or start a workflow without a push. Ask the owner for a
  screenshot of the service's Logs tab when the server misbehaves.

## The Ta Prohm dungeon is live (rounds 115, 116 and 119)

Round 115 built the dungeon crawl in the web client and round 116 tied the camera to the conversation
([115 findings](rounds/115/findings.md), [116 findings](rounds/116/findings.md), pictures in
[`rounds/115/shots/`](rounds/115/shots/) and [`rounds/116/shots/`](rounds/116/shots/)). It was merged to `main` as
`d01c8a0` on 2026-11-14 and deployed: Pages build `0.1.0+mwh0zw7i`, Render build `success`.

### Checking a deploy from the cluster

- Actions runs: the public API, as above. A failed run's log needs a GitHub login. In rounds 118 to 120 one of the
  two workflows failed now and then in `npm test`; round 122 found a race in `server/test/greeting-prefetch.test.js`
  that fails on a busy machine and fixed it. If a workflow fails again, [`rounds/120/trail/ci-annotations.patch`](rounds/120/trail/ci-annotations.patch)
  (not applied: the owner did not ask for a workflow change) makes both workflows name the failing tests in the
  run's annotations, which the public API serves. A failed Pages workflow leaves the old client live beside the new
  server; a push with `[skip render]` runs it again.
- Render's build: Render records each deploy as a GitHub deployment named "main - parallang".
  `curl -s https://api.github.com/repos/marcellobarylli/ParaLLang/deployments?per_page=4` lists them, and
  `.../deployments/<id>/statuses` gives `in_progress`, then `success` or `failure`. This is the only view of a Render
  build from the cluster.
- The live page: `client/scripts/live-check.mjs`, inside a Slurm job. It loads the Pages site in headless Chromium,
  goes from the title over the world map to the temple map and presses Start. Without `PARALLANG_TOKEN` it expects
  the refusal; with it, it starts the conversation of the site the player stands at (one model call).
  `tools/check_hosted.py` still checks the market's start.

### What nobody has checked

- A whole run against the live model. The owner has played the first site on an iPhone (round 117); the
  playthrough on the cluster uses a fixture provider. Since round 119 the run has seven sites; four of them
  (Mortimer, Flick, Marginalia, Errata) have never been started from the dungeon against the live model.
- From the cluster, anything on an iPhone. The owner reports by screenshot. Still unreported: frame rate, the
  bottom sheet under the on-screen keyboard, WebGL after the page returns from the background, and whether the strip
  under the dock is gone (round 118).

### The page opened from the home screen (rounds 117 and 118)

The owner plays the page from the iPhone's home screen. Three things follow.

- That page has its own storage, so a token entered in Safari is not there.
- iOS lays it out in an area short of the screen by the status bar's inset (about 65 pt), and clips a fixed element
  to that area, while `100vh` is the whole screen. Round 117 made the fixed shell `100vh` high and cut the bottom of
  the screen. Since round 118 the document is `100vh` high, and the panels keep their content out of the measured
  gap (`client/src/viewport.js`, `--bottom-gap`). Whether iOS paints the strip is not yet known. Chrome on the
  cluster has neither the mode nor the bug: a layout change for the installed page cannot be tested here, so it must
  never be able to cut content.
- Settings shows the build and the viewport's numbers and has "Reload the page". Ask the owner for a screenshot of
  Settings before reasoning about the phone.

A push whose head commit says `[skip render]` deploys the client alone and leaves the server and its saves running.
CI's logs need a GitHub login, which the cluster lacks; `~/workspace/r115-jobs/node22/` holds Node 22, the version
CI uses, to rerun the suites under it.

### The dungeon is a map (round 119)

Ta Prohm holds seven sites joined by eight paths, under a world map of places
([119 architecture](rounds/119/architecture.md), [119 findings](rounds/119/findings.md), pictures in
[`rounds/119/shots/`](rounds/119/shots/)).

- **Rules** live on the server, in `server/src/dungeon.js` (pure, tested in `server/test/dungeon-rules.test.js`):
  the fog, the seal on the Sanctuary, and the pass rule (a character lets the player pass once answered; the way
  back to a visited site is open). `GET /api/dungeons/:id` sends each site's state and whether it can be walked to
  now (`progress.sites`), and the client shows that. The client holds no rule of its own except the unexplored map
  it shows before the server answers (`unexploredSites` in `client/src/dungeonModel.js`).
- **A new site or path** is content: `content/world/dungeons/ta_prohm.yaml`. `client/src/__tests__/dungeon-file.test.js`
  says whether it stands in a wall, and the director's tests walk the camera along it from every way it can have
  come. A new place on the world map is `content/world/atlas.yaml`, which only the client reads.
- **The client's tests keep their fake server by the server's own rules** (`client/src/__tests__/fakeRun.js` imports
  `server/src/dungeon.js`). A rule change needs no second edit there.
- **A walk starts with a turn on the spot** (`turnPoses` in `director.js`). `blendPoses` swings the camera around
  the point it looks at, which sends it through the piers of a gate passage on a half turn.
- **Two deploys, one push.** For some minutes after a push the new client may talk to the old server, or the
  reverse. The client names an old server ("The server is being updated") and retries on Start.

### The party in the dungeon (round 120)

([120 architecture](rounds/120/architecture.md), [120 findings](rounds/120/findings.md).)

- The server's party is unchanged. The client added `party`, `recruit`, `talkTo`, `leaveParty` and the phase `party`
  (`client/src/stores/gameStore.js`), `PartyPanel.jsx`, and the offer and the invitation in `DungeonScreen.jsx`.
- **A party conversation has no `dungeonId`.** The server does not hold a move for it, and a site start replaces it
  (the client sends the start again with `restart`, round 115's Decision 2). So an unfinished one lasts until the
  next site conversation. The app keeps it until the player finishes or leaves it.
- **The newest read or write of the party wins** (`partyRequest`), as for the run (`progressRequest`).
- **The stories a member tells** (the Journey's fragments after three conversations) are on the server and in the
  app. This client's Spellbook shows no fragments, so its Party panel announces none.
- The client's tests have a fake party (`createFakeParty` in `client/src/__tests__/fakeRun.js`). It is a
  re-statement of the server's party rules, unlike the fake run, which uses the server's own.

### Levels in the dungeon (round 121)

([121 architecture](rounds/121/architecture.md), [121 findings](rounds/121/findings.md).)

- **XP is awarded inside the commits that exist** (`submitDialogue`, `submitReview` in
  `server/src/learning-service.js`, the sizes in `XP`), so a replayed attempt earns nothing again. The save holds
  `progression: { xp }`; the level is derived (`levelFor`, `progressionView` in `server/src/language-engine.js`).
  A receipt holds `xpGained` and not `progression`.
- **A level seal** is `requires_level` on a site of `content/world/dungeons/ta_prohm.yaml` (The Library 3, The
  Sanctuary 5). `gateFor`, `moveProblem` and `siteStates` in `server/src/dungeon.js` take the level. In a complete
  run no gate is sealed.
- **The ratio bonus** (`ratioBonusFor`, 0.03 per level above the first) is taken when a dungeon site's conversation
  starts and kept in the session (`ratioBonus`). A market conversation (the iPhone app) and a party member's get
  none, though every conversation earns XP. The pinned prompt fixtures are at level 1, where nothing changes.
- **The client contract.** The web client names the contract it speaks (`CLIENT_CONTRACT`, 121, in
  `client/src/api/encounter.js`) on the map read, a move, a reset and a site start. The server
  (`requireClient` in `server/src/errors.js`) answers an older page, or one that names none, with 426 and "This page
  is older than the server. Open Settings and tap "Reload the page"." Raise both numbers together when the
  dungeon's contract changes in a way an older page cannot play by. The owner's installed page keeps old builds
  (round 118), so this message is what such a page shows.
- **The client** keeps `progression` highest-wins (`takeProgression` in `gameStore.js`), and a reply that raises
  the level reads the map again, because the client walks by its cached map.
- The client's fake run (`client/src/__tests__/fakeRun.js`) starts at 5000 XP, above every site's level, so tests
  that are not about levels walk freely. A test about levels passes `xp`.
- The numbers (the awards, the curve, levels 3 and 5, 0.03) are a first choice, not tuned by play. What the live
  model does with a higher ratio has not been measured.

### The characters' figures (round 122)

([122 architecture](rounds/122/architecture.md), [122 findings](rounds/122/findings.md), pictures in
[`rounds/122/shots/`](rounds/122/shots/).)

- `aesthetic/src/scene/figures.js` builds the seven figures from boxes, cones and cylinders with vertex colours,
  one mesh each in the `plain` PS1 material. `FIGURES` holds each one's scale, the height of its face (`focus`) and
  how far it floats. `aesthetic/test/figures.test.js` holds the limits: 160 triangles, 2.2 m, 0.9 m from the axis, a
  face between 1.2 and 1.5 m (Portia's higher: the start site's camera stands back).
- **The triangle budget is nearly spent.** The level has 62,408 of the style's 64,000; the figures 986, the path
  ribbons and fog patches about 300. The playthrough fails above 64,000.
- **Why the faces are low.** On a phone the top bar and the conversation sheet leave a strip that shows from about
  0.9 to 1.8 m at a site once the camera has stepped in. The camera looks 1.35 m above the site
  (`TARGET_LIFT` in `director.js`).
- **Why a figure shrinks away.** A walk from a site starts at the site's point, so the camera walks through the
  place of the figure on some ways on (`FIGURE.near`, `FIGURE.far` in `levelView.js`). A camera that walks round
  the figure would be the better answer; the gate passages are 2.2 m wide.
- **To look at a figure:** `client/scripts/figure-shots.mjs` in a Slurm job (it needs the built client, no server).
- A site without `figure` in the dungeon file still shows the old beacon.

### Working on the dungeon

- `client/src/scene/director.js` is the camera (pure, tested in Node). Its `engage` and `beat` are how a
  conversation moves it (round 116); `client/src/components/__tests__/camera-wiring.test.jsx` tests the path from
  the screen to them. `client/src/scene/levelView.js` is the
  three.js host. `client/src/stores/gameStore.js` is the flow. `content/world/dungeons/ta_prohm.yaml` holds the sites
  and the paths.
- `client/src/index.css` is the PS1 menu look (round 117): grey bevelled windows, no rounded corner (a test fails on
  one), and the panels' opacity from `--panel-alpha`, which the Settings slider sets (`client/src/display.js`).
- `client/src/__tests__/dungeon-file.test.js` checks the sites and the paths against the level's wall plan, which
  `client/src/__tests__/taProhmPlan.js` encodes by hand from `aesthetic/src/scene/taprohm.js`. Move a site or change
  the level, and that test says whether the camera would walk through stone.
- Pictures and an end-to-end check: `client/scripts/dungeon-shots.mjs`, inside a Slurm job (it starts a server on
  127.0.0.1 behind a token). It needs `puppeteer-core` and a Chrome; round 115 used
  `~/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome` and the `puppeteer-core` under
  `~/.npm/_npx/`. `~/workspace/r115-jobs/run.sh` and `shots.sh` are the job scripts. Chromium aborts in a batch job
  unless `DBUS_SESSION_BUS_ADDRESS` is disabled, which the script does.
- The server and the client's proxy tests bind 127.0.0.1 ports, so `npm test` runs under `sbatch`. The pure client
  tests (`src/scene`, `src/stores`, `src/components`) bind none. `npx vitest run src` in `client/` includes
  `src/__tests__/proxy.test.js`, which binds one: name the folders. `~/workspace/r119-jobs/run.sh` and `shots.sh`
  are round 119's job scripts.

### The Long Way Home (round 144)

([144 architecture](rounds/144/architecture.md), [144 findings](rounds/144/findings.md), [the curriculum](curriculum.md),
pictures in [`rounds/144/shots/`](rounds/144/shots/).)

- **Everything pure is in `server/src/road/`** and the client bundles `terrain.js` and `graph.js` from there
  (`client/src/scene/roadView.js`, `client/src/components/Road.jsx`), so both stand on the same ground from the seed
  alone. A change to either changes every learner's landscape: the sites of a save are ids of cells, and a site that
  no longer exists sends the learner back to the start (`roadOf` in `service.js`).
- **The road's methods are on `LearningService`** (`Object.assign` at the end of `learning-service.js`). A road
  conversation is an ordinary session with `road: { seed, node, step, activity, unitId }`; its definition is built
  from that by `encounters.js` and cached. `definition.scope` (the curriculum's vocabulary) is what makes the service
  read evidence against the curriculum and not the pack.
- **The curriculum's vocabulary is not in `content.vocabulary`.** Ids start with `c_`; `service.lookup` and
  `service.entryVersion` find both kinds. `content.curriculum` is read on first use (about a second: one pattern per
  form), and `server.js` reads it at start.
- **A new lesson, unit or stage is content.** `node server/scripts/check-curriculum.js` after every edit. A unit's
  `roles` are who the player meets there. The pacing's numbers are `PACING` in `pacing.js`, with their sources in
  `docs/curriculum.md`.
- **The client's tests run the real server logic** in process (`client/src/__tests__/roadServer.js`), with the
  scripted grader of `server/test/road-helpers.js`. Nothing of the road is mocked.
- **The save's copy** is the store's `backup` (`gameStore.js`), read and written past the proxy that handles a lost
  learner. `initialize` puts it back when the server answers `recovered: false` for an id the browser already had.
- **`client/scripts/road-shots.mjs`** needs Playwright and a Chromium (the cloud session's container has both; the
  cluster's scripts use `puppeteer-core`). It serves `client/dist` by request interception and starts its own server.
- **Not built:** the road in the iPhone app; figures that are more than a cloak; a stage exam; sound for the glide.

### Next

- The world map's closed places get a level when they get a dungeon (round 121 left them without one).
- Figures that are modelled and move (round 122's are built from primitives and only turn, bob and hop), and a
  camera that walks round a figure in place of the figure shrinking away.
- The owner's phone run of the map (round 119's open items), the screenshot of Settings in the installed page
  (round 118), and the verdict on round 117 (the look, the opacity to make the default).
- A site's greeting is requested when the walk to it is picked. On a short walk the hosted server's 15 s start still
  shows as "… is getting ready to talk".
- The dungeon in the iPhone app (`aesthetic/native/TempleView.js` is an untested start).
- Angkor Wat as a second dungeon: a content file, a `dungeon` on its place in `atlas.yaml`, an entry in `LEVELS` in
  `levelView.js`, and a plan test. The world map then needs a server record of where the player is.
