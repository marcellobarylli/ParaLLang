# Round 034 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** `prototype.md` Phase 4 ("visual polish"); backlog C3, split here: C3a (this round, type scale
  and palette tokens) and C3b (transitions, later).
- **Findings:** [`findings.md`](findings.md), after the build.
- **Artifact:** `mobile/src/components/ui.js` (`type`, `colors.successSurface`), every component's styles,
  `mobile/App.js`, `mobile/src/__tests__/theme.test.js`. No server or prompt change.

## Goal (pre-run)

One type scale and one palette for the app, with tests that keep literal sizes and colours out of the components
and keep text readable (WCAG 2, 4.5:1) on every background it sits on.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Apple's text-style names, the app's own sizes** where they are close (title1 stays 24, not 28).
2. **Text at 14 points moves to 15** (`subhead`), including React Native's unset default of 14.
3. **Critique by a Claude subagent** (Codex at its usage limit until about 20:35 UTC).

## Design (pre-run)

1. **Scale** in `ui.js`: `type = { caption2: 11, caption1: 12, footnote: 13, subhead: 15, callout: 16, body: 17,
   title3: 20, title2: 22, title1: 24, largeTitle: 32 }`. Every `fontSize` in the app is `type.<name>`. 14 → 15. 18
   → 17 (`body`) for the NPC's target-language line (lineHeight 25 kept), and → 20 (`title3`) for the Spellbook's
   section headings. `ui.js`'s button label is `type.subhead`.
2. **Every text style names a size** (critique 1.2). A style with `color`, `fontWeight` or `fontStyle` (a text style)
   gets a `fontSize`. The ones without one were at React Native's default of 14, and now get `type.subhead`.
3. **Palette:** both `'#e7f3e8'` literals become `colors.successSurface`: the victory banner in `DialoguePanel.js`
   and the notice in `App.js` (critique 1.1). The value is unchanged and pinned in the test.
4. **Opacity** (critique 1.3). Map nodes you cannot move to (the current one, a far one, a sealed one) keep their
   labels at full opacity. The `Button` gets a `dim` option, default on, which the map turns off. A node you cannot
   reach shows it by its dot and the `muted` label colour, while the current node stays `ink`. Opacity on disabled
   and pressed controls elsewhere stays: WCAG exempts inactive controls, and a press is momentary.
5. **Dynamic Type stays on.** `maxFontSizeMultiplier={1.5}` goes on the map's node labels and seal captions (fixed
   120-point boxes) and on the Header's badge (critique 1.6, in part). Large-text layout is a Simulator open item.
6. **Line heights stay set by hand** (critique 1.7, in part). Three values, revisited in C3b.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 11f3386a…; Claude subagent (general-purpose, claude-opus-5-5),
read-only; raw text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A second `#e7f3e8` in `App.js` | + | Accept | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.2 | Error | Text styles without a size stay at RN's 14 | + | Accept: every text style names a size; scan rule | **Accepted** (autonomous, pending owner review) | Design 2, Tests |
| 1.3 | Error | Map labels at 45% opacity carry information | + | Accept: map nodes not dimmed; muted label for unreachable; other disabled/pressed states exempt | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.4 | Risk | Pairs missing: accent on dangerSurface, accent on background | + | Accept; no text on dot colours (noted in the test) | **Accepted** (autonomous, pending owner review) | Tests |
| 1.5 | Risk | Scan regex too narrow; not recursive | + | Accept: spaced forms, inline objects, 3–8 digit hex, rgb/hsl, named colours, recursive `src/**` minus tests, comments stripped | **Accepted** (autonomous, pending owner review) | Tests |
| 1.6 | Risk | Dynamic Type clips fixed boxes | + | Accept in part: caps on map labels and badge; layout at large sizes is a Simulator open item | **Accepted in part** (autonomous, pending owner review) | Design 5 |
| 1.7 | Suggestion | Line heights unscanned | 0 | Accept in part: deferred to C3b | **Accepted in part** (autonomous, pending owner review) | Design 6 |
| 1.8 | Suggestion | `ui.js` label and scan | + | Accept: `type.subhead`; ui.js scanned for `fontSize` literals | **Accepted** (autonomous, pending owner review) | Design 1, Tests |

**Deferred / optional:** pin `#e7f3e8` (taken); caption2's contrast (muted on surface, 5.82, covered by the pairs).

Net change from plan-v1: every text style sized, map labels at full opacity, a wider scan, size caps on two fixed
boxes.

## Tests (pre-run)

- `theme.test.js`:
  - The scan covers `App.js` and `src/**` (not `__tests__`), with comments stripped. It finds no numeric `fontSize`
    and no colour literal (hex, `rgb`/`hsl`, named colours) outside `ui.js`'s `colors`. Every style object with
    `color`, `fontWeight` or `fontStyle` has a `fontSize`.
  - The scale is increasing and unique.
  - Contrast is at least 4.5:1 for each text/background pair in use: `ink`, `muted`, `accent`, `success` and
    `danger` on `background` and `surface`; `accentInk` on `accent`; `danger`, `muted` and `accent` on
    `dangerSurface`; `success` on `successSurface`.
- `map.test` (or the existing map test): a non-adjacent node's label has no opacity and uses `muted`.
- All mobile suites, expo-doctor, iOS export; server and web unchanged.

## Outcome (2026-11-05)

Built as designed, with no Amendments. No component sets a literal font size or colour, every text style names a
size from the scale, every text/background pair in use meets 4.5:1, and map labels are no longer faded. Mobile
74/74, server 157/157, web client 12/12 and build, expo-doctor 20/20, iOS export ok. See [findings](findings.md).
