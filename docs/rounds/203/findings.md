# Round 203 findings

## Question

Can the wait for a reply be played through, without the reply being missed or cut short?

## Finding

Yes, as an experiment behind a switch. The game starts with the answer and ends by itself: the reply stops the stream
of invaders, the last ones come down, and the panel returns with the reply, which is read aloud only then. Losing all
three lives leaves the player waiting, as asked.

## Results

| Check | Result |
|---|---|
| Root `npm test` | passes (server 615, client 346, aesthetic 95, mobile 320) |
| Client build | passes |
| `wait-game-check.mjs`, Chromium 390 x 844, synthetic touches | 17 checks, 0 problems: off by default and no game; on, the game covers the panel, the reply waits under it, the panel returns at its own opacity (0.7); lost, the game stays until the reply |
| Pictures | [`shots/`](shots/) |
| On a phone | not checked |

## Working beside another session

The session of round 202 (hosted narrator voice) was sent this round's number and files before the first edit, and
answered by keeping to its own files. A third session merged round 204 meanwhile. `origin/main` was merged into this
branch before the push; `DungeonScreen.jsx` and `STATUS.md` were changed on both sides.

## Claim boundary

- Thumb control was tried with synthetic touch events only. Whether the drag feels right on an iPhone, and whether
  76 px under the figure is the right room for a thumb, is the owner's to say.
- The speeds and the stream's rate are first guesses, not tuned by play.
- With voices on, speech deferred to the end of the game starts outside the tap that sent the answer. The existing
  reply already speaks after a network wait, so this should behave the same; not checked on iOS.

## Open items

- Tune by play: the invaders' speed, the stream's rate, the figure's height.
- Whether a reply held up to 6 s by the last invaders is welcome or an annoyance.
