# Round 164 findings

## Question

Does the picture the owner liked survive as an icon, and is everything ready to merge?

## Finding

Yes. The script draws the same walk as the owner's picture (the same shape, from the same seed and the same rule),
and at 512 pixels it is that picture squared. At 64 pixels the land, the water and a gold tangle read; the line's
turns do not.

## Method

The icons written and looked at; every test suite run; the page built.

## Results

| Check | Result |
|---|---|
| Web client tests | 281 of 281 |
| Server tests | 567 of 567 |
| The aesthetic package's tests | 95 of 95 |
| The iPhone app's tests | 320 of 320 (not run in rounds 153 to 163; its code is unchanged) |
| The client build | builds; `dist/` holds the five icons |

Pictures: [the owner's first picture](shots/00-the-owners-picture.jpg), [the owner's second, from further
off](shots/04-the-owners-second-picture.jpg), [the icon at 512](shots/01-icon-512.png), [the maskable
icon](shots/02-icon-maskable-512.png), [the icon at 64](shots/03-icon-64.png). The icon files shown are the final
ones, from further off (Amendment 3 of the architecture); the first build's were the closer view of the first
picture.

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's readings and decisions, for the owner to
overrule:

- **"This should be the icon"** was read as: every icon, the web app's and the iPhone app's.
- **The first pull is written down and not built**, with a proposal for how to build it.
- **The compiler's own chapters of the lore book are unchanged.** Nobody in the world knows any of this, so it is
  all in the part outside the compiler's voice.
- **"Merge and deploy"** was read as the page and the server both.
- **Issues #1 to #9 are closed with the merge. #11 and #13 are left open**: #11 pulled trees only, and #13 shows a
  chart drawn here in place of a public-domain map. The owner's "That's fine" may have meant these too; closing
  them is one word.

## Evidence

`client/scripts/make-icons.mjs`, `docs/lore-book.md`, `docs/proposals/2026-11-23-the-first-pull.md`,
[`shots/`](shots/).

## Claim boundary

A phone that has the page on its home screen keeps the old icon until the page is added again. No model has been
run against the prompts of rounds 153 to 156; the deploy is the first time one will be.

## Open items

- The owner's read of the lore book's new parts, and the questions in its "Not settled" list.
- The first pull, and the characters going back through the ground: not built.
- The first live conversations after the deploy: light mode, the narrator's voice, the characters' hints.

## The deploy (2026-11-23, 07:39 to 07:42 UTC)

Merged to `main` as `5ae0627` with rounds 153 to 163. CI run 45132679028 and Pages run 45132679072 succeeded, and
Render's deployment "main - parallang" for the commit reports success (GitHub's API; the live page and the hosted
server were not looked at from the cloud session). Issues #1 to #9 were closed; #11 and #13 are open.

