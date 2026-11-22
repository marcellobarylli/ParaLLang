# Round 147 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's message while round 146 was
deploying; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is
frozen.

- **Design source:** the owner's request; [round 146](../146/architecture.md) (the day, the weather and the blended
  sky); [round 144](../144/architecture.md) (the endless landscape, its graph of sites and the road's map).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `aesthetic/src/scene/atmosphere.js` (the sky's palettes), `aesthetic/src/scene/sky.js` (the sun's
  disc and the sky's bands), the cloud layer in `aesthetic/src/scene/endless.js`; `client/src/roadMap.js` (the map's
  view and its picture) and `RoadMap` in `client/src/components/Road.jsx`; the tests; `docs/rounds/147/shots/`.

## Goal

1. Sunsets in orange, purple and red, and sunrises to match.
2. Clouds.
3. The road's map as an isometric view from far off, in which the landscape's relief shows.

All three are in the web client alone. The server, the content and the iPhone app are not touched.

## Design

### Sunrise and sunset (`atmosphere.js`)

Round 146 laid the package's `dawn` and `golden` presets thinly over the day's sky. Now the clear sky is one of a row
of palettes, chosen by the sun's height (1 at noon, 0 on the horizon, negative under it) and blended between
neighbours:

| The sun's height | Evening | Morning |
|---|---|---|
| 0.5 and above | the day | the day |
| 0.24 | golden hour: gold horizon, warm white clouds | golden morning: pale gold |
| 0.03 | **sunset**: orange horizon (`#ff6a1c`), red above it (`#c0356a`), purple overhead (`#2b1a63`); clouds purple on top and orange underneath | **sunrise**: gold horizon (`#ffae45`), pink above it (`#e58a9c`), blue-violet overhead (`#31428c`); clouds pink on top and gold underneath |
| -0.17 | afterglow: a red band under deep violet | before dawn: a rose band under violet |
| -0.42 and below | the night | the night |

- **Cloud does not take the colour out any more.** Cover below 0.35 leaves the sky its palette; above it the sky
  greys towards overcast, as before. A sunset under a sky full of rain is still grey.
- **The sun goes down.** The disc is drawn where the sun is (`sunDisc`), down to the horizon and a little under it,
  while the light (`sunDir`) still comes from no lower than 0.16, as round 146 required. Under the horizon the disc
  becomes the moon, which rises from the same depth, so the disc never jumps in sight. A low sun is drawn up to 1.9
  times as large (`sunScale`), the moon at 0.7.
- **The colours come down the sky at twilight** (`skyBands`): the horizon's colour gives way to the next at 13 % of
  the way up instead of 25 %, and the zenith's is reached at 42 % instead of 75 %, so the purple over a sunset is in
  sight from the ground, where the camera looks level.
- The sky's dome (`sky.js`) takes the three optional values (`sunDisc`, `sunScale` and `haloScale`, `skyBands`);
  a named preset without them looks as it did.

### Clouds (`createWeatherEffects` in `endless.js`)

The level's sky had nine small clouds on a far ring. Now there is a layer of up to 80:

- **Shape.** Six shapes, each three to five twelve-faced balls with a flat base, shared by all the clouds: 108 to 180
  triangles a cloud, about 4,900 in sight on a clear day and 9,600 under full cover (the ground and trees are about
  27,600).
- **Place.** Each cloud has its place in the world and is wrapped into a circle of 640 m round the camera. The layer
  is 108 m over the camera overhead and 72 m lower at the rim, so far clouds stand low over the horizon. A cloud
  grows from nothing at the rim and when the cover asks for it: none ever appears at once.
- **Number.** 40 % of them on a clear day, all of them under full cover.
- **Motion.** They drift with the wind, 2.5 m/s in a calm and 16 m/s in a storm; they stand still with reduced
  motion.
- **Colour.** When the light is set (four times a second, and only if it changed), each face is coloured by where it
  points: up, the palette's `cloud`; down, its `cloudUnder`; towards the sun, warmed by the sun's colour. This is what
  makes the sunset: purple clouds with orange undersides.
- They are ordinary solid objects: a hill in front hides them, and a peak may stand up into them.

### The map (`client/src/roadMap.js`, `RoadMap`)

The map was the landscape from straight above. Now it is an isometric picture from far off:

- **The view** (`createMapView`). The two ground axes run down the picture to the right and to the left at 30° and
  height goes straight up. Heights are drawn three times taller than true, as a relief map does: from a kilometre
  off, a hill of 30 m is otherwise a few pixels. The frame holds the last 12 sites of the trail and every site ahead,
  each at its height, with room for its sign, and shows at least about 1,050 m across (it showed 440 m before).
- **The picture** (`renderMap`), 240 pixels across, drawn small and shown large as the rest of the game is. Every
  column is walked from the front of the land to the back, and each point of ground paints the pixels it stands
  above that nothing nearer has painted, so near hills hide what is behind them. Colour is by what grows there and
  how high it is; light comes from the left; a height line every 10 m; trees as two pixels each; water darker where
  it is deeper; a little haze over the far ground. About 0.1 s to draw in the session's container.
- **The overlay** uses the same view: the ways lie on the ground (every point at its own height), visited sites are
  tiles lying flat, the player's site has a white post, and each site ahead is a sign on a stem with its letter. The
  signs keep their names, their roles and their order, so the keyboard, a screen reader and the tests find them as
  before. Each sign has a tap area larger than itself.

## Tests

- `aesthetic/test/atmosphere.test.js`: the sunset's and the sunrise's colours; the disc on the horizon while the
  light stays above; no colour and no visible disc jumps at one step a second through a day; scattered cloud leaves
  the colours; clouds by cover, in reach, carried by the wind, coming along with the camera, still with reduced
  motion, orange underneath and purple on top at sunset, white at noon.
- `client/src/__tests__/roadMap.test.js`: the view is isometric; heights by the relief; the frame holds every site
  for four seeds; every pixel painted; the same picture twice; a block on a plain stands up, hides the ground behind
  it and lets the far ground show over its top.
- `client/src/components/__tests__/road-screen.test.jsx` picks a site on the map and walks to it, as before.
- `client/scripts/road-shots.mjs` plays the road at 390×844 and 1440×900 and takes the pictures, now with golden
  hour, sunset, afterglow, before dawn, sunrise and a cloudy noon.

## Claim boundary

Pictures were taken in headless Chromium with software WebGL, at one site (a forest glade, where the trees hide much
of the sky). Not seen on a phone, and no frame rate was measured. Whether the colours are beautiful is the owner's
to say.

## Outcome

See [`findings.md`](findings.md).
