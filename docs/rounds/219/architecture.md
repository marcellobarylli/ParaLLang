# Round 219 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md)); events
in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `aesthetic/src/ps1/shaders.js` (`uGrade`), `aesthetic/src/ps1/pipeline.js` (`grade`, `setGrade`),
  `aesthetic/src/scene/atmosphere.js` (`DAY`), `client/src/scene/roadView.js` (`GRADE`), `server/src/road/weather.js`
  (`WEATHER.linger`).

## Decisions

1. **A soft grade in the post pass.** The PS1 post shader takes `uGrade` (softness, greens, warmth; 0 to 1 each)
   before its quantisation and dither. A colour whose green leads its red and blue is drawn toward its grey, as far as
   green leads, and nudged toward red: a sage rather than a neon. Every colour then loses 14 % of its saturation, the
   blacks are lifted by 0.035 and the whites eased by 9 %. Warmth multiplies the image by (1.05, 1, 0.9). One place
   grades all of it: the grass texture, the biome tints, the simple trees and the model trees.
2. **On the road only.** The Journey 2 is graded `{ soft: 1, green: 0.45, warm: 0.7 }`; the warmth follows the
   daylight (none at night) and thins under heavy cloud. The dungeon levels, the iPhone app and every other user of
   `createPS1Pipeline` keep the default 0 0 0 and look as before.
3. **A warm, soft day.** The day palette of the road keeps the blue's hue but paler and less saturated (zenith
   `#5582bd`, was `#3a70b8`), its horizon and fog a warm cream (`#ece2cf`, `#ddd5c2`, were cool greys), and warmer
   sunlight and light from the ground. `PRESETS.day` itself is unchanged (the dungeons use it).
4. **Longer sunrises and sunsets.** The sun's height is its sine raised to the power 1.7 (`WEATHER.linger`): the sun
   is as high at noon and as low at midnight, but lingers near the horizon. With the sky's stops unchanged, the time
   from the golden hour to the afterglow (height 0.24 to -0.17) goes from about 3 minutes to about 6 of the 45-minute
   day, for the sunrise and for the sunset. The parts of the day (dawn, dusk...) are read from the phase and do not
   move; the narrator's sentence is unchanged.

## Tests

`npm test -w server`, `npm exec --workspace client -- vitest run`, `npm test -w aesthetic`;
`npm run build -w client && node client/scripts/road-shots.mjs <outDir>` for the pictures.
