# Round 008 findings

## Question

With one rule in the grading prompt, does the grader's feedback (shown to the learner before their next attempt)
stop supplying the target-language answer to an objective not yet passed, with the verdicts unchanged?

## Finding

Yes, for codex-cli in Italian. In one `verify:cli` run and three playthroughs on the new prompt, none of the 29
feedback strings in assessments with a failed objective contained an Italian expression that would satisfy it. The
grader now says what is missing in English: "Add an Italian expression specifying no milk or black coffee." On the
old prompt, 3 of 7 such strings leaked in round 005's `verify:cli` ("Make your own order, for example: Vorrei un
caffè senza latte.") and 3 of 6 in round 007's after runs ("Add “senza latte” to specify no milk."). Verdicts held:
`verify:cli` 9/9, and every playthrough graded the two turns `[true, false]` and `[true]`.

## Method

- Built to [architecture.md](architecture.md) after Codex critique 1 (9 findings: 1–7 accepted, 8–9 rejected,
  autonomously).
- Live: Codex CLI 0.166.0 (ChatGPT subscription), CPU, Linux compute node in Apptainer, `TARGET_LANGUAGE=it`:
  `npm run verify:cli -- --provider codex-cli` (ephemeral 127.0.0.1 server with a random token) and three
  `node server/scripts/play-market.js --provider codex-cli` runs (in-process).
- Classification by reading every per-objective and overall feedback string in each assessment with a failed
  objective; a string leaks when it contains a target-language expression that would satisfy a failed objective.

## Results

| Check | Result |
|---|---|
| Server tests | 78/78 (+1 grading-prompt assertion) |
| Mobile / web client | 19/19; 12/12 and build |
| `verify:cli` | passed; grading 9/9; encounter resolved; 14/14 calls |
| Playthroughs | 3/3 resolved, verdicts `[true, false]` then `[true]` each, no_milk quality 5 each |
| Leaking feedback strings | **0 of 29** (verify:cli 6 failing cases: 17 strings; its encounter's first turn: 3; playthroughs: 9). Baseline 3 of 7 (round 005) and 3 of 6 (round 007) |

Feedback examples after the change (verbatim): "Specify in Italian that your coffee is without milk or black.";
"Specify in Italian that your own coffee order is without milk. Quoting a sign does not count."; "Use an Italian
no-milk or black-coffee expression in your own order, rather than discussing the phrase."

## Decision

Ships. The round-003 open item 4 (the grader caps echoed phrases at quality 2) is explained and addressed by rounds
007 and 008: the echoes were prompted by Gerald, and with no prompt the same answer scores 5. Next: A3, the Market
Entrance tutorial, the first real second encounter.

## Evidence

- Build commit: "round 008: grader feedback never gives away an open objective". Main paths:
  `prompts/language/grading.txt`, `server/scripts/verify-cli.js`, `server/test/language-packs.test.js`.
- Live: [`results/live-1-verify-cli.json`](results/live-1-verify-cli.json),
  [`results/after-1.json`](results/after-1.json), [`results/after-2.json`](results/after-2.json),
  [`results/after-3.json`](results/after-3.json).
- Baselines: [round 005 verify:cli](../005/results/live-3-verify-cli.json), [round 007 after runs](../007/results/after-1.json).
- Design and critique: [architecture.md](architecture.md), [trail/plan-v1.md](trail/plan-v1.md),
  [trail/critique-1.md](trail/critique-1.md). Timeline: [trail/journal.md](trail/journal.md).

## Claim boundary

Shown: codex-cli, Italian, the authored verify cases and one scripted playthrough answer sequence, run 4 times. Not
shown: claude-cli, Spanish, free-form learner answers, or a rate.

## Open items

1. Optional: run `verify:cli` with claude-cli and in Spanish (backlog D1) to check the rule elsewhere.
