# Round 043 findings

## Question

Can the Party screen tell the player that finished conversations lead to a story (the owner question left by
rounds 032–033), without naming the story, and stay in step with the Spellbook?

## Finding

Yes, in tests. Each party member's card now carries a countdown: "2 more finished conversations until Gerald tells
you a story." Once the story is found, it reads "Gerald has told you a story. It is in your Spellbook." The server
derives both from the same rule it uses to file the fragment in the Spellbook (`isHomeMember`), so the hint and the
Spellbook cannot disagree. Opening the Party screen refreshes the party.

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 8 findings (no Errors), 7 accepted and 1 in part.
- A draft was in the working tree before the critique returned (journal row 5).
- Linux compute node. No LLM calls: no prompt or content changed, and conversation counts come from saved
  envelopes.

## Results

| Check | Before | After |
|---|---|---|
| server | 163/163 | 165/165 (story progress, it and es) |
| mobile jest | 110/110 | 120/120 (story hint 10) |
| web vitest, web build | 12/12, ok | unchanged |

## Decision

Keep it. G1 is done.

## Evidence

The round's build commit; journal rows 4–8. Files: `server/src/learning-service.js` (`isHomeMember`,
`storyProgress`), `mobile/src/components/PartyPanel.js` (`storyHint`), `server/test/lore-fragments.test.js`,
`mobile/src/__tests__/party.test.js`.

## Claim boundary

Tests only. The hint has not been seen on screen or heard through VoiceOver (critique 1.6). No pack has two
conversation thresholds for one member, so the two-threshold case is tested on a stand-in list only.

## Open items

1. Owner, Simulator: check the hint on the Party screen, and that VoiceOver reads it on the member's card. Finish a
   third coffee break with Gerald, then confirm the line changes to "has told you a story".
2. Owner: review the wording, and whether a count without the story's title is the right amount to reveal.
