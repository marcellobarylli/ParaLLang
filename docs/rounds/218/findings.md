# Round 218 findings

## Question

Why did the A1 to A2 gate show nothing on the owner's phone, can the gate stand in Angkor Wat and be played through
to the world event, and is the event silent? What else did rounds 214 to 217 break?

## Finding

- **The blank gate was the level failing to start**, not the game: in headless Chromium the gate played normally with
  the breathing on (Ta Prohm, all three conversations), and the owner's "faint green" is the level's backdrop. Blocking
  the level's chunk reproduces it exactly; the likeliest cause is a page open over a deploy. The level's code is now
  fetched early, retried, and, if it cannot be had, the player is told to reload.
- **The gate that ends a level is in Angkor Wat** and plays through: the last unit of A1, "Enter Angkor Wat", the
  breathing over each walk, the three conversations at the causeway, the pool and the terrace with the temple drawn,
  then the pull and the way on.
- **The world event is silent**: the speaker is stopped and nothing is said under it or after it (tested with a
  recording speaker; not heard).
- **The review of rounds 214 to 217** found five faults, all in or around round 216's level question; fixed and tested.
  The server's pulls and flooding showed no errors.

## Results

| Check | Result |
|---|---|
| Server suite | 632 pass |
| Client suite | 391 pass (new: Angkor Wat's plan, the level's retries, the slot's share, the silent event) |
| Aesthetic suite | 96 pass |
| Mobile suite | 320 pass |
| `gate-check.mjs` (phone, breathing on) | 0 problems; pictures in [`shots/`](shots/) |
| `pull-check.mjs` (the developer's jump, now into Angkor Wat) | 0 problems |
| Title radios at phone size | 18 × 18 each, the chosen one gold |
| Level chunk blocked | "The game was updated…" with Reload |

## Not done

Not played on a phone: whether the phone's failure was the stale chunk or a WebGL context it would not give is not
known; both are handled. Angkor Wat is not opened on the world map. The A2 to B1 gate is also in Angkor Wat, as is
every later change of level (the owner's decision, after the round).
