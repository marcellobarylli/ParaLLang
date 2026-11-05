# Round 045 findings

## Question

Can an encounter let its objectives be met in any order (backlog G3), so that Mortimer's tasting accepts "more,
please" before "I like it", while every other encounter behaves as before?

## Finding

**Yes, in tests and in one live run per language.** With `objectives_unordered: true` on `mortimer_tasting`, the
player asked for more first:
- the first turn closed `ask_more` while `like_it` failed and stayed current;
- the second turn was graded on `like_it` alone and resolved the conversation.

Both runs resolved, with every verdict as scripted. Under the old engine, the first turn would have counted for
nothing. Gerald's golden prompts and every other suite are unchanged, so ordered encounters behave as before.

After the early "more", Mortimer asked whether the player liked it: "Ti piace questa fetta?", "Pero dime, ¿te
gusta?". The scanner flags these as near lines, the inflected verb of the open *mi piace* / *me gusta*. Like round
044's "Vuoi latte?", they name the topic, and the player still has to give the verdict in the first person. They are
accepted.

## Method

- Plan [v1](trail/plan-v1.md); a Codex critique, [critique 1](trail/critique-1.md): 9 findings, 5 accepted, 2 in part
  and 2 rejected. Codex saw the code before the draft (a bundle on stdin); the draft was in the tree before the
  critique returned (journal row 5).
- Live, 2026-11-05: `play-market.js --party --member butchers_stall` with `--lines` in the reverse order. it
  20:57:40–20:59:38 UTC, es 20:59:38–21:01:19 UTC, 14 calls each. codex-cli 0.166.0, Linux compute node.
- Read with `server/scripts/leak-scan.js` (round 044) and by hand.

## Results

| Run | Turn 1 verdicts | Turn 2 verdicts | Resolved | Calls | Conversation lines (share / requested) |
|---|---|---|---|---|---|
| it | like_it ✗, ask_more ✓ | like_it ✓ | yes (count 1) | 14 | 0.33/0.30, 0.43/0.35, 0.50/0.40 |
| es | like_it ✗, ask_more ✓ | like_it ✓ | yes (count 1) | 14 | 0.29/0.30, 0.35/0.35, 0.45/0.40 |

Leak scan over the 16 lines: 0 leak, 2 near (above), 0 quoted, 0 echo.

Tests: server 176/176 (unordered objectives 4), mobile 120/120, web client 12/12.

## Decision

Keep it. G3 is done. Other encounters stay ordered unless a later round has a reason to change one.

## Evidence

`results/party-it.json`, `results/party-es.json` and their logs; journal rows 9–12.

## Claim boundary

One live run per language. The app was not run (no Simulator): it shows the first open objective as "Current
objective", which is unchanged code. The shares are estimates.

## Open items

1. Owner: review the choice of Mortimer's tasting and whether other party conversations (Gerald's praise and
   thanks) should be unordered too.
2. Owner, Simulator: play the tasting with "more" first and check that the current objective stays "Tell him you like
   it".
