# Claude subagent critique 1: type scale and palette tokens

- **Dispatched:** 2026-11-05T19:21:11 (journal row 3)
- **Returned:** unknown (the notification came after the theme test's first run, about 19:24; journal row 4)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/034/trail/plan-v1.md` against `mobile/src/components/*.js`, `mobile/App.js`, `mobile/src/__tests__/`, `mobile/package.json`: missed sizes or colours, missed text/background pairs (opacity, disabled), robustness of a source scan, Dynamic Type; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 450 words
- **Reviewed input:** `plan-v1.md`, sha256 11f3386ace7f72919828cacb4de3ade5b3081eafc3759beb865c72c059c5fc5d, HEAD 9d75186, working tree: draft component, ui.js and theme-test changes were uncommitted while it ran
- **Findings:** 8

## Raw output (verbatim)

```text
I found 3 Errors, 3 Risks and 2 Suggestions. I computed every contrast ratio below with WCAG 2 luminance and opacity blending.

1. **Error: there are two hex literals, not one.** `App.js:70` (`notice`) also has `backgroundColor: '#e7f3e8'`. The plan only changes `DialoguePanel.js`, yet its own scan covers `App.js`, so the new test fails on day one. Fix: move both to `colors.successSurface`, and add the `notice` pair (success on successSurface, 5.6) to the contrast list.

2. **Error: the plan only counts sizes that are written out.** About 15 Text styles have no `fontSize` and get React Native's default of 14. Examples: `speaker`, `strong`, `muted`, `thinking` (DialoguePanel), `label` (Header), `joined` (PartyOffer), and the `muted`/`strong` styles in Spellbook, SavesPanel, PartyPanel and ReviewPanel. After the change the app still shows 14pt text, which is off the scale, and the scan cannot catch it. Fix: give every Text style an explicit `type.*`, or add a test that renders each panel and asserts every flattened Text style has a `fontSize` in the scale.

3. **Error: the contrast list ignores opacity.** Map nodes are `Button`s with `disabled` set whenever a node is current, not adjacent or sealed, so their labels sit at 45% opacity. That includes "you are here", which is real information and not an inactive control. Ink at 0.45 on surface is 2.74; muted at 0.45 is lower. Other cases: a disabled primary button is 2.2, a pressed primary is 3.82, and the disabled InputBar (opacity 0.6) is 4.33. Fix: blend opacity into the contrast test, and on the map show state through the dot rather than with opacity, or keep labels at full opacity.

4. **Risk: one text-on-background pair is missing.** The ErrorBanner's "×" is a `variant="text"` button, so accent text sits on dangerSurface. It passes at 6.6 but is not checked, and Header's text button (accent on background) is not listed either. Text on `border`, `muted` or `ink` backgrounds: none found. The map dots that use those colours hold no text. If text is ever put on `border`, muted on border is 3.96 and would fail. Fix: build the pair list from the styles, or add these pairs and a comment saying no text is placed on dot colours.

5. **Risk: the scan regex is too narrow.**
   - It should catch inline objects such as `PronounceButton.js:22` `style={{ fontSize: 20 }}` and spaced forms like `fontSize : 18`. A pattern like `/fontSize\s*:\s*[\d.]/`, run on file text with comments stripped, does that.
   - For colours it should catch `#rgb` and `#rrggbbaa` as well as 6-digit hex (`/['"]#[0-9a-f]{3,8}['"]/i`), plus `rgba(`, `hsl(` and named colours (`'white'`).
   - The glob should be recursive over `src/**`, so new subfolders and future style files are covered.

6. **Risk: Dynamic Type layout.** React Native scales every size by one `fontScale`, not Apple's per-style curves, so the Apple style names promise more than they deliver. Fixed boxes will clip at accessibility sizes: map `nodeWrap` (about 120pt wide, `numberOfLines={2}`), the Header badge (`minWidth: 18`, `borderRadius: 9`), and a 32pt review word growing toward 100pt. Fix: set `maxFontSizeMultiplier` (about 1.5–2) on map labels and the badge. List the large-text checks as Simulator open items for the owner.

7. **Suggestion: line heights.** 18→17 with lineHeight 25 is fine (1.47). But `lineHeight` values (25, 23, 21) stay hand-set and unscanned. Fix: make the scale `{ size, lineHeight }` pairs, or ban numeric `lineHeight` the same way.

8. **Suggestion: `ui.js` is excluded from the scan.** It still has `label: fontSize: 15`. Fix: convert it to `type.subhead` too and scan `ui.js` for `fontSize` (allow hex only inside `colors`).

No existing test depends on font sizes or styles (the grep in `__tests__` found nothing), and the jest setup (`jest-expo` preset, `jest.setup.js` mocks) needs no change.

Optional: put `#e7f3e8` in the 3a test as the expected value so the "unchanged value" claim is checked. Give caption2 (11pt muted, the seal caption) at least 4.5:1 explicitly, since small text has no large-text exemption.
```
