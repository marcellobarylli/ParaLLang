# Round 221 findings

## Question

Is the narration shown only at the start and the end of a conversation, and does the reply's arrival bring the
correction box to the top of the panel?

## Finding

- **Narration:** in Portia's conversation the opening line is narrated and the reply to the first answer is not, on
  screen and in the narrator's voice; the line that ends a conversation is narrated again (unit test).
- **Follow:** after the answer, with the breathing off and on, the correction box ("Understood") stands 52 px from the
  top of the text, just under the objective's bar (which ends at 39 px), with the reply below it.

## Results

| Check | Result |
|---|---|
| Client suite | 392 pass |
| Server suite | 632 pass |
| `follow-check.mjs off` | 0 problems |
| `follow-check.mjs on` (the guidebook's entry, then three breaths) | 0 problems |

## Evidence

[`shots/after-answer-breathing-off.jpg`](shots/after-answer-breathing-off.jpg),
[`shots/after-answer-breathing-on.jpg`](shots/after-answer-breathing-on.jpg).

## Claim boundary

Headless Chromium at phone size with a scripted model (a light turn), **not on a phone**. A strict turn's correction
card is in the same box and is expected to land the same way; not played here.

## Open items

- Whether the model should stop writing the narrative of the lines between (fewer tokens); not changed.
