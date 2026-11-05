# Round 056 findings

## Question

Can the word chips under an NPC line show their word class, as the owner's note asks ("R/G/B for
noun/verb/adjective"), without colour being the only cue and without breaking the chips (backlog C6)?

## Finding

**Yes, in the app, checked by jest only.** 79 of the 149 entries in the two packs are now coloured:

- nouns and noun phrases: a blue chip border and a "noun" label;
- verbs and verb phrases: a red dashed border and "verb";
- adjectives: a green border and "adj.".

The other 70 entries keep today's look: adverbs, numerals, interjections, pronouns, questions and phrases,
including *senza latte*. Every chip now has a 2-point border, so all chips are the same size. VoiceOver hears the
class in the chip's name ("Translate word: caffè, noun"). Revealed chips are no longer dimmed, so the colour and
label stay readable on past lines. The meaning line drops its "(noun)", because the chip already says it. The
class shows on the active line before any hint; that is an autonomous decision and an owner question.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit, so a Claude subagent wrote the critique: 9 findings, 7 accepted (all 3 Errors), 2 in part.
- Checks: mobile jest, the theme test with the three tokens on `surface`, server and client tests, expo-doctor and
  the iOS export.
- No live runs and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 142/142 (139 before; 3 new in `word-class.test.js`; 3 queries renamed) |
| Contrast on surface | noun 6.98, verb 6.43, adjective 6.09 (all ≥ 4.5) |
| Server / web client | 228/228 / 12/12 (unchanged) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C6 is done in encounters. The Spellbook and reviews still show the class only as text; reusing `wordClass` there
is a possible later item.

## Evidence

- `mobile/src/__tests__/word-class.test.js`: classes of every part of speech in both packs, labels, names, border
  colours and dashes on a protected line, undimmed revealed chips.
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

No one has looked at it yet. The colours, the dashed border on iOS, the wrap of a chip with its label and 🔊 on a
narrow screen, and VoiceOver reading need the Simulator. Red and green have similar luminance, so colour-blind
players rely on the label and the dash. No playtest has shown whether the free class on the active line makes the
Butcher's or Flick's objectives easier.

## Open items

1. **Owner, Simulator:** the three colours and labels on chips. Check the dashed verb border, the narrowest
   screen (a phrase chip with its label and 🔊), and VoiceOver names.
2. **Owner:** may the class show on the active line before a hint (decision 1)? The closest cases are Mortimer's
   `name_meat` and `quantity` (nouns) and Flick's verbs. Is R/G/B the palette the note meant, and should
   verb-like `phrase` entries count as verbs?
