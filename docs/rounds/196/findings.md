# Round 196 findings

## Question

Can the narrator have a generated storyteller's voice, cheaply, and can the road's characters each sound like a
random point in a space of voice parameters?

## Finding

Yes, at no cost, with the browser's speech synthesis that the characters already use (round 126). Its parameters
are the voice (any of the device's voices), the pitch (0 to 2) and the rate; there is no timbre or accent parameter
beyond the choice of voice. Round 126's voice lists (`VOICE_KINDS` in speech.js) expect an iPhone to offer Apple's
novelty voices (Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley) in the language beside Alice, Federica and
Luca; that was not checked on a device here. Where it holds, the voice axis alone has about a dozen points, and with
pitch and rate each road character is a point of its own.

In headless Chromium with a fake engine holding an iPhone's voices: the narrator read the first line's narrative as
Daniel (en-GB, pitch 0.9, rate 0.88), its Italian word in the Italian voice, and the character's line after it; the
travel passage on the way was read in full and the next character's line was queued after it with nothing cut off;
the two characters met had different voices (Rocko 1.44/0.96, Grandma 1.49/1.13). Over 200 sites of seed 4242 every
axis spans more than 90 % of its range, and pitch and rate are uncorrelated.

## Results

| Check | Result |
|---|---|
| Client tests | 341 of 341 (4 new) |
| Server tests | 615; 612 in the full run, the 3 others (two CLI-runner timing tests and the new one, fixed) pass alone; the full run was short of memory |
| Client build | passes |
| `narrator-voice-check.mjs` | 7 of 7 ([shots](shots/)) |
| On a phone, real voices | not heard |

## Claim boundary

- Which voices a phone has is the phone's: a device with one voice of the language tells characters apart by pitch
  and rate alone, and one without an English voice reads the narration in whatever the browser picks for en-GB.
- How the voices sound, and whether short target-language words between narrator runs sound natural (each is its
  own utterance, so there is a small pause either side), was not heard.

## Open items

- A hosted voice (a paid text-to-speech API) for the narrator, if the device voices are not enough.
