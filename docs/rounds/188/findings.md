# Round 188 findings

## Question

Can the microphone stay on through pauses until it is tapped off, and switch language without switching off?

## Finding

Yes, with a fake listener: a stretch that ends on a silence is followed by a new one, the language button starts the
next stretch in the other language with the microphone still on, and a tap, a send or a refusal switches it off.
Not tried on a phone.

## Results

| Check | Result |
|---|---|
| Client tests | 332 of 332 (1 new, 1 changed) |
| Client build | passes |
| Tried on a phone | not checked |

## Claim boundary

- Whether iOS Safari lets a page start a new recognition from the end of the last one, without a tap, was not
  checked. If it refuses, the refusal is said under the box and the microphone switches off, as before.
- Words spoken in the moment between two stretches may be lost.
