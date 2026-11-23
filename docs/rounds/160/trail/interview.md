# Interview: round 160

### Q0 (2026-11-22): the owner's message in a cloud session (no question was asked)
- **Options offered:** none.
- **Answer:** "Pls implement all open issues one after the other, the dependencies and favourable order should be
  clear. Finish all issues autonomously, I am going to sleep"

Round 153's interview holds Claude's reading of it. This round is issue #8, whose body is:

> ## Goal
> Add a **biome system** to the fractal world (starting biome: jungle) and integrate legacy dungeons (e.g. Ta Prohm)
> into the world map.
>
> ## Design
> - Legacy dungeons are special levels within the journey.
> - Certain graph nodes have an **adjacent legacy-dungeon node**. When the player is on the neighbouring node, the
>   isometric map shows a prompt such as **"Enter Ta Prohm"**, which loads the dungeon.
> - Tie it to the curriculum: the final unit exam of a curriculum unit is a legacy dungeon. Since the graph knows
>   how many hops remain to finish a unit, the **penultimate unit node is adjacent to the legacy node**. Computed
>   during graph generation.
> - Node identities can follow an algorithm based on the curriculum: deterministic yet procedural.
>
> ## Questions to answer in the PR
> - Is fractal/terrain generation already seed-deterministic? Is graph generation? (Seeded code exists in
>   `server/src/road/graph.js` and `terrain.js`; verify no `Math.random` leaks.)
> - Efficiency: graph gen should be cheap. Dungeons are only loaded on entry and never during overworld play (lazy
>   load).

There is no pull request (the owner did not ask for one); the two questions are answered in `findings.md`.
