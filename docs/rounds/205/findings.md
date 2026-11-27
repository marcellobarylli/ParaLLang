# Round 205 findings

## Question

Why does the narrator's hosted voice read its own direction aloud, and can it be funnier?

## Finding

Round 202 put the direction in front of the text as one run-on sentence: "Read this aloud as a warm, dry, unhurried
storyteller ...: You stop at the cart." Gemini's speech models take style from the prompt itself, and with nothing
marking where the direction ends the model read it as part of the story. Google's prompting guide for these models
lays the direction out as headed notes (an audio profile, director's notes) above a section headed TRANSCRIPT; that
layout is used now, with a closing note that only the transcript is spoken. The guide was not read in this session
(Google's pages are outside its network); the layout is from its known form.

## Results

| Check | Result |
|---|---|
| Server tests | 618 pass (the request's text ends with the TRANSCRIPT heading and the passage) |
| A real call to Google | not made: the session has no Gemini key |
| Heard | no |

## Claim boundary

- Whether the model now never speaks the notes, and how the new character sounds, is known only from the owner's
  first narrations after the deploy. Clips are kept by model, voice and text, not by direction, so the server's
  in-memory clips from before are dropped only by its restart, which the deploy brings; the page keeps up to 24 of its
  own until it is reloaded.
- If the notes are still heard, the next step is Gemini's `systemInstruction` for the direction, untried here because
  whether the speech models accept it was not confirmed.
