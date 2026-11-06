# Round 104 findings

## Question

A review of rounds 100–103's code found no bug a player meets, but five ways the leak scan could miscount reports not
yet written, and two small gaps. Fixed, do the committed numbers change?

## Finding

**No committed number changes; the scan now counts correctly on new reports.**

- ***espresso* is English only in "espresso shot(s)".** Before, every Italian *espresso* in an NPC line was soft,
  though it is a required answer: "Vuoi un espresso?" would have hidden a real give-away. All 32 committed soft
  *espresso* lines say "espresso shot(s)", so none moved.
- **The old leak is counted, not summed.** Round 101 said earlier rounds' leak counts equal leak + soft. That holds
  for the committed reports (it 98, es 29, counted by the pre-101 rule), but not in general: a frame word beside a
  fresh word hit is `near` now and was `leak` before. The scan prints the counted figure (`old leak K`).
- **A fresh word hit always makes a line `near`** (after `leak`), also when an exact hit in the line was echoed. No
  committed line changed.
- **English texts keep every form of an objective.** Six early feedback texts (rounds 005–007) now list *caffè nero*
  beside *senza latte*; they were already fresh, so the counts stay (8 of 942 feedback turns).
- **An English *espresso* stops no word hit of its objective**, like a frame word.
- **The web Spellbook** also hides a card that fell due while it was open.
- **Correction to round 103's record:** the server still sends meanings in the Spellbook during an encounter. The app
  and the web client hide them on screen; nothing removes them from the payload (deferred).

## Method

As in [architecture.md](architecture.md). Review by a fresh read-only subagent in place of Codex
([`trail/review-1.md`](trail/review-1.md)): 8 findings, 7 accepted, 1 in part. Every committed report rescanned
before and after; each fix removed in turn to see a test fail. Offline.

## Results

| Check | Result |
|---|---|
| Rescan ([before](results/scan-before.txt), [after](results/scan-after.txt)) | no NPC-line kind changes; six extra-feedback lines list one more form (*caffè nero*); totals unchanged: it leak 50, soft 48, old leak 98; es leak 12, soft 17, old leak 29; from 051: it leak 6, es 0 |
| `server/test/leak-scan.test.js` | 4 new, 28/28: *espresso* in and out of "shots" (Gerald, Errata); echoed frame word with a fresh word hit is `near`; `oldLeak` and `oldLeakLines`; an English *espresso* keeps order_coffee's word hit; feedback with an echoed and a fresh form |
| Mutations | 5 of 5 fail a test (the context, the old `near` rule, `oldLeak` by key, one form per objective, the soft predicate); the R1.5 test was first too weak (the mutation passed) and was tightened to assert the objectives of the word hits |
| Web Spellbook | 1 new test, 14/14; the time check removed → 1 fails; round 103's test given a future review time for its not-due card |
| Mobile | the three race tests assert the read was under way, 19/19 |
| Full suites | server 389/389, client 14/14, mobile 301/301; client build |

## Decision

Keep the fixes (autonomous decisions, pending owner review). Defer removing meanings from the server's payload during
encounters.

## Evidence

`server/scripts/leak-scan.js` (`NPC_ENGLISH_FORMS`, `npcEnglish`, `scanText`, the kind rule, `oldLeak`), the tests,
the two scans, [`trail/review-1.md`](trail/review-1.md).

## Claim boundary

Committed reports against today's content. The *espresso* rule is one pattern; another English use would still count
as a leak (the safe side).

## Open items

- Meanings in the server's Spellbook payload during encounters (review R1.7): blank them on the server, if the
  owner wants the payload itself clean.
