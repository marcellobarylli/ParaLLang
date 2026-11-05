# Critique 1: a display font for titles (Claude subagent; Codex at its usage limit)

- **Dispatched:** unknown, between 20:10:26 and 20:11 UTC
- **Returned:** unknown, before 20:12:15 UTC (75 s after dispatch by the agent's own duration)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only by instruction, repo access
- **Prompt:** adversarial read-only review of `docs/rounds/042/trail/plan-v1.md` and the code it touches (ui.js,
  App.js, the title styles of seven components, theme.test.js, jest.setup.js, package.json, app.json, expo-font and
  @expo-google-fonts/literata); numbered Error / Risk / Suggestion items with fixes, Optional unnumbered, under 600
  words
- **Reviewed input:** `plan-v1.md`, sha256 4df600a32972bb8037070f4cfe1fd999dec6b288d1d368c8f358764bde493c18, HEAD
  2698eb5, working tree: docs/rounds/042/, the installed packages (package.json, package-lock, app.json), and a
  draft (ui.js `Title`, seven components, App.js, theme.test.js, font.test.js) written during the critique
- **Findings:** 9 (2 Errors, 4 Risks, 3 Suggestions)

## Raw output (verbatim)

```text
I found 2 errors, 4 risks and 3 suggestions in the plan. I checked them against the installed packages but ran nothing in the app; the glyph and weight figures come from parsing the font file directly.

1. **Error: the fallback weight "800, as today" is wrong for half the titles.** Today the Header, Onboarding, Map and Party titles use weight 800. The Spellbook, Saves and Review titles and the Spellbook section headings use 700. A blanket `fontWeight: '800'` fallback in `<Title>` changes those four. Fix: keep each title's weight in its own style, and have `<Title>` only remove `fontWeight` when it applies `fontFamily`.

2. **Error: the `expo-font` entry in app.json does nothing.** The plugin returns the config unchanged unless it is given `fonts`, and Expo Go ignores plugins anyway. It reads as if the font is embedded at build time, which it is not. Fix: remove `"expo-font"` from `plugins`. If a dev build comes later, add `["expo-font", { "fonts": [<path to the 700 ttf>] }]` then.

3. **Risk: `useFonts` under jest-expo makes a real async state update in every App test.** jest-expo defines `window`, so `useFonts` takes the runtime path. That calls `loadAsync` in an effect and sets state after it resolves; the native `ExpoFontLoader.loadAsync` is only a generic auto-mock. The result is likely "not wrapped in act(...)" warnings, and a rendered font that depends on timing, across all existing App suites. Fix: mock `expo-font` in `mobile/jest.setup.js` (for example `useFonts: jest.fn(() => [false, null])`). The `useDisplayFont` test can then override it to return `[true, null]` or `[false, new Error()]`.

4. **Risk: a module-level flag plus subscription leaks state between tests and puts a test-only export in production code.** Jest does not reset modules between tests in the same file, so one test calling `setDisplayFontReadyForTests(true)` changes every later test. Fix: put the ready flag in a React context set in App, with `<Title>` reading it via `useContext`. Tests wrap a component in the provider, and no test hook ships. If the flag stays, reset it in `afterEach`.

5. **Risk: importing from the package root bundles all 16 TTFs.** `@expo-google-fonts/literata/index.js` has 16 `require`s, one per face, so a single `import ... from '@expo-google-fonts/literata'` defeats the subpath import. Fix: the source test should fail on any import of the root package, not only check that the 700 file is required. The planned "exactly one .ttf in the iOS export" check covers this end to end, so keep it. Also, the size is 256 KB, not ~360 KB. The 96 KB `.ttf.png` preview is never required, so it is not bundled.

6. **Risk: titles wrap or truncate with Dynamic Type.** A bold serif sets wider than SF. The Header title (title2, in a row with buttons), the Map title (`here.name`, any location name) and the Saves and Spellbook rows (`justifyContent: 'space-between'`) are the likely places. Fix: keep the titles wrapping (no `numberOfLines`) and give the Spellbook and Saves headers `flexShrink: 1` and `flexWrap`. Add "titles at the largest accessibility size and with long location names" to the owner's Simulator open items.

7. **Suggestion: `<Title>` must pass through `role="heading"` and other props.** Every current title has `role="heading"` for VoiceOver, so `<Title>` should spread `...props` onto `Text` and default `role` to `"heading"`. Add a test that `getByRole('heading', { name: 'Spellbook' })` still finds it, along with the other existing heading queries.

8. **Suggestion: record the OFL obligations, not just "licence file present".** The package is "MIT AND OFL-1.1": MIT for the code, OFL for the font. The OFL requires the copyright notice and licence to travel with the font. Fix: add a short third-party notice to the repo, with an in-app credits line as an owner decision. The test should check that `LICENSE_FONT` names OFL 1.1.

9. **Suggestion: glyph coverage is fine. Write it down instead of leaving it as a risk.** The 700 file maps 1164 code points and contains every Italian and Spanish accented letter (upper and lower case), ñ/Ñ, ¿, ¡, curly quotes, the em dash and the ellipsis. Its weight class is 700. A test that checks coverage of the characters actually present in content titles would guard any future language pack.

## Optional

- On iOS, `fontWeight` with a single-face custom family is ignored or may pick another face, so dropping it is right. Also make sure no `fontStyle: 'italic'` reaches a `<Title>`, since only the upright face is loaded.
- Titles have no `lineHeight` today. Keep it that way, or the serif's accents on capitals (È, Ì) could clip.
- Consider putting the Spellbook card titles on the system font in the plan's text explicitly. They are headings, and a reviewer may otherwise expect them to be moved.
- "Expo Go ignores config plugins" is the real reason for runtime loading, so say it next to decision 2 in the plan, and drop the app.json change from the diff.
```
