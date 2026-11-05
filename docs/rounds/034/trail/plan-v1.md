# Round 034 plan v1: type scale and palette tokens in the app (C3, first part)

Backlog C3 (prototype.md Phase 4, "visual polish: typography, palette, transitions"), split: this round is
typography and palette only; transitions are a later round. Codex is at its usage limit (until about 20:35 UTC). No
server or prompt change; no LLM call.

## Problem

`mobile/src/components/*.js` set 12 different literal font sizes (11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 32)
and one literal colour (`'#e7f3e8'`, the victory banner in `DialoguePanel.js`). Nothing checks text contrast.

## Design

1. **Type scale in `mobile/src/components/ui.js`**, named after Apple's text styles, using the sizes the app already
   uses where they are close: `type = { caption2: 11, caption1: 12, footnote: 13, subhead: 15, callout: 16, body: 17,
   title3: 20, title2: 22, title1: 24, largeTitle: 32 }` (font sizes in points). Every `fontSize` in the components
   uses `type.<name>`. Two sizes move: 14 → 15 (`subhead`: error banner text, narrative italics, meanings, map notes,
   examples; 6 uses) and 18 → 17 (`body`: the NPC's target-language line, lineHeight 25 kept) or 20 (`title3`: the
   Spellbook's section headings). Weights stay as they are.
2. **Palette:** the victory banner's background becomes `colors.successSurface` (`#e7f3e8`, unchanged value).
3. **Checks in a new jest test** (`mobile/src/__tests__/theme.test.js`):
   - a source scan of `App.js` and `src/components/*.js` except `ui.js`: no numeric `fontSize:` literal and no hex or
     `rgb(` colour literal;
   - every `type` value is one of the scale's sizes, and the scale is increasing;
   - WCAG 2 contrast of each text colour on each background it is used on (`ink`, `muted`, `accent`, `success`,
     `danger` on `background`/`surface`; `accentInk` on `accent`; `danger` and `muted` on `dangerSurface`; `success`
     on `successSurface`) is at least 4.5:1. Today all pass (lowest: `muted` on `dangerSurface`, 5.04).
4. Dynamic Type stays on (React Native's default `allowFontScaling`); no caps added.

## Tests

The new theme test; all mobile tests (component tests match text, not sizes, so they should not change); typecheck
if any; expo-doctor; server and web suites unchanged.

## Not in scope

Transitions (next C3 round), a custom font (needs an asset and licence check), dark mode.
