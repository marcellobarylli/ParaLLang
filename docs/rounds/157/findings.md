# Round 157 findings

## Question

Does an entry reach the guidebook when its narration first fires, stay in the save, and show on a phone's screen
without crowding it?

## Finding

Yes, after two corrections made on the way.

- **A map only read entered an entry.** The first build entered "Being let past" when a dungeon's map was read. The
  client reads the first dungeon's map at start-up, so a player who went straight to the road was told about
  dungeons there. It is now entered when a conversation opens at a site, or on a walk between sites.
- **A fourth button clipped the title.** With "?" in the top bar, "ParaLLang" lost its last letters on the road at
  390 px. The phone's buttons each gave up a little padding, and the title fits.

## Method

Server and client tests; `client/scripts/guidebook-check.mjs` on the built client in headless Chromium at 390×844.

## Results

| Check | Result |
|---|---|
| Server tests | 542 of 542 (536 before, 6 new) |
| Web client tests | 269 of 269 (265 before, 4 new) |
| `guidebook-check.mjs` | 8 checks, 0 problems; the top bar is 390 of 390 px |

Pictures: [an entry told on the road's card](shots/01-entry-told.jpg), [the guidebook](shots/02-guidebook.jpg),
[read](shots/03-read.jpg).

## Decision

Built as designed in [`architecture.md`](architecture.md). Claude's decisions, for the owner to overrule:

- **An entry is its own piece of narration with its own trigger**, beside the atmospheric passages, not a flag on
  one of them. A place can then tell its passage and an entry at once.
- **Four real entries** in place of a placeholder.
- **Opening the guidebook reads everything.** There is no per-entry "read".
- **The button is "?"**, the narrowest thing that would fit a phone's top bar.

## Evidence

`content/narration/guidebook.yaml`, the tests named in the architecture, [`shots/`](shots/).

## Claim boundary

Not on a phone. The top bar was measured on the road with a one-digit count; a two-digit count on the button, or a
longer stage name than "A1", was not tried.

## Open items

- The owner's read of the entries.
- Not on `main`.
