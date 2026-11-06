# Round 088 findings

## Question

Rounds 054–064 (word chips and spans, word classes, kept lines, narrator speech) were never reviewed after their
builds. Does an independent review find bugs, and can they be closed offline?

## Finding

**One answer leak, now closed; two minor items.** A kept line (round 060) is the paid translation of an NPC line,
shown in the Spellbook and withheld while a card in it is due, since the line is that card's answer in context. It
was withheld only for its **chip** ids, and chips come from the current encounter's words only, longest first and
non-overlapping. So "Grazie, il caffè è ottimo." kept in Gerald's coffee break showed "Thanks, the coffee is great"
while the *caffe* card was due, and "caffè nero" (chip `caffe_nero`) did not hide for a due *caffe*.

The server now sends `cardIds` for each line: its chips plus every card of the learner whose entry stands in the line
alone (overlaps do not exclude each other) or as an unlisted inflection of a single-word form of 4+ letters (round
086's rule: *ottimi* for *ottimo*). The line is withheld while any of them is due, and the app's clock check of a
stale snapshot uses them (an older server's chips when missing). An English word that is a card form (*sei* in "sei
days") hides a line too: accepted, as it errs toward the rule. Nothing changes in the save.

The minor items: the app's `segmentLine` kept the shorter of two spans starting together, the opposite of the
server's rule (cosmetic: the server never sends overlaps); the 500-character cap of a kept line could leave a lone
surrogate (now dropped; native and translation still cut separately, as round 060 decided).

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 3 findings (2 accepted, 1 in part), critique 8 (2 Errors on
homograph false hides and the cache; all accepted). Offline, no LLM call. Each change was removed in turn to see
that a test fails without it.

## Results

| Check | Result |
|---|---|
| `server/test/kept-lines.test.js` | 8/8 (2 new): Italian lines hide for another encounter's due card (*caffe* in Gerald's coffee break), for *caffè* inside "caffè nero", for an unlisted inflection (*ottimi*), for an English homograph (*sei*); "caffè" alone does not hide for a due `caffe_nero`; a due card not in the line hides nothing; `cardIds` order (chips first) and the stored ids unchanged; the cap leaves no lone surrogate. The first test's line-shape check gains `cardIds` |
| mobile `kept-lines`, `word-class` | 13/13 (2 new): a card due by the clock only in `cardIds` hides; without `cardIds` the chips are checked; two same-start spans keep the longer |
| A change removed → test fails | found-alone ids, matching alone (vs together), inflections (after the test moved from the listed *ottima* to *ottimi*), the surrogate cut, the app's `cardIds`, the span sort |
| Full suites | server 316/316 (314 before), client 12/12, mobile 244/244 |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`server/src/learning-service.js` (`inflectsForms`, `keptLines`, `lineEntryIds`, `keepLine`),
`mobile/src/components/Spellbook.js` (`lineHiddenBy`), `mobile/src/wordClass.js`, the tests,
[`trail/review-1.md`](trail/review-1.md) (also its "checked and fine" list: speech stops, spans and folding,
apostrophes, saves, encounters), [`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Tests only. A line is not withheld for: words that are no card yet, inflections of forms under 4 letters or of
multi-word forms, a card's meaning in English without its form, glitch characters inside a word (Rift). It may be
withheld for an English homograph of a due card.

## Open items

- Owner (Simulator): keep a line in Gerald's coffee break that says *caffè*, let the *caffe* card fall due, open the
  Spellbook: the line's translation waits.
- Owner: whether homograph false hides (a line waiting for a review of *sei* because of an English "sei") are
  acceptable.
