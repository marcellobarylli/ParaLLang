# Round 066 findings

## Question

Can the owner run prototype.md Phase 4's last task (3–5 external testers) from a written kit, without reading the
code? Does the README still describe the game as it is?

## Finding

**There is a kit now, untried with a tester:** [`docs/playtest/guide.md`](../../playtest/guide.md).

- **Where testers play.** Every tester sits at the owner's Mac. CLI providers bind the server to 127.0.0.1, so
  Expo Go on a tester's own phone cannot reach it. The critique found this; it would have stopped a first session.
- **What the guide contains:**
  - a checklist before each tester: provider check, language switch, new save, its creation time, consent;
  - a 45-minute plan by encounter, with what to watch for in each;
  - a recording table, counted by hand, because the app shows no turn count and the "Hints" counter is one shared
    budget;
  - questions to ask afterwards;
  - how to turn 3–5 sessions into tuning: NPC numbers before content.
- **The critique caught 4 wrong facts in the draft:**
  - `escalation_rate` does not exist; the field is `escalation.target_ratio_increase_per_turn`, per pack;
  - the hint counter cannot be split into word and sentence reveals;
  - the transcript cannot be read afterwards;
  - the reason given for removing saves was wrong.
  I also removed two claims of my own that I could not verify (that accents are graded leniently, and an LLM call
  count).
- **README.** It still described the Phase 2 game in three places: only Gerald, "no encounter yet" at the other
  places, and `play-market.js` with three locations. It now describes the six encounters, the Rift's seal and
  drill, the party, the fragments and the script's options.

## Method

- Drafted the guide and the README diff ([plan-v1](trail/plan-v1.md)).
- A Claude subagent fact-checked them against the code and content, standing in for Codex
  ([critique 1](trail/critique-1.md)): 11 findings, all accepted.
- Checked two facts myself by grep: the escalation field (`imp_coffee_greeting.yaml:12-13`) and the 127.0.0.1
  binding (`server/src/config.js:75`).
- Docs only: no code changed, no live runs.

## Results

| Check | Result |
|---|---|
| Server / web client / mobile | 244/244 / 12/12 / 185/185 (unchanged) |
| Facts in the guide | Every label, path and field named in it checked against the code (critique 1 and grep) |

## Decision

The kit is ready for the owner. The Phase 4 playtesting itself stays with the owner.

## Evidence

[plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), [journal](trail/journal.md), `docs/playtest/guide.md`,
`README.md`.

## Claim boundary

No tester has used the guide. The session timings (45 minutes, the per-encounter slots) are estimates from
scripted runs, not from people.

## Open items

1. **Owner:** run the kit with 3–5 testers. After the first session, fix the guide wherever it was wrong, then file
   the results as a round.
