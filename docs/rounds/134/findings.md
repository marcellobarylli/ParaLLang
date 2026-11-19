# Round 134 findings

## Question
Is the walk twice as fast, and can the player walk between any two places they have discovered?

## Finding
Yes by tests: `WALK_SPEED` is 5.6; the server allows a move to any visited site, and the camera walks the joined paths
(`director.test.js`, `dungeon-rules.test.js`, `dungeon-screen.test.jsx`). Not watched in a browser, not on a phone.

## Claim boundary
A walk across the whole temple (library to the gate) runs through the sites between; whether it feels right, and
whether the figures at those sites look right as the camera passes, is for the owner to see.

## Open items
- "Discovered" is "visited". A known neighbour not yet visited is still reached only from its neighbour.
