# ParaLLang

ParaLLang is a conversational language-learning game. It teaches Italian by default, and Spanish is also available. The prototype is The Crumbling Market: six places on a map, an encounter at each (Portia's tutorial at the entrance, Gerald, Mortimer, Flick, Marginalia, and Errata in the sealed Rift), tracked companion help, a Spellbook of canonical vocabulary with spaced-repetition reviews, a party of saved NPCs with their own conversations, and fragments of the in-world book *The Journey*. For running a session with testers, see [`docs/playtest/guide.md`](docs/playtest/guide.md).

## Design notes and project records

- `parallang.md` is the vision and lore; `prototype.md` is the technical blueprint.
- `parallang_obsidian/` holds the owner's Obsidian notes: design choices, lore, characters, locations, plot and quests, game mechanics and the development roadmap. Start at `Parallang.md` (the combined note) or `HUB.md` (links to the topic notes). The folder is a copy of the vault in `~/Documents/Parallang`, taken 2026-10-31 without the `.obsidian/` app settings. Edits made in Obsidian are not synced; copy the notes again to update them. To browse the notes with their `[[links]]`, open the folder as a vault in Obsidian.
- [`STATUS.md`](STATUS.md) has the current state, how the project is logged, and the round index. Design rounds live in `docs/rounds/NNN/`. From round 003 on they are recorded with the `round-log` and `codex-critique` Claude Code skills, and `python3 tools/round_log_check.py NNN` checks a round's records (tests: `python3 -m unittest discover -s tools`).

## Playtest ParaLLang through Codex and Claude Code subscriptions

ParaLLang can use either official CLI with its native subscription sign-in for both Gerald's narration and dialogue grading. CLI mode is local-only: the backend binds to `127.0.0.1`, starts a fresh isolated CLI process for each generation, disables coding and external tools, and never falls back to an API key, alternate provider, model, or billing path.

## Run locally

Node.js 20.11 or newer and npm are required (`import.meta.dirname` is used by the server). From the repository root:

```sh
npm ci
cp .env.example .env
npm run dev
```

For the iPhone app, see [Run the iPhone app](#run-the-iphone-app). The browser client runs at `http://localhost:5173` and proxies `/api` to the server on port 3001. The root `.env` is loaded consistently even when the server is started through its npm workspace.

### Target language

`TARGET_LANGUAGE` in the root `.env` selects the language the market's characters speak: `it` (Italian, the default) or `es` (Spanish). Each value names a language pack under `content/languages/<code>/`, which holds its `language.yaml` (name and BCP 47 tag), vocabulary, encounters and lore fragments; the character and narration style in `content/characters/` and `content/narration/` are shared. An unknown value stops the server at startup and lists the available packs. To switch, change the value, restart the server, then reload the browser page. The server prints the active language at startup.

Choose one narration/grading provider in the root `.env`:

- `LLM_PROVIDER=codex-cli`: install the official Codex CLI, run `codex login`, and complete the ChatGPT browser sign-in. API-key login does not satisfy this mode.
- `LLM_PROVIDER=claude-cli`: install the official Claude Code CLI, run `claude auth login`, and use native `claude.ai` subscription authentication. API keys and third-party providers do not satisfy this mode. A subscription OAuth token in `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) is also accepted and passed to the Claude CLI only; `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` and the Bedrock/Vertex switches are refused either way.
- `LLM_PROVIDER=openai`: set `OPENAI_API_KEY`; the default model is `gpt-4o-mini`.
- `LLM_PROVIDER=ollama`: ensure the configured `OLLAMA_BASE_URL` is already reachable; the default model is `llama3.1`.
- `LLM_MODEL` optionally selects a model for any provider. When it is blank, `claude-cli` gets `sonnet` (round 126; `LLM_MODEL=default` gives the account's own default model, `haiku` is the fastest) and `codex-cli` uses its own default; ParaLLang never supplies the OpenAI API default to a CLI.

Optional CLI settings are `CODEX_CLI_PATH`, `CLAUDE_CLI_PATH`, and `LLM_CLI_TIMEOUT_MS`. Executable settings are paths, not shell commands. The timeout defaults to 120000 ms and accepts integers from 1000 through 300000. Existing `.env` values are preserved when the root file is loaded.

After selecting a provider, verify installation, isolation capabilities, and subscription authentication without making an inference request:

```sh
npm run check:provider
# Or inspect a provider without editing .env:
npm run check:provider -- --provider codex-cli
npm run check:provider -- --provider claude-cli
```

The check prints only the provider, CLI version, authentication category, requested model/default, and active isolation controls. Provider changes require a server restart. Then run `npm run dev` and open `http://localhost:5173`.

Both dialogue grading and Gerald's follow-up narration are separate structured calls. A grading/provider error is retryable and does not commit the turn.

The integration was developed against capability surfaces observed in Codex CLI 0.162.0 and Claude Code 2.1.287. These are tested versions, not unconditional minimums: `check:provider` rejects an installed version when the controls ParaLLang needs are absent. ParaLLang does not install or upgrade either CLI.

### CLI troubleshooting

- `CLI_MISSING`: install the official CLI or set its executable path, then restart the server.
- `CLI_AUTH_REQUIRED`: sign in through `codex login` or `claude auth login`; do not set an API key as a substitute.
- `CLI_UNSUPPORTED`: remove conflicting provider configuration or use an installed version whose help exposes the reported isolation controls.
- `CLI_MODEL_UNAVAILABLE`: select a model available to that subscription with `LLM_MODEL`; `LLM_MODEL=default` (claude-cli) or a blank `LLM_MODEL` (codex-cli) uses the account's own default.
- `CLI_QUOTA_EXHAUSTED`, `CLI_BUSY`, or `CLI_TIMEOUT`: keep the retained response in the browser and retry later. Increase `LLM_CLI_TIMEOUT_MS` only when a normal request genuinely needs longer.
- `CLI_INVALID_RESPONSE` or `CLI_PROCESS_FAILURE`: run `npm run check:provider`, restart the backend after configuration changes, and retry. Raw CLI stderr, prompts, account details, and credentials are intentionally omitted from browser errors and ordinary logs.

For an explicit bounded live evaluation (nine grading cases plus one complete encounter, at most 14 generation calls), run one provider at a time:

```sh
npm run verify:cli -- --provider codex-cli
npm run verify:cli -- --provider claude-cli
```

The cases and encounter answers follow `TARGET_LANGUAGE` (for example `TARGET_LANGUAGE=es npm run verify:cli -- --provider codex-cli`). The output's `passed` is true only when every grading case matches its expected verdict and the encounter ends `resolved`; otherwise the command exits with status 1.

Live verification uses a temporary learner save and removes it afterward. It is never run by installation, startup, health checks, `check:provider`, or deterministic tests.

## Run the iPhone app

Development is app-first from round 004: new features go to the Expo / React Native app in `mobile/`, tested in the iOS Simulator on a Mac. The browser client in `client/` was frozen until round 114; since round 115 it is the Ta Prohm dungeon crawl (see "The web client: the Ta Prohm dungeon" below).

One-time setup (needs the Mac App Store and `sudo`):

1. Install Xcode from the App Store and open it once.
2. `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, then `sudo xcodebuild -runFirstLaunch`.
3. If no iOS Simulator runtime came with Xcode, run `xcodebuild -downloadPlatform iOS`.
4. Check that `xcrun simctl list devices available | grep iPhone` lists at least one iPhone.

`mobile/` is a standalone npm project, not a root workspace (Expo pins its own React and React Native versions), so it is installed separately. From the repository root:

```sh
npm ci
npm ci --prefix mobile
npm run dev:server     # in one terminal, with the provider chosen in .env as above
npm run dev:ios        # in another: boots the Simulator and opens the app in Expo Go
```

No Apple developer account, signing or native build is needed: Expo Go runs the app in the Simulator. The Simulator shares the Mac's network, so the app reaches the server at `http://127.0.0.1:3001` and CLI providers keep their local-only binding. To point the app at another address, set `EXPO_PUBLIC_API_URL` when starting Expo (for example `EXPO_PUBLIC_API_URL=http://127.0.0.1:3002 npm run dev:ios`); it is read at bundle time, so restart Expo after changing it.

If the server is not running, the app shows "Can't reach the ParaLLang server at http://127.0.0.1:3001. Start it with npm run dev:server." and keeps the text you sent. The target language comes from the server's `TARGET_LANGUAGE`; restart the server and reload the app (press `r` in the Expo terminal) to switch. Pronunciation uses the iOS voices installed in the Simulator: if the speaker button shows "Italian pronunciation unavailable", add an Italian voice in the Simulator's Settings → Accessibility → Spoken Content → Voices.

The app keeps its own learner ID (in the app's storage), so its Spellbook is separate from the browser's.

The app opens on the map of the Crumbling Market (round 005): six locations from `content/world/locations/`, joined by the paths in `content/world/connections.yaml`. Unvisited places beyond your neighbours stay hidden; tap a neighbouring place to walk there. Each place has its encounter ("Talk to Gerald" at The Coffee Cart); the Rift stays sealed until the other five are complete and asks for a short review drill first. Your position, the places you have visited and the encounters you have completed are saved with your Spellbook.

### Optional API token

Set `PARALLANG_TOKEN` in the root `.env` to require the header `X-ParaLLang-Token: <value>` on every `/api` route except `/api/health`. It is unset by default. The iPhone app sends it when Expo is started with the same value in `EXPO_PUBLIC_PARALLANG_TOKEN` (for example `EXPO_PUBLIC_PARALLANG_TOKEN=<value> npm run dev:ios`; restart Expo after changing it). Expo reads `.env` files from `mobile/` only, so the root `.env` does not reach the app: pass the variable on the command line as shown (run `expo start --clear` if an old value seems to stick). An `EXPO_PUBLIC_` value is bundled into the app, which is fine for a local Simulator session but is no secret in a shipped build. The server never logs the token. The web client's Vite dev proxy (`npm run dev:client`) adds it on the server side, reading `PARALLANG_TOKEN` from the environment or the root `.env`, so the token never reaches the browser; the proxy's target follows `PORT` (default 3001). `verify:cli` and the tests protect their temporary servers with a random token.

Two optional switches spend extra LLM calls and are off by default. Set them in the root `.env` and restart the server. `PARALLANG_ATMOSPHERE=on` adds a generated line of atmosphere under each place's description on the map (round 053). `PARALLANG_PREFETCH=on` writes an open encounter's greeting once the player has stayed 1.5 s at its place, so Talk answers sooner (round 076: 4.4 s against 12.1 s in a live run). It costs one call for each place where the player stays and never talks.

### Live Crumbling Market playthrough

`node server/scripts/play-market.js --provider codex-cli [--location <id>] [--out report.json]` plays the map and one encounter with scripted answers (Gerald at The Coffee Cart by default; any location id from `content/world/locations/`; `--tour` plays all six in order, `--party --member <home location>` a party conversation, `--lines 'a|b|c'` your own answers) in-process (no port) on a temporary save and prints a JSON report: each step, every raw LLM output, grading verdicts, timings and two rough estimates of the target-language share of each NPC line. It exits 1 unless the encounter resolves and the map marks it complete.

## The web client: the Ta Prohm dungeon

Since round 115 the web client (`client/`) is one screen, a dungeon crawl through the Ta Prohm level of
[`aesthetic/`](aesthetic/README.md). Since round 119 the dungeon is a map under a world map.

- **The world map** shows the places the fog allows: Ta Prohm, which is open, and its neighbours: The Kiln, which
  is open too (round 133), and Angkor Wat and Micromort Mountain, which are closed. The Bone Dome is hidden.
- **The Kiln** is Ta Prohm's plan burnt: the level `kiln` of `aesthetic/` (lava-rock floor, glowing ruins, charred
  bare trees) with the same seven sites and characters under its own site names
  (`content/world/dungeons/the_kiln.yaml`). Its run is kept apart from Ta Prohm's; experience, the Spellbook and
  the party are shared. The browser remembers the place last entered. `node client/scripts/kiln-shots.mjs` plays
  into it in headless Chromium (needs Playwright).
- **The temple map** is the top-down view of Ta Prohm. Seven sites hold the Crumbling Market's seven encounters:

  | Site | Character | Where |
  |---|---|---|
  | The Face Gate | Portia (the tutorial) | Outside the wall, the start |
  | The Buttress Tree | Mortimer | The outer court |
  | The Root Court | Gerald | The third enclosure's court |
  | The Sunlit Court | Flick | The third enclosure's court |
  | The Library | Marginalia | The third enclosure's court |
  | Before the Sanctuary | Bambieshart | The second enclosure's court |
  | The Sanctuary | Errata | The first enclosure, the goal |

  Eight paths join them. A site the player has not reached is under the fog until a path leads to it from a visited
  site.
- **Moving.** The player picks where to walk: on the temple map, on a site's card, or from the ways on after a
  conversation. A character lets the player pass once answered, and the way back to a visited site is always open.
  The Sanctuary is sealed until the six other sites are cleared. Clearing it completes the run. A complete run
  stays open ("Stay in the temple"), and "Play again" starts a new one from the world map.
- **The camera** moves through five states: a slow orbit of the whole level (the title and the world map), a
  bird's-eye view of the map with its numbered sites, an approach down to the site the player stands at, a walk at
  eye height along a path to a neighbouring site, and a pull back out to the orbit when the Sanctuary is cleared.
  Inside a conversation the camera follows the answers (round 116): each objective the player closes steps it in
  towards the site, and a verdict is a brief push or pull.
- **The party** (round 120, as the iPhone app has it). After a saveable character lets the player pass (Gerald,
  Mortimer, Flick, Marginalia), the player may save them: "Save Gerald" after the conversation, or "Invite Gerald to
  your party" on the cleared site's card. The Party panel in the top bar lists the members, and "Talk to Gerald"
  starts a conversation with him wherever the player is, outside a conversation. The camera stays where it is.
  After three finished conversations a member offers a deeper one. A party conversation left unfinished is kept
  until another conversation starts.
- **Levels** (round 121). The player earns experience: 10 XP for each objective a turn closes, 25 for a conversation
  that resolves (a site's or a party member's) and 5 for a correct review of a due Spellbook card. Level L starts at
  `10 × (L − 1) × (L + 4)` XP (0, 60, 140, 240, 360, 500, …). The top bar shows the level and the way to the next.
  A level opens sealed sites: The Library opens at level 3 and The Sanctuary at level 5, besides its six sites. The
  six sites give 300 XP (level 4), so the Sanctuary asks for one or two conversations more, or one and a few
  reviews. Each level above the first also adds 0.03 to the target-language ratio of a site's conversation, taken
  when the conversation starts. The market's conversations in the iPhone app and a party member's keep the
  content's ratio. A new run keeps the level.
- **The characters** (round 122). Each site shows its character as a figure built in code in the level's PS1 look,
  after the character's sheet: Portia a stone archway with eyes on her lintel and glowing threads, Gerald an imp on
  his coffee cart, Mortimer in a striped apron with a ham for a hat, Flick a gnome on the rim of a cracked basin
  with sparks, Marginalia a spectacled worm on a heap of books, Bambieshart a stooped wanderer in a banded coat,
  Errata a misaligned figure with a bright seam and drifting letters. A figure turns to the camera, hops when an
  objective is passed, and shrinks away when the camera walks through its place.
- The dialogue is a bottom sheet on a phone and a side panel from 1100 px. A reload resumes at the site the player
  stands at.

- **Content.** `content/world/dungeons/ta_prohm.yaml` holds the sites, the paths, the start, the goal and the seal in
  Ta Prohm world units. `content/world/atlas.yaml` holds the world map's places. The client bundles both at build
  time, so the title and the maps show before the server answers. The server keeps the run
  (`server/src/dungeon.js` holds the rules): `GET /api/dungeons/:id` returns the map with each site's fog state and
  whether it can be walked to now, `POST /api/dungeons/:id/move` walks to a neighbouring site,
  `POST /api/encounter/start` with `dungeonId` starts the encounter of the site the player stands at, and
  `POST /api/dungeons/:id/reset` starts a new run. The map and the dialogue and review replies carry
  `progression` (`{ xp, level, levelStartsAt, nextLevelAt }`); the save holds the XP and the level is derived
  (`server/src/language-engine.js`). The dungeon's routes ask for the client's contract (`client=121`); a page
  that names an older one, or none, is told to reload. The party is the server's of rounds 021 to 047 (`GET /api/party`,
  `POST /api/party/recruit`, a party conversation by `encounterId`); the map names which sites' characters can be
  saved (`saveable`).
- **Figures.** `aesthetic/src/scene/figures.js` builds them (at most 160 triangles each, one mesh in the `plain`
  material); a site names its figure in the dungeon file (`figure: imp`). `client/scripts/figure-shots.mjs` renders
  each one at its site with no server.
- **Code.** `client/src/scene/director.js` is the camera director (pure, no three.js). `client/src/scene/levelView.js`
  is the three.js host and loads as its own chunk. `client/src/stores/gameStore.js` holds the flow, and
  `client/src/components/DungeonScreen.jsx` the screen. Without WebGL a still backdrop stands in and the game stays
  playable.
- **Run it.** `npm run dev` starts the server and the client's dev server (http://localhost:5173). The dev server
  listens on a port: on a shared machine run it inside a job, never on a login node.
- **Check it.** `npm test` covers the director, the dungeon file against the level's plan, the store, the screen
  (jsdom), the wiring between the screen and the camera (`camera-wiring.test.jsx`, the three.js host mocked) and the
  client's store against the real server. The director's tests walk every path in both directions, from every way
  the camera can have come, and fail if the camera is ever inside a wall of the level's plan.
  `client/scripts/dungeon-shots.mjs` plays the built client through all seven sites in headless Chromium against an
  in-process server with a fixture provider and writes a screenshot of each camera state at a phone and a desktop
  size. It fails if the gameplay and the camera come apart (a dialogue open while the camera travels, no step in
  after a closed objective) or if the map's labels and fog are not what the run should show. It needs
  `puppeteer-core` and a Chrome (see the script's header); round 119's pictures are in
  [`docs/rounds/119/shots/`](docs/rounds/119/shots/).

## Web client on GitHub Pages, server on Render

Round 114 publishes the web client (`client/`) to GitHub Pages and runs the server as a Docker image on Render, where
it calls Claude through the owner's subscription (the `claude-cli` adapter).

- **Pages.** `.github/workflows/deploy.yml` tests and builds the client on every push to `main` and deploys
  `client/dist`. The build uses a relative base (`base: './'`), so it works under `/ParaLLang/`. It writes
  `version.json` and has a web app manifest, so the site installs to the home screen. `.github/workflows/ci.yml` runs
  `npm test` and the client build on every push and pull request. The icons are generated by
  `node client/scripts/make-icons.mjs`.
- **Settings.** The gear button in the web client opens a sheet with the server URL and the access token. Both stay in
  the browser's `localStorage`; the token is sent as `X-ParaLLang-Token`. The Pages build takes its default server URL
  from the repository variable `VITE_API_BASE`. The token is never built in. A blank URL means the page's own `/api`,
  which is what `npm run dev:client` proxies (the proxy still adds `PARALLANG_TOKEN` itself).
  The same sheet has a slider, "Text panel opacity", for how much of the 3D level shows through the text panels. It
  applies at once and is stored under its own key (`parallang.display`), so it does not reconnect (round 117).
  A checkbox, "Tilt to look", lets the phone's orientation turn the camera's look at a site by up to 12° sideways and
  8° up or down (round 125; tilting the phone's top towards the player looks up). It is off by default; ticking it is the tap from which iOS Safari is asked for access to
  motion. `node client/scripts/tilt-check.mjs` checks it in headless Chromium with synthetic orientation events.
  "Character voices" (round 126, on by default) has each character read its new lines aloud with the browser's speech
  synthesis, in the voice its sheet names (`voice: { kind, pitch, rate }` in `content/characters/enemies/`, kinds
  `female`, `male`, `creature`, `funny`); a line's 🔊 repeats it. Where the browser has speech recognition, a 🎤 beside
  the reply box writes what the player says, in the target language, and the player sends it. Both run in the
  browser: no key, no cost and no extra call to the model. `node client/scripts/voice-check.mjs` checks the wiring in
  headless Chromium with recorders in place of the browser's speech.
  "Ambient music" (round 127, on by default) plays quiet generated chords with the Web Audio API
  (`client/src/ambience.js`): no audio file, never the same twice, lowered while a line is read aloud and silent
  while the microphone listens. It starts at the first tap. `node client/scripts/music-check.mjs` checks it in
  headless Chromium and renders a sample to listen to.
  "Beginner mode" (round 129, on by default) sends `beginner: true` with each answer. The server then grades with
  `prompts/language/grading_beginner.txt`: the grader says which objectives the player tried and returns their
  answer in correct target language. A corrected answer costs one of three hearts a conversation and closes the
  objectives it tried; with no heart left it is corrected and must be said right. The player may say or type the
  correction again; the app checks that itself. `node client/scripts/beginner-check.mjs` plays it in headless Chromium.
  From round 130 the narration is English prose with a few target-language words dropped in (half the share of the
  character's line, at most 30%). The model lists them with meanings in `narrative_words`; the server keeps those
  that stand in the narration and are not an objective's answer, and the web client shows each as a word to tap for
  its meaning, free. `node client/scripts/narrative-check.mjs` checks the tapping in headless Chromium.
  From round 131 a turn asks for about a paragraph: the character's line (the CONVERSATION block of
  `prompts/system/base.txt`) asks in one go for everything still open and adds a question of its own, the
  conversation's view lists every open objective (`openObjectives`), and the reply box is a growing text area
  (Enter sends, Shift+Enter makes a new line).
- **Server image.** `Dockerfile` (Node 22, the server's production dependencies, `content/`, `prompts/` and Claude
  Code 2.1.325 at `CLAUDE_CLI_PATH=/usr/local/bin/claude`). `render.yaml` is the Render blueprint: one web service,
  health check `/api/health`. With `NODE_ENV=production` the server refuses to start unless `PARALLANG_TOKEN` is set
  (16 characters or more), and only then does a CLI provider listen beyond 127.0.0.1.
- **Free plan limits.** The Render service sleeps after about 15 idle minutes; the first request then waits about a
  minute. Saves are written to `/data/saves` inside the container and are lost on every redeploy. A paid plan with a
  disk mounted at `/data` keeps them (see the commented `disk` block in `render.yaml`).

Live since 2026-11-14: https://marcellobarylli.github.io/ParaLLang/ against https://parallang.onrender.com. The
deployment, its limits and a chain check (`tools/check_hosted.py`) are in [`docs/handoff.md`](docs/handoff.md).

Owner steps (done once; they cannot be done from the cluster):

1. Make the repository public. Settings → Pages → Source: "GitHub Actions".
2. Render: New → Blueprint, pick this repository. Set `CLAUDE_CODE_OAUTH_TOKEN` (run `claude setup-token` on your Mac)
   and `PARALLANG_TOKEN` (a long random string, for example `openssl rand -hex 24`).
3. GitHub: Settings → Secrets and variables → Actions → Variables → New variable `VITE_API_BASE` = the Render URL
   (for example `https://parallang.onrender.com`). Re-run the "Deploy to GitHub Pages" workflow.
4. Open the Pages site, tap the gear, and enter the `PARALLANG_TOKEN` value once.

Anyone with the Pages URL and the token spends your Claude subscription, so share the token only with people you
would lend it to, and change it in Render (and in each browser's settings) if it leaks.

## Learning data and saves

The browser keeps a server-issued opaque learner ID in local storage, and the iPhone app keeps its own in the app's storage. The server writes that learner's Spellbook and durable attempt receipts as one atomic JSON document under `server/data/saves/` by default. Override the directory with `PARALLANG_SAVE_DIR`. Each language has its own Spellbook: Spanish saves stay directly in the save directory (where they were before language packs existed), and every other language saves to a subdirectory named after its code, such as `server/data/saves/it/`. The same learner ID starts with an empty Spellbook in a new language and finds its earlier cards again when that language is selected. The directory is resolved independently of the shell's working directory and is gitignored.

Definitions remain in each pack's `vocabulary/` folder; saves contain canonical IDs, content version, evidence, and review schedules. Encounter transcripts are intentionally in memory only, so a server restart starts a fresh conversation while preserving the Spellbook. Invalid, corrupt, or unsupported saves are reported and left untouched rather than reset.

## Focused verification

`npm test` runs every server, web-client and app test (`npm run test:server` for the server alone). Do not run a bare
`node --test` inside `server/`: it also picks up the fake CLIs in `server/test/fixtures/`, which wait on stdin forever.

Round 002 deliberately selects these checks rather than a broad repository suite; round 003 adds the language-pack test (both packs, the Italian encounter and per-language saves), and round 004 adds the iPhone app's tests, its Expo health check and an iOS bundle:

```sh
node --test server/test/language-packs.test.js
node --test server/test/llm-contracts.test.js server/test/learning-flow.test.js server/test/cli-runner.test.js server/test/cli-providers.test.js server/test/cli-learning-flow.test.js
node --test --test-name-pattern="same-learner mutations serialize|dialogue and review receipts replay after service restart|persisted full-flow simulation recovers the exact review schedule" server/test/learning-storage.test.js
npm exec --workspace client -- vitest run src/stores/__tests__/learning-state.test.js
npm exec --workspace client -- vitest run src/components/__tests__/learning-flow.test.jsx -t "actual learning UI|loading plus|CLI provider"
npm run build -w client
npm run test:mobile
(cd mobile && npx expo-doctor && npx expo export --platform ios --output-dir "$(mktemp -d)")
git diff --check
```

The automated CLI tests use deterministic fake executables and never discover real CLIs, read credentials, or consume subscription quota. They prove process, isolation, schema, rollback, and error integration—not live-model teaching quality. Browser speech remains independent of the provider; actual voice and speaker quality must still be checked on the target device.
