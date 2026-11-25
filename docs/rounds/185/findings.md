# Round 185 findings

## Question

Can streamlined mode have the legacy dungeon's gates again, every three conversations, with one encounter for each?

## Finding

Yes. On a road played through the server with the scripted provider, three unit conversations are followed by three
encounters in Ta Prohm, at three different sites (the first at The Face Gate), each titled "The gate, n of 3"; the
fourth unit waits until the third, then every way on offers it and the next gate is three conversations off.

## Method

Pacing tests (when a gate is owed, its encounters, the objectives asked, a poor score still counting) and a road test
through the HTTP API with the scripted provider. A client test of the result line.

## Results

| Check | Result |
|---|---|
| Server tests | 612 of 612 (2 new) |
| Client tests | 329 of 329 (1 new) |
| Client build | passes |
| Played in a browser or on a phone | not done |

## Claim boundary

- Not seen in a browser: whether Ta Prohm's level shows the second and third sites well behind the road's panels was
  not looked at.
- While a gate is owed, every site ahead offers it, so the map shows the dungeon's stepped gate at each of them.

## Open items

- The owner confirms the reading: three units, then three encounters (one per unit), required before the next unit.
- Whether two hints an objective is right for a gate in streamlined mode (the full pacing's gate has none).
