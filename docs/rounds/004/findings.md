# Round 004 findings

## Question

Can ParaLLang's development move to an iPhone app: an Expo / React Native app that plays the same Coffee Cart loop
as the web client, tested in the iOS Simulator on this Mac against the local server, with the web client kept working
and frozen?

## Finding

Yes. The app in `mobile/` ran in an iPhone 17 Simulator against the local server with the Codex CLI provider. A fresh
learner revealed a word and a sentence, answered a due review, ordered "Vorrei un caffè senza latte, per favore." and
resolved Gerald's encounter. When the server was stopped, the app said it could not reach the server and kept the
trimmed reply. The automated mobile tests and `expo-doctor` pass, and the frozen web client still tests and builds.
Getting there needed two fixes found only in the live run. Expo now serves on localhost. Nodemon now ignores learner
saves, which had been restarting the dev server mid-session since round 001.

## Method

- Built to the pre-run design in [architecture.md](architecture.md), revised after
  [Codex critique 1](trail/critique-1.md) (all 10 findings accepted).
- Stack: Expo SDK 58.0.22, React Native 0.88.1, React 19.3.0. The app runs in Expo Go, with no native build.
- Automated: `npm run test:mobile` (jest-expo, React Native Testing Library 14.1), `npx expo-doctor`,
  `npx expo export --platform ios`, `npm exec --workspace client -- vitest run`, `npm run build -w client`,
  `git diff --check`.
- Live: Xcode 27.2, iPhone 17 Simulator on iOS 27.2, Codex CLI 0.162.1 on the owner's ChatGPT subscription, CPU,
  local machine. The server ran as `LLM_PROVIDER=codex-cli npm start -w server` while the nodemon bug was open, and
  as `npm run dev:server` after the fix.
- UI driving: this Xcode has no Simulator window app and `simctl` cannot send input. The owner chose idb, installed
  locally (`idb-companion` 1.7.7 from Homebrew, the `fb-idb` client in a venv). Taps used the accessibility frames.
  `idb ui text` drops characters and cannot type "è", so the order was set with `idb ui set-value` and finished with
  one real keystroke. That keystroke makes React Native's `onChangeText` fire. The transcript shows the store sent
  the exact sentence.
- Screenshots: `xcrun simctl io booted screenshot`. Speech: the Simulator's system log.

## Results

| Check | Result |
|---|---|
| Mobile tests | 15/15 pass (4 suites: store, API, pronunciation, UI flow), also after the `--localhost` change |
| `expo-doctor` | 20/20 checks pass, with the root `node_modules` present |
| iOS bundle | `expo export --platform ios` bundled 652 modules |
| Web client (frozen) | vitest 12/12, build clean |
| Live 1: server | `check:provider -- --provider codex-cli`: chatgpt-subscription, 0 inference requests. Server on 127.0.0.1:3001, Italian. **Done** |
| Live 2: app opens | After the two fixes below, the app opened on a fresh learner: Gerald's greeting with chips espresso, caffè, senza latte; Italian target 25%; Hints 2/2. **Done** |
| Live 3: play | Word "caffè" revealed as "coffee (noun)" (Hints 1/2). Sentence translated (Hints 0/2; the other chips disabled). Before any order: Spellbook showed 3 due. "senza latte" answered "without milk": Correct, Quality 5/5, next review 2026-11-01. Order sent 12:55:03, resolved in 18 s; both objectives achieved; input disabled; Spellbook 1 due. **Done** |
| Live 4: pronounce | An Italian voice exists: the buttons read "Hear … in Italian" and are enabled. Tapping one started Apple's speech audio unit (`MauiTTSSupport.MauiAUSP`) for Expo Go. Audible output was **not checked**: there was no audio access. **Done up to speech start** |
| Live 5: server down | Restarted (new greeting), stopped the server, sent "  Vorrei un caffe.". The banner read "Can't reach the ParaLLang server at http://127.0.0.1:3001. Start it with npm run dev:server." The field kept "Vorrei un caffe." and Send stayed enabled. **Done** |
| Nodemon fix | A save no longer restarts the dev server; editing `server.js` still does; a fresh app against `npm run dev:server` reached the greeting |

Problems found in the live run, in order:

