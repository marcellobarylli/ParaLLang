# Critique 1: the round 101 plan

- **Dispatched:** about 08:25:00 UTC 2026-11-06
- **Returned:** about 08:27:00 UTC (122 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC). Scratch replay in `/tmp/rc101`, deleted.
- **Prompt:** adversarial read-only critique of `plan-v1.md` against leak-scan.js, its tests, the pass rule in
  `learning-service.js`, the schema, the encounters, round 044's findings and the committed reports: wrong claims of
  optionality, shared forms, real give-aways hidden by `soft`, Errata's English rule, kind order, comparability,
  missing tests, anything simpler; numbered Error / Gap / Cut with file:line; an Optional section; under 600 words.
- **Reviewed input:** `plan-v1.md`, sha256 2b273e00…, HEAD 215ee2c, working tree: docs/rounds/101/ new
- **Findings:** 6

## Raw output (verbatim in wording; bullet layout condensed when saved)

```text
Six problems; two are errors that would hide real give-aways. Checked with a scratch replay of the plan's rule over all 149 committed reports through scanReport (deleted).

1. **Error — English forms would hide real target-language leaks.** ENGLISH_FORMS (leak-scan.js:140-143) holds basta, ciao, hola, chilo, kilo(s), salame, chorizo, cafe, dos, yo — mostly required answers, and NPC lines are mostly Italian or Spanish. The replay turns these leaks into soft: Errata's "Non basta" (rounds 015, 026, 067; basta required by stop_now, the_rift_errata.yaml:70), Portia's "Ciao!" (026, two lines) and "¡Hola!" (009, 019, 026). Round 044 (findings.md:22) counts Portia's greeting as a real leak. Contradicts decision 5 (homonyms stay leaks) and the Source paragraph, which lists basta among the leaks that remain. Recommendation: for NPC lines mark English through a narrow list, { it: ['espresso'] } (Gerald's "shots"); leave ENGLISH_FORMS to round 100's English texts.

2. **Error — Mortimer's numbers are not frame words.** For quantity the grammar constraint says (butchers_stall_charcutier.yaml:48) "a number, un/una or a half … a bare unit does not pass". mezzo is the "half" option itself, tre/cento are numbers the answer needs. learning-service.js:898 only enforces the groups; the grader still fails a bare unit, so these forms carry half the answer. None hit in committed reports, so it costs nothing to fix now. Recommendation: only vorrei/quiero, io/yo, nome/nombre are frame words, listed by id with a reason each; Mortimer's numbers stay leaks; drop or invert the "tre is soft" test.

3. **Gap — open item 2 is only half closed.** Round 044's item (findings.md:91) names sono as a frame word, but sono is in a required group (the_rift_errata.yaml:93, [mi_chiamo, sono]), so "Sono Errata" / "Sono qui" (067, 072) stay leaks. Recommendation: say so in the plan and findings; accept sono as a key form or carry the item over; don't report it as closed.

4. **Gap — soft changes what leak means across rounds.** In the replay it leak falls 98 → 45 (53 soft), es 29 → 9 (20 soft); from round 051 on, it 15 → 5 and es 8 → 0. Round 044's numbers (Errata 18, Gerald 19) and round 100's 98/29 count the old leak. Tests asserting leakLines (leak-scan.test.js:55,73,78,89,121) pass, but the field's meaning changes. Recommendation: print "leak N (+soft M = old leak)"; state in the findings that leak was redefined.

5. **Gap — frame marking must go by entry id, not surface form.** formsFor (:103-107) returns only {objective, form}; a form shared by an optional and a required entry could not be told apart. No such overlap exists today (checked every optional form against its objective's required forms, both packs). Recommendation: add id to formsFor's output and decide frame from the id; a content test that no frame form folds to a required form of the same objective.

6. **Gap — kind order hides fresh word hits.** With leak > soft > near, a line with a frame hit and a fresh word of a required multi-word form (nome + "chiamo" from mi chiamo) becomes soft, though the word hit is the stronger hint. Recommendation: order leak > near > soft, or near whenever a fresh required word hit exists; test that line.

Missing tests: "Non basta" stays leak, Portia's "Ciao!" stays leak, the frame + word ordering line, frame decided by id.

Optional
- Simpler: skip the English part (decision 2) entirely; Gerald's espresso lines are all before round 051 except 067, 072, 078 and 080 (one each); a short note covers them better than a new rule.
- Errata's ENGLISH_SPEAKERS / ENGLISH_COLLISIONS handling has no conflict: none of those words is a single-word target form. Two English lists now sit side by side; one comment saying which covers what would help.
- Decision 6's "remaining leaks from round 051 on" should be checked against the replay: 5 it lines (Flick's ora ×3, Errata's sono ×2) and 0 es; if finding 1 is adopted, Errata's 067 "Non basta" stays a leak too, making 6.
```
