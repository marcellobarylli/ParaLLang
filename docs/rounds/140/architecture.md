# Round 140 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Artifact:** `client/src/components/DungeonScreen.jsx` (`EncounterSheet`).

## Design

Round 138 removed every scroll the code made itself, and the owner still saw a jump when a reply arrived. Whatever
moves the text then (the browser keeping something in view, a change of height above the view, which iOS Safari does
not anchor) is now undone: the sheet remembers the position while the player scrolls (touch, wheel, key, pointer, and
1.8 s of momentum after) and puts it back after any other scroll and after every render. Opening a conversation sets it
once (the top for a new one, the end for one resumed).

## Claim boundary

The jump was not reproduced here: there is no run of a reply in a real browser in this session. Client tests pass and
the build succeeds. If the jump is the old build in the installed page, "Reload the page" in Settings is the fix.

## Outcome (2026-11-20)

Built as designed.
