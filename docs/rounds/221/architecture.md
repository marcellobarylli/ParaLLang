# Round 221 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `client/src/components/DialoguePanel.jsx` (`narratedLine`), `client/src/components/DungeonScreen.jsx`
  (the narrator's reading, the follow); `client/scripts/follow-check.mjs` (new); the voice test in
  `camera-wiring.test.jsx`.

## Decisions

1. **The narration frames a conversation.** A line of the character carries its narrator's paragraph, shown and read
   aloud, only when it is the conversation's first line, or its last once the conversation is over (resolved or
   ended otherwise). The lines between show the character's words alone. It holds for every conversation (the road,
   the dungeons, the party). The model still writes a narrative for every line; the client leaves it out (a later
   round could stop asking for it).
2. **The follow lands on the correction.** With "Follow the reply" on (the default), the reply's arrival (after the
   breathing, when it is on) brings the box under the player's answer (the correction, or "Understood" in a light
   turn) to the top of the text, just under the objective's bar, with the reply below it. A turn with no such box
   brings the reply's top, as before. Round 198's rule (the answer at the top when the whole turn fits) is gone.

## Tests

`npm exec --workspace client -- vitest run`; `npm run build -w client`, then
`node client/scripts/follow-check.mjs docs/rounds/221/shots off` and `... on`.

## Amendment 2026-11-28: the default

The owner asked that the follow to the box be the default. It already is: `follow` is on unless the player chose
"Stay where I am" in Settings (`client/src/display.js`), so a new game and a fresh install follow. Settings'
description of "Follow the reply" now says it moves to the box under the answer, with the reply below it.
