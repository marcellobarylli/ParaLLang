# Round 032 findings

## Question

Can a party member's relationship unlock something (prototype.md §4.2 `relationship_unlocks`), using the
conversation count that round 022 already keeps, without a save change or an LLM call?

## Finding

Yes, in tests. After his third resolved coffee break, Gerald recites "The word for it", a fragment of *The Journey*
in the Spellbook. In it, Journathan drinks something dark and bitter in the Dead Branch, and the word for it died
with the branch. The text never names the drink.
- The fragment appears neither on Gerald's defeat nor on the first two breaks. A replayed attempt does not count
  again, and during a fourth break the translation is withheld as usual.
- The resolved screen notes it on the third break only ("from Gerald").
- Its text contains no vocabulary form of the pack and no word starting with a stem of the coffee break's answers
  (`buon`, `otti`, `graz` / `buen`, `deli`, `grac`).

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 7 findings (2 Errors), 6 accepted and 1 in part. The Errors were that a
  completion-based filter would show the fragment after the greeting, and that the member lookup must match the
  Party screen's.
- [Amendment 1](architecture.md#amendment-1-2026-11-05-second-opinion-rows-renumbered) renumbers the pre-run table's
  rows, which said 2.n instead of 1.n.
- The draft text hit `lingua` / `lengua`, a vocabulary entry ("no language remembers it"). It became "not even a
  dictionary remembers it".
- Inflected forms of targets were checked by hand: `è morta` (essere) and `murió`. Neither is an answer.
- Tests on the Linux compute node. No live LLM runs.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 154/154 | 156/156 (new: the stem check, and the three-break flow with a replay and a hidden fourth; extended: pack equality with N, member counts 0/2/3/9 and the wrong character, loader refusals) |
| mobile jest | 67/67 | 68/68 (note on the unlocking break only) |
| web client vitest, build | 12/12, ok | 12/12, ok |
| `npx expo-doctor`, iOS export | 20/20, ok | 20/20, ok |

## Decision

Keep it. Gerald's prototype.md unlock is done as a fragment. Unlocks for Mortimer, Flick and Marginalia, and tiers
that change the conversation itself, are open.

## Evidence

The round's build commit; journal rows 4–9; `content/languages/{it,es}/lore/fragments.yaml`,
`server/test/lore-fragments.test.js`, `server/test/party-conversation.test.js`.

## Claim boundary

Tests only. The texts await a native speaker. Three breaks is an autonomous choice, against prototype.md's 10.
Nothing tells the player that more breaks lead somewhere. That is deliberate (Dark Souls-style), but untested with
players.

## Open items

1. Owner: review the Dead Branch text (it, es), the threshold of three, and whether the Party screen should hint at
   it.
2. Owner, Simulator: the "from Gerald" note on the third break, and the fragment in the Spellbook.
