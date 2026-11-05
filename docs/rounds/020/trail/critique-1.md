# Codex critique 1: Portia's formalities in the target language

- **Dispatched:** 2026-11-05 16:21:25 (approximate)
- **Returned:** 2026-11-05 16:22:08 (approximate; the wait loop's print)
- **Model:** codex exec (codex-cli default model), `--sandbox read-only -c model_reasoning_effort=high`, no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files: everything you need is on stdin (a plan, plan-v1.md, then cat -n copies of the previous round's findings, the narration system prompt template, the style guide, two NPC character sheets and the tutorial encounter). The plan is for a language-learning game where an LLM voices NPCs: it adds one personality quirk so the tutorial NPC Portia speaks more of the target language, without giving away the answers to open objectives. Critique it: errors, risks (answer leaks, Spanish/Italian, the quirk's wording, measurement validity), and test gaps. Number each finding, label it Error / Risk / Gap / Optional, give a concrete fix. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 83f92471c90ff9dbdba57bd33b69fd3765daca3b920fa11f351f51ac11ad7713, HEAD 6b9a35f, working tree `docs/rounds/020/` untracked; stdin bundle `/tmp/r020-bundle.txt` sha256 cbda9831afaee6aadcf7b075bef2b6740db2aa6267f1c4f66cb37acac6b62bcb
- **Findings:** 9

## Raw output (verbatim)

```text
1. **Error — The claimed answer guard is absent.** “Words she has been given” includes active learning data, not just ambient vocabulary (base.txt:12). The style guide also permits natural questions and remarks; it does not prohibit every answer-bearing self-introduction. **Fix:** explicitly distinguish ambient vocabulary from open-objective answers and forbid modeling phrases that satisfy any unpassed objective.

2. **Risk — “Visitor’s language” can mean English.** A beginner may write mostly English; Portia’s existing uncertainty about languages compounds the ambiguity. **Fix:** say “the encounter’s configured target language,” consistently for both packs.

3. **Risk — The quirk overrules the intended balance.** “Formalities … are in it” and “only her grumbling asides are in English” imply substantially more than the requested 20% initially. Removing English can also inflate the share without adding useful target-language material. **Fix:** describe a preference for short target-language formalities while retaining beginner English context and the requested ratio; check overshoot and absolute token counts.

4. **Risk — Formalities invite precisely the open answers.** Portia can naturally introduce herself with *sono/mi chiamo* or ask *come ti chiami* before those objectives pass. “Formal” may also encourage *Lei* despite the Italian objective requiring informal *tu*. **Fix:** constrain register and review complete utterances against every still-open objective, including future objectives.

5. **Gap — Spanish has no meaningful acceptance gate.** The leak examples and numerical success thresholds are Italian-only; one Spanish run cannot establish that shared content behaves safely there. The Spanish encounter’s actual targets are not supplied. **Fix:** derive checks from each pack’s objective definitions and define Spanish share, language-correctness and leak criteria before running.

6. **Risk — The primary metric is translation-dependent.** “Not in translation” can change because the English translation changes; names and cognates distort it. Canonical coverage misses new valid phrases and can reward repetition. **Fix:** manually label dialogue tokens by language, exclude names/punctuation consistently, and report absolute target-language tokens, total tokens and phrase diversity alongside both proxies.

7. **Gap — The success thresholds do not establish the hypothesis.** Three Italian runs, compared with historical runs, cannot reliably distinguish a quirk effect from generation variance. Aggregate means can hide weak initial greetings or later overshoot. **Fix:** use contemporaneous baseline/changed runs with identical scripts and model settings; report per-run and per-turn results and frame small-sample outcomes as exploratory.

8. **Gap — Scripted successful play misses the dangerous states.** Wrong answers, English-only replies, repeated failures and out-of-order introductions can trigger helpful answer modeling. **Fix:** add these paths in both languages, including the previous *Piacere!* rejection, and inspect dialogue and feedback after each turn against the current open-objective set.

9. **Gap — Prompt inclusion proves little about behavior.** An unchanged grading prompt does not guarantee unchanged verdicts when narration changes the conversation supplied to grading. **Fix:** retain the prompt assertions, then verify expected grading and objective transitions on the changed transcripts, including negative cases.
```
