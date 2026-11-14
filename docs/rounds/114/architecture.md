# Round 114 architecture

**Conversational round, recorded before the build.** Designed on 2026-11-14 with the owner, not through the round
pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes go into dated
Amendments; results go into the dated Outcome section, added later. The full record (interview, timeline) is in
`trail/`; it is not needed to implement this round.

- **Design source:** the owner's request ([`trail/interview.md`](trail/interview.md), Q0); the 3D levels in
  `aesthetic/` ([README](../../../aesthetic/README.md)); round 004 (app first, web client frozen), which this round
  partly reverses for the web client; the owner's DJ_Graphyla repo (github.com/marcellobarylli/DJ_Graphyla) as the
  model for the GitHub Pages setup.
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/` (dungeon view, Pages build), `server/` (dungeons), `content/world/dungeons/`,
  `.github/workflows/`, `Dockerfile`, `render.yaml`.

## Goal (pre-run)

1. **A dungeon crawl on Ta Prohm** in the web client: three encounter sites, five camera transitions, the existing
   dialogue gameplay at each site, a victory screen.
2. **The web client on GitHub Pages**, phone-friendly, deployed on every push to `main`, as DJ_Graphyla is.
3. **A hosted server** the Pages build talks to: a Docker image on Render, calling Claude through the owner's
   subscription token (the existing `claude-cli` adapter), behind `PARALLANG_TOKEN`.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- **Client:** the web client, deployed to GitHub Pages; the repo goes public (Q1). Round 004's freeze of `client/`
  ends for this feature; the iPhone app is not changed.
- **Backend:** hosted now (Q2). Offered: scripted dialogue on Pages, a hosted backend, the owner's Mac through a
  tunnel.
- **Level:** Ta Prohm (Q3).
- **Encounters:** three, played in order (Q4): Portia's tutorial (`market_entrance_tutorial`), Gerald's coffee order
  (`imp_coffee_greeting`), Bambieshart (`high_gate_bambieshart`) (Q5).
- **Host:** no answer (Q6). Claude chose Render, with a Dockerfile so Fly or Railway can take the same image.
- **LLM:** the Claude subscription token (Q7). Offered with a warning: a subscription token behind a public URL
  serves whoever reaches it, so `PARALLANG_TOKEN` is required on the hosted server.

## Design (pre-run)

### Content: a dungeon file

`content/world/dungeons/ta_prohm.yaml`, shared by every language pack:

```yaml
id: ta_prohm
name: Ta Prohm
level: taprohm            # an aesthetic WORLDS id
sites:                    # played in this order
  - { encounter: market_entrance_tutorial, name: "The Face Gate", at: [x, z] }
  - { encounter: imp_coffee_greeting,      name: "...",           at: [x, z] }
  - { encounter: high_gate_bambieshart,    name: "...",           at: [x, z] }
