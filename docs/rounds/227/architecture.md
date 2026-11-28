# Round 227 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md). It brings
back round 203's game ([architecture](../203/architecture.md)), removed in round 214
([architecture](../214/architecture.md)), as a choice beside the meditation.

- **Artifact:** `client/src/waitGame.js` and `client/src/components/WaitGame.jsx` (restored from the commit before
  round 214's, then changed), `EncounterSheet` and `RoadBreath` in `client/src/components/DungeonScreen.jsx`,
  `SettingsSheet.jsx`, `display.js` (`WAIT_MODES`, `waitModeOf`, `display.waitMode`), `gameStore.js` (`setWaitMode`),
  `index.css`; tests in `client/src/__tests__/waitGame.test.js`, `client/src/components/__tests__/wait-game.test.jsx`
  and `breath-game.test.jsx`; `client/scripts/wait-game-check.mjs`.

## Decisions

1. **A dropdown, "While you wait", in Settings, "Display and controls"**, replaces the checkbox "Breathe while you
   wait". Its choices: Meditation (the default), Space Invaders, and Nothing (the old checkbox's "off", kept so that
   nothing is lost). Each has its own line of explanation under it. The choice is the display preference `waitMode`
   (`'meditation'` or `'invaders'`; anything else reads as Meditation); "Nothing" is `breathing: false`, and the mode is
   kept for when something is chosen again. The store action is `setWaitMode(value)`.
2. **The game is chosen when an answer is sent** (and, on the road, when the walk starts), so changing the setting
   mid-game does not swap it; "Nothing" ends it at once, as the breathing was ended (round 218). It follows the
   breathing's rules: the reply waits under it, is read and followed once it has gone, and a failed request ends it.
   It has no guidebook entry and no first-time card.
3. **Harder: one life, no hearts, 10 % faster.** `WAIT_GAME.lives` is 1: the first invader past the figure loses the
   game, which then waits for the reply (as round 203's lost game did; the field is cleared and "One got through.
   Nothing for it but to wait for <name>." stays). The hearts are gone from the screen; the score of invaders shot
   down stays at the top right. 10 % faster is `FASTER = 1.1` applied to the invaders' speed (62 to 104 px/s, now 68.2
   to 114.4) and to how often they set out (0.85 s to 0.42 s, now 0.77 s to 0.38 s; the first after 0.45 s). The
   figure's fire (0.17 s, 560 px/s) is as it was, since making that faster would make the game easier.
4. **On the road's walk** the same choice is played: Space Invaders over the walk, on a clear field so the walk shows
   through, ending when the conversation there is ready.

## Not done

- No sound, no high score, no way to leave the game early. The Expo app in `mobile/` has neither.

## Tests

`npm exec --workspace client -- vitest run` (404 pass); `npm run build -w client`;
`node client/scripts/wait-game-check.mjs docs/rounds/227/shots` (Chromium, scripted grader, the reply held back).
