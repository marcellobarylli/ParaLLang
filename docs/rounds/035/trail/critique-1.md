# Claude subagent critique 1: transitions that respect Reduce Motion

- **Dispatched:** 2026-11-05, after 19:27:40 (journal row 3)
- **Returned:** unknown (the notification came while the first motion test was being debugged; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/035/trail/plan-v1.md` against `mobile/App.js`, `DialoguePanel.js`, `BilingualText.js`, `ui.js`, the store, the mobile tests, `jest.setup.js` and `package.json`: flicker or hidden content, the initial-ids ref on restart / save switch / resume, `key={state.view}` remounts, the initial reduce-motion value, jest behaviour; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 450 words
- **Reviewed input:** `plan-v1.md`, sha256 29e36dbc58eb571ce1bb32e21cae088007f13019e1af5d8a8b06668380f272e2, HEAD 6d67f61, working tree: draft `motion.js`, DialoguePanel, App and theme-test changes were uncommitted while it ran
- **Findings:** 8

## Raw output (verbatim)

```text
I found three errors in the plan: as written, the fade either never runs or flashes content that is already showing, the "ids at mount" ref goes wrong on restart, and an assessment that changes does not fade. I edited nothing and ran no servers.

1. **Error: the hook can't settle per component.** If every `FadeIn` calls `useReduceMotion()`, each one starts at `true` on its first render. One of two things then happens. If the start value is fixed at mount, nothing ever animates. If the effect depends on `reduce`, every mounted element drops from opacity 1 to 0 and fades back once the read resolves. **Fix:** keep one module-level value, read once at app start and updated by the `reduceMotionChanged` listener, exposed through `useSyncExternalStore`. `FadeIn` decides once at mount from that value; if the value is still unknown, it does not animate. If Reduce Motion turns on during a fade, stop the animation and set opacity to 1. Stop the animation on unmount.

2. **Error: the mount-time id set breaks on restart.** `restartEncounter` keeps `view: 'dialogue'`, so `DialoguePanel` does not remount. The new encounter's opening line gets a new `randomUUID` id (`server/src/learning-service.js:236`), so it fades in as if it were a new message, and the stale set keeps growing. **Fix:** reset the set when `encounter.id` changes, or put `key={encounter.id}` on `DialoguePanel`. Call `useRef` before the `!encounter` early return, and seed it from the first non-null encounter.

3. **Risk: FlatList recycles cells.** Off-window cells unmount and remount when scrolled back, so a message that arrived after mount fades again. **Fix:** track ids that have already faded in a set owned by the panel; a message fades only on its first render.

4. **Error: a changed assessment does not fade.** `sendMessage` replaces `assessment` without clearing it, so the box stays mounted. Only the first assessment fades. **Fix:** key the assessment `FadeIn` on its content, for example the joined `objectiveResults` ids plus a turn count.

5. **Risk: the screen wrapper needs `flex: 1`.** Without `style={{ flex: 1 }}`, the dialogue's `KeyboardAvoidingView`, the FlatList and the other `flex: 1` panels collapse to zero height. Add a test that checks the wrapper's flattened style. `key={state.view}` loses no state: each view is already a separate conditional and the draft lives in the store. Say so in the plan rather than wrapping each view.

6. **Risk: jest behaviour.** The jest preset's `isReduceMotionEnabled` resolves `false`, so every suite rendering `App` will animate. Its `requestAnimationFrame` is a `setTimeout(0)`, so frames run after an assertion and can outlive the test. A state update after the promise can raise act() warnings. **Fix:** in `jest.setup.js`, mock the read to resolve `true` by default; `motion.test.js` overrides it with `mockResolvedValueOnce(false)` and fake timers. The missing native-driver warning is suppressed when `NODE_ENV=test`, so no warning noise. No current test uses `toBeVisible`, which treats opacity 0 as hidden (`dist/matchers/to-be-visible.js:52`). Ban it next to faded content, or advance timers first.

7. **Risk: VoiceOver at opacity 0.** The "read from the first frame" claim in Design point 5 is unverified. Testing Library says opacity 0 doesn't hide an element from accessibility on iOS; whether VoiceOver actually skips near-transparent views needs the Simulator. Start opacity at about 0.01 rather than 0, or list it as an owner Simulator check, along with screenshots taken during a 200 ms fade.

8. **Suggestion: tie line heights to sizes.** The theme test should also require `lineHeight: leading.X` to sit with `fontSize: type.X`, so a mismatched pair fails.

Optional:
- Apple's guidance replaces movement with a cross-fade under Reduce Motion rather than removing everything. Consider keeping the opacity fade and dropping only `translateY` (`prefersCrossFadeTransitions` exists). Record whichever choice you make.
- When `sendMessage` adds the player and NPC messages together, the two fade at the same moment. Consider a 60 ms stagger.
- The existing `learning-flow.test.js` scroll test should also assert `{ animated: false }` under Reduce Motion.

Files reviewed: `/work/ParaLLang/docs/rounds/035/trail/plan-v1.md`, `/work/ParaLLang/mobile/App.js`, `/work/ParaLLang/mobile/src/components/DialoguePanel.js`, `/work/ParaLLang/mobile/src/stores/gameStore.js`, `/work/ParaLLang/mobile/node_modules/@react-native/jest-preset/jest/mocks/AccessibilityInfo.js`.
```
