# Round 135 architecture

**Conversational round, recorded with the build** (see [round 134](../134/architecture.md) for why there is no pre-run
commit). The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Design source:** round 119's [architecture](../119/architecture.md) (the pass rule, the camera's walk).
- **Artifact:** `server/src/dungeon.js`, `client/src/scene/director.js`, `client/src/components/DungeonScreen.jsx`, the tests.

## Design

- **Speed.** `WALK_SPEED` 2.8 to 5.6 m/s; the ramps and the turn at the start of a walk keep their times.
- **Travel.** The pass rule's adjacency becomes "a neighbour, or a visited site": a move from a site to any site the
  player has been to is allowed (still refused if the target is sealed). The server's `reachable` follows, so the map
  card's "Walk here" buttons do too. The site card's ways on list the neighbours and every other visited site.
- **The camera** walks the route between two sites that no path joins: `routePoints` takes the fewest paths, end to
  end, and the walk follows it through the sites between.

## Claim boundary

Tests and the headless build only; the longer walks were not watched.

## Outcome (2026-11-19)

Built as designed. The director's per-frame turn limit in one test went from 0.08 to 0.12 rad for the faster walk.
