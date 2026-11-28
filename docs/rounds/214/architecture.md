# Round 214 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen. No Codex critique was run: the design is the owner's, and the owner asked for it to
be built, merged and deployed.

- **Design source:** the owner's message. It replaces round 203's game
  ([architecture](../203/architecture.md)).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/breath.js` (the rules), `client/src/components/BreathGame.jsx` (the canvas, the hold, and
  `BreathIntro`), `EncounterSheet` in `client/src/components/DungeonScreen.jsx`, `display.js`, `gameStore.js`,
  `SettingsSheet.jsx`, `index.css`, `api/encounter.js`; on the server `narration.js` (`CLIENT_EVENTS`),
  `learning-service.js` (`guidebookNote`, `enterGuidebook`), `app.js`; `content/narration/guidebook.yaml`. Tests in
  `client/src/__tests__/breath.test.js`, `client/src/components/__tests__/breath-game.test.jsx` and
  `server/test/guidebook.test.js`; `client/scripts/breath-play.mjs`.
- **Removed:** `client/src/waitGame.js`, `client/src/components/WaitGame.jsx`, their two test files,
  `client/scripts/wait-game-check.mjs`, the `.wait-game` styles, the `waitGame` display preference and its setter.

## Decisions

1. **A breath is 4 s in and 6 s out**: six breaths a minute, the breath out the longer. Why, and how far the evidence
   goes, is in the findings. The numbers are `BREATH` in `breath.js`.
2. **The breath is a pacer.** It starts on a breath in the moment an answer is sent and keeps its own time whatever
   the player does. A breath left alone is still a breath; nothing is counted, lost or shown as a score.
3. **The turns are timed, as a deflect is.** The player holds the panel (anywhere on it; the space bar on a desktop)
   for the breath in, lets go where it turns, and presses again where the breath out ends. Each turn has a window of
   0.6 s either side and a best moment of 0.2 s either side in its middle. A turn kept in time sends a slow ring out
   from the breath (brighter at the best moment) and warms the light a little; a turn missed does nothing. A turn is
   judged once. The press that opens the first breath is not judged (the thumb has just left Send), nor is a press at
   the end of the last breath out.
4. **What is drawn.** A light in the middle swells with the breath in and sinks with the breath out, eased so that it
   slows into each turn, and is brighter while the panel is held. Round it is a thin ring; a small light goes once
   round it for each breath, clockwise from the top (the breath in; the light itself sets off 45 degrees before it; amended 2026-11-28). Two
   stretches of the ring glow: one 40 % of the way round, where the breath turns (let go), and one at the start, where
   the next begins (press). Each stretch is the window of
   tolerance, fading at both ends, with a brighter point in its middle for the best moment. Gold and the ink colour
   of the game; every light is a gradient to nothing, so nothing has an edge. **No text.**
5. **The panel is not covered: it thins.** `.sheet.breathing` fades the panel's own text and controls to nothing and
   its background to 32 % of the player's opacity setting, so the place behind shows through; the breath is drawn
   over it. The panel's background moved to `.sheet::before` so that it alone can fade. Both come back over 0.7 s
   when the breathing ends.
6. **At least three whole breaths, and it ends on a breath out.** After the third, the breath in which the reply
   becomes ready is the last; before that the reply waits. So a wait is at least 30 s and a reply is held at most
   10 s beyond that. As the last breath goes out the ring and its stretches fade, so that no press is asked for.
7. **The reply waits for the breathing**, as it did for round 203's game: it is in the store under the breathing and
   is shown, read aloud and followed only when the breathing has gone. A request that fails ends the breathing the
   same way, and its message waits too (`breathingNow` in the store; nothing is written over the breathing).
8. **On unless switched off.** Settings, "Display and controls": "Breathe while you wait" (`display.breathing`). The
   old `waitGame` preference is no longer read, so a browser that had the shooting game off gets the breathing.
9. **The first time, a few words first.** The guidebook has a seventh entry, "A breath while you wait" (event
   `breath_wait`). The page tells it itself, as a card over the panel with **Begin**, the first time an answer is
   sent in a game, then starts the breathing. Because that moment happens on the page and the server cannot see it,
   every view's guidebook note carries such entries ahead of time (`ahead`), and the page asks for the entry to be
   entered (`POST /api/guidebook/enter { event }`, only for `CLIENT_EVENTS`), as read. With the setting off it is
   neither told nor entered. A server before this round sends no `ahead`: the breathing then starts without the card.
10. **The rules are apart from the drawing**, as in round 203: `stepBreath(game, { dt, ready, held })` has no canvas
    or clock and is tested in Node.

## Not done

- The Expo app in `mobile/` does not have it.
- No sound, and no way to leave the breathing early other than the setting.
- No Chromium check script replaces `wait-game-check.mjs`: Playwright is not on this machine. `breath-play.mjs`
  starts the server the check used (real code, scripted grader, replies held back) for playing by hand.

## Tests

`npm exec --workspace client -- vitest run`; `npm test -w server`; `npm run build -w client`;
`node client/scripts/breath-play.mjs 8` and the page pointed at it.

## Status

Built and tested; played in the desktop app's browser pane at a phone's size with scripted holds, not on a phone. It was
built as round 213 and renumbered 214 when another session's round 213 (the pulls) reached `main` first; that round
is merged in. The other local session was asked before the first edit and again before the merge, and held no work.
Merged to `main` and pushed on the owner's word ("check in with them before merging, then deploy"): the push deploys
the page (GitHub Pages) and the server (Render).

## Amendment (2026-11-28): the entry's wording is the owner's

The text of "A breath while you wait" (the card before the first breathing, and the guidebook entry: one text) is
now the owner's: it opens "The world is fast. Sometimes it is good to be slow.", adds "Feel your belly expand." and
"Let it go.", and no longer ends with the sentence about three breaths and nothing being counted. The rule itself
(decision 6) is unchanged; the card simply does not say it. `server/test/guidebook.test.js` holds the text word for
word. The wording reached this session through another session and was applied only on the owner's own yes
([`trail/interview.md`](trail/interview.md)). Pushed to `main`, which deploys the page and the server.

## Amendment (2026-11-28): where the light starts

Corrected the same day. An earlier amendment moved the points themselves (the "in" stretch to the upper left); that was
a misreading. The points stay where the breathing guideline puts them: "in" at the top, "out" 144 degrees on (40 % of
the way round, the 4 s in and 6 s out), each with a faint lowercase label just outside the ring. What the owner asked
for is a lead-in: the light sets off **45 degrees before the "in"** (1.25 s, `BREATH.lead` in `breath.js`), so the
player has a moment to prepare; no turn is judged during it. `BREATH_START` in `BreathGame.jsx` is the top again.
