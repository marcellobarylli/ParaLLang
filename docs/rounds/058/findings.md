# Round 058 findings

## Question

Does every surface form of a pack, read alone, match its own entry and no other (backlog F3)? Can the matcher
guarantee that by construction, rather than through the lengths that today's content happens to have?

## Finding

**Yes, and the critique found a real latent bug on the way.** The matcher used to sort entries by their longest
variant, and each entry then tried all of its variants in turn. An entry with one long variant could therefore
take another entry's phrase with one of its short variants. A `buono` with a 12-letter variant took
`buon giorno`; the fixture fails on HEAD, as recorded in `results/head-run.txt`. Today's packs passed only through
the lengths their entries happen to have: `buono`'s longest variant, *buonissimo*, is one letter shorter than
*buon giorno*. The matcher now tries every (entry, variant) pair longest folded form first, across all entries.

A pack-wide check, `vocabularyFormConflicts`, now runs in the tests. It requires every variant of both packs to
match its own entry, whole, and it reports none in either pack. On real data the matcher's output is unchanged:
1,021 NPC lines from saved live reports, matched against both packs, gave 0 differences.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 6 findings, all accepted. It replaced the planned folded-form
  lint with this behavioural check and found the sort bug.
- Before/after: `results/compare-matchers.mjs`, using the matcher from HEAD before the build, writes
  `results/compare-matchers.txt`.
- No live runs.

## Results

| Check | Result |
|---|---|
| New tests on HEAD source | the stealing fixture fails; the pack checks and fixtures pass |
| Server tests | 238/238 (232 before; 6 new in `vocabulary-forms.test.js`) |
| Mobile / web client | 146/146 / 12/12 (unchanged) |
| Old vs new matcher on saved lines | 2,042 comparisons, 0 differences |

## Decision

F3 is done. A new entry whose form another entry already takes, or whose form takes another entry's, now fails
`vocabulary-forms.test.js`.

## Evidence

- `server/test/vocabulary-forms.test.js`, `results/head-run.txt`, `results/compare-matchers.txt`.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

The check tests each form alone. Crossing overlaps in running text, where neither form is inside the other,
still go to the longer match; this is out of scope (Decision 2). Forms written with leading or trailing
punctuation are not covered beyond the hygiene check (none exist today).

## Open items

None for the owner.
