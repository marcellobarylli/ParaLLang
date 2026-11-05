# Codex critique 1: numbers 2–12 in Flick's slow walk

- **Dispatched:** 22:58:58
- **Returned:** 23:00:46
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, effort high, read-only; bundle on stdin (no file access)
- **Prompt:** "You are an adversarial reviewer. Do NOT run any commands or read files; everything you need is in the bundle on stdin (a plan for a language-learning game round, plus the relevant content and code excerpts). Critique the plan in docs/rounds/052/trail/plan-v1.md: find errors (things that will break or teach wrong language), risks, and missing tests. Check Italian and Spanish correctness of the proposed numbers and examples, English collisions, matcher behaviour (accent folding, whole-word matching), grading pitfalls, and leaks. Output a numbered list of findings, each labelled Error, Risk or Question, with a concrete fix; then an 'Optional' list. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 b75aa69df14f38b79be572489e167119545817b1dcfeae46815deaa6ec3dd64e, HEAD 58cf236, working tree: round 052 trail only; bundle (750 lines, sha256 cd6b4f78b12fd8ae834a6a06df2b4f1b2d2f0c4cb0550f810d7317fe614dc7db): plan-v1, flick_slow_walk (it, es), flick_party (it), butcher_meats (es), letharger_flick, cracked_fountain_letharger (it), party-conversation.test.js 200–260, content-loader.js 200–260, language-engine.js 40–90
- **Findings:** 11

## Raw output (verbatim)

```text
1. **Error — Lesson comes after its prerequisite use (lines 3–18).** Flick must be encountered at the Fountain before joining the party, so this lesson cannot prepare players for their first Fountain time objective. Move number support before that objective, or describe this as later reinforcement.

2. **Risk — One answer does not teach eleven numbers (lines 38–41).** A single alternatives group lets “Tre” finish the lesson without exposing the other ten; prohibiting NPC numbers also removes their initial presentation. Add an explicit learning aid and repeated practice, or narrow the claimed learning outcome.

3. **Error — `accent_insensitive: false` is ignored by this matcher.** It always strips accents: French **très** matches Spanish `tres`, and misspelled **séis** matches `seis`. Honor the flag or explicitly distinguish tolerant recognition from correct spelling; test both.

4. **Error — Folded offsets can corrupt chips.** Removing combining marks changes string length, but match offsets index the original text. In `"e\u0301 due"`, the `due` excerpt is misaligned. Maintain an original-index mapping and test decomposed Unicode before and within matches.

5. **Risk — Collision checks miss the actual narration vocabulary (lines 27–35).** The test examines objective targets, whereas narration loads whole files. Importing Spanish butcher vocabulary also enables chips for English **kilo** and **chorizo**. **Once**, **due**, Italian **sei** meaning “you are,” and the name **Otto** need contextual handling. Test actual `narrationEntries`; keep exceptions specific to language, entry, and form.

6. **Risk — “Whole word” does not mean “target-language use.”** The matcher correctly excludes `due` inside **overdue**, but matches it in **due-to**; apostrophes and hyphens count as boundaries. Add boundary tests for punctuation, digits, underscores, compounds, and case. Semantic grading must reject English and homonym uses despite lexical matches.

7. **Risk — Number presence can pass the wrong offer (lines 39–44).** Inputs such as “Sei stanco,” “Tre ore,” “Non due minuti,” and “Cento e tre minuti” contain target IDs without offering 2–12 minutes. Explicitly constrain meaning and range. Test valid corrections such as “Non cinque, due minuti” so rejecting negation does not reject a real offer.

8. **Question — What grammar tolerance is intended?** The plan does not settle “Due minuto,” “Dos minuto,” mixed-language units, or a tentative “¿Tres?”. Define acceptable agreement slips and bargaining questions; give corrective feedback without presenting malformed phrases as models.

9. **Risk — Moving the first objective weakens existing leak protection.** The prohibition on saying `andiamo`/`insieme` or `vamos`/`juntos` currently lives in `lets_go`. Ensure it applies during the new greeting and `minutes` turns too. Test upcoming answers as well as numbers, including after failures and across objective transitions.

10. **Risk — A fixture grader cannot validate semantic grading (lines 51–55).** It can verify service plumbing while simply returning the expected verdict. Add real-grader cases for quotations, metalinguistic answers, English collisions, wrong units, digits, refusals, and agreeing to five. Verify matched-ID evidence and ordered advancement separately.

11. **Risk — Live coverage is underspecified (lines 60–67).** Four runs cannot establish correctness for every numeral and negative case; previous reports do not predict newly generated dialogue. Specify exact scripts and deterministic coverage for all eleven IDs in both packs, singular/plural noun recognition, and cross-file IDs. Scan complete reports for answer disclosure, then inspect dialogue chip spans specifically.

**Optional**

- All listed Italian and Spanish numeral spellings are correct. The Italian accepted examples are natural.
- Write explicit Spanish examples: **Dos minutos**, **Diez minutos, nada más**, **Tres**; localize the prompt and constraints.
- Add references for the new numerals and *minuto*, and describe the expanded scope of the overlap test accurately.
```
