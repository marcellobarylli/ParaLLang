# Round 045 plan v1: objectives met in any order (backlog G3)

Round 023 deferred "unordered objectives". Today the engine advances one index (`objectiveIndex`): a turn closes
only the leading run of passed objectives, so a player who answers the second objective first gets nothing for it
(round 044's critique found such a turn in `022/results/party-es-1.json`: `[praise_coffee false, thank_gerald true]`).
For some scenes the order is arbitrary: at Mortimer's tasting, asking for more before saying you like it is natural.

## Decisions (autonomous, pending owner review)

1. An encounter may set `objectives_unordered: true`. Its objectives can be met in any order; every passed
   objective in a turn closes. Default false: every existing encounter behaves exactly as today (Gerald's golden
   prompts unchanged).
2. First user: Mortimer's tasting (`mortimer_tasting`, it and es). Other encounters stay ordered (the tutorial's
   greet → introduce → ask back, the Fountain's stop → direction → now, reading passages in order).
3. The "current objective" shown in the app is the first open objective in authored order.

## Design

1. Loader: `objectives_unordered: z.boolean().optional()` on the encounter schema.
2. Session: `passedObjectiveIds: []` beside `objectiveIndex`. Helpers `openObjectives(session)` (ordered: slice from
   the index; unordered: authored order minus passed) and `currentObjective(session)` (the first open one). Every
   `objectives[objectiveIndex]` use goes through them (serializeEncounter, currentRevealKeys, help, submit).
3. Submit: ordered — unchanged (leading passes). Unordered — every passed result among the open objectives closes;
   resolved when none is open. `objectiveIndex` stays the number closed (for code that only counts). SM-2
   scheduling uses the set of objectives closed this turn (`advancedObjectiveIds`), as today.
4. Narration and grading prompts get the open objectives in authored order (as today for ordered encounters).
   `decision.nextObjectiveId` is the first open one.
5. Reveals are per objective id already; the current objective's reveals apply.

## Tests

- Loader accepts the flag; an ordered encounter's behaviour is unchanged (existing suites, golden prompts).
- Unordered: a turn that passes only the second objective closes it; the current objective stays the first; the
  next turn passing the first resolves; a turn passing both resolves at once; a failed turn changes nothing; the
  narration prompt lists only the open objectives; the resolving response and party count as today.
- Ordered: the same out-of-order turn still closes nothing (regression).
- Live (after Codex's reset): `play-market.js --party --member butchers_stall` in it and es, with an out-of-order
  script (ask for more first, then the verdict); measure with `leak-scan.js`.
