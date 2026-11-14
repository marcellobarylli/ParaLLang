# Handoff (2026-11-14): the hosted setup and the next round

For the next agent. Start at [STATUS.md](../STATUS.md); this file holds what round 114's records do not: the live
deployment and the brief for round 115.

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
- With the `claude-cli` provider, an encounter start takes about 15 s and a turn about 25 s.
- Anyone with the token spends the owner's subscription. To rotate it, change `PARALLANG_TOKEN` in Render (the
  service restarts) and re-enter it in each browser's gear sheet.
- The Claude CLI in the image is pinned to 2.1.325 in the `Dockerfile`.

### What an agent can do from the cluster

- Read Actions runs and jobs through the public GitHub API with `curl` (`gh` is not installed), for example
  `curl -s https://api.github.com/repos/marcellobarylli/ParaLLang/actions/runs?per_page=5`.
- Call the hosted server with the token, as `tools/check_hosted.py` does.
- It cannot see Render's dashboard or logs, run Docker, or start a workflow without a push. Ask the owner for a
  screenshot of the service's Logs tab when the server misbehaves.

## Next: round 115, the Ta Prohm dungeon crawl

The owner agreed the design in round 114 and moved the build to a separate round. The design is round 114's
[Design section](rounds/114/architecture.md#design-pre-run) (Goal 1), unchanged. Open round 115 with the round-log
skill and take that section as its design source.

In short: the web client's first screen is the Ta Prohm level from `aesthetic/`. There are three sites, played in
order: Portia's tutorial, Gerald's coffee order and Bambieshart. The camera director moves through five transitions:

1. Attract: a slow isometric orbit of the whole level.
2. Overview: bird's eye, with the route drawn and the sites numbered.
3. Approach: zoom down to site 1, where the existing dialogue opens over the level.
4. Walk: at ground level along the route to the next site, twice.
5. Victory: zoom back out to the orbit, with "Dungeon cleared" and "Play again".

### Already committed

- `content/world/dungeons/ta_prohm.yaml`: the three sites and the ground route, in Ta Prohm world units.
- Server: `GET /api/dungeons/:id`, `POST /api/dungeons/:id/reset`, and `POST /api/encounter/start` with `dungeonId`
  (next uncleared site only, 409 `NOT_NEXT_SITE` otherwise). A resolved site is marked cleared in
  `envelope.dungeons`. Older saves migrate. Tests: `server/test/dungeon.test.js`.
- Client infrastructure: `client/src/api/settings.js` (server URL and token), `createLearningApi` in
  `client/src/api/encounter.js`, `SettingsSheet.jsx`.

### Not committed: `docs/rounds/114/trail/level-wip.patch`

The patch holds the camera director (`client/src/scene/director.js`), `client/src/dungeon.js`, the dungeon flow in
`gameStore.js`, and `aesthetic` joined to the root npm workspaces. It no longer applies cleanly. Apply it with

```
git apply --reject --exclude=client/src/api/settings.js --exclude=client/src/api/encounter.js docs/rounds/114/trail/level-wip.patch
```

and merge `client/src/stores/gameStore.js.rej` by hand into the committed store, which already has the settings
changes. The patch also deletes `aesthetic/package-lock.json` because the workspace join moves its dependencies into
the root lockfile. Run `npm install` afterwards and check that `npm test` passes.

### Constraints for the build

- Every push to `main` deploys Pages and restarts Render, and `npm test` gates the Pages deploy. Push only green
  commits, and work on a branch until the dungeon screen is playable.
- GitHub's runners are slower than the cluster. On 2026-11-14 the mobile Saves screen test hit Jest's 5 s default
  there (run 43646340054) while it passed on the cluster, so `mobile/package.json` sets `testTimeout` to 20 s. A test
  that is slow only on GitHub is a timing problem; read the job log before changing the test.
- Layout is phone first: the level fills the screen and the dialogue is a bottom sheet; at 1100 px and wider it is a
  side panel. Tap targets are 44 px or larger.
- Screenshots of each camera state at phone and desktop widths come from a headless browser inside a Slurm job
  (`sbatch`, logs under `~/workspace`), never on the login node. A dev or preview server listens on a port, so it
  runs only inside the job, behind a token.
- The iPhone app is not changed in this round.

### Handoff prompt

```
New round 115 (round-log skill; start at STATUS.md and docs/handoff.md): build the Ta Prohm dungeon crawl in the web
client. The design is round 114's Design section (docs/rounds/114/architecture.md: five camera transitions, three
sites — Portia's tutorial, Gerald, Bambieshart — the existing dialogue at each site, a victory screen). The server
side is committed (docs/rounds/114/findings.md). Start from docs/rounds/114/trail/level-wip.patch as
docs/handoff.md says (skip settings.js and encounter.js, merge the gameStore.js reject by hand). Phone-first layout;
capture each camera state in a headless browser inside a Slurm job. Pushing to main deploys to Pages and Render, so
work on a branch until it is playable.
```
