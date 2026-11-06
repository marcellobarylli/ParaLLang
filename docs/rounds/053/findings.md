# Round 053 findings

## Question

Does the optional LLM atmosphere line (`PARALLANG_ATMOSPHERE=on`, `GET /api/world/atmosphere`) give one short
English moment per location that fits its description? Success: at least five of six lines kept per pack, every kept
line in English, at most 40 words, consistent with the description (backlog A10).

## Finding

**It passed, with margin: 24 of 24 lines kept (12 per pack), with no drop. The lines are very samey.**

- **Every line met the rules.** Each was English with no target-language word, and 19–33 words long (at most 40
  allowed). Each fitted its place and state: Gerald's machine hissing, the archway creaking, dust and grit at the
  Fountain, pages in the bookshop, a crackle "half a beat late" in the Rift. No line added a character, quoted
  anything, or told the player what to say. Each call took 4–11 s.
- **The lines are monotonous.** 23 of 24 lean on one joke: bureaucracy. "Approval" appears in 9 of them,
  "complaint" in 4, and "filed", "application", "processing fee", "budget" and "exempted" turn up too. Seven open
  with a smell, and eight with a hiss or a creak. Each line is good on its own, but a player who walks the map would
  read the same joke six times in a row.

  The atmosphere prompt itself has no bureaucratic wording, so I suspect the motif comes from the shared style
  guide's tone; I did not open the style guide to check. The feature is off by default, so this is a follow-up, not
  a failure.

## Method

- `docs/rounds/053/results/atmosphere-live.mjs` with codex-cli, in-process (no port), on a temporary save. It covers
  the six locations, each open and then complete, in both packs: 12 calls per pack.
- Run on 2026-11-06 at about 01:44–01:52 UTC, after Codex's usage-limit reset.
- Between the round's build and this run, rounds 054–066 changed nothing in the atmosphere path (STATE.md).
- Motif counts by a keyword scan over the 24 lines, read by hand.

## Results

| Pack | Calls | Kept | Words (min–max) | Drops |
|---|---|---|---|---|
| it | 12 | 12 | 19–33 | 0 |
| es | 12 | 12 | 22–33 | 0 |

Examples (actual outputs):

> The machine gave a small, apologetic hiss. Gerald narrowed his eyes at it; apparently even the equipment was
> struggling to meet the minimum standard of being worth his time. (it, Coffee Cart, open)

> A faint crackle followed your footsteps, half a beat late. Even the end of the world apparently had buffering.
> (it, the Rift, complete)

> Portia gave a tiny stone creak, the architectural equivalent of leaving someone on read. Her disapproval had
> settled into the comfortable permanence usually reserved for temporary restrictions. (es, Market Entrance, open)

All 24 lines are in `results/live-it.json` and `results/live-es.json`.

## Decision

A10 is done: the feature works as designed and stays off by default. The monotony goes to the backlog as **A10b**:
vary the line's joke, for example by giving the prompt the lines already shown in the session, or a rotating kind
of detail. Measure it by the motif count against this baseline (23/24).

## Evidence

- `results/live-it.json`, `results/live-es.json` (and their empty `.log`).
- `results/atmosphere-live.mjs`.
- [journal](trail/journal.md).

## Claim boundary

One provider, one call per location and state. Consistency with the description was judged by reading, by me, not
by a rubric. No Simulator: the italic line on the map card has not been seen on a phone.

## Open items

1. **Owner:** decide whether the atmosphere should be on by default, and whether the bureaucratic joke on every line
   is the intended tone (A10b).
2. **Owner, Simulator:** start the server with `PARALLANG_ATMOSPHERE=on` and check the line under the description.
