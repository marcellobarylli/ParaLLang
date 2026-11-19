# Round 136 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Artifact:** `client/src/index.css`, `client/src/components/DungeonScreen.jsx`.

## Design

- **Font.** The root font is Courier New (then Courier, then the system monospace). Buttons, inputs and the text box
  inherit it.
- **Scroll.** After every change the conversation scrolled to its end, so when a reply arrived the correction and
  assessment below it pushed the reply out of view. When the newest message is the character's, the text now stands
  at the top of that reply. While the player's answer is out, and at the start, it behaves as before.

## Claim boundary

Client tests pass; the scroll was not watched in a browser or on a phone.

## Outcome (2026-11-19)

Built as designed.
