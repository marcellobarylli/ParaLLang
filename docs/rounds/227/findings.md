# Round 227 findings

## Question

Can the wait for a reply be chosen in Settings between Meditation and Space Invaders, and is the game one life, with no
hearts, and 10 % faster?

## Finding

Yes, as seen in headless Chromium at phone size (390 x 844), with the real server code and a scripted grader.

## Results

| Check | Result |
|---|---|
| Client suite | 404 pass (new: one life, 10 % faster, no hearts, the dropdown and its persistence) |
| Default | the meditation is played; "While you wait" reads Meditation; the dropdown offers Meditation, Space Invaders, Nothing ([shot](shots/default-02-settings.jpg)) |
| Space Invaders chosen | kept in the browser; no meditation; the field covers the panel; no hearts, a score at the top right ([shot](shots/invaders-01-playing.jpg)) |
| Played | the reply waits under the game; the panel returns at its own opacity (0.7) with the reply |
| Lost | one invader past loses the game; "One got through." stays until the reply is ready ([shot](shots/lost-01-lost.jpg)) |

## Claim boundary

Not tried on a phone, and no touch was played by a person: the thumb was scripted. "10 % faster" is read as the
invaders' speed and how often they set out; how it feels was not judged. The road's walk with Space Invaders (decision 4) uses
the same component but was neither played in Chromium nor tested on its own.

## Open items

None.
