# Round 138 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Artifact:** `client/src/components/DungeonScreen.jsx` (`EncounterSheet`).

## Design

The sheet's text no longer scrolls by itself after a turn (it went to the end before round 136 and to the start of the
reply in round 136). It is set once when a conversation opens or is resumed (the top for a new one, the end for one
resumed part-way) and is otherwise left to the player. The correction card's own scrolling into view of its box and
verdict (round 137) answers the player's typing and stays.

## Claim boundary

Client tests pass; not watched on the iPhone.

## Outcome (2026-11-19)

Built as designed. Round 136's scroll to the reply is gone.
