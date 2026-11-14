# Round 113 findings

## Question
Can Bambieshart from Zanzibart and a Micromort Mountain teaser go into the game as content, in both packs?

## Finding
Yes. The High Gate is a seventh map location with one encounter, and its signpost carries the Micromort Mountain
teaser. The leak tests caught one design error ("where" words) and it was fixed.

## Method
Content only (YAML), plus an ambience loop and updated test expectations. The server, client and mobile suites ran as
Slurm jobs 5377 and 5378 (failing, in the course of the build) and a final full `npm test` run (CPU).

## Results
- `npm test`: 320 mobile tests and 21 client tests pass, the server suite passes.
- No Italian or Spanish text was reviewed by a native speaker. The reference URLs were not opened.

## Decision
The High Gate is optional: not in the Rift's gate, the tour or Errata's review.

## Evidence
[`architecture.md`](architecture.md), [`trail/journal.md`](trail/journal.md), [`trail/interview.md`](trail/interview.md).

## Claim boundary
Tested only by structural and leak tests. Nobody has played the encounter against a live model.

## Open items
- Play the encounter in the Simulator and check Bambieshart's voice.
- Decide whether Micromort Mountain should become a real location (it is a signpost only).
- Decide whether Bambieshart should be saveable (needs a party conversation) or return "dying" as in the screenshot.
- Rounds 111 and 112 have no round index row, and round 112 has 10 round-log check problems from the run's last timeout.
