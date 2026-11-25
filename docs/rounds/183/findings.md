# Round 183 findings

## Question

Can friends' turns run on Claude Sonnet 5.5, paid from the owner's monthly Max API credit?

## Finding

Built and tested with a fake Claude client; not yet seen against the real API. The session cannot hold a Claude API
key (network secrets are not offered for Anthropic's hosts), and the hosted server is out of its reach, so the first
real call is a friend's turn on the hosted page.

## Method

Unit tests of the adapter (request shape, schema, nulls, refusal, errors in the excuse) and of the routing (Claude for
friends, a friend's own Gemini key first, the owner on the primary, Gemini when Claude fails, Claude's reason when
both fail). The game's six reply schemas were converted and checked for keywords that are not sent.

## Results

| Check | Result |
|---|---|
| Server tests | 610 of 610 (7 new) |
| Schemas sent to Claude | all six without length, range or pattern keywords |
| Real Claude call | not made |

## Claim boundary

- Whether the API accepts the schemas as sent, and how long a Sonnet turn takes at low effort, are unknown until the
  first hosted turn. A refused schema would show as "Claude answered 400 …" in the excuse, after Gemini was tried.
- Cost estimate (not measured): about $0.04 a turn on Sonnet 5.5, so about 2,500 turns a month on $100.

## Open items

- A friend plays a turn on the hosted page; the server's log names the route at start.
- The owner checks the Console's usage page after a few turns.
