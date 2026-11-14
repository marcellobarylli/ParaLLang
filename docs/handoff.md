# Handoff (2026-11-14): the hosted setup and the dungeon

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

## The Ta Prohm dungeon is live (rounds 115 and 116)

Round 115 built the dungeon crawl in the web client and round 116 tied the camera to the conversation
([115 findings](rounds/115/findings.md), [116 findings](rounds/116/findings.md), pictures in
[`rounds/115/shots/`](rounds/115/shots/) and [`rounds/116/shots/`](rounds/116/shots/)). It was merged to `main` as
`d01c8a0` on 2026-11-14 and deployed: Pages build `0.1.0+mwh0zw7i`, Render build `success`.

### Checking a deploy from the cluster

- Actions runs: the public API, as above.
- Render's build: Render records each deploy as a GitHub deployment named "main - parallang".
  `curl -s https://api.github.com/repos/marcellobarylli/ParaLLang/deployments?per_page=4` lists them, and
  `.../deployments/<id>/statuses` gives `in_progress`, then `success` or `failure`. This is the only view of a Render
  build from the cluster.
- The live page: `client/scripts/live-check.mjs`, inside a Slurm job. It loads the Pages site in headless Chromium,
  goes from the title to the route and presses Start. Without `PARALLANG_TOKEN` it expects the refusal; with it, it
  starts the first conversation (one model call). `tools/check_hosted.py` still checks the market's start.

### What nobody has checked

- A run against the live model. The playthrough used a fixture provider.
- A real phone: frame rate, the bottom sheet under the on-screen keyboard in iOS Safari, WebGL after the tab returns
  from the background.

### Working on the dungeon

- `client/src/scene/director.js` is the camera (pure, tested in Node). Its `engage`, `onward` and `beat` are how a
  conversation moves it (round 116); `client/src/components/__tests__/camera-wiring.test.jsx` tests the path from
  the screen to them. `client/src/scene/levelView.js` is the
  three.js host. `client/src/stores/gameStore.js` is the flow. `content/world/dungeons/ta_prohm.yaml` holds the sites
  and the route.
- `client/src/__tests__/dungeon-file.test.js` checks the sites and the route against the level's wall plan, which
  it encodes by hand from `aesthetic/src/scene/taprohm.js`. Move a site or change the level, and that test says
  whether the camera would walk through stone.
- Pictures and an end-to-end check: `client/scripts/dungeon-shots.mjs`, inside a Slurm job (it starts a server on
  127.0.0.1 behind a token). It needs `puppeteer-core` and a Chrome; round 115 used
  `~/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome` and the `puppeteer-core` under
  `~/.npm/_npx/`. `~/workspace/r115-jobs/run.sh` and `shots.sh` are the job scripts. Chromium aborts in a batch job
  unless `DBUS_SESSION_BUS_ADDRESS` is disabled, which the script does.
- The server and the client's proxy tests bind 127.0.0.1 ports, so `npm test` runs under `sbatch`. The pure client
  tests (`src/scene`, `src/stores`, `src/components`) bind none.

### Next

- The owner's verdict after a run on the phone, and on two choices of the build: the walk starts on a button, and
  only the first site is approached from above.
- Start the next site's greeting when a site resolves, to hide the hosted server's 15 s start.
- Encounter assets at the sites. Each site has a beacon (a crystal, a ring, a shaft of light) as a stand-in.
- The dungeon in the iPhone app (`aesthetic/native/TempleView.js` is an untested start).
- Angkor Wat as a second dungeon: a content file, an entry in `LEVELS` in `levelView.js`, and a plan test.
