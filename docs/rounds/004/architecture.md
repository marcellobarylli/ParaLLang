# Round 004 architecture

**Conversational round, recorded before the run.** Designed on 2026-10-31 with the owner, not through the round
pipeline. Sections marked *pre-run* must not be edited after the commit that holds them. Changes go into dated
Amendments; results go into the dated Outcome section, added later. The full record (interview, drafts, raw
critiques, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** [round 001](../001/architecture.md) (learning loop, web client), [round 002](../002/architecture.md)
  (CLI providers, 127.0.0.1 binding), [round 003](../003/architecture.md) (API contract: `target`,
  `canonicalTarget`, `language`), [`prototype.md`](../../../prototype.md) section 7 (speech).
- **Findings:** to be written after the run (`findings.md`).
- **Artifact:** `mobile/`; after the rebase on round 003, README, root `package.json`, `CLAUDE.md`, `AGENTS.md`.

## Goal (pre-run)

**Development becomes app-first for iPhone.** A new Expo / React Native app in `mobile/` plays the same Coffee Cart
loop as the web client (Gerald's encounter, word and sentence help, the Spellbook, due review, pronunciation) and is
tested in the iOS Simulator on this Mac against the existing local server. New features go to the app from here on.

This reverses `prototype.md`'s non-goal "Not a mobile app (web-first)" and the roadmap note "Start development in a
simple webpage format (before considering phone version)" for development. It does not decide how players first
reach the game (the notes' "website as primary entry point" stays an open product question).

## Owner decisions (pre-run)

Asked and answered at the start of the round ([interview](trail/interview.md)).

1. **Stack.** Offered: Expo / React Native (recommended), a Capacitor wrapper around the web client, or native
   SwiftUI. Chosen: **Expo / React Native**. Native iPhone UI in JavaScript; the store and API logic carry over.
2. **Round 003.** Offered: park it and make the app round 004, finish Italian first, or fold Italian into the app
   round. Chosen (owner's words): **"another agent is doing it, so don't worry about it"**. Round 004 runs alongside
   round 003 and does not touch its work.
3. **Web client.** Offered: keep it working, frozen (recommended), or retire it. Chosen: **keep it working,
   frozen**. `client/` stays runnable and tested; new features go to the app only.
4. **Device.** Offered: Simulator only (recommended), or Simulator plus the owner's iPhone on Wi-Fi. Chosen:
   **Simulator only**. The server keeps its 127.0.0.1-only binding for CLI providers; no Apple developer account.
5. **Second opinion.** All 10 findings of Codex critique 1 accepted as recommended ("go ahead"; see Second opinion).

## Claim boundary (pre-run)

The round can claim: the app in `mobile/` plays the Coffee Cart loop in the iOS Simulator against the local server;
the automated mobile tests and `expo-doctor` pass; the frozen web client's tests and build still pass; and each live
step in Tests as reported done or not done. It cannot claim anything about a physical iPhone, voice quality on a
device, App Store readiness, Android, or a hosted server.

## Deferred (pre-run)

- A physical iPhone, LAN binding or a hosted server; a development build; App Store, TestFlight and signing.
- Speech recognition, offline play, push notifications, Android.
- A shared JS package between `client/` and `mobile/`; learner-switch protection for review responses (finding 1.6).
- How players first reach the game (website or app) stays an open product question.

## Design (pre-run)

### Baseline

- The web client is 461 lines (`client/src/`): `App.jsx` switches three views (`dialogue`, `spellbook`, `review`)
  from a Zustand store (`client/src/stores/gameStore.js`, factory `createGameStore({ api, storage })`); the API module
  (`client/src/api/encounter.js`) calls relative `/api/...` paths through the Vite proxy to `127.0.0.1:3001`.
- The server (`server/src/app.js`) is plain JSON over HTTP with an `X-Learner-Id` header; `config.js`
  `listenHostForProvider` binds CLI providers to `127.0.0.1`.
- This Mac has only the Command Line Tools: no Xcode, no `simctl`, no Simulator. Node 24.3, arm64, macOS 26.7.

### Prerequisites (owner, once)

These need the App Store and `sudo`, so the owner runs them:

1. Install Xcode from the App Store and open it once.
2. `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, then `sudo xcodebuild -runFirstLaunch`.
3. `xcodebuild -downloadPlatform iOS` if no iOS Simulator runtime came with Xcode.
4. Check: `xcrun simctl list devices available | grep iPhone` lists at least one iPhone.

### Coordination with round 003

Round 003 is running concurrently in the main working tree and changes the API: `spanish` → `target`,
`canonicalSpanish` → `canonicalTarget`, and `POST /api/learner` returns `language: { code, name, tag }`
(`docs/rounds/003/architecture.md`, "Neutral field names" and "Client").

- Round 004 works in its own git worktree on branch `round-004-iphone-app`, and only in new paths (`mobile/`,
  `docs/rounds/004/`) until round 003 has landed on `main`.
- The app is written against round 003's documented contract (`target`, `canonicalTarget`, `language`). Its tests
  use fixtures, so they pass before round 003 lands. Live Simulator verification waits until 003 is on `main` and
  the branch is rebased on it. If round 003's contract changes after critique, the app follows the landed contract.
- Shared docs (`README.md`, `CLAUDE.md`, `AGENTS.md`, `STATUS.md`, root `package.json`) are edited last, after the
  rebase, so the two rounds do not conflict.
- No server change is needed: the Simulator shares the Mac's network, so `http://127.0.0.1:3001` reaches the
  server directly; native `fetch` is not subject to CORS.

### App layout

```
mobile/                          standalone npm project (not a root workspace)
├── app.json                     Expo config: name ParaLLang, iOS only, portrait, bundle id com.parallang.app
├── package.json                 scripts: start, ios, test
├── App.js                       root: SafeAreaProvider, view switch from the store
└── src/
    ├── config.js                API base URL from EXPO_PUBLIC_API_URL, default http://127.0.0.1:3001
    ├── api/learning.js          createLearningApi({ baseUrl, fetch }); same calls as client/src/api/encounter.js
    ├── stores/gameStore.js      ported from client/src/stores/gameStore.js
    ├── speech.js                expo-speech wrapper: voice lookup by language tag, speak
    └── components/
        ├── Header.js            title, location, Spellbook button with due badge, Restart
        ├── DialoguePanel.js     objective card, transcript (FlatList, scrolls to end), thinking line
        ├── BilingualText.js     native line, word chips (tap to translate), Translate sentence
        ├── InputBar.js          TextInput + Send, KeyboardAvoidingView
        ├── Spellbook.js         card list with Review buttons
        ├── ReviewPanel.js       prompt, answer field, Check / Show answer, feedback
        ├── PronounceButton.js   speaker icon, disabled with a label when no voice
        └── ErrorBanner.js
```

- **Scaffold.** `npx create-expo-app@latest mobile --template blank` (JavaScript, matching the repo). The SDK is
  whatever is current at build time, and its version is recorded in the round. Packages are added with
  `npx expo install` so versions match the SDK:
  `zustand`, `@react-native-async-storage/async-storage`, `expo-speech`, `react-native-safe-area-context`.
- **Standalone, not a workspace.** `mobile/` has its own `package-lock.json` and `node_modules`. The root workspaces
  pin React for Vite; Expo pins its own React and React Native versions, and hoisting them together is a known
  source of breakage. `npx expo-doctor` must pass, including with the root `node_modules` present. Setup installs
  it separately: `npm ci --prefix mobile` beside the root `npm ci`.
- **Run with Expo Go.** `npx expo start --ios` boots the Simulator and installs Expo Go; no native build, no signing.
  A development build (`expo run:ios`) is deferred until a native module outside Expo Go is needed.
- **Navigation.** The store's `view` field drives the screen, as on the web. No router this round: three views do
  not need one, and the store already owns the transitions.

### Store and API

- **Ported, not shared.** `mobile/src/stores/gameStore.js` is a copy of the web store with these changes. Sharing
  one module would mean editing the frozen client while round 003 edits it, and Metro needs extra configuration to
  resolve files outside `mobile/`. The web store is frozen, so drift is accepted; the app's store is the one that
  moves forward.
  - Storage is async: `initialize` awaits `storage.getItem` / `storage.setItem` (AsyncStorage). The learner ID key
    stays `parallang.learnerId`.
  - It keeps `language` from `createLearner` (round 003) and exposes it; `null` until known.
  - `attemptId` is unchanged: `crypto.randomUUID` when present, otherwise the existing timestamp-and-random string.
    The server needs a non-empty ID, not a UUID.
  - All request-epoch, snapshot and retained-draft behaviour is unchanged. A failed send keeps the trimmed text,
    and the learner-switch guard covers dialogue responses only.
- **API.** `createLearningApi({ baseUrl })` builds absolute URLs; errors keep `status`, `code` and `retryable`. A
  network failure (server not running) becomes the message "Can't reach the ParaLLang server at <baseUrl>. Start it
  with npm run dev:server.", so the commonest Simulator problem is self-explanatory.

### Screens

Same content and wording as the web client, laid out for a phone:

- **Dialogue.** Objective card at the top (`<language.name> target: N% · Hints: r/l`), transcript in a `FlatList`
  that scrolls to the newest message, word chips as tappable pills showing `canonicalTarget` and, once revealed, the
  meaning; Translate sentence button; the protected-message note; assessment and victory banners; input bar pinned
  above the keyboard. Send is disabled while loading, when empty, or when resolved; a failed send keeps the text.
- **Spellbook.** Due count, card list (target word, pronounce button, meanings, part of speech, mastery, due or
  next review), Review on due cards, empty and nothing-due states, Return to Gerald.
- **Review.** `<language.name>-to-English recall` or the practice label, target word with pronounce button, English
  answer field, Check answer / Show answer / Return; feedback view with canonical answer, quality, next review,
  Continue reviews / Return to Gerald.
- Every button has an `accessibilityLabel` matching the web `aria-label`s, so tests and VoiceOver read the same.

### Pronunciation

`speech.js` uses `Speech.getAvailableVoicesAsync()` and picks a voice whose language's primary subtag matches
`language.tag` (`it-IT` → `it`); `Speech.speak(text, { language: tag, voice: voice.identifier })`, stopping any
current utterance first. Expo takes the voice's identifier string, not the voice object the web code passes. With no
matching voice the button is disabled and labelled "<name> pronunciation unavailable", as on the web. Simulator
voices are limited; voice quality on a real iPhone is out of scope.

### Docs (after the rebase on round 003)

- `README.md`: "Run the iPhone app" (prerequisites, `npm ci --prefix mobile`, `npm run dev:server`,
  `npm run ios --prefix mobile`, the base URL setting, the not-reachable error) and a note that `client/` is frozen.
- Root `package.json`: `"dev:ios": "npm run ios --prefix mobile"` and `"test:mobile": "npm test --prefix mobile"`.
- `CLAUDE.md` and `AGENTS.md` "Planned Stack": Frontend becomes the Expo / React Native iPhone app in `mobile/`, the
  React/Vite web client frozen in `client/`; the architecture diagram's client box follows.
- `STATUS.md`: round 004 addendum and index row at close.

### Out of scope

Android; a physical iPhone; LAN binding or hosted server; App Store, TestFlight and signing; a development build;
speech recognition; offline play; push notifications; a shared JS package between `client/` and `mobile/`; any
server or content change; visual redesign beyond a phone layout.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 d7597ec1…; Codex, effort high; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | `expo-crypto` used for `attemptId` but never installed | − | Accept: keep the existing fallback; the server needs a non-empty ID, not a UUID | **Accepted** | Store and API |
| 1.2 | Gap | Setup never installs the standalone `mobile/` packages | + | Accept: the app cannot start without it; one line | **Accepted** | App layout (Standalone); Docs |
| 1.3 | Error | "Expo Go in the Simulator only runs the latest SDK" is false | − | Accept: drop the claim, keep scaffolding on the current SDK | **Accepted** | App layout (Scaffold) |
| 1.4 | Gap | Expo `speak` takes a voice identifier string, not the voice object | 0 | Accept: pass `voice.identifier`, assert it in the test | **Accepted** | Pronunciation; Test 3 |
| 1.5 | Error | "Keeps the exact draft" contradicts the store, which trims | − | Accept: narrow to the trimmed submitted text; no store change | **Accepted** | Store and API; Test 1; Live 5 |
| 1.6 | Error | Learner-switch guard covers dialogue only, not review | − | Accept: narrow to the stale dialogue response; no learner-switch UI exists | **Accepted** | Store and API; Test 1 |
| 1.7 | Error | Live server-down send runs after resolution, when sending is disabled | 0 | Accept: restart the encounter first, then stop the server and send | **Accepted** | Live 5 |
| 1.8 | Error | Victory can leave no card due, so the live review may be impossible | 0 | Accept: review after the greeting, before a successful order | **Accepted** | Live 3 |
| 1.9 | Error | Live "tap pronounce" contradicts the accepted no-voice fallback | 0 | Accept: conditional step; report when live speech was not tested | **Accepted** | Live 4 |
| 1.10 | Cut | Server suite rerun is not needed; no server change | − | Accept: keep mobile tests and the web client checks | **Accepted** | Tests |

Net change: +1 setup step; −1 dependency, −1 false claim, −1 test suite; 6 checks narrowed or reordered.

## Tests (pre-run)

Automated (`npm test --prefix mobile`, jest-expo preset with `@testing-library/react-native`; fixtures use round
003's field names):

1. **Store** (ported from `client/src/stores/__tests__/learning-state.test.js`): recovers the stored learner ID from
   async storage and deduplicates startup; a failed send keeps the input; a CLI provider error ends loading and
   keeps the trimmed submitted text; results sync encounter and Spellbook snapshots; a stale dialogue response
   after a learner switch is ignored. Plus: `language` is stored from `createLearner`.
2. **UI flow** (ported from `client/src/components/__tests__/learning-flow.test.jsx`): help reveals a word and a
   sentence and is disabled when hints are spent; a failed send keeps the input; the encounter resolves; the
   Spellbook lists cards; a review is answered, revealed, and returns to Gerald; empty and nothing-due states; the
   CLI provider error is shown and dismissible.
3. **Pronunciation**: picks an `it-IT` voice for `it-IT` and ignores `es-ES`; disabled with the fallback label when
   no voice matches; speaks with the chosen voice's `identifier` string and stops the previous utterance
   (expo-speech mocked).
4. **API**: absolute URLs from the base URL; `X-Learner-Id` sent; error fields kept; a network failure gives the
   not-reachable message.
5. **Health**: `npx expo-doctor` passes.

The frozen web client still passes: `client` vitest and `npm run build -w client`. The server suite is not rerun:
this round changes no server code, and round 003 verifies its own server changes.

Live (recorded with commands, outputs and Simulator screenshots from `xcrun simctl io booted screenshot`), after
round 003 is on `main`:

1. Server with the owner's CLI provider (`npm run check:provider`, then `npm run dev:server`).
2. `npm run ios --prefix mobile` opens the app in an iPhone Simulator.
3. One pass on a fresh learner: after Gerald's greeting, reveal one word and one sentence. Open the Spellbook and
   answer one due review before any successful order, because a successful order reschedules the cards it credits
   and none may be due after victory. Return, order Gerald's coffee in the target language and finish the
   encounter.
4. Pronounce: if the Simulator has a voice for the target language, tap pronounce and hear it. Otherwise check the
   disabled button and its "<name> pronunciation unavailable" label, and report that live speech was not tested.
5. Restart the encounter while the server is running and wait for the greeting. Then stop the server and send: the
   not-reachable message shows and the trimmed text is kept.

Each step is reported as done or not done, never assumed.
