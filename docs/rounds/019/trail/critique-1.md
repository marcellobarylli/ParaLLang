# Codex critique 1: Portia's own words (ambient vocabulary)

- **Dispatched:** 2026-11-05 16:06:58
- **Returned:** 2026-11-05 16:08:36 (approximate; the wait loop's print)
- **Model:** codex exec (codex-cli default model), `--sandbox read-only -c model_reasoning_effort=high`, no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files: everything you need is on stdin (a plan, plan-v1.md, followed by cat -n copies of the relevant source and content files). The plan is for a language-learning game where an LLM voices NPCs: it adds 'ambient vocabulary' so the tutorial NPC Portia can speak more of the target language without giving away answers to open objectives. Critique it: errors (wrong or would break), risks (pedagogy, prompt behaviour, giving answers away, Spanish/Italian correctness, English-word collisions in chip matching), and test or measurement gaps. Number each finding, label it Error / Risk / Gap / Optional, give a concrete fix. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 494940b196c93979db4f0367094f54c230ec5ef4a588917e1b3d056b1c23edc1, HEAD 3d2b6d7, working tree `docs/rounds/019/` untracked; stdin bundle `/tmp/r019-bundle.txt` sha256 1145f876293ef5d3500a99275bcae95e8eef900201987178b75c8ab4660d0a5d
- **Findings:** 12

## Raw output (verbatim)

```text
I’ll review only the supplied text and make no tool calls.
codex
1. **Error — The causal explanation overstates the prohibition.** Plan lines 9–12 say Portia cannot use objective vocabulary, but style rule 12 expressly permits it in her own questions and remarks. **Fix:** frame vocabulary scarcity as a hypothesis; compare ambient vocabulary against a prompt clarification allowing natural NPC speech.

2. **Risk — Different IDs do not guarantee answer safety.** The proposed validator permits an ambient entry whose surface form duplicates an objective target, or a phrase containing its answer. **Fix:** check normalized surface-form overlap and manually review semantic overlap; replace “using them gives nothing away” with an explicit requirement to preserve the existing answer restrictions.

3. **Risk — Natural dialogue can still reveal future answers.** Portia asking “Come ti chiami?” supplies the later `ask_back` answer while complying with the current style rules. The narration prompt also already includes `accepted_examples` and answer-bearing grammar constraints (`prompt-builder.js:21–34`). **Fix:** define whether such modelling is allowed, inspect disclosures against **every remaining objective**, and remove unnecessary model answers from narration data.

4. **Risk — Ambient expressions invite answers the grader rejects.** “Piacere” and “mucho gusto” are plausible responses when meeting someone, but neither satisfies the authored greeting target groups. More exposure can therefore produce reasonable player answers that fail. **Fix:** explicitly decide their assessment status and test ambient-only responses, with feedback that explains any unmet requirement without dictating an answer.

5. **Risk — Agreement and usage guidance never reaches the narrator.** The proposed prompt supplies only canonical targets and meanings, omitting the planned variants and notes. “Benvenuto/bienvenido” requires agreement with the person welcomed; listing other forms in content does not tell the narrator how to choose. “Piacere” also needs an introduction-specific usage distinction from its noun/verb senses. **Fix:** pass concise usage constraints and avoid assuming the player’s gender or number.

6. **Risk — Spanish retains an Italian language cue.** The shared character sheet explicitly supplies `MERCATO`; adding Spanish `mercado` leaves competing spellings in the same prompt. **Fix:** localize the sign through pack data or mark `MERCATO` explicitly as an intentional foreign inscription, then check Spanish output for unintended Italian.

7. **Gap — The chip fixture does not exercise the new file-selection behavior.** Portia’s objective file already joins `narrationEntries` in full (`content-loader.js:175–178`). Adding ambient entries to that same file produces chips even if the new ambient-file union is broken. **Fix:** add a fixture with ambient vocabulary in a separate file; verify matching, persisted discovery, and exclusion when that file is unselected.

8. **Risk — Selecting whole files broadens exposure beyond declared ambient IDs.** A selected ambient file contributes all its entries, including undeclared siblings. **Fix:** either select ambient entries individually or document this behavior and test that sibling entries cannot cause unintended chips or answer exposure.

9. **Gap — “No English collisions” is not a matcher test.** Checking six canonical strings misses variants, phrase boundaries, punctuation, and existing Spanish collisions such as English “soy” and “yo.” The matcher implementation is absent from the supplied material, so its safeguards cannot be assessed. **Fix:** add positive and negative mixed-language fixtures, including English “soy milk,” “yo,” larger words containing target strings, and complete versus partial phrase matches.

10. **Risk — Ambient chips compete with tutorial help.** Each newest-line word reveal consumes the current objective’s two-hint allowance (`learning-service.js:35–78`). Players can spend both hints on scene vocabulary before understanding the task. **Fix:** measure this interaction and either exempt ambient definitions or provide an allowance that preserves useful objective help.

11. **Gap — The success criterion can reward superficial improvement.** Three Italian greetings averaging 0.15 neither establish reliable behavior nor address the reported per-line deficit against 0.28. Repetition, shorter English text, and unauthored connective words can also affect the result. **Fix:** define both share measures, report individual results and lengths, assess later turns and repetition, and use comparable Spanish baselines with repeated runs.

12. **Gap — Static prompt checks do not establish behavioral regression safety.** Ambient dialogue enters the grader’s conversation context even though its rubric is unchanged; byte-identical Gerald prompts cover only prompt construction. **Fix:** test copied NPC speech, ambient-only answers, failed and repeated attempts, hints, and resolution in both languages. Inspect feedback and translations for disclosures, and retain a focused service-level check for unaffected encounters.
```
