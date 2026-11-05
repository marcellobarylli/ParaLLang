# Codex critique 1: telling the time at the Cracked Fountain

- **Dispatched:** 2026-11-05T22:04:40Z
- **Returned:** 2026-11-05T22:06:22Z (the output file's modification time)
- **Model:** codex exec (codex-cli 0.166.0), `--sandbox read-only -c model_reasoning_effort=high`, no file access (bundle on stdin)
- **Prompt:** verbatim in `../results/critique-prompt.txt`
- **Reviewed input:** `plan-v1.md`, sha256 328382f024d3…, HEAD 52b28f2, working tree docs/rounds/050/ only; bundle `../results/critique-bundle.txt` (634 lines, sha256 e8fbce20…)
- **Findings:** 13 (5 Errors, 8 Risks)

## Raw output (verbatim)

```text
The proposed Italian and Spanish forms are valid. The main weaknesses are the mismatch between “any hour” and matchable evidence, underspecified grading, and permissive success criteria.

1. **Error — Valid time statements can lack required evidence (plan lines 21, 25–34).** “Sono quasi le tre” and “Son casi las tres” state a time but contain none of the four required forms. Either expand the supported forms or narrow the acceptance promise; semantic correctness alone cannot satisfy `validateAssessment`.

2. **Error — The Italian singular path misses typographic apostrophes (lines 25–26, 41–43).** The authored `l'una` does not match `l’una`: accent folding does not normalize apostrophes. Add the curly-apostrophe variants and verify that `È l’una` passes through actual evidence validation.

3. **Risk — Omitting number vocabulary leaves a mixed-language grading ambiguity (lines 21–22, 31–34).** “Sono le three” and “Son las three” contain valid target evidence, while the shared grading prompt explicitly permits mixed English and target language. Define whether the hour itself must use target-language words or digits; avoiding entries for *due* and *once* does not resolve this.

4. **Risk — Matching a starter does not establish a valid clock time (lines 21–22, 31–34).** “Sono le”, “Son las una”, and “Sono le venticinque” can supply required vocabulary despite being incomplete or malformed. Specify the policy for agreement, valid hours/minutes, and digit notation, with corresponding negative examples.

5. **Risk — The planned negatives barely exercise semantic rejection (lines 37–49).** “Adesso” and “Che ore sono?” lack the required time targets, so their rejection does not demonstrate that the grader understands the objective. Include target-bearing negatives such as “Sono le tre?”, “¿Son las tres?”, quotations, and “Lo faccio a mezzogiorno” / “Lo haré al mediodía”, which schedule an action rather than report the current time.

6. **Risk — Ordered closure needs combined-answer tests (lines 14–16, 37–43).** An answer that passes `now` while failing `time` cannot close `now`, because only the leading sequence of passes closes. Test “Adesso!” followed by a time-only answer, and “Adesso sono le tre” / “Ahora son las tres”; assert exactly which objectives remain and whether both can close together.

7. **Risk — Italian `ora` needs a cross-objective regression (lines 14–16, 27, 48–49).** In “Che ora è?”, `ora` means “hour”, not an insistence on now. Although the longer question entry can suppress `ora` in a full-answer match, validation rematches each evidence excerpt independently, so an excerpt of `ora` remains matchable; test rejection when `now` is active as well.

8. **Risk — The narration restriction’s scope is unproven (lines 14–20, 35–36, 51–52).** The plan explicitly relies on the last objective’s intent to preserve the jingle, but puts the new prohibition in an intermediate objective. Verify that the narrator receives it during greetings, retries, and transitions; also check that Flick’s unchanged three-part character defeat condition does not prompt premature victory narration.

9. **Error — The leak threshold contradicts the authored prohibition (lines 20, 51–57).** “Never says a time itself” is incompatible with allowing one of four runs to leak. Require zero observed leaks while `time` remains open, including narration that supplies an example answer or echoes a failed attempt.

10. **Error — An explained grading mismatch still meets the success criterion (lines 9–10, 56–57).** “Every live verdict matches the script, or a mismatch is explained” permits known incorrect grading to ship. Require correction and rerun, or an explicitly unresolved failure; an explanation alone does not establish acceptance of times and rejection of non-times.

11. **Risk — The test plan does not explicitly verify the evidence contract (lines 37–40).** Adding a scripted passing verdict is insufficient unless its exact evidence survives `validateAssessment` against the complete vocabulary index. Cover full versus minimal evidence excerpts, accentless input, and competing longer forms, since matching is longest-first and overlapping matches are suppressed.

12. **Risk — Four live runs leave important acceptance paths untested (lines 47–50).** The second-run choice of plural **or** midday does not guarantee coverage of both, and midnight and minute-bearing answers have no assigned live case. Use a fixed matrix across both packs, including at least one target-bearing semantic rejection; the optional Italian tour also leaves Spanish end-to-end behavior unchecked.

13. **Risk — The hint teaches an incomplete construction (lines 32–34).** Revealing *sono le* / *son las* gives learners neither an hour number nor a complete answer, and singular one o’clock requires a different construction. Verify that a beginner can reach a complete supported answer through the available chips and hints, including a noon/midnight route.

## Optional

- Add authoritative time-expression references and `assessment_reference_ids` alongside the new rubric.
- Before rewriting a lore fragment solely to preserve existing tests (lines 39–40), inspect whether the new match is legitimate; preserve coverage of that interaction where appropriate.
```