route: [[x, z], ...]      # ground waypoints from the entrance through the three sites, in order
```

Coordinates are Ta Prohm world units (`aesthetic/src/scene/taprohm.js`). Sites stand on clear ground (its
`isClear`), in the order a visitor walks: the east face-tower gopura, a courtyard, the central sanctuary. The route
follows `TA_PROHM_TOUR`'s ground-level stretch and must not pass through walls. The loader validates that each
site's encounter exists in every pack and is a location encounter (not a party conversation), and that the level id
is one `aesthetic` knows (a fixed list in the loader is fine).

### Server: start by dungeon, progress per dungeon

- `GET /api/dungeons/:id` returns the dungeon (name, level, sites, route) and the learner's progress: which sites are
  cleared in the current run, the next site, and whether the run is complete.
- `POST /api/encounter/start` accepts `dungeonId`. With it, a start is allowed when the encounter is the run's next
  uncleared site: the market's location check (`NOT_HERE`) and gates do not apply. Starting a site out of order is a
  409 (`NOT_NEXT_SITE`). A site whose encounter the learner has finished before is played again from the start.
- Resolving an encounter started from a dungeon marks that site cleared in the save (`envelope.dungeons[id]`). The
  market's `completedEncounterIds` is updated as before, so fragments and the Spellbook keep working.
- `POST /api/dungeons/:id/reset` starts a new run (clears the run's sites only).
- The save gains `dungeons` (default `{}`); older saves migrate.

### Web client: the dungeon view

The dungeon is the client's first screen. The old single-encounter screen is replaced; its components
(`DialoguePanel`, `InputBar`, the assessment banner, `Spellbook`, `ReviewPanel`) are reused.

The 3D level comes from `aesthetic/` (three.js, PS1 pipeline, no DOM in `src/`). `aesthetic` joins the root npm
workspaces and the client depends on it.

A **camera director** (pure, no DOM, unit-tested) drives the camera through these states, each a transition with
eased position and look-at:

1. **Attract:** a slow isometric orbit around the whole level, full view. Title and an "Enter" button.
2. **Overview:** the camera rotates up to a bird's-eye view, top-down. The route is drawn on the level as a line and
   the three sites are marked and numbered. A "Start" button.
3. **Approach:** "Start" rotates and zooms down to site 1, framing the site from a few metres up. The dialogue opens
   over the level (the encounter itself, no assets yet). A slow drift keeps the scene alive.
4. **Walk:** when the encounter resolves, the camera moves along the route at ground level (eye height above
   `taProhmHeightAt`) to the next site, then the dialogue opens there. Runs twice: site 1 → 2 and site 2 → 3.
5. **Victory:** when site 3 resolves, the camera zooms back out to the isometric rotating view, with a victory screen
   ("Dungeon cleared") and "Play again" (a new run).

A reload resumes from the save: the run's next site, or the victory screen if the run is complete.

**Layout.** Phone first (DJ_Graphyla's approach): the level fills the screen and the dialogue is a bottom sheet over
it. At 1100 px and wider, the dialogue is a side panel. Tap targets 44 px or larger.

**Settings.** A small settings sheet holds the server URL and the access token (stored in `localStorage`, sent as
`X-ParaLLang-Token`). The Pages build takes a default server URL from `VITE_API_BASE` at build time (a repository
variable). With no server reachable, the attract and overview screens still work, and "Start" explains what is
missing.

### GitHub Pages

As DJ_Graphyla: `base: './'`, `.github/workflows/deploy.yml` (build the client, upload `client/dist`, deploy), and
`.github/workflows/ci.yml` (install, tests, build). A web app manifest and icons, so the site installs to the home
screen. A `version.json` written at build time. No service worker in this round (stale cached builds are a dev
hazard; can be added later).

### Hosting: Docker on Render

- `Dockerfile` at the repo root: Node 22, the server workspace's production dependencies, `content/` and `prompts/`,
  and the Claude CLI (`@anthropic-ai/claude-code`, its path in the setting the `claude-cli` adapter reads).
  `LLM_PROVIDER=claude-cli`. `CLAUDE_CODE_OAUTH_TOKEN` and `PARALLANG_TOKEN` come from the host's secrets.
- `render.yaml` blueprint: one web service from the Dockerfile, health check `/api/health`, secrets marked
  `sync: false`. On the free plan the service sleeps when idle and saves on its disk reset on redeploy; a paid disk at
  `PARALLANG_SAVE_DIR` keeps them. Both are documented in the README.
- The server refuses to start in production (`NODE_ENV=production`) without `PARALLANG_TOKEN`.

### Owner steps (cannot be done from the cluster)

1. Make the repo public; Settings → Pages → Source: "GitHub Actions".
2. Render: New → Blueprint from the repo; set `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) and
   `PARALLANG_TOKEN`.
3. Set the repository variable `VITE_API_BASE` to the Render URL, and enter the token once in the app's settings.

## Claim boundary (pre-run)

The build is checked by unit tests, the existing suites and screenshots of each camera state from a headless browser.
Docker, Render and Pages cannot run from the cluster, so the deploy files are checked only by review until the owner's
first deploy. Nobody plays the dungeon against the live model in this round.

## Deferred (pre-run)

- Encounter assets at the sites (the owner's "future update").
- The iPhone app's dungeon (the aesthetic's `native/TempleView.js` route).
- Angkor Wat as a second dungeon.
- A service worker and offline play.
- Scripted (fixture) dialogue for a server-less Pages demo.

## Tests (pre-run)

- **Server:** the dungeon file loads in both packs; a bad site (unknown encounter, party conversation, unknown level)
  is rejected; a dungeon start skips the location check, refuses an out-of-order site, clears the site on resolve,
  and the reset starts a new run; an old save migrates.
- **Client:** the camera director's states join without a jump (each transition starts where the last ended); the
  walk stays at eye height above the ground; the store's dungeon flow (attract → overview → approach → encounter →
  walk → … → victory) with a mocked API; the settings send the token header.
- **Screens:** a headless browser (in a Slurm job) captures attract, overview, approach, walk and victory at phone
  and desktop widths.
- All existing suites keep passing.
