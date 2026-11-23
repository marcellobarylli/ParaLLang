# Round 158 findings

## Question

Can a text be shown to the player with no way, anywhere in the game, to have it translated?

## Finding

Yes, by not holding a translation. The pack's file has no field for one, the server sends the text and its language
and nothing else, the client draws a span with no control in it, and a test reads every file the server loads for
the English of the texts and finds none. The meanings are in the vault note, which the game does not read.

The check in a browser also found that a place's card had outgrown a phone's screen (see the architecture, "Also
changed"); it is fixed.

## Method

Server and client tests; `client/scripts/turmeric-check.mjs` on the built client in headless Chromium at 390×844,
as a learner walked along the road on the server until the first text was told.

## Results

| Check | Result |
|---|---|
| Server tests | 550 of 550 (542 before, 8 new) |
| Web client tests | 271 of 271 (269 before, 2 new) |
| `turmeric-check.mjs` | 11 checks, 0 problems; the span's colour is `rgb(232, 163, 23)` |
| The earlier checks (`light`, `narrator`, `guidebook`) | pass, the last two after their selectors and one count were brought up to date |

Pictures: [the owner's line on the road's card](shots/01-turmeric-on-the-road.jpg), [the guidebook with the entry and
the kept text](shots/02-guidebook.jpg). In the first picture the note lists three entries: the check's clock stands
still, so all three count as entered last. With a running clock only the newest are told.

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **Ten texts, in both packs.** The issue names Italian; the passages are shared by both packs, so Spanish has them
  too.
- **Turmeric is `#e8a317`**, upright and a little heavier than the italic around it. The interface's gold is close
  to it; the weight and the upright set it apart.
- **The guidebook keeps the texts found.** The issue asks only for the entry; a text met at A1 and lost by B1 would
  miss the point of it.
- **The plain statement is on the road.** The lore book says the plain statement belongs to untranslatable text, so
  the B1 texts say it outright. Issue #7 (dungeon characters who utter deeper truths) can take over the deepest.
- **A level, and a wait in conversations**, pace the passages.
- **The meanings are kept out of the repository's records** (this one included) and written in the vault note.

## Evidence

`content/languages/it/lore/truths.yaml`, `content/narration/passages.yaml`,
`parallang_obsidian/Understood Later.md`, the tests named in the architecture, [`shots/`](shots/).

## Claim boundary

The Italian and Spanish are unread by a speaker. Not on a phone. A player can still copy a text into a translator
outside the game; `translate="no"` only stops the browser offering.

## Open items

- A speaker's read of the ten texts in each language (the vault note lists a doubt about *tela*).
- The owner's read of the passages and of the vault note.
- Not on `main`.
