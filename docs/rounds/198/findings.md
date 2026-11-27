# Round 198 findings

## Question

Can light checking become the default for games already being played, and where should the correction stand?

## Finding

The saved display writes every setting each time, so every browser that has played holds `light: false`; reading a
missing value as light would have changed nothing for them. Strict is therefore kept under a new key that only a
choice made from now on writes.

The correction stood at the bottom of the panel, after the character's reply, so the last thing above the reply box
was the player's own corrected sentence and not the line being answered.

## Results

| Check | Result |
|---|---|
| Client tests | 342 of 342 (1 new) |
| Client build | passes |
| A light turn in Chromium, no setting touched | sent as light; tops at answer −148 px, understood −77 px, reply 439 px, reply box 752 px; nothing between the reply and the box ([shot](shots/03-understood.jpg)) |
| First push to `main` (`c99d771`) | CI and Pages failed: three tests of `server/test/web-client.test.js` play the client's strict flow and got light turns. The page was not deployed from it. Fixed by having that file choose strict; root `npm test` then passes (server 615, client 342, aesthetic 95, mobile) |
| On a phone | not checked |

## Claim boundary

- A player who had chosen Strict on purpose before this round is moved to Light with everyone else; the choice
  cannot be told from the old default.
- With a long correction (its practice box open) the player's own answer is scrolled out above; the reply and the
  box are in view.
- The live page and server are outside the session's network; the deploy is read from GitHub only.
