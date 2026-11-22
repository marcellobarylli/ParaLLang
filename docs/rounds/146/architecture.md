# Round 146 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's reply to round 145's report;
the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is frozen.

- **Design source:** the owner's request; [round 145](../145/architecture.md) (the GitHub save and its health
  check); [round 144](../144/architecture.md) (the endless level, the road's seed, the narrator's scene);
  [round 127](../127/architecture.md) (the ambient music).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/SaveGuide.jsx`; `server/src/road/weather.js`;
  `aesthetic/src/scene/atmosphere.js` and the effects in `aesthetic/src/scene/endless.js`;
  `client/src/scene/weatherClock.js`, `roadView.js`, `client/src/components/Road.jsx`, `client/src/ambience.js`;
  the narrator's scene in `server/src/learning-service.js` and `server/src/llm/prompt-builder.js`; the tests;
  `docs/rounds/146/shots/`.

## Goal

1. The steps to switch the GitHub save on, in the app, beside the save, so they do not depend on a chat.
2. A day and night of 45 minutes, rain 30 % of the time, and weather worth looking at, on The Long Way Home.
3. A deploy.

## Design

### The guide (`SaveGuide.jsx`)

In Settings, under "Your save". Two parts:

- **One line that says where the server keeps its saves now**, read from the server's health check when Settings
  opens (`readSaveStore` in the store; the check needs no token): on its disk only (and that a restart loses them),
  on GitHub (with the time of the last write), on GitHub but failing, or unknown. A wrong setting's reason is shown.
- **"Guide: keep the saves on GitHub"** opens the steps in place: make a fine-grained token with "Contents: Read and
  write" on one repository; enter `PARALLANG_GITHUB_TOKEN` and `PARALLANG_GITHUB_REPO` in Render; check the line
  above or the health check (a link); play one conversation and look for the `saves` branch's commit. Then what the
  file holds, the optional settings, how to rotate the token and how to stop.

### The weather model (`server/src/road/weather.js`)

Pure: `weatherAt(time, seed)`. The server and the client compute it from the same clock and the road's seed, so they
agree without a request, and the weather goes on while nobody plays.

- **The day** turns once in 45 minutes of real time. Phase 0 is sunrise; the sun is up for 56 % of the cycle
  (about 25 minutes) and the moon for the rest (about 20). Each road's hour is shifted by its seed.
- **Rain.** Time is cut into slots of three minutes; a slot is rainy with probability 0.3 by a hash of the slot and
  the seed, so it rains 30 % of the time, in spells of three minutes or a few together. A spell has a strength;
  rain fades in and out over 25 seconds inside its slot; clouds gather 70 seconds before and clear after. Rain of
  strength 0.8 or more is a storm.
- It also gives cloud, wind (stronger in rain), mist (at dawn, and in rain), the part of the day, a label for the
  screen ("Dusk · light rain") and a sentence for the narrator.

### The sky and the light (`aesthetic/src/scene/atmosphere.js`)

`atmosphereFor(weather)` blends a preset's values from six palettes: the clear day and the two twilights are the
package's own presets (`day`, `dawn`, `golden`), and night and two overcast skies are new. Night to day by daylight;
the sunrise's or sunset's colours while the sun is near the horizon; cloud takes the colour out. The sun's direction
follows the day and by night the moon's does, never lower than a little above the horizon, so light never comes from
under the ground. Mist and rain pull the fog in; it never reaches beyond the built chunks. `world.setAtmosphere`
applies such values as `setPreset` applies a named preset. The client sets it four times a second.

### What else the weather does (Claude's choice of "other cool stuff")

- **Rain** as short lines falling round the camera, more of them the harder it rains, slanted by the wind.
  **Snow** in its place above the snow line.
- **Stars** on a clear night, turning with it. The sun's disc is the **moon** by night.
- **Fireflies** over low ground after dark, when it is dry.
- **Lightning** in a storm: one slow flash of the light now and then, at least some seconds apart, with **thunder**.
  With reduced motion there is no flash at all.
- **Wind** in the trees: the crowns' tips sway, more in rain.
- **Sound.** The ambient music gains the sound of rain (filtered noise, as loud as the rain is heavy) and a rumble
  for thunder. Both sit under the music's own level, so they drop while a character speaks and stop while the
  microphone listens, and the "Ambient music" switch turns them off with it.
- **The hub's card** shows the time of day and the weather.
- **The narrator is told**: the scene of a greeting ends with the weather's sentence, and each turn carries it, so a
  character may complain about the rain. Authored encounters are told nothing new, and their pinned prompts are
  unchanged.

The weather is the road's only. Ta Prohm, The Kiln and Micromort Mountain keep the light they were built with.

`client/src/scene/weatherClock.js` lets a weather be held still (`window.__parallangRoad.pinWeather({ phase, rain })`
in the console, `null` to let go): the pictures of the night are taken at any hour.

## Tests

- `server/test/road-weather.test.js`: the cycle, the order of the day's parts, rain within 3 points of 30 % over
  600 cycles for three seeds, no jump from second to second over two hours, the words, and the narrator's prompt.
- `aesthetic/test/atmosphere.test.js`: night dark and day bright, a warm sunrise, a grey overcast; through a whole
  day the light never from below and the fog inside the built ground, with no jump; rain, snow, stars and fireflies
  when they should show; lightning seconds apart and never with reduced motion.
- `client/src/__tests__/ambience.test.js` (rain and thunder), `client/src/components/__tests__/save-guide.test.jsx`,
  the weather line in `road-screen.test.jsx`.
- `client/scripts/road-shots.mjs` holds dusk, night, rain and a storm still, checks what shows and takes the
  pictures, and opens the guide.

## Claim boundary

Seen in software WebGL at two sizes and judged by Claude; not on a phone, and the rain's and thunder's sound was
never heard (the tests check the audio graph, not the sound). No live model has been told the weather. Of the
guide's steps, Render's (Environment, "Add Environment Variable", "Save and deploy") were found in search extracts of
Render's documentation, and GitHub's token is under Developer settings by the same; the exact labels on GitHub's
token form ("Only select repositories", "Contents: Read and write") are as Claude knows them and were not found in an
extract. No page was opened.

## Outcome

See [`findings.md`](findings.md).
