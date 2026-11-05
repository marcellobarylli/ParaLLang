# Round 035 plan v1: transitions that respect Reduce Motion (C3b)

Backlog C3, second part (prototype.md Phase 4 "transitions"), plus the line heights round 034 deferred (its
critique 1.7). Codex is at its usage limit (until about 20:35 UTC). No server or prompt change, no LLM call.

## Design

1. **`useReduceMotion()`** in a new `mobile/src/motion.js`: starts `true` (no motion until the setting is known),
   then reads `AccessibilityInfo.isReduceMotionEnabled()` and follows the `reduceMotionChanged` event; unsubscribes
   on unmount; a rejected read counts as `true`.
2. **`<FadeIn>`** in `motion.js`: an `Animated.View` that on mount goes from opacity 0 and translateY 6 to opacity 1
   and translateY 0 in 200 ms (`useNativeDriver: true`). With Reduce Motion it renders at opacity 1 and offset 0 and
   starts no animation. Its `style` prop passes through.
3. **Where it is used:**
   - `DialoguePanel`: each transcript message that arrives after the panel mounted fades in. The ids present at mount
     (opening line, a resumed transcript) are kept in a ref and render without a fade. The assessment box and the
     victory banner fade in when they appear.
   - `scrollToEnd({ animated })` follows the setting: no animated scroll under Reduce Motion.
   - Screen changes in `App.js`: the active panel is wrapped in `<FadeIn key={state.view}>`, so a switch fades the
     new screen in (no cross-fade, nothing waits on it).
4. **Line heights:** `leading = { subhead: 21, callout: 23, body: 25 }` in `ui.js`; the five hand-set line heights use
   it; round 034's theme test also bans numeric `lineHeight` outside `ui.js`.
5. **Accessibility:** a fade never delays content: text is in the tree (and read by VoiceOver) from the first frame;
   no `aria-hidden` during the fade.

## Tests

- `motion.test.js`: with Reduce Motion off, `FadeIn` calls `Animated.timing` (opacity to 1, 200 ms, native driver);
  with it on, no call and the style is opacity 1; the hook follows a `reduceMotionChanged` event and removes its
  listener on unmount; a rejected read gives `true`.
- `DialoguePanel`: messages present at mount do not animate; one appended later does; under Reduce Motion
  `scrollToEnd` gets `animated: false`.
- Theme test: no numeric `lineHeight` outside `ui.js`.
- All mobile suites; expo-doctor; iOS export.

## Not in scope

Sound (C4), haptics, a custom font, animated map movement.
