# Round 159 findings

## Question

Does a completed encounter deliver its character's passage, once, in the right place, and keep it?

## Finding

Yes. Played against the real server with a scripted grader: Bambieshart's conversation shows nothing while it runs;
the answer that completes it brings the narrator's line and the text in turmeric above the last word; the guidebook
gains its entry on turmeric text and lists what he uttered.

## Method

Server and client tests; `client/scripts/revelation-check.mjs` on the built client in headless Chromium at 390×844,
as a learner standing before Ta Prohm's sanctuary.

## Results

| Check | Result |
|---|---|
| Server tests | 555 of 555 (550 before, 5 new) |
| Web client tests | 272 of 272 (271 before, 1 new) |
| `revelation-check.mjs` | 8 checks, 0 problems |

Pictures: [what Bambieshart utters](shots/01-bambieshart-utters.jpg), [kept in the guidebook](shots/02-kept.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **Three characters**: the bookworm who reads *The Journey*, the wanderer for whom every sentence is a prophecy,
  and the thing in the Rift. The issue names Ta Prohm; all three stand in it.
- **Every revelation is untranslatable text.** The issue says "possibly". A revelation in English would state what
  the lore book says no character says plainly; in turmeric it stays a thing the player has to earn.
- **The wording** is the issue's "utters the following:", with one clause before it.
- **Before the last word**, since two of the three leave in theirs.

## Evidence

The six encounter files, `content/languages/it/lore/truths.yaml`, `server/test/revelation.test.js`,
[`shots/`](shots/).

## Claim boundary

Unread by a speaker. Not on a phone. Errata's and Marginalia's were tested as content and through the same code
path, not each played in a browser.

## Open items

- A speaker's read of the three texts.
- Whether more characters should utter something (the party's deeper conversations are candidates).
- Not on `main`.
