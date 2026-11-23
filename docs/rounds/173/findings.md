# Round 173 findings

## Question

Why did the next conversation ask for a greeting and a name again, and does streamlined mode make each unit one
conversation, with the next conversation the next unit?

## Finding

The repeat was the pacing's design, not necessarily a failed check: a unit is three lessons (Saying hello, Names, How
you are), each a conversation, then reviews and a gate; a lesson below 60 % comes back later, and the next unit opens
at 80 % on the gate. Streamlined mode, now on by default, makes each unit one conversation and the next conversation
the next unit's. The owner's save could not be read here, so which of the two happened is not known.

## Method

Server and web-client tests against the real service with a scripted grader; a production build of the page. Not
played in a browser and no model called.

## Results

| Check | Result |
|---|---|
| Server tests | 581 of 581 (578 before; 3 new in `streamlined.test.js`). Tests of the full pacing switch the mode off |
| Web client tests | 296 of 296 (295 before; 1 new: streamlined by default, unit after unit, switched off in Settings) |
| Aesthetic package tests | 95 of 95 |
| Client build | Succeeds |

## Open items

- The owner plays a few units streamlined and says whether one conversation a unit (three objectives) is right.
- Not seen in a browser or on a phone.
