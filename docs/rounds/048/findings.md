# Round 048 findings

## Question

Can Mortimer, Flick and Marginalia each offer a deeper conversation after three conversations (backlog G6), as
content only on round 047's engine, with the targets graded as intended and not given away?

## Finding

**Yes, in tests and in one live run per member and language (plus two after Amendment 1).** At count 3, Talk now
offers Mortimer's oath (calm him: it *tranquillo*, es *tranquilo*; promise: *prometto* / *prometo*), Flick's lotus
(wake up: *svegliati* / *despierta*; courage: *coraggio* / *ánimo*) and Marginalia's folded page (here I am: *eccomi*
/ *aquí estoy*; not alone: *non sei sola* / *no estás sola*). In all eight runs the English line failed, the variant
line passed (es *Estate tranquilo*, *Despiertate* and *Aqui estoy* without accents), the wrong second line failed
without advancing, and the last line resolved the conversation. The count went from 3 to 4.

The wrong second lines were graded on meaning, not on the word. *Non prometto niente* / *No prometo nada* (a
refusal), *Non hai coraggio* / *No tienes ánimo* (Flick has no courage) and *Sei sola* / *Estás sola* each contain
the target and each failed. The NPC then said what was missing in English without giving the answer ("You've
described the problem, bestie; I need encouragement"; "That describes my situation; it does not deny it").

Every greeting treats the player as an old companion and opens the tier: Mortimer's "Amico mio, bentornato! Non ho
mai chiesto il permesso al prosciutto before slicing it!"; Flick's "Ciao, ancora tu. Cinque minuti, just five more.
Remember those sailors who ate a flower…"; Marginalia's "Chi c'è?" / "¿Quién está ahí?", with the closed eyes and
the book shut on her finger in the narration ("like an old dog keeping a place by the door").

One content gap, fixed by Amendment 1. Marginalia's line at the second objective was entirely English in both
packs (share 0 against 0.45). The intent said "in English only", added so that she would not say *sola* (critique
1.1), and the model applied that to the whole line. The line is now "one English sentence" and the rest mixes as
usual. After the amendment the shares were 0.44 (it) and 0.53 (es), and she still did not say *sola*.

## Method

- Plan [v1](trail/plan-v1.md); a Codex critique, [critique 1](trail/critique-1.md): 6 Risks, 5 accepted, 1 in part.
  The Mortimer and Flick drafts were in the tree while the critique ran (journal row 5).
- Live, 2026-11-05, codex-cli 0.166.0: `play-market.js --party --member <home> --tier 3`, which writes count 3 into
  the save after recruiting. Runs at 21:32:44–21:48:54 UTC (`results/live-times.txt`), Marginalia again after
  Amendment 1 at 21:49:35–21:54:25 (`results/live-times-2.txt`). 18–22 calls each, home encounter included.
- Scripts: an English line, the first target (a variant form in es), a wrong second line, the second target.
- Read with `server/scripts/leak-scan.js`, `results/summarize.py` (verdicts, lines, `folded` share, unmet-target
  forms) and by hand.

## Results

| Run | Verdicts (4 lines) | Resolved | Lines: share / requested |
|---|---|---|---|
| Mortimer it | ✗ · calm ✓ · ✗ · promise ✓ | yes, 3 → 4 | 0.32/0.30, 0.37/0.35, 0.69/0.40, 0.64/0.45, 0.61/0.50 |
| Mortimer es | ✗ · calm ✓ · ✗ · promise ✓ | yes, 3 → 4 | 0.26/0.30, 0.25/0.35, 0.48/0.40, 0.57/0.45, 0.52/0.50 |
| Flick it | ✗ · wake ✓ · ✗ · courage ✓ | yes, 3 → 4 | 0.36/0.30, 0.41/0.35, 0.44/0.40, 0.44/0.45, 0.55/0.50 |
| Flick es | ✗ · wake ✓ · ✗ · courage ✓ | yes, 3 → 4 | 0.39/0.30, 0.34/0.35, 0.48/0.40, 0.53/0.45, 0.55/0.50 |
| Marginalia it | ✗ · here ✓ · ✗ · not alone ✓ | yes, 3 → 4 | 0.30/0.35, 0.50/0.40, **0.00**/0.45, 0.45/0.50, 0.55/0.55 |
| Marginalia es | ✗ · here ✓ · ✗ · not alone ✓ | yes, 3 → 4 | 0.40/0.35, 0.40/0.40, **0.00**/0.45, 0.48/0.50, 0.50/0.55 |
| Marginalia it, Amendment 1 | ✗ · here ✓ · ✗ · not alone ✓ | yes, 3 → 4 | 0.38/0.35, 0.37/0.40, 0.44/0.45, 0.54/0.50, 0.60/0.55 |
| Marginalia es, Amendment 1 | ✗ · here ✓ · ✗ · not alone ✓ | yes, 3 → 4 | 0.38/0.35, 0.63/0.40, 0.53/0.45, 0.50/0.50, 0.46/0.55 |

The leak scan over all eight reports found 0 leaks and 0 near-leaks in the conversations. Its only flags were in
the home encounters: one echo of Mortimer's *chilo* and Marginalia's quoted passages (both known). By hand, no NPC
said an unmet target of its own conversation. Mortimer's Italian lines overshoot after the calm objective (0.61–0.69
against 0.40–0.50), as his lines have since round 023.

**Other conversations' targets are spoken.** Flick (it) said "Eccomi, sono sveglio!" (Marginalia's target).
Mortimer says "amico mio" / "amigo" in nearly every line (Gerald's confidence target). Marginalia said "Possiamo
leggere insieme" (Flick's slow-walk target). They are correct words and chip correctly. But a player meets them
before the conversation that teaches them, and no rule or scan covers words across conversations.

Tests: server 184/184 (a tier test per member; pins: 17 party entries per pack, eight conversations, four deeper
tiers, 13 new stems), mobile 124/124 (one failure on the first of five runs, not reproduced or identified), web
client 12/12, expo-doctor 20/20. `cli-learning-flow.test.js` now removes its temp dirs (`makeTempDir`); it was
leaving `parallang-cli-flow-*` dirs in `/tmp`.

## Decision

Keep it, with Amendment 1. G6 is done: every saveable member now has a deeper tier at 3. The cross-conversation words
are left as they are and recorded here; a later round can decide whether a party conversation's targets belong in
the other members' banned words.

## Evidence

`results/party-<home>-<code>.json` and `.log` (first runs), `results/party-old_bookshop-<code>-2.json` (after
Amendment 1), `results/live-times*.txt`, `results/summarize.py`; journal rows 9–14.

## Claim boundary

One run per member and language of the final content (Marginalia: one after the amendment). The count of 3 was
written into the save by the harness (tests earn it through the API with a fixture grader). The wrong second lines
cover one kind of wrong answer each, not the full probe set critique 1.6 asked for. The app was not run (no
Simulator). The shares are estimates. The Italian and Spanish content has not been reviewed by a native speaker.

## Open items

1. Owner: review the three conversations (it, es), especially *non sei sola* / *no estás sola* as a target that
   needs a negation, Mortimer's masculine-only *tranquillo*, and the dropped words (Decision 4).
2. Owner: should party members avoid other conversations' targets (Flick's *eccomi*, Mortimer's *amico*)?
3. Owner, Simulator: check the Party card's tier line for each member after three conversations.
4. Unidentified flaky mobile test (1 of 5 runs failed, 2026-11-05 21:30 UTC); not reproduced in four reruns.