1. **Dual-screen default device.** Expo picked "iPhone Duo", which has two displays; `simctl io screenshot` needs
   `--display` there. The run switched to a booted iPhone 17. Expo targets the booted device.
2. **LAN URL timeout.** Expo Go timed out on `exp://192.168.18.6:8081`. The Mac's own en0 address refused
   connections even from the Mac (firewall off; the cause was not found). Fixed: `expo start --ios --localhost`.
3. **Dev server restarts.** `/api/learner` wrote a save, nodemon restarted, and `/api/encounter/start` lost its
   connection (NSURLError -1005). Fixed by the [Amendment](architecture.md#amendment-2026-10-31-nodemon-ignores-learner-saves-owner-after-the-live-run).

## Decision

The round ships as built, with the Amendment. Departures from the pre-run text:

- **`--localhost`.** The app's `ios` script serves Metro on loopback. This holds only while development is
  Simulator-only (owner decision 4); a physical iPhone would need the LAN or a tunnel.
- **Server dev config.** `server/nodemon.json` was added at the owner's request. This goes past the pre-run "no
  server change", but no server code changed.
- **Live tooling.** idb was used for the live pass; neither the app nor the repo depends on it.
- **Implementation details** (also in the Status section): a shared `Button` and colour set; ARIA props, as React
  Native Testing Library 14 recommends; the Expo template's `AGENTS.md`, `LICENSE`, plugin-enabling
  `.claude/settings.json`, Android and web config removed; the `splash` field, which SDK 58 rejects, dropped.

## Evidence

- Build commits: "round 004: Expo iPhone app in mobile/" and "round 004: README, root scripts and agent docs for the
  iPhone app". The close commit holds the `--localhost` script, `server/nodemon.json` and these records.
- Main paths: `mobile/` (app, tests, `jest.setup.js`), `server/nodemon.json`, README "Run the iPhone app", root
  `package.json` (`dev:ios`, `test:mobile`).
- Live evidence in [`results/`](results/):
  - Server: [`live-1-check-provider.txt`](results/live-1-check-provider.txt),
    [`live-1-server.log`](results/live-1-server.log), and the failed run's
    [`live-1-server-nodemon-restarts.log`](results/live-1-server-nodemon-restarts.log).
  - Launch: [`live-2-launch.png`](results/live-2-launch.png), with the failed launches
    [`live-2-lan-timeout.png`](results/live-2-lan-timeout.png) and
    [`live-2-unreachable-nodemon.png`](results/live-2-unreachable-nodemon.png).
  - Play: `live-3a` to `live-3g` (word, sentence, Spellbook, review answer and feedback, sending, victory).
  - Pronunciation: [`live-4-speech-log.txt`](results/live-4-speech-log.txt).
  - Server down: [`live-5a-restarted.png`](results/live-5a-restarted.png) and
    [`live-5b-server-down.png`](results/live-5b-server-down.png).
  - Amendment check: [`amend-nodemon-server.log`](results/amend-nodemon-server.log) and
    [`amend-dev-server-greeting.png`](results/amend-dev-server-greeting.png).
  - Expo logs: `live-2-expo*.log`, `amend-expo.log`.
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md), [trail/interview.md](trail/interview.md).
- Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

This round shows that the app plays the Coffee Cart loop in an iPhone 17 Simulator on iOS 27.2 against the local
server with the Codex CLI provider. It also shows the automated and frozen-client checks pass, and that both fixes
work. It does not show:

- anything on a physical iPhone, including voice quality or audible speech (the Simulator's speech was confirmed only
  as started);
- typing on the iOS keyboard: text was entered through idb, partly by setting the field's accessibility value;
- other Simulator models, iOS versions, or VoiceOver use;
- the Claude CLI, OpenAI or Ollama providers through the app;
- App Store readiness, Android, or a hosted server.

## Open items

1. **The owner plays the app themselves**, typing on the Simulator keyboard and listening to the Italian voice.
   This Xcode has no Simulator window, so it is opened from Xcode (or the owner installs the Simulator app if it is
   a separate download in Xcode 27).
2. **LAN address refusing connections.** Not needed while development is Simulator-only, but a physical iPhone
   would need it. Look at this when a device round starts.
3. **Learner-switch protection for review responses** (critique finding 1.6) stays deferred: the app has no
   learner switch.
4. Carried over from round 003: the owner reviews the Italian content.
