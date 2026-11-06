# Codex critique 1: narrator footnotes

- **Dispatched:** 2026-11-06T04:02:40Z
- **Returned:** 2026-11-06T04:09:05Z
- **Model:** codex-cli 0.166.0, `codex exec --sandbox read-only -c model_reasoning_effort=high`, bundle on stdin (no plugin in the sandbox)
- **Prompt:** the codex-critique template adapted for a stdin bundle, verbatim in `critique-1-prompt.txt`
- **Reviewed input:** `plan-v1.md`, sha256 fb501d8bb5fb9c9c82fc54713ed740e83da03cbb40f46070d7a3f0de050fc23d, HEAD c46e2e7, working tree: docs/rounds/081/ new; bundle 700 lines sha256 5c0cbb30… (plan, schemas.js, cli-adapter.js 1–16, style_guide.yaml, base.txt, learning-service.js 20–40, 345–470, 500–600, 800–880, 965–990, DialoguePanel.js, NarratorButton.js)
- **Findings:** 9

## Raw output (verbatim; the final message, which the log printed twice)

```text
1. **Error — high: serialization references an undefined variable.**  
   Evidence: [plan:52](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:52) specifies `{ footnote }`, but the serialization callback has `message`, with no local `footnote` binding ([learning-service.js:384](/work/ParaLLang/server/src/learning-service.js:384)). Any kept footnote takes the truthy branch and throws instead of returning the encounter.  
   **Smallest fix (0):** use `{ footnote: message.footnote }`.

2. **Gap — high: the new component prop is never supplied.**  
   Evidence: [plan:53](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:53) changes `Narration`’s signature, but its existing caller supplies only `text` ([DialoguePanel.js:85](/work/ParaLLang/mobile/src/components/DialoguePanel.js:85)). Following the listed edits leaves `footnote` undefined: a correctly serialized footnote is neither displayed nor spoken.  
   **Smallest fix (+):** add `footnote={message.footnote}` at that call site. Exercise this through `DialoguePanel` in the planned mobile test.

3. **Error — high: vocabulary matching does not enforce the stated language guarantee.**  
   Evidence: [plan:25–27](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:25) checks only pack entries and exempts homographs; [plan:79](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:79) claims this keeps footnotes English-only. The exemption set includes `once`, `soy` and `sei` ([learning-service.js:28](/work/ParaLLang/server/src/learning-service.js:28)). A footnote using Spanish `once` to mean eleven is exempted just as English “once” is. Any target-language form absent from the pack also escapes this check. Pack completeness is an unverified assumption.  
   **Smallest strict fix (+):** constrain the field to a small reviewed set of English asides using the existing schema validation; remove the vocabulary filter and exemptions. Open-ended generation plus this matcher cannot support “never”.

4. **Error — medium: the prompt contains conflicting narrator instructions.**  
   Evidence: the existing rule says characters may use internet register, but “the narrator does not” ([style_guide.yaml:9](/work/ParaLLang/content/narration/style_guide.yaml:9)). The new rule asks that narrator to use meme formats and get “ratioed” ([plan:43–45](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:43)). A model following the existing prohibition can suppress the requested meme register; following the new instruction violates it.  
   **Smallest fix (0):** amend the existing prohibition to explicitly permit evergreen meme formats in footnotes.

5. **Error — medium: the shared style rule assumes an encounter-only schema.**  
   Evidence: the plan puts instructions about the `footnote` field in the shared style guide ([plan:42](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:42)). Atmosphere generation also receives that guide ([learning-service.js:971](/work/ParaLLang/server/src/learning-service.js:971)), while its strict schema permits only `atmosphere` ([schemas.js:39](/work/ParaLLang/server/src/llm/schemas.js:39)). Whether that builder includes `style.rules` is unverified in the supplied code. If it does, an atmosphere reply following “null otherwise” by adding `footnote: null` is rejected, losing the whole atmosphere line ([learning-service.js:977](/work/ParaLLang/server/src/learning-service.js:977)).  
   **Smallest fix (0):** put the field instruction in the encounter narration prompt instead of the shared guide.

6. **Error — high: the live acceptance criteria can pass without a single visible footnote.**  
   Evidence: [plan:71–75](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:71) measures **offered** frequency, not successful display. For example, 15 of 45 NPC lines can offer overlength footnotes: all are dropped, the offered rate passes, and “no kept footnote holds a target-language word” passes vacuously. The same section also declares a 15% minimum while expressly leaving results below it unfixed.  
   **Smallest fix (0):** replace the offered-rate range and its exceptions with a requirement that each language sample contain at least one kept footnote and at least one reply without one. A zero-kept result must fail.

7. **Error — medium: the Spanish comparison baseline is unspecified.**  
   Evidence: both language runs must stay within 0.05 of round 080, but the only value supplied is explicitly Italian: `it 0.43` ([plan:74](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:74)). Applying that value to Spanish assumes comparable baselines without evidence. An unchanged Spanish share of, for example, 0.55 would fail despite no regression.  
   **Smallest fix (−):** remove this unrelated share gate. It does not establish correct footnotes.

8. **Cut — medium: counters and raw-footnote reporting add unnecessary machinery.**  
   Evidence: [plan:35–36](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:35) adds mutable counters; [plan:56–57](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:56) adds report plumbing and raw/kept output. For identical generated replies, removing these changes neither the accepted footnote nor its rendering or cadence. Serialized messages already expose the kept result.  
   **Smallest fix (−):** remove `footnoteStats`, counter assertions and raw-report additions. Keep the behavioral tests.

9. **Cut — medium: two full tours and the six-encounter verdict gate exceed this feature’s verification needs.**  
   Evidence: [plan:71–73](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:71) requires roughly 90 calls and complete scripted encounter outcomes. A correct footnote implementation can fail that gate because of unrelated grading or dialogue variation.  
   **Smallest fix (−):** retain the existing suite and use short Italian and Spanish smoke samples to check actual footnote generation, filtering and occasional appearance.
tokens used
27,724
1. **Error — high: serialization references an undefined variable.**  
   Evidence: [plan:52](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:52) specifies `{ footnote }`, but the serialization callback has `message`, with no local `footnote` binding ([learning-service.js:384](/work/ParaLLang/server/src/learning-service.js:384)). Any kept footnote takes the truthy branch and throws instead of returning the encounter.  
   **Smallest fix (0):** use `{ footnote: message.footnote }`.

2. **Gap — high: the new component prop is never supplied.**  
   Evidence: [plan:53](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:53) changes `Narration`’s signature, but its existing caller supplies only `text` ([DialoguePanel.js:85](/work/ParaLLang/mobile/src/components/DialoguePanel.js:85)). Following the listed edits leaves `footnote` undefined: a correctly serialized footnote is neither displayed nor spoken.  
   **Smallest fix (+):** add `footnote={message.footnote}` at that call site. Exercise this through `DialoguePanel` in the planned mobile test.

3. **Error — high: vocabulary matching does not enforce the stated language guarantee.**  
   Evidence: [plan:25–27](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:25) checks only pack entries and exempts homographs; [plan:79](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:79) claims this keeps footnotes English-only. The exemption set includes `once`, `soy` and `sei` ([learning-service.js:28](/work/ParaLLang/server/src/learning-service.js:28)). A footnote using Spanish `once` to mean eleven is exempted just as English “once” is. Any target-language form absent from the pack also escapes this check. Pack completeness is an unverified assumption.  
   **Smallest strict fix (+):** constrain the field to a small reviewed set of English asides using the existing schema validation; remove the vocabulary filter and exemptions. Open-ended generation plus this matcher cannot support “never”.

4. **Error — medium: the prompt contains conflicting narrator instructions.**  
   Evidence: the existing rule says characters may use internet register, but “the narrator does not” ([style_guide.yaml:9](/work/ParaLLang/content/narration/style_guide.yaml:9)). The new rule asks that narrator to use meme formats and get “ratioed” ([plan:43–45](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:43)). A model following the existing prohibition can suppress the requested meme register; following the new instruction violates it.  
   **Smallest fix (0):** amend the existing prohibition to explicitly permit evergreen meme formats in footnotes.

5. **Error — medium: the shared style rule assumes an encounter-only schema.**  
   Evidence: the plan puts instructions about the `footnote` field in the shared style guide ([plan:42](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:42)). Atmosphere generation also receives that guide ([learning-service.js:971](/work/ParaLLang/server/src/learning-service.js:971)), while its strict schema permits only `atmosphere` ([schemas.js:39](/work/ParaLLang/server/src/llm/schemas.js:39)). Whether that builder includes `style.rules` is unverified in the supplied code. If it does, an atmosphere reply following “null otherwise” by adding `footnote: null` is rejected, losing the whole atmosphere line ([learning-service.js:977](/work/ParaLLang/server/src/learning-service.js:977)).  
   **Smallest fix (0):** put the field instruction in the encounter narration prompt instead of the shared guide.

6. **Error — high: the live acceptance criteria can pass without a single visible footnote.**  
   Evidence: [plan:71–75](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:71) measures **offered** frequency, not successful display. For example, 15 of 45 NPC lines can offer overlength footnotes: all are dropped, the offered rate passes, and “no kept footnote holds a target-language word” passes vacuously. The same section also declares a 15% minimum while expressly leaving results below it unfixed.  
   **Smallest fix (0):** replace the offered-rate range and its exceptions with a requirement that each language sample contain at least one kept footnote and at least one reply without one. A zero-kept result must fail.

7. **Error — medium: the Spanish comparison baseline is unspecified.**  
   Evidence: both language runs must stay within 0.05 of round 080, but the only value supplied is explicitly Italian: `it 0.43` ([plan:74](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:74)). Applying that value to Spanish assumes comparable baselines without evidence. An unchanged Spanish share of, for example, 0.55 would fail despite no regression.  
   **Smallest fix (−):** remove this unrelated share gate. It does not establish correct footnotes.

8. **Cut — medium: counters and raw-footnote reporting add unnecessary machinery.**  
   Evidence: [plan:35–36](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:35) adds mutable counters; [plan:56–57](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:56) adds report plumbing and raw/kept output. For identical generated replies, removing these changes neither the accepted footnote nor its rendering or cadence. Serialized messages already expose the kept result.  
   **Smallest fix (−):** remove `footnoteStats`, counter assertions and raw-report additions. Keep the behavioral tests.

9. **Cut — medium: two full tours and the six-encounter verdict gate exceed this feature’s verification needs.**  
   Evidence: [plan:71–73](/work/ParaLLang/docs/rounds/081/trail/plan-v1.md:71) requires roughly 90 calls and complete scripted encounter outcomes. A correct footnote implementation can fail that gate because of unrelated grading or dialogue variation.  
   **Smallest fix (−):** retain the existing suite and use short Italian and Spanish smoke samples to check actual footnote generation, filtering and occasional appearance.
```
