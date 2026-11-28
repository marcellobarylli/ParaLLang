# Round 224 findings

## Question

Does the welcome message say the game's vision and how to answer, in fewer words?

## Finding

Yes: three short paragraphs (was three longer ones), the second naming the game's language. It fits a phone's screen.

## Results

| Check | Result |
|---|---|
| Client suite | all pass; the welcome test reads the line with the game's language |
| In the browser | phone size, Italian game: the message fits (358 × 482), Set out gives way to the arrival ([shot](shots/01-welcome.jpg), [after](shots/02-after.jpg)) |

## Claim boundary

Seen in headless Chromium, **not on a phone**. "You will be shown your answer in {language}" describes the mended
sentence of the correction box; not checked at every share of the language.

## Open items

None.
