# Round 181 findings

## Question

Can French be played, in every system, on the hosted game?

## Finding

Yes, in tests and in headless Chromium against a local server playing Italian, French and Spanish. Not yet seen on
the hosted page, and the French content has not been read by a native speaker.

## Method

The pack loaded by the server's own checks (every form unique, every example holding its objective's words, every
reference and id resolved); subagents' own checks of answers and leaks on French; the test suites; the production
build in headless Chromium, the title's language buttons pressed.

## Results

| Check | Result |
|---|---|
| French pack | 16 encounters, 81 market entries, 491 curriculum entries (36 units, 108 lessons), 10 fragments, 6 inscriptions, 13 truths; no shared form |
| Tests | server 597, client 313, aesthetic 95, mobile 320, all pass |
| In the browser | the title shows Learn: Italian, French, Spanish; French pressed reloads into a French game (`parallang.language` = fr) ([shot](shots/title-language.png)) |
| A1 "à" | the curriculum's bare `à` (for "at" an hour) would match English "a" and the verb "a"; replaced by "à + hour" forms |

## Claim boundary

- The French was authored by Claude, not checked by a native speaker; dictionary URLs follow the sites' patterns and
  were not opened.
- The pack's specific tests (tutorial, bookshop, fountain, annex, Rift) run on Italian and Spanish only; French was
  checked against the same rules by the subagents' scripts.
- The iPhone app sends no language and plays the server's default.
- French truths are not in `parallang_obsidian/Understood Later.md` (the owner's vault).

## Open items

- A native speaker reads the French pack, starting with the curriculum and the truths.
- The owner plays a French game on the hosted page.
- The iPhone app's language choice.
