# Round 036 findings

## Question

Can the Spellbook tell the player where each of its seven Journey fragments came from (round 033, open item 2)?

## Finding

Yes, in tests. Each fragment now shows a source line under its title: "Told by Marginalia" for a fragment unlocked
by party conversations, "Found at The Old Bookshop" for one found by completing an encounter. The card's accessible
label carries the same words. The server adds `toldBy`, the member's display name, as the Party screen shows it. An
older server's conversation fragment, which has no `toldBy`, shows no line. Without that rule it would have claimed
"Found at" the member's home (critique 1.1).

## Method

- Planned in [plan-v1](trail/plan-v1.md). A fresh Claude subagent critiqued it, since Codex was at its usage limit:
  [critique 1](trail/critique-1.md), 3 findings accepted and 4 checks noted.
- The draft was built before the critique returned (journal row 7).
- Linux compute node. No LLM calls.

## Results

| Check | Before | After |
|---|---|---|
| server `node --test` | 157/157 | 157/157 (extended: `toldBy` for the three members, Gerald while hidden, Mortimer's tastings) |
| mobile jest | 78/78 | 79/79 (source lines, labels, no line without a source or from an older server) |
| web client vitest | 12/12 | 12/12 |
| `npx expo-doctor` | 20/20 | 20/20 |

## Decision

Keep it. The list keeps file order.

## Evidence

The round's build commit; journal rows 4–8; `server/src/learning-service.js`, `mobile/src/components/Spellbook.js`,
`mobile/src/__tests__/fragments.test.js`.

## Claim boundary

Tests only, not seen on a screen. The source line partly repeats the English `found` line.

## Open items

1. Owner, Simulator: the source line in the Spellbook, and VoiceOver reading each card's label.
