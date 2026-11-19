# Round 142 architecture

**Conversational round, recorded with the build.** The owner's words are in [`trail/interview.md`](trail/interview.md).

- **Artifact:** `client/src/sentences.js`, `client/src/components/SentenceText.jsx`,
  `client/src/components/BilingualText.jsx`, `client/src/components/CorrectionCard.jsx`, `client/src/index.css`.

## Design

Wherever a line is shown beside its translation (the character's reply and the correction card), both are cut into
sentences and the Nth sentence of each gets the same colour. A sentence ends at `. ! ? …` with any closing quote,
bracket or `*` after it. The seven colours are the Okabe-Ito set (colour-vision-deficiency safe), lightened to read
on the dark panels, and cycle after the seventh sentence of a line.

If the two sides hold a different number of sentences, or the translation is not yet revealed, the text stays plain:
a guess by position would colour unlike sentences alike.

## Claim boundary

Tested in jsdom (splitting, pairing, cycling, plain fallback). Not seen in a browser or on the iPhone; the colours'
legibility on the panels and the splitter's behaviour on abbreviations ("Sig.") are unchecked.

## Outcome (2026-11-20)

Built as designed.
