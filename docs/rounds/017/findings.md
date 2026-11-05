# Round 017 findings

## Question

Can the app's Spellbook stop giving away the answers the game is asking for (words protected in the NPC's current
line, words due for review) and show the authored vocabulary notes, without breaking the frozen web client?

## Finding

Yes, in process. While an encounter is under way the Spellbook snapshot says so (`inEncounter`), the app shows each
card's word, part of speech and mastery only, and the server refuses reviews (409 `IN_ENCOUNTER`) on create and on
submit, including a challenge issued before the encounter. Between encounters a due card hides its meaning, note and
example English until it is reviewed, and every other card is a full reference card with its note (round 003's
deferred item). Codex's critique changed the design: hiding only the current line's words, as planned, would still
have leaked through other cards' examples ("Vorrei un caffè" / "I would like a coffee") and through reviewing a
related phrase ("caffè nero", "black coffee").

## Method

- Plan [v1](trail/plan-v1.md), Codex critique 1 ([critique-1](trail/critique-1.md); 6 findings: 4 accepted, 2
  accepted in part, autonomously), built to [architecture.md](architecture.md).
- Tests only: the rules are deterministic and no prompt, content or grading changed, so no live LLM runs.

## Results

| Check | Result |
|---|---|
| server `node --test server/test/*.test.js` | 103/103 (101 before; +2 in `spellbook-encounter.test.js`) |
| mobile jest | 25/25 (22 before; +3 in `spellbook.test.js`) |
| web client vitest, build | 12/12, ok |
| `npx expo export --platform ios` | ok |

Existing tests that reviewed a word mid-encounter now resolve the encounter first (`finishEncounter` in
`server/test/helpers.js`); the restart test expects `inEncounter: false` after a restart (in-memory encounters are
lost by design). One older mobile test now passes the fixture's clock (`now`), because due is checked against the
clock.

## Decision

Keep. D3 is done apart from the Simulator check.

## Evidence

The build commit (journal row 8); `server/test/spellbook-encounter.test.js`, `mobile/src/__tests__/spellbook.test.js`.

## Claim boundary

As pre-run: the app's Spellbook and the review API. The API still sends meanings and the frozen web client still
shows them on its cards. Cross-card leaks for due cards between encounters are accepted. Not checked in the iOS
Simulator.

## Open items

1. Owner, Simulator: the Spellbook during an encounter (the explanation line, no Review buttons) and between
   encounters (due cards hidden, reference cards with notes and examples).
2. Owner, review: closing reviews during encounters, and accepting cross-card leaks for due cards
   ([decisions](../../autonomy/decisions.md), round 017 rows).
3. Test trap: a Spellbook render appended to `mobile/src/__tests__/learning-flow.test.js` came out null (cause not
   found); Spellbook-only tests live in `spellbook.test.js`.
