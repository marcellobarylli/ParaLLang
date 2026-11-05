# Codex critique 1: a concrete language-mix rule (round 026)

- **Dispatched:** 17:45:21 UTC (journal row 4)
- **Returned:** 17:46:24 UTC (the command's closing `date -u`)
- **Model:** `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol (as printed), session 01a1acd0-c881-7bd0-998a-e403d77b8ad1
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is in the bundle on stdin (a plan and the relevant prompt templates and source with line numbers). Critique the plan for round 026 of ParaLLang, a language-learning game where LLM-voiced NPCs speak a mix of English and the target language (Italian or Spanish) at a requested share that rises per turn, and must not give away the answer to an open objective. The plan changes the shared system prompt's language-mix rule. Find errors (things that would break, mis-measure, leak answers or make the A/B invalid), risks and better alternatives. Number each finding and label it Error, Risk or Suggestion. Be concise."
- **Reviewed input:** bundle `/tmp/r026-bundle.txt` (sha256 bf27b029…, 160 lines): `plan-v1.md` (sha256 cb51faf0…), `prompts/system/base.txt`, `prompts/encounter/greeting.txt`, `prompts/encounter/dialogue_turn.txt`, `server/src/llm/prompt-builder.js` 37–85, `content/narration/style_guide.yaml` (under a heading naming a wrong path), `server/scripts/play-market.js` 99–113; HEAD f3efed7, working tree: `docs/rounds/026/` untracked
- **Findings:** 9

## Raw output (verbatim)

```text
2. **Error — Refrain accounting contradicts the metric.** The prompt excludes repeated catchphrases, but `languageShare` counts every occurrence (plan 29; estimator 12). “Percent of the words” also leaves unclear whether excluded words remain in the denominator. Define the accounting and report both total share and share excluding repeated phrases.

3. **Error — The primary estimator cannot reliably measure improvement.** English words absent from a paraphrased translation become false target-language tokens; Italian/Spanish words also present in English become false negatives. Changing phrase structure or translation wording can improve the score without improving language mix. Validate a blinded sample with token-level language annotation.

4. **Risk — The experiment changes answer policy as well as language mix.** “Never names an open objective’s answer” is stronger than the existing rules, which permit target words naturally in NPC questions and remarks (style 12–14). That can change dialogue and progression independently of the quota. Preserve the existing policy for this A/B, or evaluate the stricter policy separately.

5. **Risk — Surface-form scanning cannot establish “no new leaks.”** It misses inflections, paraphrases and answer-revealing explanations; it can also flag natural uses allowed by the current policy. Review whether each line supplies a solution to an objective open when the line was generated, alongside automated matching.

6. **Risk — Before/after tours may compare different tasks.** If responses change progression, later calls can have different histories, open objectives and requested shares. Matching encounter averages does not fix this. Add paired replays of identical states, histories and inputs with fixed model/settings; keep full tours as integration checks.

7. **Risk — The pass bar can hide regressions.** Aggregate MAE can fall while one language or encounter worsens; “overshoot does not grow” does not specify frequency or magnitude. Define per-language and per-encounter results, separate under/overshoot measures, and explicit acceptance thresholds before running.

8. **Risk — Per-line quotas conflict with concise, natural dialogue.** Short greetings have coarse word-count increments, while requiring surrounding English explanations can encourage padding or awkward glosses. Test very short lines explicitly; consider a rolling dialogue budget with a flexible greeting allowance.

9. **Suggestion — Strengthen behavioral validation.** Regenerated snapshots and rendered-number tests verify prompt construction, not compliance. Add reviewed cases covering low/high ratios, repeated refrains, scarce safe vocabulary and open objectives. Repeat paired generations: one tour per language cannot support a strong claim about rare leaks or stochastic improvement.
```
