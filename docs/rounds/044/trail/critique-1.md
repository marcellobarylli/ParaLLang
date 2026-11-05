# Critique 1: a leak scan that catches words inside authored phrases (Claude subagent; Codex at its usage limit)

- **Dispatched:** unknown, between 20:22:00 and 20:22:30 UTC
- **Returned:** unknown, before 20:24:48 UTC (138 s after dispatch by the agent's own duration)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only by instruction (read-only commands allowed), repo access
- **Prompt:** adversarial read-only review of `docs/rounds/044/trail/plan-v1.md` against the existing leak checks
  (rounds 020, 022, 026), language-engine.js, content-loader.js, play-market.js (alignment of lines and grading),
  sample reports and the vocabulary YAML; numbered Error / Risk / Suggestion items with fixes, Optional unnumbered,
  under 600 words
- **Reviewed input:** `plan-v1.md`, sha256 1fbb478824f2de8462fed5adf79875eb3400842c3d88c57cc362e8f39f282722, HEAD
  8a6cfb6, working tree: docs/rounds/044/ and a draft `server/scripts/leak-scan.js` written during the critique
- **Findings:** 14 (5 Errors, 5 Risks, 4 Suggestions; the summary line says 4 errors and 6 risks, item 10 is
  labelled Error)

## Raw output (verbatim)

```text
I found 4 errors, 6 risks and 4 suggestions in plan v1 (`docs/rounds/044/trail/plan-v1.md`). I checked everything against the code and the 89 reports.

1. **Error: "Closed once any grading passed it" does not match how the server moves on.** `submitDialogue` (`server/src/learning-service.js` ~489) advances only over the run of passes at the start of the list and stops at the first fail. The narration prompt then gets `objectives.slice(nextObjectiveIndex)`. A real case: `022/results/party-es-1.json` has `[praise_coffee false, thank_gerald true]`. Under the plan, `thank_gerald` would be treated as closed while it was still open in the prompt. Fix: replay `objectiveIndex` the same way (start at 0, then for each counted grading add the passes before the first fail). Add a test for this case.

2. **Error: `grading[j]` does not always come before `lines[j+1]`.** `play-market.js` records every LLM output before it is validated. When `validateAssessment` throws `INVALID_GRADING`, or the narration call then fails with `PROVIDER_FAILURE`, a grading is recorded with no line after it and progress is not changed. `010/butcher-it-1.json` has 4 lines and 4 gradings, and its last grading passed `quantity` in a step that failed. `026/limit-after-tour-it.json` has 3 and 3. If such a failure happens mid-run, every later line shifts and false passes close objectives. Fix: pair gradings with the `say` steps (`ok`, `verdicts`). Count only ok steps, and use the validated `verdicts` instead of `grading[].output`. In tours, split `steps` at each `start <Name>`. Also assert `lines.length === 1 + okSays`; skip and count any scene where that fails.

3. **Error: `scenesOf` misses 11 scenes.** Reports from rounds 005–008 have top-level `lines` and `grading` but no `encounterId`; their objectives are `order_coffee,no_milk`, so the encounter is `imp_coffee_greeting`. Fix: when the id is missing, infer it from the objective ids, or fall back to `content.defaultEncounterId`. Report the inference.

4. **Error: the "89 reports" input contains files that are not scenes.** Two are not valid JSON (`005/live-3-verify-cli.json` and `008/live-1-verify-cli.json` start with an npm banner). `003` and `010` verify reports have no NPC text. `021/http-check-it.json` has no `language`. `026/replay-*.json` are greeting-only `results[]`. Fix: count each file as "not a scene" by reason. Also read the replay `results` as greeting scenes with every objective open, since they are the data round 026 used.

5. **Risk: some words will flood the results.** I listed the content words of today's multi-word forms. These are very common: it `come` (from *come ti chiami*), `caffe`, `nero`, `buon`, `giorno`, `nuovo`; es `como`, `solo`, `cafe`, `buen`, `dia`, `otra`, `muchas`. `caffe_nero` and `cafe_solo` are targets of `no_milk` too. So after `order_coffee` closes, almost every coffee-cart line will hit "caffe". Fix: drop any word that is a whole form of a target that is closed or already used. Also report counts per (objective, word) next to a control rate: the same word in lines after that objective closed.

6. **Risk: Errata's lines mix in English.** For example "Cøntainment procedure: yoùù must…". Folding turns that into English words, and English `come`, `solo` and `sin` will look like Italian or Spanish hits. Fix: a per-language stopword set, plus English stopwords for `the_rift_errata`. Or match only inside the part of the line before the "Containment procedure" marker, and add a test.

7. **Risk: the NPC repeating the player.** After a failed answer, the NPC often quotes the player's own words. That is not a leak. Fix: tag a word hit as "echo" when the word is in the previous player message (the `say "…"` step name).

8. **Risk: apostrophes and elision.** `normalizeAnswer` turns `'` and `’` into spaces, so "ancora un po'" becomes "ancora un po". That is fine if the line is folded the same way. Fix: run lines and forms through the same `normalizeAnswer(…, {stripAccents:true})` and test "po’" (curly) and "l'ho".

9. **Risk: exact word matching misses inflected forms.** `chiamo` will not hit `chiami`, nor `gusta` `gustan`. Say in findings that the word scan is a lower bound.

10. **Error: the planned test uses a form that does not exist.** There is no "un poco più" form; the Italian `ask_more` targets are `ancora` and "ancora un po'". Fix: build test fixtures from real forms in `content/languages/*/vocabulary/*.yaml`, or from a small fake pack.

11. **Suggestion: look targets up in `content.vocabularyById`** rather than `narrationEntries`, and check that the grading's objective ids still exist today. None are stale right now, but the check guards the "read against today's content" claim.

12. **Suggestion: match the way `matchCanonicalVocabulary` does.** It uses `(?<![\p{L}\p{N}_])` boundaries on folded text with whitespace normalised by `\s+`. Reuse it, or share the code, so exact hits mean the same as the game's own canonical matching.

13. **Suggestion: add tests** for:
    - a failed `say` step in the middle of a run (alignment);
    - a grading out of order;
    - the 005–008 report shape;
    - an Errata English line with "come";
    - an echo of the player's words.

14. **Suggestion: list skipped scenes and files by reason** in the CLI output, so the total ties back to 89.

## Optional
- `turn` in `lines` is the index of the line, not `committedPlayerTurns`. Label it "line" in the output.
- Keep a per-language 3-letter minimum, but Spanish `y tú` yields no content words. That is fine; just note it.
- `021/http-check-it.json` has a `party` key. Make sure the recursive finder does not pick it up as a scene.
```
