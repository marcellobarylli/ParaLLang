# Codex critique 1: kept lines, live (round 069)

- **Dispatched:** 2026-11-06 02:11:19 UTC
- **Returned:** 2026-11-06 02:12:31 UTC (the shell clock after the command exited)
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp; no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is on stdin: a round plan (plan-v1.md) for a live end-to-end check of the ParaLLang game's 'kept lines' feature, plus the relevant server code and its tests. Critique the plan: will its checks actually catch defects in kept lines with real LLM output, are any checks wrong against the code (would fail or pass for the wrong reason), what is missing, what is wasteful. Number findings; tag each Error (the plan is wrong or will mislead), Risk, or Gap; put nice-to-haves under 'Optional'. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 29502670…, in a 424-line bundle on stdin (sha256 db65f1285ef328a1…: plan-v1, learning-service.js 1–64, 220–275, 482–540, 905–960, kept-lines.test.js), HEAD 2c1b3d2, working tree docs/rounds/069/
- **Findings:** 9 numbered (7, plus 2 numbered under Optional)

## Raw output (verbatim)

```text
1. **Error — Final-line reveals are invalid.** Step 6 tries revealing after every NPC line, including the resolving response. `revealEncounterHelp` rejects a non-`ongoing` encounter before checking hints. Reveal only while ongoing; assert the resolving line adds nothing.

2. **Error — The word reveal may legitimately fail.** Step 5 follows a paid sentence reveal, which consumes the same objective’s hint allowance. A chipped word does not guarantee another hint is available. Handle `HINTS_EXHAUSTED` and verify no mutation; ensure a successful word-only reveal is exercised separately.

3. **Gap — Step 6 has no enforceable success threshold.** It is omitted from the pass criteria, and every later reveal may be exhausted. The round could pass with only greetings saved. Require successful reveals of distinct later messages, then assert the complete ordered save and Spellbook contents, including unchanged contents after refusals.

4. **Risk — Visibility checks can pass vacuously.** Real output may supply no empty-vocabulary lines, no due-card lines, or no lines actually opened by review. Require evidence that each claimed transition occurred. Include a multi-card line checked after partial review, and an already-open line checked during the next encounter.

5. **Error — “Reviewed” is the wrong visibility oracle.** The code hides against **currently due cards present in the Spellbook**, not review history or every vocabulary ID attached to a line. Sentence reveal itself does not discover cards. Steps 7–8 should calculate expected visibility from actual cards and their due states, and assert that review really clears the intended due states.

6. **Gap — Repeating a reveal does not test deduplication.** Step 4 returns through `alreadyRevealed` without calling `keepLine`. It tests repeat charging. Text deduplication requires a different message with matching normalized native text and speaker. Keep that deterministic fixture coverage, or narrow the live report’s “deduped” claim.

7. **Risk — Reruns need an inconclusive outcome.** Provider failures and unresolved encounters can prevent required checks. Preserve both attempts and mark the round inconclusive if coverage remains incomplete; do not count excluded attempts as a pass. Since reveals change assistance, resolution failures also deserve investigation before attribution.

**Optional**

8. **Gap — Later re-hiding is untested.** Advance a controlled clock until a reviewed card becomes due again and verify its lines close. Receipt replay after visibility changes is another useful extension, already partly covered by fixtures.

9. **Risk — Historical lengths do not test truncation.** The corpus scan is reassuring but cannot establish cap correctness. Retain boundary fixtures; specify expected truncation as JavaScript `.slice(0, LINE_TEXT_LIMIT)`—UTF-16 code units, not bytes. Repeating extensive cap/dedup/storage fixtures through paid live calls would add little value.
```
