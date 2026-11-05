# Round 057 findings

## Question

Can the words that have chips under an NPC line be marked inside the line itself, where the server matched them,
coloured and underlined by class (backlog C7, the owner's note "the backbone … is colour coded")?

## Finding

**Yes, from new lines on; checked by tests, not on a device.** The server keeps every span the matcher gave a word
(`spans` on narration words: UTF-16 offsets into the line). The app splits the line at those spans and marks
each one in place:

- nouns in blue, adjectives in green, verbs in red with a dashed underline;
- every other class with an ink underline.

The line stays one text element, so VoiceOver reads one element. Repeats are all marked. A word inside a longer
match is never marked: in "Un caffè nero? Sì, caffè nero, non un caffè." only the last *caffè* is marked as the
noun *caffè*. Lines saved before this round have no spans and show unmarked, as before.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 9 findings, 8 accepted (both Errors), 1 in part. Its main point
  changed the design: the server sends the offsets, and the app does not search.
- A contract test (`server/test/word-spans.test.js`) runs the real matcher and `canonicalizeNarration`, then the
  app's `segmentLine`. It checks that the text is unchanged and that the marks are exactly the server's spans.
- No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Server tests | 232/232 (228 before; 4 new) |
| Mobile jest | 146/146 (142 before; 4 new) |
| Web client | 12/12 and build (unchanged; it ignores `spans`) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C7 is done. Ink underlines for the uncoloured classes are a stated limit: they are told apart only by the chip
order, which follows the line order.

## Evidence

- `server/test/word-spans.test.js`: spans, `caffè nero`, NFD and a no-break space, serialization, the contract.
- `mobile/src/__tests__/word-class.test.js`: `segmentLine` and the marked line.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

Not verified on a device: how the marks look, dashed underlines on iOS, and VoiceOver. Spans are UTF-16 offsets
from the same JS string on both sides. A future server in another language would have to keep that. Lines in
saves from before this round stay unmarked.

## Open items

1. **Owner, Simulator:** an NPC line with marked words. Check the colours, the dashed verb underline, the ink
   underlines, a repeated word, and VoiceOver reading the line as one element.
2. **Owner:** are ink underlines for adverbs, numerals and phrases helpful, or should only the three coloured
   classes be marked?
