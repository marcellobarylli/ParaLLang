# Round 212 findings

## Question

Where does the game follow the system's "Reduce motion", and does that explain the leaves not moving in the wind?

## Finding

The web client read the setting in `RoadView.jsx` and `DungeonView.jsx` and passed it to the 3D views, and three CSS
rules in `index.css` read it. With it on, the camera cut instead of walking, the characters neither bobbed nor hopped,
a completed character did not sink (round 211), there was no lightning, the clouds did not drift, and the title and
the big buttons did not animate.

The leaves' sway never read it. On the road it follows the wind; in the legacy dungeons it is held at nothing unless
"Glitch" is on in Settings (round 205: there the sway tore the canopy into shards). So the still leaves in a dungeon
are round 205's choice, not this setting.

## Results

| Check | Result |
|---|---|
| `sink-check.mjs --reduced` (Chromium with Reduce motion on) | the browser asks for reduced motion; the character still sinks over 23 readings and the walk follows: 6 checks pass |
| Client tests, build | 351 pass; passes |
| On a phone | not checked |

## Claim boundary

- The Expo app in `mobile/` still follows the setting for its fade-ins (`mobile/src/motion.js`); it is not the game
  played now and was left alone.
- The lightning now shows with the setting on; it is a slow single flash, not a strobe (round 146).
