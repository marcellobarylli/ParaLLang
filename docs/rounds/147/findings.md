# Round 147 findings

## Question

Can the road have sunsets in orange, purple and red and sunrises to match, clouds, and a map that shows the
landscape in three dimensions from far off?

## Finding

Yes, in the web client. Built and pushed on the session branch; **not deployed**: the owner did not ask for a deploy
of this round.

- **Sunset** is an orange horizon under red and purple, with clouds lit orange from below; **sunrise** is gold under
  pink. The sun goes down to the horizon and grows as it does.
- **Clouds**: a layer of up to 80 that drifts with the wind and takes its colours from the sky.
- **The map** is an isometric picture of at least a kilometre of the landscape, with hills, lakes, trees and height
  lines, and the sites standing on it.

## Method

Tests of the palettes, the clouds, the map's view and its picture; the built client in headless Chromium (software
WebGL) at 390×844 and 1440×900 with the weather held still at golden hour, sunset, afterglow, night, before dawn,
sunrise, a cloudy noon, rain and a storm at night, the camera turned towards the sun for the twilight pictures.

## Results

| What | Result |
|---|---|
| Tests | web client 252 of 252 (247 before the round); aesthetic 87 of 87 (80 before); server 497 of 497 (unchanged). The iPhone app is untouched (320 at round 144's run) |
| Sunset (the sun 0.03 above the horizon) | horizon `#ff6a1c`, above it `#c0356a`, overhead `#2b1a63`; clouds `#7b4690` on top and `#ff7436` underneath; the disc 1.8 times its size |
| Sunrise | horizon `#fdab49`, above it `#dd869a`, overhead `#2f3f87`; clouds pink on top and gold underneath |
| Through a day at one step a second | no colour of the sky or the clouds moves by more than 4 % in a step; the disc never jumps while it is in sight; the light never comes from below 0.16 |
| Clouds | 29 in sight on a clear day (4,860 triangles), 58 under full cover (9,648); the ground and trees are 27,606 |
| The map's picture | 240×197 pixels, every pixel painted, drawn in about 0.1 s in the container; shows at least about 1,050 m across (440 m before) |
| Playthrough | passes at both sizes, 40 pictures |

Pictures in [`shots/`](shots/): [golden hour](shots/11-golden-hour-desktop.jpg),
[sunset](shots/12-sunset-desktop.jpg), [afterglow](shots/13-afterglow-desktop.jpg),
[before dawn](shots/15-before-dawn-desktop.jpg), [sunrise](shots/16-sunrise-desktop.jpg),
[a cloudy noon](shots/17-cloudy-noon-desktop.jpg), [the map](shots/07-map-phone.jpg),
[the map with a site picked](shots/08-map-choice-desktop.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md).

Decisions Claude took:

1. **"The world map" is the road's map**, the one that shows the generated landscape. The card that lists the places
   is unchanged.
2. **A sunrise is not a sunset played backwards**: it has its own, lighter palette (gold and pink where the evening
   has orange, red and purple).
3. **Scattered cloud no longer greys the sky.** Round 146 mixed grey in from the first cloud, which took the colour
   out of most evenings.
4. **Heights on the map are drawn three times taller than true**, and the map says so under the picture.
5. **The map is a drawn picture, not a second 3D scene**: it costs a tenth of a second once, needs no WebGL, and its
   sites stay ordinary buttons.
6. **Clouds stand still with reduced motion.**

Two things were changed after the first pictures: the clouds were too high and too few to be in sight from the
ground (lowered from 150 m to 108 m, 56 to 80, and made solid so hills hide them properly), and the sunset's light
left the ground dark red (the ambient light was made less red).

## Evidence

`aesthetic/test/atmosphere.test.js`, `client/src/__tests__/roadMap.test.js`,
`client/src/components/__tests__/road-screen.test.jsx`, `client/scripts/road-shots.mjs`, [`shots/`](shots/).

## Claim boundary

- Seen only in headless Chromium with software WebGL, at one site, a forest glade: the trees hide much of the sky
  there, and the sun's disc is behind them in the sunset pictures. No open shore or hilltop was looked at.
- Not run on a phone; no frame rate measured. The clouds add up to 58 draw calls and about 9,600 triangles.
- The map's signs can overlap where sites ahead are close together; each can still be reached by the keyboard and
  from the hub's list of ways.
- The map does not hide a way or a sign that lies behind a hill.

## Open items

- **A deploy**, on the owner's word. Every change is in the web client, so it can go out without restarting the
  server (a merge to `main` with `[skip render]`).
- The owner's eye on the colours, on a phone.
