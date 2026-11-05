# Round 047 findings

## Question

Can a party member's conversation deepen with the relationship (backlog G4), so that after three coffee breaks
Talk starts a different, authored conversation with Gerald, while every other conversation behaves as before?

## Finding

**Yes, in tests and in two live runs per language.** A party conversation may set `after_conversations: N`. Talk
then offers the deepest tier the member has unlocked. Gerald's confidence (`gerald_confidence`, at 3) asks the
player to tell him he is a friend, then to make the toast (it *amico*, *cin cin*; es *amigo*, *salud*). In all four
runs the English line failed, the plural friend line passed, the toast resolved the conversation, and the count went
from 3 to 4 with nothing marked on the map.

The first pair of runs found a content gap. Both greetings opened as a first meeting ("Ciao. Sono Gerald. This
market? Two espresso shots."). The Dead Branch, the reason for the deeper talk, came up only in the Spanish run's
second line. The greeting template wins over an intent unless the intent says "in his greeting" (the round 013
trap). Amendment 1 moved the opening into the greeting. After it, both openings greet an old companion and name the
dead drink:
- it: "Ciao, eccoti qui. Another coffee break together. Bene. The Dead Branch had a drink—scuro e amaro. … Its name
  died with my old home. Nessuno ricorda. Not even me."
- es: "Ah, otra vez tú. Another coffee break together. … Era oscuro y amargo—the drink back home in the Dead Branch.
  Its name died with the place. Nadie recuerda su nombre."

No NPC line gave a target away before its objective was met. After the English line, Gerald asked for Italian or
Spanish ("Can you tell me what I am to you with some Spanish?") without naming the word. After the friend line, he
said the toast was the player's ("The toast is yours"), not the toast itself.

## Method

- Plan [v1](trail/plan-v1.md); a Codex critique, [critique 1](trail/critique-1.md): 8 findings (2 Errors), 6
  accepted, 1 in part, 1 rejected (Spanish *amigo* kept). The draft was in the tree while the critique ran (journal
  row 5).
- Live, 2026-11-05, codex-cli 0.166.0: `play-market.js --party --tier 3`, which writes the count 3 into the save
  after recruiting. Before the amendment: it 21:15:50–21:17:19, es 21:17:19–21:18:41 UTC. After: it
  21:19:37–21:20:52, es 21:20:52–21:22:19 UTC. 12 calls each (home encounter included).
- Read with `server/scripts/leak-scan.js` and by hand. Shares are the `folded` estimate (round 046).

## Results

| Run | Verdicts (3 turns) | Resolved | Count | Lines (share / requested) | Greeting |
|---|---|---|---|---|---|
| it 1 | ✗✗ · friend ✓ · toast ✓ | yes | 3 → 4 | 0.24/0.25, 0.27/0.30, 0.39/0.35, 0.53/0.40 | first meeting, no Dead Branch |
| es 1 | ✗✗ · friend ✓ · toast ✓ | yes | 3 → 4 | 0.20/0.25, 0.29/0.30, 0.30/0.35, 0.45/0.40 | first meeting; Dead Branch in turn 2 |
| it 2 | ✗✗ · friend ✓ · toast ✓ | yes | 3 → 4 | 0.26/0.25, 0.21/0.30, 0.43/0.35, 0.47/0.40 | old companion, Dead Branch |
| es 2 | ✗✗ · friend ✓ · toast ✓ | yes | 3 → 4 | 0.29/0.25, 0.23/0.30, 0.36/0.35, 0.52/0.40 | old companion, Dead Branch |

Leak scan over the 16 conversation lines: 0 leak, 0 near, 0 quoted, 0 echo. The only flags, one per Italian run,
are in Gerald's home encounter: his English "espresso", known noise.

The turn after the English line runs short in all four runs (0.21–0.29 against 0.30). That line is mostly English
commentary on the English answer. The resolving lines overshoot (0.45–0.53 against 0.40), as other conversations
do.

Tests: server 181/181 (party tiers 4, loader cases 4 more), mobile 124/124, web client 12/12, expo-doctor 20/20.

## Decision

Keep it. G4 is done. Deeper tiers for Mortimer, Flick and Marginalia are content only now (backlog G6). A tier's
opening must sit in the greeting, as Amendment 1 does.

## Evidence

`results/party-it.json`, `results/party-es.json` (before Amendment 1), `results/party-it-2.json`,
`results/party-es-2.json` (after), their logs and `results/live-times*.txt`; journal rows 9–14.

## Claim boundary

Two runs per language, one before and one after the amendment, so one run each of the final content. The count of 3
was written into the save by the harness, not earned through three live coffee breaks (tests earn it). The app was
not run (no Simulator). The shares are estimates.

## Open items

1. Owner: review Gerald's confidence (it, es): the friend and toast objectives, *cin cin* without *salute*, Spanish
   *amigo* although English borrows it, and the threshold of 3, the same as the Dead Branch fragment.
2. Owner: decide whether the deeper tier should repeat for ever (today) or alternate with the coffee break.
3. Owner, Simulator: check the Party card's line "Gerald trusts you with a deeper conversation now." and that Talk
   starts the confidence after the third break.
4. Native-speaker review of both conversations and the reference URLs (unopened here).
