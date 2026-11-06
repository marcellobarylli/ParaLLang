# Round 059 findings

## Question

Can the word class that the encounter chips show (round 056: noun, verb, adjective in R/G/B) read the same way on
Spellbook cards and on the review prompt, without showing a meaning where round 017 hides it (backlog C8)?

## Finding

**Yes, in the app, checked by jest only.** On a Spellbook card the class word on the "noun · Mastery: discovered"
line is now in its chip colour and semibold (noun blue, verb red, adjective green, by `wordClassText`); other classes
keep the muted text ("adverb", "prepositional phrase"), and a card with no class shows only its mastery. Card frames
stay neutral (decision 2). The review prompt shows the class under the target word, in colour or muted, read in
English. The app takes it from the Spellbook card that came with the challenge, so the server is unchanged and an
older server works too. Meanings, notes and English examples stay hidden where round 017 hides them; the class was
already shown in every card state. Showing the class on a recall prompt is a new, small hint (decision 1, owner
question). A revealed chip whose word has no part of speech no longer throws.

## Method

- Built to [architecture.md](architecture.md) after [critique 1](trail/critique-1.md). Codex was at its usage
  limit (until 01:36 UTC 2026-11-06), so a Claude subagent wrote the critique: 10 findings, all accepted (1.9 moot).
- Checks: mobile jest (new `word-class-cards.test.js`, review assertions in `learning-flow.test.js`, contrast of the
  class colours on `background`), server and client tests, expo-doctor and the iOS export.
- No live runs (no gameplay or content change) and no Simulator.

## Results

| Check | Result |
|---|---|
| Mobile jest | 153/153 (146 before; 7 new in `word-class-cards.test.js`, which fail without the change; 2 assertions added to `learning-flow.test.js`) |
| Contrast on background | noun, verb and adjective ≥ 4.5 (theme test; the critic computed 6.30, 5.81, 5.50) |
| Server / web client | 238/238 / 12/12 (unchanged code) |
| expo-doctor / iOS export | 20/20 / built |

## Decision

C8 is done. The word class now reads the same on chips, Spellbook cards and the review prompt.

## Evidence

- `mobile/src/__tests__/word-class-cards.test.js`: `wordClassText` cases; cards between and during encounters
  (colours, neutral frames, hidden meanings); the review tag (colour, no language tag, heading unchanged, practice,
  muted, none); `reviewPartOfSpeech`; a chip without a part of speech.
- `mobile/src/__tests__/learning-flow.test.js`: the full flow's reviews show "noun" and "prepositional phrase".
- [critique 1](trail/critique-1.md), [journal](trail/journal.md).

## Claim boundary

No one has looked at it. The colours on the cards and the review screen, wrapping at large Dynamic Type sizes and
VoiceOver reading the class need the Simulator. No playtest has shown whether the class on the review prompt makes
recall easier in a way that matters.

## Open items

1. **Owner, Simulator:** the class word on Spellbook cards and the tag under the review word (colours, Dynamic Type,
   VoiceOver reads it in English).
2. **Owner:** may the review prompt show the class (decision 1)? Should card frames take the class colour after all
   (decision 2)?
