# Round 188 findings

## Question

What is the lightest change that puts the world into a conversation's second line, made of that conversation's
exercise, and nowhere else?

## Finding

One sentence of turn data on the reply to the player's first answer, and two lines of the world block changed. In
tests the road conversation's narrator calls carry `world_moment` on the second call only: greeting no, first answer
yes, second answer no.

## Results

| Check | Result |
|---|---|
| Server tests | 614 of 614 (612 before; 2 new, 1 changed) |
| Gerald's pinned prompts | unchanged |
| A live model's second line | not checked |

## Claim boundary

- Scripted provider only. Whether the model's remark really comes out of the exercise's subject, and stays clear of the
  noticed line's wording, needs a live conversation on the hosted server.
- The A1 conversation rules ask for short lines on the conversation's words; the remark is one short statement, but
  how it sits with those rules at A1 was not seen live.

## Open items

- The owner plays two or three road conversations and reads the second line of each.
