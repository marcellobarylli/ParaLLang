# Round 068 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), [a void first dispatch](trail/critique-0-no-access.txt),
journal); it is not needed to implement this round.

- **Design source:** backlog A10b, from [round 053's findings](../053/findings.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `prompts/world/atmosphere.txt`, `buildAtmosphereMessages` (`server/src/llm/prompt-builder.js`),
  `writeAtmosphere` and a new `atmosphereDetail` (`server/src/learning-service.js`), tests,
  `results/atmosphere-live.mjs`, `results/motif.mjs`.

## Goal (pre-run)

The optional atmosphere line should stop telling the same office joke everywhere. Round 053's lines lean on
approvals, complaints and fees: 20 of 24 by a whole-word count (`results/motif.mjs`; round 053 said 23 by a
substring scan, critique 1.4). Each line should find its joke in its own place, with a varied kind of detail, and
stay lively. Off by default, as before.

## Owner decisions (pre-run)

No owner was present; **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Generic office jokes are out of the narrator's atmosphere line, everywhere, including the Rift** (critique 1.1,
   in part). Errata's containment paperwork belongs to Errata's own voice in the encounter. The atmosphere prompt
   never receives Errata's traits, so a narrator's office joke there would be the same generic joke, not Errata's.
2. **The detail kind is fixed per place and state, not random**, so prompts stay testable and the cache stays right.

## Design (pre-run)

1. **The rule** in `atmosphere.txt` (critique 1.1): "Find the joke in this place itself: its objects, its trade,
   its keeper, or a comparison in the spirit of its description. Avoid generic office humour: no approvals,
   complaints, forms, applications, fees, budgets or paperwork."
2. **`{{detail}}`** replaces "(a sound, a smell, a movement)" in the detail rule, which now reads: "Add one small,
   passing detail of this moment: {{detail}}, drawn from something already in the description or under NOW. If that
   kind of detail does not fit this place, use a sound instead." (critique 1.3).
3. **`atmosphereDetail(world, locationId, state)`** in `learning-service.js`, exported (critique 1.2):
   `ATMOSPHERE_DETAILS = ['a sound', 'a smell', 'a movement', 'the light', 'the air or the temperature']`. The
   index is `(3 × i + s) mod 5`, where i is the location's index in `world.locations` and s is 0 for none, 1 for
   open and 2 for complete. For today's six places this gives (open, complete): 1,2 / 4,0 / 2,3 / 0,1 / 3,4 / 1,2.
   Every kind is used, and the two states of one place differ. `writeAtmosphere` computes it and passes `detail`
   to `buildAtmosphereMessages`, which fills it, defaulting to "a sound" when it is absent (old callers).
4. **Cache** unchanged: the detail is a pure function of (pack world, location, state), which the key already
   holds, for the server's lifetime (critique 1.6). The invariant is stated in a comment and tested.

## Tests (pre-run)

- The full mapping for the six locations × (none, open, complete): the values above, all five kinds over open and
  complete, open ≠ complete per place, the same answer on a second call (critique 1.6, 1.7).
- Wiring: through `getAtmosphere`, the provider's system prompt holds the rule and exactly the detail
  `atmosphereDetail` gives for that place and state, and not the old "(a sound, a smell, a movement)"
  (critique 1.7). Assertions are scoped to the rules, so a description holding a listed word does not fail.
- `buildAtmosphereMessages` without `detail` fills "a sound".
- Existing atmosphere tests pass.

## Live (pre-run)

`results/atmosphere-live.mjs` (round 053's script, also recording each row's `detail`; Optional 1), codex-cli. It
runs **twice per pack** (Optional 2), so 4 × 12 = 48 calls, written to `results/live-{it,es}-{1,2}.json`. Each line
is read by hand for two things (critique 1.5): whether it has a joke at all, and whether that joke is grounded in
the place (its objects, keeper or description) rather than generic.

## Success (pre-run)

Over the 48 lines:

1. Round 053's criteria still hold. At least 10 of 12 lines are kept in each run (drops are reported and count
   against variety, not for it). Every kept line is English, at most 40 words, and consistent with its place.
2. The motif (`results/motif.mjs`) appears in at most 12 of the 48 kept lines (baseline 20/24, so 40 of 48).
3. By hand, at least 36 of the 48 have a joke, and at least 36 are grounded in their place. Bland lines are a
   failure, not a fix.

## Claim boundary (pre-run)

One provider, two runs per pack. The humour and grounding judgements are mine, made by reading.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 24ca644d…; Codex, effort high, with a bundle on stdin; raw text in
`trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | A blanket ban suppresses legitimate humour, Errata's paperwork | 0 | Accept in part: "generic office humour"; the Rift's narrator line included (Errata keeps the motif in its own voice) | **Accepted in part** (autonomous, pending owner review) | Decision 1, Design 1 |
| 1.2 | Error | The builder lacks the selector's inputs | 0 | Accept: `atmosphereDetail` in the service, `detail` passed explicitly, formula stated | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.3 | Risk | Forced details invite invention | + | Accept: drawn from the description or NOW; fall back to a sound | **Accepted** (autonomous, pending owner review) | Design 2 |
| 1.4 | Error | The baseline is 20/24, not 23/24 | 0 | Accept: whole-word `motif.mjs`; addendum to round 053 | **Accepted** (autonomous, pending owner review) | Goal, Success 2 |
| 1.5 | Gap | Keyword counts cannot tell lively from bland | + | Accept: a hand read for joke and grounding; drops reported | **Accepted** (autonomous, pending owner review) | Live, Success 1 and 3 |
| 1.6 | Risk | The cache relies on an unstated invariant | 0 | Accept: state it and test repeatability | **Accepted** (autonomous, pending owner review) | Design 4, Tests |
| 1.7 | Gap | Tests cover presence, not mapping or wiring | 0 | Accept: the full mapping, wiring through the service, scoped assertions | **Accepted** (autonomous, pending owner review) | Tests |

**Optional**, both taken: each row's detail kind recorded in the live output, and two runs per pack.

Net change: the detail is chosen in the service and passed in, grounded with a fallback; a corrected whole-word
baseline; a hand read for humour; two runs per pack.
