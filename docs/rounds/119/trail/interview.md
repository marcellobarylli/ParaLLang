# Interview: round 119

### Q0 (2026-11-15, about 09:35 UTC): the owner's request
- **Options offered:** none.
- **Answer:** "We can start integrating the gameplay features added into the latest version. World map, party system, leveling etc"

Claude's reading, before any question: "the latest version" is the Ta Prohm dungeon in the web client (rounds 115 to
118), which plays three sites in a fixed order. The world map (round 005) and the party (rounds 021 to 023) exist in
the server and the iPhone app. Leveling is in the design notes ("Leveling Up and World Scaling") and in
`prototype.md` (`progression.js`: XP, level, unlocked areas) and is not built anywhere.

### Q1 (09:44:06): The dungeon (web client) plays three sites in a fixed order. The world map with fog of war exists only in the iPhone app, for the Crumbling Market's seven locations. What should the world map be in the dungeon version?
- **Options offered:** (a) Temple is the map (recommended): the top-down view of Ta Prohm becomes the map, all seven market encounters get a site joined by branching paths, fog hides sites not reached, the player taps the next site and the camera walks there, Errata's site stays sealed until the others are done. (b) Map above the dungeons: a separate world map whose nodes are whole places (Ta Prohm now; Angkor Wat, Micromort Mountain later), with fog; inside Ta Prohm the three sites stay in order. (c) Both layers: the temple becomes a free map of seven sites, and a world map above it holds Ta Prohm plus locked future places; the largest build.
- **Answer:** "Both layers"

### Q2 (09:44:06): Leveling is in your notes ("as you level up, you gain access to places") and is not built anywhere. What should a level do?
- **Options offered:** (a) Levels unlock places (recommended): XP for each objective met, each encounter cleared and each Spellbook review; a level opens sealed sites; Errata's seal becomes a level requirement plus the encounters before it; the top bar shows level and XP. (b) Unlock places and raise difficulty: as (a), and each level also raises how much of the target language the characters speak, so a replay at a higher level is harder (the NG+ note). (c) Shown only: XP and a level are counted and shown and gate nothing yet.
- **Answer:** "Unlock places and raise difficulty"

### Q3 (09:44:06): In the iPhone app a defeated saveable character (Gerald, Mortimer, Flick, Marginalia) can be saved to the party and talked to again anywhere, with deeper conversations after three talks. How should the party come into the dungeon?
- **Options offered:** (a) Port it as built (recommended): SAVE or LEAVE after a saveable character's site, a Party panel in the top bar, Talk from anywhere outside a conversation; the app's server rules, nothing new. (b) Port it, plus a party role: members also do something in other encounters (for example one extra hint).
- **Answer:** "Port it as built (Recommended)"

### Q4 (09:44:06): How should the work be cut into rounds? Each round is designed, built, tested and deployed to the live site on its own.
- **Options offered:** (a) Map, then party, then levels (recommended): round 119 is the map alone, because the party offer and the level gates both attach to its sites; party and leveling follow as rounds 120 and 121. (b) All three in one round. (c) Party first.
- **Answer:** "Map, then party, then levels (Recommended)"

### Q5 (09:54:06): the owner's instruction after reading the summary of draft 1 (no question was asked)
The summary named the seven sites, the pass rule, the fog, the world map, that the critique's findings would be put
to the owner, and that the round ends with a merge to `main`, which deploys and wipes the saves on Render.
- **Options offered:** none.
- **Answer:** "Once you are done, can start replacing the placeholder 3D encounters with real characters. Run autonomously as I will be away, go with most reasonable assumption"

Claude's reading: the owner is away, so Claude decides the critique's findings and every later choice and reports
them. "Done" is the integration the owner asked for first (map, party, levels, rounds 119 to 121); the characters at
the sites follow as their own round. Q4's "each deployed" stands, so each round is merged to `main` after its tests
and playthrough pass.
