# Round 203 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/waitGame.js` (the rules), `client/src/components/WaitGame.jsx` (the canvas and the
  thumb), `EncounterSheet` in `client/src/components/DungeonScreen.jsx`, `display.js`, `SettingsSheet.jsx`,
  `index.css`; tests in `client/src/__tests__/waitGame.test.js` and
  `client/src/components/__tests__/wait-game.test.jsx`; `client/scripts/wait-game-check.mjs`.

## Decisions

1. **Experimental, and off unless switched on.** Settings, "Display and controls": "A game while you wait
   (experimental)". It is the display preference `waitGame`, kept in this browser; a display saved before this round
   reads as off. With it off nothing changes.
   Its note ends, tongue in cheek, with a line for the TikTok kids (the owner's follow-up).
2. **When an answer is sent, the game covers the conversation panel.** The whole panel (the grip, the header, the
   text and the reply box) goes opaque over 0.42 s, whatever the panel's opacity setting, in the dungeons, on the
   road and with the party (one `EncounterSheet`).
3. **The game.** A figure follows the thumb left and right (a drag anywhere on the panel; the mouse, and the arrow
   keys, on a desktop) and fires a pellet every 0.17 s. Invaders set out from the top one after another, the first
   after 0.5 s, then every 0.85 s, quickening to every 0.42 s. A pellet takes an invader. An invader that reaches the
   figure's line costs one of three lives. The figure stands 76 px above the panel's bottom so the thumb can rest
   under it.
4. **When the reply is ready, no new invader sets out.** The ones already out still come down. When the field is
   empty the game fades over 0.42 s and the panel is back at the player's opacity, with the reply.
5. **Lost.** With no lives left the field is cleared and the game says so; it stays until the reply is ready, then
   fades the same way.
6. **The reply waits for the game.** It arrives in the store as always, under the game. It is read aloud (voices,
   narrator) and brought to the top of the panel ("Follow the reply") only when the game has gone. A request that
   fails ends the game the same way and shows its error.
7. **The rules are apart from the drawing.** `stepGame(game, { dt, shipX, ready, random })` has no canvas, clock or
   randomness of its own, and is tested in Node.

## Not done

- No sound, no high score, no way to leave the game early. A reply that is ready while invaders are out is held
  until they are shot or get past: about 6 s at most on a phone's panel.
- The Expo app in `mobile/` does not have it.

## Tests

Root `npm test`; `npm run build -w client`; `node client/scripts/wait-game-check.mjs` (Chromium, scripted grader, the
reply held back).

## Status

Built and tested, and played in headless Chromium with synthetic touches; not tried on a phone. Merged to `main` and
pushed on the owner's word.
