# Round 125 findings

## Question
The owner asked for a gyro feature: the encounter camera should respond to the phone's orientation. Does it?

## Finding
Yes in tests and in a headless browser fed synthetic orientation events. It has not run on a phone. With "Tilt to
look" ticked in Settings, tilting the phone turns the camera's look at a site. The direction, the strength and the
iOS permission prompt are the owner's to check on the iPhone.

## Method
The encounter camera is the web dungeon's director (round 116), so the feature reads the browser's
`deviceorientation` events. A new pure module, `client/src/scene/tilt.js`, turns an orientation into a look. The
director applies the look to a hold at a site. The setting is stored with the display preferences. Tests ran in the
cloud session's container. `client/scripts/tilt-check.mjs` loads the built client in headless Chromium (Playwright,
software WebGL), puts the camera at Gerald's site and sends orientation events.

## Results
- **What the player gets.** A checkbox "Tilt to look" in Settings, off by default
  ([picture](shots/05-settings.jpg)). At a site's card and in its conversation, turning the phone to the left looks
  left and tilting its top away looks up ([straight](shots/01-straight.jpg), [left](shots/02-left.jpg),
  [up](shots/03-up.jpg), [right](shots/04-right.jpg)). The orbits, the maps and the walks ignore the phone.
- **Numbers.** The look turns 0.6° per degree of tilt, up to 12° to either side and 8° up or down. Past that the
  baseline is dragged along, so tilting back answers at once. The baseline also follows the phone slowly (30 s), and
  each new camera state takes the phone's present orientation as straight ahead.
- **The camera stays put.** Only the line of sight turns. In the browser the camera moved 0.20 m in 3.9 s of
  tilting, which is the hold's own drift.
- **Browser check.** 13 checks, 0 problems: 15° of tilt gave a look of 8.65° to the left after 1.2 s (9° less the
  recentre), and the rendered camera had turned 9.4°; 70° stopped inside 12°; switching the setting off brought the
  look back.
- **Permission.** iOS Safari sends orientation events only after the page has asked from inside a tap, over HTTPS
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static),
  [WebKit](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)). Ticking the box asks. On a later visit
  with the setting on, the first tap anywhere asks. A refusal is said under the box.
- **Tests.** Client 149 passing (120 before): the tilt 15, the director 8, display 1, the Settings sheet 3, the
  wiring 2. Aesthetic 43 passing. The build succeeds.

## Decision
Kept on the branch. The setting, the direction, the gain and the range are Claude's; the owner asked only for the
camera to respond to the phone's orientation.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- Pictures: [`shots/`](shots/), from `client/scripts/tilt-check.mjs`.
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
No phone was used, and headless Chromium has no motion sensor. Not known: whether iOS shows its prompt when the box
is ticked on the page installed to the home screen, whether iOS asks again on each visit, how the motion feels in
the hand, and landscape. The server and mobile suites and the full playthrough (`dungeon-shots.mjs`, which needs
`puppeteer-core`) were not run; no file of theirs changed. No Codex critique was made.

## Open items
- **Owner:** merge the branch to `main` to deploy it, then tick "Tilt to look" in Settings on the iPhone and play a
  conversation.
- **Owner:** if a direction feels backwards, flip `TILT.yawSign` or `TILT.pitchSign` in `client/src/scene/tilt.js`.
  The strength is `TILT.gain`, the range `TILT.maxYaw` and `TILT.maxPitch`.
- If iOS refuses, the box stays ticked and shows the refusal; a way to ask again is not built.
