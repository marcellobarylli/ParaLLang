# Codex critique 1: the Fountain's infohazard (round 025)

- **Dispatched:** 17:33:40 UTC (journal row 4)
- **Returned:** 17:35:01 UTC (the command's closing `date -u`)
- **Model:** `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, model gpt-6.1-sol (as printed), session 01a1acc5-e359-76f1-88d0-2273c7b7e9bb
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is in the bundle on stdin (a plan and the relevant content and source files with line numbers). Critique the plan for round 025 of ParaLLang, a language-learning game where LLM-voiced NPCs speak a mix of English and the target language (Italian or Spanish) and the player must answer objectives in the target language; NPC lines must not give away the answer to an open objective. Find errors (things that would break, give answers away, mis-grade, or teach wrong Italian/Spanish), risks and better alternatives. Check the Italian and Spanish. Number each finding and label it Error, Risk or Suggestion. Be concise."
- **Reviewed input:** bundle `/tmp/r025-bundle.txt` (sha256 be130477…, 371 lines): `plan-v1.md` (sha256 9706ed2d…), `content/characters/enemies/letharger_flick.yaml`, both packs' `cracked_fountain_letharger.yaml`, `content/world/locations/cracked_fountain.yaml`, `prompts/system/base.txt`, `server/src/llm/prompt-builder.js` 19–80, the fountain vocabulary forms; HEAD 3acbc61, working tree: round 024 journal row 12, `docs/rounds/025/` untracked
- **Findings:** 7

## Raw output (verbatim)

```text
1. **Risk — Safe jingle text does not guarantee safe NPC lines.** Plan lines 24–27 establish only that the jingle contains no target. Flick could explain it with “Say *adesso*, not *domani*,” leaking an open answer. Extend the live checks to greetings, retries and objective transitions, covering every open target’s surface variants and answer-bearing phrases.

2. **Risk — NPC instructions enter the grading rubric.** The expanded `now.intent` reaches both narrator and grader (`prompt-builder.js`, lines 3–15). “Humming it back is giving in” could cause rejection of a valid refusal that quotes the jingle: `No, adesso! Non domani!` or `¡Ahora, no mañana!` Test these alongside bare repetition; explicitly scope rejection to answers that actually agree to postpone.

3. **Risk — Repetition can satisfy the language ratio mechanically.** A three-word jingle on half the lines can dominate short NPC replies while the surrounding dialogue stays English. Measure the requested language mix with the repeated refrain excluded as well as included, and check that meaningful beginner dialogue remains.

4. **Error — Existing Italian negative example mislabels valid Italian.** Italian encounter lines 33–34 reject `Stop!` as necessarily English-only. *Stop!* is also an established Italian interjection used to order a halt. If the exercise requires particular vocabulary, describe that restriction accurately; otherwise this can mis-grade a legitimate Italian response.

5. **Risk — The briefing asserts comprehension without evidence.** “Which now includes you” (plan line 33) declares the player susceptible before they have demonstrated understanding of the jingle. That weakens the central comprehension-dependent mechanic. “If you understood it, congratulations” preserves the deadpan voice and the condition.

6. **Suggestion — Test the catchphrase behavior itself.** “Jingle in at least half the lines” allows the words anywhere, including narration, and does not verify the proposed sentence-ending symptom. Check that Flick appends the exact refrain to dialogue, keeps narration English, and retains its feed voice across repeated runs.

7. **Suggestion — Keep the authored spellings distinct from vocabulary IDs.** Both `Dopo, dopo, domani!` and `¡Después, después, mañana!` are grammatical jingles. Preserve Spanish accents and inverted punctuation in displayed text; `despues` and `manana` are IDs or tolerated input variants, not spellings to teach.
```
