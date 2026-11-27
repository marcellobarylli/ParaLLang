# Round 204 findings

## Question

Why do the legacy dungeons not show the time of day and the weather, and can they take the road's?

## Finding

They never had them. A dungeon's level was built with one fixed preset (jungle for Ta Prohm, ember for The Kiln)
and nothing changed it; the road's weather effects were made only in the road's view. The sound was the other way
round from what the owner thought: the rain's sound was asked for only in road mode, so a dungeon was dry to the ear
as well. Both worlds are built from the same kit, with the same uniforms and the same `setAtmosphere`, so the
road's engine fits a level with a small stand-in for the ground (its height function and a water level).

## Results

`dungeon-sky-check.mjs`, each level with a weather held still:

| Level | Night | Storm | Kept |
|---|---|---|---|
| Ta Prohm | sunlight 0.85 against 1.95 by day (the three channels summed); stars 0.78 | rain 1, two flashes, fog's far edge 141 m against 175 m | glow |
| The Kiln | the same light; stars 0.78 | rain 1, fog 105 m against 130 m | ember glow, corruption 1 |
| Micromort Mountain | the same light; stars 0.78 | snow 1 (the site is above the snow line), fog 419 m against 440 m | glow |

| Check | Result |
|---|---|
| The script's 19 checks | pass |
| Without a seed | no weather, the fixed preset |
| Client tests, aesthetic tests, build | 342, 95, passes |
| On a phone | not checked |

Pictures: [Ta Prohm at night](shots/dungeon-night.jpg), [in rain by day](shots/dungeon-rain-by-day.jpg),
[The Kiln at dusk](shots/kiln-dusk.jpg); the rest are in [`shots/`](shots/).

## Claim boundary

- Seen in Chromium with software rendering at 390 by 844; the cost of the effects on a phone was not measured (the
  road already runs them).
- The Kiln is no longer always in its ember light: by day it is lit as the road is, with its ember glow and lava
  kept. Whether it should stay dark at every hour is the owner's call.
- The narrator of a dungeon's own conversation is not told the weather (a road conversation is); only the picture
  and the sound follow it.
- The rain's sound in a dungeon was not listened to; the same call is made as on the road.
