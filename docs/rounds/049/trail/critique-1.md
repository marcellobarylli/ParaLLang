# Codex critique 1: foreign targets in the leak scan

- **Dispatched:** 2026-11-05T21:56:51Z
- **Returned:** 2026-11-05T21:57:58Z
- **Model:** codex exec (codex-cli 0.166.0), `--sandbox read-only -c model_reasoning_effort=high`, no file access (bundle on stdin)
- **Prompt:** verbatim in `../results/critique-prompt.txt`
- **Reviewed input:** `plan-v1.md`, sha256 66d021659ed3…, HEAD 5bcd1b3, working tree docs/rounds/049/ only; bundle `../results/critique-bundle.txt` (286 lines, sha256 8391f7f8…)
- **Findings:** 9 (4 Errors, 5 Risks)

## Raw output (verbatim)

```text
1. **Error — Numerator and denominator cover different scenes** (plan 20, 37). Foreign lines include home encounters, but the denominator is party-conversation lines. Compute party foreign lines / scanned party lines; report home encounters separately. Count each line once, even when it hits multiple owners.

2. **Error — Exact matches can be English look-alikes** (14–15). `fold` removes accents, and `scanLine`’s English-collision filter only applies to partial-word hits. A hypothetical target `solo` would match English “a solo performance.” Preserve raw matches, flag ambiguous forms, and use reviewed target-language occurrences for the decision. Add an English-collision regression.

3. **Error — “Another conversation’s target” does not establish premature teaching** (11–13, 30). “Grazie” is ordinary conversational vocabulary; the player may already know it. Different entry IDs can also share a surface form, so subtracting own entry IDs does not remove lexical overlap. Record shared surfaces and common vocabulary separately, label the metric “other-target exposure,” and review actionable cases before prescribing avoidance.

4. **Risk — Today’s content changes the meaning of historical results** (20–22). This is explicitly a retrospective comparison, not historical leakage or a representative estimate of current behavior. Existing encounter/verdict checks also skip some old reports. Report the content revision, exclusions, and results by report round; use a current-content cohort for the closure decision.

5. **Error — An exact-only lower bound cannot justify closing G7** (15, 37). The plan excludes words within phrases and misses inflections, so under 5% exact matches does not establish under 5% premature exposure. Either narrow the closure claim to exact forms or audit partial/morphological candidates and sampled negatives before closing.

6. **Risk — Pooling can hide concentrated failures** (37–39). A pooled rate can fall below 5% while one language or conversation repeatedly exposes another’s targets; repeated historical runs can dominate it. Report rates and sample sizes by language, encounter, owner, and cohort, and define which strata govern the decision. Explain why 5% is acceptable.

7. **Risk — Echo detection can suppress phrases never spoken by the player** (scanner 141). Joining previous messages makes separate turns ending “amico” and beginning “mio” look like “amico mio.” Match each prior message independently. Test both this boundary case and a line containing one echoed foreign hit plus one fresh hit; the latter must count.

8. **Risk — Foreign-only lines could disappear behind the existing early return** (scanner 147). That return skips lines without existing exact/word hits. Compute foreign hits independently and outside that guard. Add a foreign-only fixture and assert that all four existing kinds retain their original counts and hit details.

9. **Risk — The proposed tests leave aggregation and output compatibility unprotected** (26–33). Add Spanish, surface variants, folded-form duplicates, shared owners, zero-hit/skipped scenes, and CLI/JSON coverage. Verify that owner subtotals are explicitly non-additive, `foreignLines` remains separate from `KINDS`, and existing output rows remain unchanged when new foreign rows are added.
```
