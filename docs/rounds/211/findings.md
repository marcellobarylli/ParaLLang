# Round 211 findings

## Question

Can a road character whose conversation is complete sink slowly into the ground, watched, before the walk on?

## Finding

Once a conversation is complete the server's road lists the site as cleared and has no current conversation, so the
3D view swapped the character for a cairn at once, while the conversation panel was still up. The view now keeps the
character standing at the site the player is at until they move on, and the walk waits for it to sink.

## Results

`node client/scripts/sink-check.mjs`: a conversation completed in headless Chromium (phone size), Continue pressed,
the view read every tenth of a second.

| Check | Result |
|---|---|
| Complete, before Continue | the character stands; not sinking |
| After Continue | it sinks over about 25 readings (3.2 s), steadily, the camera at the site throughout |
| The walk | begins on the reading after it is gone |
| Client tests, aesthetic tests, build | 351, 95, passes |
| On a phone | not checked |

The first run showed the site's cairn standing over the sinking figure: the per-frame visibility pass showed the
hidden cairn again. Fixed before the shots kept here: [complete](shots/00-complete.jpg),
[sinking](shots/01-sinking.jpg), [gone](shots/02-nearly-gone.jpg), [walking on](shots/03-walking-on.jpg).

## Claim boundary

- With reduced motion the figure does not sink; the walk (a cut there) goes at once, as before.
- A conversation left unfinished from the map does not sink its character (it was never completed).
