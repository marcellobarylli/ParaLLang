# Round 201 findings

## Question

How strict should the practice box under a correction be?

## Finding

Not at all. The box compared the try with the corrected sentence word for word and listed the words that differed,
so a sentence said rightly and misheard by the microphone was marked "Not quite". The owner first thought of scoring
by edit distance and then dropped it: the try is the point, so every try is green, and the wording owns up to not
having checked.

## Results

| Check | Result |
|---|---|
| Root `npm test` | passes (server 615, client, aesthetic 95, mobile) |
| Client build | passes |
| In a browser, on a phone | not checked |

## Claim boundary

- A try of any text at all, even one word, is told it was probably right.
