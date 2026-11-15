# Round 118 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-15 by the owner's screenshot after round 117's
first fix, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit that holds
them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full record (the
owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 117's [architecture](../117/architecture.md) (Diagnosis) and
  [findings](../117/findings.md).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/index.css`, `client/src/viewport.js`, `client/src/components/SettingsSheet.jsx`,
  `client/vite.config.js`.

## Goal (pre-run)

1. In the page opened from the iPhone's home screen nothing is cut at the bottom. Round 117's fix cut the bottom
   65 pt of the screen there, which holds the reply box. This is a regression on the live site.
2. The player can see which build runs and can load the newest build from inside the page.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- "Bottom still cut after the fix" (Q0).
- "How do we reload from the app / website itself" (Q0).

## What the screenshot shows (pre-run)

- **The reload worked.** Everything on the screen sits about 65 pt lower than in the screenshot before the fix: the
  shell took `height: 100vh`, so `display-mode: standalone` matched and `100vh` is the screen's height. Round 117's
  diagnosis of the mode holds.
- **The fix was wrong.** The shell now reaches the screen's bottom edge, but nothing is painted below the old line.
  Round 117 assumed the strip was the body showing under a short shell. It is a clip: `body { overflow: hidden }`
  becomes the viewport's clip, and the viewport is the short layout area. A fixed element cannot paint outside it.
- **Reports of the same bug** fix it by making the document itself taller than the layout area
  (`html { min-height: calc(100% + env(safe-area-inset-top)) }`), with no clip on the viewport. That is the one
  configuration known to paint in the strip.

## Design (pre-run)

### The installed page: a taller document, the content inside the short area

Under `display-mode: standalone` (and `fullscreen`):

- `html`, `body` and `#root` are `100vh` high and do not clip. The shell is `position: absolute` in that document,
  `100vh` high, and clips its own content.
- `client/src/viewport.js` measures the gap between `100vh` and the layout area's height and sets `--bottom-gap` on
  the root element (0 where the two agree, which is every browser without the bug).
- The dock's panels, the settings sheet and the overlays add `--bottom-gap` to their bottom padding. So the content
  stays inside the short layout area, where it is known to be visible, and only the panels' background and the
  level reach into the strip.
- If iOS paints there, the strip is gone and the content sits 65 pt above the bottom edge. If it does not, the page
  looks as it did before round 117: a strip, and nothing cut. No outcome cuts content.
- The settings backdrop becomes `position: absolute` inside the shell, in every mode.

### A build number and a reload in Settings

- The build id (`0.1.0+…`, the same string as `version.json`) is compiled into the bundle.
- Settings shows it with one line of layout numbers for diagnosis: the display mode, the window, `100vh`, the
  screen and the gap. A screenshot of Settings then tells which build ran and what the phone reported.
- A button "Reload the page" navigates to the page's own address with a fresh query string, which fetches
  `index.html` past the browser's cache. The storage is per origin, so the token and the settings stay.
- When Settings opens it asks for `version.json` (uncached). If the site holds a different build, the line says so.

## Claim boundary (pre-run)

The cluster has no iPhone and Chrome does not have the bug. The tests show that the installed-mode rules hold the
content inside the layout area for any gap, and that nothing moves where the gap is 0. Whether iOS paints the strip
is the owner's observation; the layout numbers in Settings are there for the case that it does not.

## Deferred (pre-run)

- Moving the content down into the strip (the full-height layout). It needs the owner's confirmation that iOS paints
  there.

## Tests (pre-run)

- `viewport.js`: the gap from given heights (never negative, 0 without a document).
- Stylesheet: the installed-mode rules exist, the old `height: 100vh` on a fixed shell is gone, the panels pad by
  `--bottom-gap`.
- Settings sheet: the build line; "Reload the page" navigates with a fresh query; a newer build is announced.
- Playthrough (real browser): with the installed rules applied and a gap of 62 px set, the dock's content ends at or
  above the layout area's bottom edge and the shell reaches 62 px below it; with a gap of 0 the layout is unchanged.
- All suites and the build keep passing.
