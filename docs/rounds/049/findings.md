# Round 049 findings

## Question

How often do NPC lines carry a target that another party conversation teaches ("other-target exposure", backlog
G7, from round 048), and is that a giveaway that needs a content rule?

## Finding

**It is common, and it is everyday vocabulary, not a giveaway. No content rule (autonomous decision, pending owner
review).** In round 048's runs, the current-content cohort, 10 of 20 Italian and 7 of 20 Spanish party-conversation
lines hold an exact form of another party conversation's target. In earlier cohorts it is 0–33%. Read word by word
(`results/measure.txt`), the words are the commonest of conversational Italian and Spanish:
- *grazie* / *gracias* (Gerald's coffee break), 17 and 15 hits;
- *ancora* (Mortimer's tasting; NPCs mostly mean "still": "ho ancora paura"), 16;
- *andiamo* / *vamos* (Flick's slow walk), 11 and 10;
- *otra vez* (Marginalia's fragment), 9;
- *amico* (Gerald's confidence; Mortimer's "amico mio" as a form of address), 6;
- *insieme* / *juntos*, *bueno*, *me gusta*, and *eccomi* once.

A player who later meets one of these as a target has heard it in context first. That is input, not the answer.
Every objective still needs the player to produce the word, in the right sense, and the grader judges the sense
(round 048: *Non prometto*, *Sei sola* failed with the target present). So the cross-conversation words stay.

**One authored case.** *Sola* (Marginalia's folded-page target since round 048) is in her own first-tier passage,
read aloud word for word: "Il mare risponde in una lingua sola" / "El mar responde en una sola lengua". It means
"only" there. Round 048 checked new targets against fragments and other entries, not against other conversations'
authored passages. It is kept: the sense differs, and the objective needs a negation addressed to her.

## Method

- Plan [v1](trail/plan-v1.md); a Codex critique, [critique 1](trail/critique-1.md): 9 findings (4 Errors), 7
  accepted, 2 in part. The plan's "under 5% closes G7" rule was dropped (critiques 1.3, 1.5), so the decision came
  from reading the words. The draft was run once before the critique returned (journal row 5).
- `server/scripts/leak-scan.js`: `foreignFormsFor` (whole forms of every party target, minus the scene's own entries
  and own surfaces), per-line `foreign` hits computed apart from the four kinds, per-message echo, `amigo` marked as
  an English look-alike. The four existing kinds' output is identical to the round 044 scanner over all 102
  reports (diffed).
- `results/measure.mjs` over every `docs/rounds/*/results/*.json`, against today's content: tables by cohort,
  language, scene and owner. No live LLM calls.

## Results

| Cohort | Party lines | With another conversation's target | Home-encounter lines | With one |
|---|---|---|---|---|
| 048 it | 20 | 10 (50%) | 24 | 3 (13%) |
| 048 es | 20 | 7 (35%) | 24 | 8 (33%) |
| 047 it / es | 8 / 8 | 0 / 2 | 6 / 6 | 0 / 0 |
| 026 it / es (greeting replays) | 16 / 16 | 4 / 4 | 69 / 66 | 10 / 7 |
| 023 it / es | 12 / 12 | 4 / 3 | 18 / 18 | 3 / 4 |

By scene, all cohorts: Mortimer's oath (it 4/5, es 3/5) and Flick's lotus (it 4/5, es 2/5) are highest, mostly
*amico*, *grazie* and *ancora*. Gerald's coffee break has none (0/19 it, 0/12 es). Marginalia's fragment is 6/8 in
both languages because of the authored *sola*.

Tests: server 188/188 (4 new scanner tests), mobile 124/124, web client 12/12.

## Decision

G7 is closed with no content or prompt change. Other-target exposure stays in `leak-scan.js` as a reading aid,
printed apart from the four kinds. A later round that adds a party target should check it against every other
conversation's authored intents, as well as fragments and entries.

## Evidence

`results/measure.txt` (from `results/measure.mjs`), `server/test/leak-scan.test.js`; journal rows 9–10.

## Claim boundary

Exact whole forms only: inflected forms (*amica*, *grazie mille* aside) and words inside phrases are not counted, so
these rates are a lower bound. Old reports are read against today's content, so earlier cohorts show what those
lines would expose today, not what the player could know then. Round 048 is one run per member and language. The
words were classed as "everyday" by reading them, not by a frequency list.

## Open items

1. Owner: is hearing a later conversation's word first acceptable (decided yes), and should Mortimer's "amico mio"
   stay part of his voice?
2. Owner: keep *sola* although Marginalia's first-tier passage says "una lingua sola" ("only")?
3. The four existing kinds still find echoes in the joined text of earlier messages (critique 1.7). The foreign hits
   check each message, the four kinds do not, and that was left unchanged.
