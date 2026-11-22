# Round 146 findings

## Question

Can the steps of the GitHub save be in the app, beside the save? And can the road have a day and night of 45 minutes,
rain 30 % of the time, and weather worth looking at?

## Finding

Yes to both, in the web client, deployed with this round.

- **The guide** is in Settings under "Your save": a line that says where the server keeps its saves now, and a
  button that opens the four steps in place.
- **The weather** follows the clock: a day of 45 minutes, rain 29.6 % of the time over 400 days of one seed (within
  3 points of 30 % for each of three seeds over 600), with a blended sky, rain, snow, stars, fireflies, lightning,
  wind, the sound of rain, and a narrator who knows what the sky is doing.

## Method

Tests of the model, the atmosphere, the effects, the audio graph, the guide and the store; the built client in
headless Chromium (software WebGL) at 390×844 and 1440×900 with the weather held still at dusk, at night, in rain and
in a storm at night, and with the guide opened.

## Results

| What | Result |
|---|---|
| Tests | server 497 of 497 (493 before the round); web client 247 of 247 (241 before); aesthetic 80 of 80 (73 before). The iPhone app is untouched (320 at round 144's run) |
| The day | 45 minutes; the sun up for 56 % of it; dawn, morning, midday, afternoon, dusk, night in order; each road at its own hour |
| Rain | 30 % of the time in spells of three minutes, fading in and out over 25 seconds; a storm for about 7 % of the time; no jump from one second to the next over two hours |
| The light | never from below the ground; the fog never beyond the built chunks; no jump through a whole day at one step a second |
| Lightning | between 6 and 26 flashes in two minutes of storm, never two within three seconds, the sky lit for under 6 % of the time; none with reduced motion |
| The narrator | the greeting's scene ends "... in The Long Way Home. It is dusk and a light rain is falling." and each turn carries the same; the market's prompts are unchanged |
| The guide | shows "on its own disk only" against a server without the settings, the reason when they are wrong, and the time of the last write when they are right |
| Playthrough | passes at both sizes, 30 pictures |

Pictures in [`shots/`](shots/): [dusk](shots/11-dusk-desktop.jpg), [night](shots/12-night-desktop.jpg),
[rain](shots/13-rain-desktop.jpg), [a storm at night](shots/14-storm-at-night-phone.jpg),
[the guide](shots/15-save-guide-phone.jpg), and the road's other pictures again under a held morning sky.

## Decision

Built as designed in [`architecture.md`](architecture.md) and deployed by a merge to `main` on the owner's word
("re-deploy"). What the deploy's runs did is in the status report.

Decisions Claude took:

1. **The weather is the road's only.** Ta Prohm, The Kiln and Micromort Mountain keep the light they were built
   with (The Kiln's is its whole point).
2. **Real time.** The day turns by the wall clock and goes on while nobody plays; each road is at its own hour.
3. **"Other cool stuff":** snow on high ground, stars and a moon, fireflies, lightning and thunder, wind in the
   trees, the sound of rain, the weather on the hub's card, and the narrator told the weather.
4. **Lightning is gentle and optional**: one slow flash, seconds apart, and none with reduced motion.
5. **Rain and thunder belong to the "Ambient music" switch.**
6. **The guide reads the server's health check**, so it says what is true now, not only what to do.

## Evidence

`server/test/road-weather.test.js`, `aesthetic/test/atmosphere.test.js`, `client/src/__tests__/ambience.test.js`,
`client/src/components/__tests__/save-guide.test.jsx`, `client/src/components/__tests__/road-screen.test.jsx`,
`client/scripts/road-shots.mjs`.

## Claim boundary

- Seen in software WebGL at two sizes, judged by Claude. Not on a phone; the frame rate with rain is unknown.
- The sound of rain and thunder was never heard: the tests check the audio graph.
- No live model has been told the weather.
- The guide's GitHub labels are as Claude knows them; Render's were found in search extracts of its documentation.
- The GitHub save itself is still not run against GitHub (round 145).

## Open items

- The owner: follow the guide once (Settings → "Guide: keep the saves on GitHub"), and say how the night and the
  rain look and sound on the phone.
- Not built: puddles or wet ground, a rainbow, weather in the other places, weather that changes what a
  conversation asks for.
