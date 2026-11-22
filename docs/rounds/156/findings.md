# Round 156 findings

## Question

Can one voice hold for the narration a model writes and the narration that is written down, with places left for
untranslatable spans and guidebook entries?

## Finding

The rules are one list in the style guide, asked of the model and kept by the written passages (a test reads each
passage against them). The first draft of the passages broke one of the rules: three of them said what the player
thinks or remembers ("a moment before you think of it"). The test caught the first; all three were rewritten.

## Method

Server and client tests; `client/scripts/narrator-check.mjs` on the built client in headless Chromium at 390×844.

## Results

| Check | Result |
|---|---|
| Server tests | 536 of 536 (529 before, 7 new) |
| Web client tests | 265 of 265 (260 before, 5 new) |
| `narrator-check.mjs` | 5 checks, 0 problems |
| The fixture script on the tree before the round | reproduces `gerald-prompts-r131.json` exactly |

Pictures: [the first step, on the road's card](shots/01-first-step.jpg), [a conversation's last
word](shots/02-last-word.jpg), [the way taken, in the caption](shots/03-on-the-way.jpg), [the Face Gate's site
card](shots/04-face-gate.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **The narrator is told the truth and told never to say it.** The other way is to tell it nothing, and then its
  hints would point nowhere in particular.
- **A hint at most once in a conversation**, and most narratives none.
- **Footnotes stay.** The lore book's narrator is "fond of footnotes"; a footnote is a dry aside and explains
  nothing about the world.
- **Three events** for written passages now. An encounter's end (issue #7) and the journey shown on the map (issue
  #13) use the same mechanism.
- **The 26 passages are Claude's.**

## Evidence

`content/narration/style_guide.yaml`, `content/narration/passages.yaml`, the tests named in the architecture,
[`shots/`](shots/).

## Claim boundary

No live model: the generated narration under the new rules is unseen. Not on a phone.

## Open items

- Read a live conversation's narration: is it "you", present tense, and does it leave things unexplained?
- The owner's read of the passages.
- Not on `main`.
