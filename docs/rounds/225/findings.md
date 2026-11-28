# Round 225 findings

## Question

Does the objective box show the bare task?

## Finding

Yes, for every road objective in every language (test: each prompt is its ask and a full stop, with no "using").

## Results

| Check | Result |
|---|---|
| Server suite | 640 pass |
| Client suite | 394 pass |
| zh, first lessons | "Greet Cuthbert. / Ask Cuthbert how they are. / Say goodbye to Cuthbert." |

## Claim boundary

Not seen in a browser or on a phone. Some of the 324 asks still hold a lead before a colon or a list of choices; the
market's authored prompts still say "using <language>".

## Open items

- Whether the asks with a lead ("{name} thanks you in turn: ...") and the market's prompts should be trimmed too.
