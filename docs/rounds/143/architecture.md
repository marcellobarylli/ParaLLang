# Round 143 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).
It corrects [round 135](../135/architecture.md)'s reading of "travel between discovered places".

- **Artifact:** `server/src/dungeon.js` (`moveProblem`), `server/src/learning-service.js`,
  `client/src/components/DungeonScreen.jsx`, the tests.

## Design

A move to any site is allowed from any site when the site is out of the fog (visited, or `known`: joined by a path to
a visited site) and not sealed. A `hidden` site is refused (`NOT_ADJACENT`) until a site next to it is visited. The
rule that a character must let the player pass (`BLOCKED`) is gone: an unexplored site is open before the site the
player stands at is answered. Seals (`requires`, `requires_level`) and the "finish your conversation first" hold
(`leave` drops it) are unchanged. The site card lists every site out of the fog as a way on.

## Claim boundary

Server and client suites only; the camera's long walks to unexplored sites were not watched. The tutorial's gate
no longer forces Portia's conversation before the player walks on; that follows from the owner's rule.

## Outcome (2026-11-20)

Built as designed.
