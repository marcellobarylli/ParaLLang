# Round 048 architecture

**Autonomous round, recorded before the run.** Designed on 2026-11-05 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail is in `trail/`
([plan-v1](trail/plan-v1.md), [critique 1](trail/critique-1.md), journal); it is not needed to implement this round.

- **Design source:** backlog G6. Round 047 built relationship tiers (`after_conversations` on party conversations;
  Talk offers the deepest unlocked tier) with Gerald's confidence as the only deeper tier.
- **Findings:** [`findings.md`](findings.md), after the build and live runs.
- **Artifact:** content only, both packs: `mortimer_oath`, `flick_lotus`, `marginalia_folded_page` (encounter and
  vocabulary file each); play-market scripts for them; updated content pins and a tier test per member. No engine
  or template change.

## Goal (pre-run)

After three conversations, Mortimer, Flick and Marginalia each offer a deeper conversation, as Gerald does since
round 047. Each picks up the member's own third-conversation fragment of *The Journey* (found at the same count)
without assuming the player read it.

## Owner decisions (pre-run)

No owner was present. Each choice is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Mortimer's oath** (fragment: the forbidden herd). His knife shakes: he has never asked a ham's permission and
   fears he is like the sailors who roasted the sacred beasts. The player calms him (it *tranquillo*, es
   *tranquilo*), then promises never to touch the sacred herds (it *prometto*, es *prometo*).
2. **Flick's lotus** (fragment: the lotus eaters). Flick lies in the dry basin murmuring "five more minutes" and fears
   it will forget the way. The player wakes it (it *svegliati*, es *despierta* / *despiértate*), then gives it
   courage (it *coraggio*, es *ánimo*).
3. **Marginalia's folded page** (fragment: the old dog). With the book and her eyes closed she asks who is there; the
   player answers "here I am" (it *eccomi*, es *aquí estoy*). She says, in English, that she has waited a very long
   time for someone to read with; the player tells her she is not alone (it *non sei sola*, es *no estás sola*; the
   target is *sola*, and the sentence must deny that Marginalia is alone).
4. **Rejected words** (a stem of theirs is in a fragment, which the round 033 check forbids): *sempre*/*siempre*
   (Sirens), *ricorda* (*riconobbero*), *aspetto* (*aspettato*), *resto* (*restava*), es *me quedo* (*quedaba*),
   *ti voglio bene* (*voglia*), *continua* (*contento*).
5. **Masculine forms only for Mortimer** (critique 1.4): *tranquillo* / *tranquilo* has no feminine or plural
   variant, since he is the one addressed; the note mentions *tranquilla* / *tranquila*.

## Design (pre-run)

1. Each conversation: `party_of` its home encounter, `after_conversations: 3`, two ordered objectives, `hint_limit:
   2`, an assessment reference (Treccani or RAE) per objective, a vocabulary file of its own (`<id>-<code>-v1`).
2. **Openings in the greeting** (round 047 Amendment 1): the first objective's intent says that in the greeting the
   member does not introduce themself or describe the place, greets the player as an old companion, and states the
   tier's opening in a line or two.
3. **Leaks** (critiques 1.1, 1.5): every intent forbids the member to say **any still-unmet target** of the
   conversation, in dialogue or narration; Marginalia's loneliness is stated in English ("I have waited so long for
   someone to read with"), never with *sola*.
4. **Grading** (critiques 1.2, 1.3): Marginalia's constraint requires denying that she is alone; negatives: the
   affirmative (*Sei sola* / *Estás sola*), a negation that still asserts it (*Non so perché sei sola* / *No sé por
   qué estás sola*), the wrong speaker (*Non sono sola* / *No estoy sola*), the wrong gender (*Non sei solo* / *No
   estás solo*). Mortimer's promise: a bare *Prometto* / *Prometo* and *Prometto di non toccarle* / *Prometo no
   tocarlas* pass; *Non prometto*, a promise to touch the herds, and questions fail.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 5536f8bb…; Codex, effort high (a bundle on stdin, no file access); raw
text in `trail/critique-1.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | *sola* invites a leak (Marginalia says she is alone) | + | Accept: the loneliness line is English in the intent; no target form in dialogue or narration | **Accepted** (autonomous, pending owner review) | Decision 3, Design 3 |
| 1.2 | Risk | A negation does not prove the meaning | + | Accept: the constraint requires denying her being alone; four kinds of negatives | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.3 | Risk | The oath needs negation and commitment grading | + | Accept: bare and negated-content promises pass; refusals and inverted promises fail | **Accepted** (autonomous, pending owner review) | Design 4 |
| 1.4 | Risk | Mortimer's feminine and plural variants are wrong answers | + | Accept: masculine form only; the variant runs use other forms (es *Estate tranquilo*, *despiertate*, *aqui estoy*) | **Accepted** (autonomous, pending owner review) | Decision 5, Live runs |
| 1.5 | Risk | Leaks from later objectives' targets | + | Accept: every intent forbids all unmet targets | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.6 | Risk | Fixture tests do not prove semantic grading | + | Accept in part: one wrong second-objective line per script (must fail without advancing); a wider probe set is more calls than this round's live budget | **Accepted in part** (autonomous, pending owner review) | Live runs |

Net change from plan-v1: Mortimer masculine-only, English loneliness line, all-unmet-target leak rule, explicit
negation and commitment negatives, a wrong second-objective line in every live script.

## Tests (pre-run)

- `party-conversation.test.js`: four deeper tiers, each at 3 on its home; the conversation id list; party entries 11
  → 17 per pack with the overlap and English-word checks; NOT_IN_PARTY for the new ids.
- `lore-fragments.test.js`: the stems list gains it *tran*, *prom*, *sveg*, *cora*, *ecco*, *sola*; es *tran*,
  *prom*, *desp*, *anim*, *aqui*, *esto*, *sola*; every fragment still passes.
- `encounters.test.js`, `language-engine.test.js`: encounter keys and aggregate vocabulary version pins.
- `party-tiers.test.js`: for each of the three members, count 2 offers the first tier, count 3 the new one (tier 3).
- Gerald's golden prompts unchanged.

## Live runs (pre-run)

codex-cli, `play-market.js --party --member <home> --tier 3`, it and es for each member (6 runs, ~12 calls each).
Scripts: an English line (fails), the first target in a variant form, a wrong second-objective line (fails without
advancing), the second target. The bar: all six resolve with those verdicts; every greeting is not a first meeting
and carries the tier's opening; `leak-scan.js` and a reading of every NPC line find no unmet target form.
