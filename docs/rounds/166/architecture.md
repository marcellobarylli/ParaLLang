# Round 166 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-23 by the owner's message from the phone, after
the deploy of round 165; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit;
nothing here is frozen.

- **Design source:** the owner's message and picture (no GitHub issue); [round 156](../156/architecture.md) (the
  narrator's written passages and the travel caption).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/Narration.jsx`, `client/src/components/Road.jsx`,
  `client/src/components/DungeonScreen.jsx`, `client/scripts/caption-check.mjs`, `docs/rounds/166/shots/`.

## Goal

After a conversation the player walks to the next site and the narrator tells the way taken in a caption. When the
camera arrived, the caption dropped the passage and read only "Erasmus is getting ready to talk…" until the
conversation had loaded. The owner liked the passage and found the bare line dull: the passage should stay to be
read while the conversation loads, with the line put at its end.

## Design

**The passage stays; the game's line is its last sentence.** The travel caption (`RoadCaption`) now shows the
passage from setting off until the conversation opens. What the game is doing is appended to the passage's
paragraph, in the same italic voice: "On the way to The Lesser Hollow…" while the camera walks, then
"Henrietta is getting ready to talk…" once it is there. One paragraph, whose last sentence changes; nothing jumps
when the camera arrives.

`Narration` takes an optional `after`: a sentence of the game's own set at the passage's end in its own span
(`narration-after`), so that the passage's text and the game's line can still be told apart by tests and checks.

**With no passage, the caption is what it was.** A site may have nothing told of it (a pack without passages, a
first load): then the caption is the plain line alone, as before.

**The dungeons' caption does the same.** `DungeonScreen.jsx` had the same shape (the passage while walking, then a
bare "… is getting ready to talk…"); it is changed the same way, so the two places behave alike.

**Not changed:** the passages themselves, when they are told, the button on a place's card ("… is getting ready to
talk…" as a button's label while a conversation the player asked for loads), and the server.

## Tests

`client/src/components/__tests__/narration.test.jsx`: the caption's whole text while walking and while loading, one
paragraph with the game's line in its own span; and the plain line when there is no passage (2 tests, 1 before).
`client/scripts/caption-check.mjs` plays it in headless Chromium at phone size with the second conversation's start
held back until the caption's picture is taken. `narrator-check.mjs` reads the passage without the game's line.

## Claim boundary

- Seen in headless Chromium at phone size on the road. The dungeons' caption is changed by the same three lines and
  its existing tests pass, but it was not played in a browser this round.
- The owner's picture is the first sight of the deployed game on a real phone in these rounds; the change itself
  has not been seen on one.
- How long the caption is read depends on the model's speed, which no session here has measured.

## Outcome

Built and recorded in one sitting. Web client 288 tests, server 567, the aesthetic package's 95, the iPhone app's
320; the client builds; `caption-check.mjs` and `narrator-check.mjs` report 0 problems.
