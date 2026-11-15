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
