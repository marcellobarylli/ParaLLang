# Round 117 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-15 by the owner's report from a first run on
the phone, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit that holds
them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full record (the
owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 115's [architecture](../115/architecture.md) (the dungeon screen's layout).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/index.css`, `client/src/components/DungeonScreen.jsx`.

## Goal (pre-run)

On the owner's iPhone the dungeon screen reaches the bottom edge of the screen. Today a strip in the page's
background colour (`#0d0d1a`), about 67 pt high, lies under the bottom sheet.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- **Scope:** "The only fix needed is the bottom band" (Q0). The overlapping markers 2 and 3 and the route line hidden
  under the trees, which Claude had named in the same screenshot, stay as they are.

## Diagnosis (pre-run)

The owner's screenshot shows no browser bars, and the level runs under the status bar. That is the page opened from
the home screen: the manifest says `display: standalone` and the page asks for a `black-translucent` status bar with
`viewport-fit=cover` (round 114). In that mode iOS lays the page out from the top of the screen but keeps the height
of the layout area short by the status bar's inset. `.app-shell` is `position: fixed; inset: 0`, so it ends that
much above the screen's bottom edge, and the body shows below it. The strip's height matches the status bar's inset
on a phone with a Dynamic Island (59 to 62 pt). The same mode has its own storage, which explains why the token
from round 114 was missing there.

This is an inference from the screenshot and from reports of the same bug. The cluster has no iPhone.

## Design (pre-run)

- **The shell takes its height from the viewport unit when installed.** Under `display-mode: standalone` (and
  `fullscreen`) `.app-shell` and the settings sheet's backdrop get `bottom: auto; height: 100vh`. In an installed
  page no browser bar comes and goes, so `100vh` is the screen's height, also where the bug is absent. In a browser
  tab the rule does not apply and the layout stays as it is.
- **The camera's free area is measured on the shell.** `useInsets` reads `window.innerHeight`, which is short by the
  same inset. It reads the shell's own rectangle instead, and falls back to the window where that has no size.

## Claim boundary (pre-run)

The fix cannot be checked on the cluster: headless Chromium does not have the bug. The tests show that the rule
exists, that the installed layout fills the window in Chromium, and that nothing else moved. Whether the strip is
gone on the iPhone is the owner's observation. The home-screen copy of the page may keep the old stylesheet until it
is closed and opened again.

## Deferred (pre-run)

- Markers 2 and 3 overlapping on the route screen at phone size, and the route line hidden under the canopy past
  site 1 (the owner: not needed).

## Tests (pre-run)

- **Stylesheet:** a test reads `index.css` and finds the installed-mode rule for the shell and the backdrop.
- **Playthrough:** `client/scripts/dungeon-shots.mjs` gains a check at phone size with `display-mode: standalone`
  emulated: the shell's rectangle equals the window, and the dock's bottom edge is the window's bottom edge.
- All suites and the build keep passing.

## Amendment 2026-11-15: the browser check applies the installed rule directly (Claude, during the build)

Chrome 131 does not emulate `display-mode`, through puppeteer or through the protocol. The playthrough reads the
installed-mode rule from the built stylesheet, applies it without its condition, and measures the shell and the dock.

## Amendment 2026-11-15: a slider for the panels' opacity, and a PS1 menu look (owner, during the round)

The owner asked for both after the first fix was deployed ([`trail/interview.md`](trail/interview.md), Q1 and Q2):
the 3D level is central, so the text panels should let it show through, set by a slider in Settings; and the panels
should be grey with hard corners and fit a PS1 menu.

### The opacity slider

- **Setting:** `panelOpacity`, 0 to 1 in steps of 0.05, default 0.7. It is a display preference, stored under its own
  key `parallang.display` (`client/src/display.js`). The server URL and the token stay under `parallang.settings`,
  because saving those reconnects and a change of opacity must not.
- **Store:** `display` and `setPanelOpacity(value)`, which clamps, applies and stores. It touches nothing else, so a
  conversation in progress goes on.
- **Screen:** the shell carries `--panel-alpha`. The dock's panels (title, route, dialogue sheet, victory) take their
  background's alpha from it. The boxes inside a panel (objective, assessment, briefing) are a faint tint, so the
  panel's opacity is what the slider says. The objective card stays sticky; it keeps at least 55% opacity so that
  the text scrolling under it does not show through as text.
- **Settings sheet:** a range input "Text panel opacity" with its percentage. It applies at once. While Settings is
  open the dock is hidden and the sheet itself takes the panel's background over the undimmed level, so the sheet is
  the preview. "Cancel" becomes "Close", since the slider has nothing to cancel.
- The Spellbook and the review screen cover the level and stay opaque.

### The PS1 menu look

- **Grey:** the panels, boxes, buttons and inputs are neutral greys. The purple tints go. Gold stays for headings and
  the main button; links are pale cyan.
- **Hard corners:** no border radius anywhere, including the site numbers, the progress pips and the badge.
- **Window frame:** each panel has a bevel (light top and left, dark bottom and right) inside a black outline, and a
  banded vertical gradient. Boxes inside a panel are sunken (the bevel reversed).
- **Dither:** a 2 px checkerboard at low contrast lies in the panel's background, as PS1 translucency was dithered.
- **Type:** a system sans stack (Verdana first) in place of Georgia, with a hard one-pixel black shadow. Labels are
  upper case.
- **Buttons:** bevelled; a press reverses the bevel. The main button of a card carries a blinking cursor (still under
  reduced motion).

### Tests

- `display.js`: default, clamp, bad stored values, storage failure.
- Store: `setPanelOpacity` stores the value and makes no request; the conversation is unchanged.
- Settings sheet and screen: the slider reports numbers; the shell carries the value; the dock is marked hidden
  while Settings is open.
- Playthrough: in a conversation at phone size, the slider is moved through the interface and the sheet's computed
  background alpha follows; no element of the dock has a border radius. Pictures at two opacities.

## Outcome (2026-11-15)

Built as designed, with the two Amendments, and deployed in two pushes (`7eeadfd`, `f728a16`), each with
`[skip render]` so the server kept running. In the installed page the shell takes the viewport's height. Settings
has a slider for the text panels' opacity, which applies at once and leaves a conversation alone. The interface is
grey with bevelled, hard-cornered windows in a PS1 menu look. The claim boundary held: nothing was checked on an
iPhone. See [`findings.md`](findings.md).
