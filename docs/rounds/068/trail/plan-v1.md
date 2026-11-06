# Round 068 plan v1: atmosphere variety (backlog A10b)

## Problem (round 053 live data)

The optional atmosphere line (`prompts/world/atmosphere.txt`, `getAtmosphere` / `writeAtmosphere` in
`server/src/learning-service.js`, `buildAtmosphereMessages` in `server/src/llm/prompt-builder.js`) passed its live
check (24/24 kept, English, ≤ 33 words), but 23 of 24 lines lean on one joke: bureaucracy ("approval" 9,
"complaint" 4, "filed", "application", "processing fee", "budget", "exempted"). 7 of 24 open on a smell, 8 on a
hiss or creak. Likely source: the style guide's "satire of the mundane" / "treats the absurd as mundane", read as
office comedy, and the rule "Add a small, passing detail of this moment (a sound, a smell, a movement)", which every
line follows in that order.

## Change

1. **A rule in `atmosphere.txt`:** "Take the joke from this place itself: its objects, its trade, its keeper, or a
   comparison in the spirit of its description. Not from offices: no approvals, complaints, forms, applications,
   fees, budgets or paperwork."
2. **One kind of detail per line, rotated:** replace "(a sound, a smell, a movement)" with `{{detail}}`, filled by
   `buildAtmosphereMessages` from a fixed list (`ATMOSPHERE_DETAILS`: a sound, a smell, a movement, the light, the
   air or the temperature), chosen by the location's index in `content.world.locations` and the state
   (none/open/complete), so neighbouring places and the two states of one place differ. Deterministic: no
   randomness, golden tests stay stable.
3. Style guide, cache, length and vocabulary checks unchanged. Off by default, as before.

## Tests

- The filled prompt holds the new rule and exactly one detail kind; no "(a sound, a smell, a movement)" list.
- Over the six locations × open/complete, at least four different detail kinds; open and complete of one place
  differ.
- Existing atmosphere tests pass (`server/test/atmosphere.test.js`).

## Live

`docs/rounds/053/results/atmosphere-live.mjs`, codex-cli, it and es (12 calls each), outputs in round 068's results.
Success: all round 053 criteria again (≥ 5/6 kept per pack, English, ≤ 40 words, consistent), plus the bureaucratic
motif (same keyword scan as round 053: approv, complain, application, paperwork, filed, filing, subscription, fee,
budget, exempt, administrative, rejected, declined, appeal, processing, rent, restriction, responsib) in at most
6 of 24 lines (baseline 23/24), and no single opening sense in more than 8 of 24 lines.
