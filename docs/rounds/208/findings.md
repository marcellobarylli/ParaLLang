# Round 208 findings

## Question

Is there an elderly Gemini voice, and can the player choose among the candidates?

## Finding

No prebuilt voice is described as elderly. The nearest are Gacrux ("mature") and Algenib ("gravelly"), from memory of
Google's table; one search confirmed that Algenib exists (male) but not its label, nor Gacrux. Samples could not be
made in the session: the form for a Gemini key was declined and the hosted server is outside its network. The choice
is made in the game instead.

## Results

| Check | Result |
|---|---|
| Server tests | 619 pass (a listed voice is used and kept apart; another name is Charon) |
| Client tests | 351 pass (the picked voice is sent; each voice has its own clips) |
| Client build | passes |
| Heard; the picker seen in a browser | no |

## Claim boundary

- If Google does not know a voice name, the call fails and the device's voice reads for five minutes; the names were
  not checked against Google.
