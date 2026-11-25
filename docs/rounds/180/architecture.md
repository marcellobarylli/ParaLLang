# Round 180 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-25 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; the Hub note in [`parallang.md`](../../../parallang.md) (the players are
  greeted by the game's philosophy: immersion, learning as a child learns its first language); the lore of a written
  world whose seams are pulled by translation (the strings).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/Road.jsx` (`WelcomeCard`), `client/src/components/DungeonScreen.jsx`,
  `client/src/stores/roadSlice.js` (`roadWelcomed`, `dismissWelcome`, `WELCOME_KEY`), `client/src/slots.js`,
  `client/src/index.css`; `client/scripts/welcome-check.mjs`.

## Decisions

1. **When.** After the title's button the camera zooms down as before; once it is down, the opening message is the
   first thing on the screen. The arrival's card (place, narrator's passage, guidebook note, the character) waits
   until the message is closed.
2. **How.** A pop-up in the middle of the screen over a light backdrop, so the landscape and the first character stay
   in view behind it. One button, **Set out**.
3. **What it says.** Three short paragraphs: the belief (a language is learned best by living in it), the game (learn
   this world and its language by talking to the people who live in it), and a teaser (the words here have begun to
   mean more than they should; something pulls at the seams, from the player's side). The teaser hints at the
   strings and the collision without naming them. The heading, on the owner's word after the first deploy, is "In
   the beginning was the Word" (John 1:1, "Am Anfang war das Wort"); it was "A word first".
4. **How often.** Once per save slot: closing it stores `parallang.welcomed`, a per-slot key, so a new game or a
   started-over slot greets the player again. A player with a save from before this round sees it once.
5. **The browser checks.** `scripts/lib/play.mjs` marks the message read unless a check asks for it
   (`welcomed: false`), so the earlier checks still go straight to the arrival's card.

## Tests

`npx vitest run` in `client/` (311; 1 new: the message after the zoom down, the arrival's card behind it, not again in
the same slot); `npx vite build`; `node client/scripts/welcome-check.mjs` in headless Chromium at 390 × 844
([shot](shots/01-welcome.jpg), [after Set out](shots/02-after.jpg)).

## Status

Built, tested, seen in headless Chromium; merged to `main` and pushed on the owner's word ("once done push and
deploy").
