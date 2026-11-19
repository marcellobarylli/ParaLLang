# Round 125 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's request in a Claude Code
cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit that
holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full
record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 116's [architecture](../116/architecture.md) (the camera follows the conversation) and
  round 117's (display preferences in Settings).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/scene/tilt.js` (new), `client/src/scene/director.js`, `client/src/scene/levelView.js`,
  `client/src/components/DungeonView.jsx`, `client/src/components/SettingsSheet.jsx`, `client/src/display.js`.

## Goal (pre-run)

While the camera holds at a site (the site's card and the conversation), tilting the phone turns the camera's look
a little, as if the phone were a window on the temple.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- "Can we add a gyro feature, so that the encounter cam responds to the phone's orientation?" (Q0).

Everything else is Claude's: where the feature lives, the setting, the range and the direction.

- **Decision 1: the web dungeon.** The encounter camera exists only in the web client's dungeon (round 116), which
  the owner plays on the iPhone from the home screen. The Expo app has no camera. So the feature reads the browser's
  `deviceorientation` events; it adds no dependency.
- **Decision 2: a setting, off by default.** iOS Safari gives a page the phone's orientation only after the page
  asks from inside a tap (`DeviceOrientationEvent.requestPermission()`), over HTTPS. Settings gets a "Tilt to look"
  checkbox: ticking it is the tap that asks. The choice is kept with the display preferences. On a later visit with
  the setting on, the page asks at the first tap anywhere, because a page may not ask on its own.
- **Decision 3: the look turns, the camera stays.** The tilt turns the line of sight around the camera's position.
  The position is left to the director, so the camera cannot enter a wall, and the tests of the plan keep holding.
- **Decision 4: the direction is a window's.** Turning the phone to the left looks left; tilting its top away looks
  up. One sign each in `tilt.js` if the owner wants the opposite.
- **Decision 5: it applies with reduced motion too.** The setting is the player's own choice and the movement is the
  player's own hand.

## Design (pre-run)

### The tilt (`client/src/scene/tilt.js`, pure apart from two small browser helpers)

- An orientation event's three angles become a quaternion (the W3C specification's formula). The tilt is the
  rotation from a baseline orientation to the present one, read in the phone's own frame: its part about the
  screen's horizontal axis is the pitch, its part about the screen's vertical axis is the yaw. Reading the rotation
  this way has no jump at any way of holding the phone (the raw `gamma` angle jumps when the phone is upright). The
  screen's rotation (landscape) swaps the axes.
- The first event sets the baseline, and so does the start of each camera state: the way the player holds the phone
  on arriving at a site is "straight ahead".
- **Gain and range.** The look turns 0.6° per degree of tilt, up to 12° to either side and 8° up or down.
- **Leash.** Tilting past the range drags the baseline along, so tilting back answers at once.
- **Recentre.** The baseline follows the phone slowly (time constant 12 s), so a new way of holding the phone, and
  the sensor's own drift, become "straight ahead" again.
- `requestTiltPermission()` asks where the browser has the method, and answers `granted`, `denied` or
  `unsupported` (no orientation events at all).

### The director

- `look({ yaw, pitch })` sets the turn; the director eases to it (0.12 s), so sensor noise and switching the
  setting off do not jerk the view.
- The turn shapes only the hold of the approach and walk states, as `engage` and `beat` do. It fades in over the
  first half second of a hold, so a hold still joins its transition without a jump. The orbits, the map and the
  walks ignore it. A walk starts from the pose the camera holds, turned or not.
- A new state does not reset the turn: it is the phone's, not the conversation's.

### The wiring

- The level view gains `setLook(source)`: each frame it hands `source.look` to the director, and it recentres the
  source when a camera state starts.
- `DungeonView` gets the setting. While it is on and the level is ready, it listens to `deviceorientation`, feeds
  the tilt, and (where permission is needed and not yet given on this page) asks at the first click.
- `display.js` stores `tiltLook` (boolean, default off) beside the panel opacity. The Settings sheet shows the
  checkbox and, after a tick, one line if access was refused or the device has no sensor to ask.

## Claim boundary (pre-run)

The session has no phone and headless Chromium has no orientation sensor. The mathematics and the wiring are judged
by tests, with synthetic orientation events in a real browser. The permission prompt on iOS, the direction, the
gain and whether the motion feels right in the hand are the owner's observation on the iPhone. Landscape is
handled in the mathematics and not checked on a device.

## Tests (pre-run)

- **Tilt:** no tilt gives no turn; a turn of the phone about each screen axis gives the turn of the look with the
  stated sign and gain; the range holds; the leash answers at once on the way back; the baseline recentres; an
  upright phone (`beta` 90°) gives no jump; events without angles are ignored; landscape swaps the axes.
- **Director:** with no look the poses are unchanged; a look turns the sight and leaves the position; it is zero at
  the start of a hold and during transitions, orbits and the map; it is bounded; a walk that starts from a turned
  camera has no jump.
- **Display:** `tiltLook` loads off, saves, and survives a broken stored value.
- **Settings sheet:** ticking the box asks for permission and reports the choice; a refusal is shown.
- **Wiring:** with the setting on, the level view gets a look source; with it off, none.
- **Real browser:** at a site, synthetic orientation events turn the rendered camera within the range, and the
  camera's position does not move with them.
- All client suites and the build keep passing.
