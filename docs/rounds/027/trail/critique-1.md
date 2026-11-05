# Critique 1 (round 027)

- **Reviewer:** a fresh Claude subagent (general-purpose agent, claude-opus-5-5), read-only, with repo file access,
  briefed as an adversarial reviewer. Stand-in for Codex, which was at its usage limit until 20:35 UTC (autonomous
  decision, pending owner review).
- **Critiqued:** `plan-v1.md`, sha256 86b4b39dd414c822dcf19af92c6fb707202b0f204703eb2f4f1337d06167658a, HEAD 4050053.
- **Files named in the brief:** server/src/app.js, server/src/content-loader.js, server/src/learning-service.js,
  server/test/helpers.js, mobile/App.js, mobile/src/stores/gameStore.js, mobile/src/components/Header.js,
  mobile/src/api/learning.js, mobile/src/__tests__/learning-state.test.js, learning-flow.test.js, parallang.md 1–12,
  prototype.md.
- **Returned:** 18:25 UTC (about 70 s).

The text below is the reviewer's final report as returned to the main agent. The subagent's message was relayed in
a reformatted form (list layout); wording is as received.

---

I found 3 Errors, 4 Risks and 3 Suggestions in plan-v1. Nothing was edited, and no server or network calls were made.

1. **Error: the store design contradicts itself on ordering and failure handling.** Design item 3 says to read the seen flag "after the learner and world load", then to "fetch onboarding in parallel with world/spellbook/party". If `getOnboarding` is added to the existing `Promise.all` in `initialize` (`mobile/src/stores/gameStore.js:48`), its rejection rejects the whole startup and the player sees an error banner. That breaks the rule that the statement never blocks play. **Fix:** read the flag before `createLearner`. Start `getOnboarding()` as a separate promise with its own `.catch(() => null)` and await it after the `Promise.all`, under the same `epoch` guard. Then apply `world`, `spellbook`, `party`, `onboarding` and `view` in a single `set()`.

2. **Error: a player who taps the header during startup gets thrown out of their screen.** The store starts with `view: 'map'`, and the Header's Spellbook and Party buttons work while `initialize` is still pending; `openSpellbook` and `openParty` don't check `learnerId`. If the player opens the Spellbook and onboarding then resolves, `set({ view: 'onboarding' })` replaces it. `returnView` then points at map or dialogue, so the onboarding view is never part of a coherent return path. **Fix:** set `view: 'onboarding'` only if the view is still `'map'` at resolution time. Better still, start with `view: 'loading'` and hide the nav until `learnerId` is set.

3. **Error: the mobile integration fakes will silently test only the failure path.** `learning-flow.test.js` clears AsyncStorage before every test, so every App test becomes a first launch and calls `/api/onboarding`. Its fetch fake throws `Unexpected fetch`, which `request()` turns into `SERVER_UNREACHABLE`. The plan swallows that error, so the existing tests stay green while hitting the error path on every run. `party.test.js` returns a 404, which is also swallowed. Also, `fakeApi()` in `learning-state.test.js` has no `getOnboarding`. `memoryStorage()` only seeds `parallang.learnerId`, so every existing state test would hit a TypeError, which is then swallowed. **Fix:**
   - Add `getOnboarding` to `fakeApi` and an `/api/onboarding` route to both fetch fakes.
   - Seed `parallang.onboardingSeen` in the existing tests' setup.
   - Add `onboarding: null` to the `beforeEach` `setState` resets.
   - Add one App-level test that renders the panel and presses the button.

4. **Risk: a storage write failure in `finishOnboarding` is unhandled.** If `setItem` rejects and the view change happens after the write, the player is stuck on the onboarding screen. **Fix:** set `view: 'map'` first, write the flag fire-and-forget with a catch, and test a rejecting `setItem`.

5. **Risk: invented lines are presented as the owner's text.** Paragraph (a) opens "We believe…", the owner's voice. Paragraphs (b) and (c) are written by us but appear in the same list with nothing marking them. (b) also makes a product claim: words "go into your Spellbook" when met. That is true for `encounter_exposure` and `companion_reveal` discoveries (`learning-service.js:267,320`), so keep the wording accurate to that. (c) adds "has opinions", which isn't in the Market Entrance description ("has not decided which language it is in"). **Fix:** add a `source: owner|authored` field per paragraph, or keep the verbatim quote alone in its own block. Record (b) and (c) in `docs/autonomy/decisions.md` as an autonomous decision pending owner review. Add a test that the first paragraph equals the `parallang.md` text byte for byte.

6. **Risk: the token test is weak, and the plan implies a protection that doesn't exist.** `createRuntime` always sets a token (`server/test/helpers.js:120`). The 401 test only passes if it calls `api()` with `token: null`, and it duplicates existing middleware coverage. Separately, the mobile client never sends `X-ParaLLang-Token`, so on a server with a token set, onboarding (like every other route) would fail silently. **Fix:** keep the 401 test but pass `token: null` explicitly. State in the plan that mobile has no token support.

7. **Risk: changing Header's Spellbook to render only when a handler is given affects every screen.** Today Header always renders it. **Fix:** hide the whole nav when `view === 'onboarding'` with an explicit `hideNav` prop. That is clearer than nulling handlers one by one. Assert in a test that the button labelled "Spellbook, N reviews due" is absent.

8. **Suggestion: accessibility.** The panel heading should use `role="heading"` like Header. The button needs an `accessibleName`. On mount, the panel should move screen-reader focus to the heading (`AccessibilityInfo.setAccessibilityFocus`), or VoiceOver users land in the header. Text must scale with Dynamic Type inside the ScrollView. Keep the VoiceOver check on the owner's open-items list.

9. **Suggestion: onboarding and the encounter restore.** `initialize` doesn't restore an ongoing encounter today, so there is no race now. Still, add a code comment and a test asserting that onboarding uses `returnView` 'map' and never 'dialogue'. Then a future resume feature can't jump straight into dialogue past the statement.

10. **Suggestion: tests the plan is missing.**
    - The epoch test: `initialize` superseded mid-flight must not set `onboarding`.
    - Startup deduplication: `getOnboarding` is called once.
    - The loader rejecting a missing `onboarding.yaml`.
    - A strict-schema test rejecting extra keys.

    `onboarding.yaml` is shared across language packs (unlike the per-pack vocabulary), so test that it loads under both `TARGET_LANGUAGE=it` and `es`.
