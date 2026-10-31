# Round 004 architecture: iPhone app first (Expo, iOS Simulator)

## Goal (pre-run)

**Development becomes app-first for iPhone.** A new Expo / React Native app in `mobile/` plays the same Coffee Cart
loop as the web client (Gerald's encounter, word and sentence help, the Spellbook, due review, pronunciation) and is
tested in the iOS Simulator on this Mac against the existing local server. New features go to the app from here on.

This reverses `prototype.md`'s non-goal "Not a mobile app (web-first)" and the roadmap note "Start development in a
simple webpage format (before considering phone version)" for development. It does not decide how players first
reach the game (the notes' "website as primary entry point" stays an open product question).

## Owner decisions (pre-run)

Asked and answered at the start of the round.

1. **Expo / React Native.** Native iPhone UI in JavaScript; the store and API logic carry over.
2. **Round 003 is not this round's concern.** Another agent is building round 003 (configurable target language,
   Italian default). Round 004 does not touch its work.
3. **Web client kept working, frozen.** `client/` stays runnable and tested; new features go to the app only.
4. **Simulator only.** No physical iPhone this round, so the server keeps its 127.0.0.1-only binding for CLI
   providers and no Apple developer account is needed.

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
  whatever is current at build time, because Expo Go in the Simulator only runs the latest SDK; the version is
  recorded in the round. Packages are added with `npx expo install` so versions match the SDK:
  `zustand`, `@react-native-async-storage/async-storage`, `expo-speech`, `react-native-safe-area-context`.
- **Standalone, not a workspace.** `mobile/` has its own `package-lock.json` and `node_modules`. The root workspaces
  pin React for Vite; Expo pins its own React and React Native versions, and hoisting them together is a known
  source of breakage. `npx expo-doctor` must pass, including with the root `node_modules` present.
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
  - `attemptId` uses `expo-crypto`'s `randomUUID` if `globalThis.crypto.randomUUID` is missing in Hermes.
  - All request-epoch, snapshot and retained-draft behaviour is unchanged.
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
`language.tag` (`it-IT` → `it`); `Speech.speak(text, { language: tag, voice })`, stopping any current utterance
first. With no matching voice the button is disabled and labelled "<name> pronunciation unavailable", as on the web.
Simulator voices are limited; voice quality on a real iPhone is out of scope.

### Docs (after the rebase on round 003)

- `README.md`: "Run the iPhone app" (prerequisites, `npm run dev:server`, `npm run ios --prefix mobile`, the base
  URL setting, the not-reachable error) and a note that `client/` is frozen.
- Root `package.json`: `"dev:ios": "npm run ios --prefix mobile"` and `"test:mobile": "npm test --prefix mobile"`.
- `CLAUDE.md` and `AGENTS.md` "Planned Stack": Frontend becomes the Expo / React Native iPhone app in `mobile/`, the
  React/Vite web client frozen in `client/`; the architecture diagram's client box follows.
- `STATUS.md`: round 004 addendum and index row at close.

### Out of scope

Android; a physical iPhone; LAN binding or hosted server; App Store, TestFlight and signing; a development build;
speech recognition; offline play; push notifications; a shared JS package between `client/` and `mobile/`; any
server or content change; visual redesign beyond a phone layout.

## Tests (pre-run)

Automated (`npm test --prefix mobile`, jest-expo preset with `@testing-library/react-native`; fixtures use round
003's field names):

1. **Store** (ported from `client/src/stores/__tests__/learning-state.test.js`): recovers the stored learner ID from
   async storage and deduplicates startup; a failed send keeps the input; a CLI provider error ends loading and
   keeps the exact draft; results sync encounter and Spellbook snapshots; stale responses after a learner switch are
   ignored. Plus: `language` is stored from `createLearner`.
2. **UI flow** (ported from `client/src/components/__tests__/learning-flow.test.jsx`): help reveals a word and a
   sentence and is disabled when hints are spent; a failed send keeps the input; the encounter resolves; the
   Spellbook lists cards; a review is answered, revealed, and returns to Gerald; empty and nothing-due states; the
   CLI provider error is shown and dismissible.
3. **Pronunciation**: picks an `it-IT` voice for `it-IT` and ignores `es-ES`; disabled with the fallback label when
   no voice matches; speaks with the chosen voice and stops the previous utterance (expo-speech mocked).
4. **API**: absolute URLs from the base URL; `X-Learner-Id` sent; error fields kept; a network failure gives the
   not-reachable message.
5. **Health**: `npx expo-doctor` passes.

Unchanged suites still pass: `client` vitest, `server` node tests, `npm run build -w client`.

Live (recorded with commands, outputs and Simulator screenshots from `xcrun simctl io booted screenshot`), after
round 003 is on `main`:

1. Server with the owner's CLI provider (`npm run check:provider`, then `npm run dev:server`).
2. `npm run ios --prefix mobile` opens the app in an iPhone Simulator.
3. One full pass: order Gerald's coffee in the target language, reveal one word and one sentence, finish the
   encounter, open the Spellbook, answer one review, tap pronounce.
4. Stop the server mid-session and send: the not-reachable message shows and the text is kept.

Each step is reported as done or not done, never assumed.
