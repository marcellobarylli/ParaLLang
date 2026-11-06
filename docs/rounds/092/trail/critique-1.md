# Critique 1: round 092 plan v1 (fixes from a review of the core server paths)

- **Dispatched:** 2026-11-06 about 06:43:40 UTC
- **Returned:** about 06:45:30 UTC (exact time unknown; 108 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no ports, no network, no LLM calls). Critique the plan /work/ParaLLang/docs/rounds/092/trail/plan-v1.md (repo /work/ParaLLang: Node server in server/, Express 5). Read: server/src/app.js (requireToken, route order, cors), server/src/routes/encounter.js, server/src/learning-service.js (submitDialogue: the evidence checks near line 860–880, the assisted cap near 940–950, held/ordered logic, capAssistedQuality), server/src/language-engine.js (matchCanonicalVocabulary, foldEvidenceText or its equivalent, the typo rule), the tests that use the token (grep PARALLANG_TOKEN / token in server/test), and tests of grading evidence (grep INVALID_GRADING in server/test). Look for: does each fix close its issue; any other way around the token (encoded paths, double slashes, `/api/health/..`, HEAD/OPTIONS, a route mounted outside /api, Express's `strict`/`case sensitive` settings, `req.path` vs `req.originalUrl`); whether requiring the entry alone in the full answer could reject correct answers (typos, apostrophes, accents, inflections the grader rightly accepts, phrases split by other words, entries whose forms overlap, Rift glitch text), and what a player sees when it does; whether the cap change can over-cap (held results, a reveal for a later objective); whether the rejected and deferred items are reasonable; missing tests. Numbered list typed Error / Gap / Cut with brief reasoning and file:line evidence, then Optional. Under 400 words."
- **Reviewed input:** `plan-v1.md`, sha256 3ea9f470…, HEAD 326da97, working tree: docs/rounds/092/ new
- **Findings:** 6

## Raw output (verbatim)

```text
1. **Error (R1.2): the new check doesn't tie the evidence to where it appears in the answer.** `matchCanonicalVocabulary(playerInput, [entry])` accepts the entry if it occurs anywhere in the answer. The presence check at `learning-service.js:871` is only a substring test. So "panettone, pane" still passes when the quoted "pane" is the substring inside "panettone". That case is harmless, but the check is looser than the plan says. A tighter fix: require that some match of the entry in the full answer has `foldEvidenceText(match.excerpt) === foldEvidenceText(evidence)`.

2. **Gap (R1.2): could it reject correct answers?** It looks safe.
   - Typos are already rejected today: the excerpt must be an authored form (`grading.txt:8-9`, `language-engine.js:60`), and the typo rule (`:50`) applies only to reviews.
   - Apostrophes, accents and decomposed text fold the same way in both paths (`:6`, `:10`, `:66-74`).
   - Phrases split by other words already fail the contiguous-substring check.
   - Hyphens and apostrophes count as word boundaries, so "l'acqua" and "caffè-bar" still pass.
   - The one new rejection is a form glued inside a longer word (for example "porta" in "portami"). That is correct under the authored-forms rule.
   - Rift glitch text only affects NPC lines, not `playerInput`.

   What the player sees on a rejection: a retryable INVALID_GRADING ("retry unchanged"). If the LLM keeps quoting the same way, the player is stuck in a retry loop with no hint why. The plan should say this and add a test for the error message.

3. **Gap (R1.1): the fix holds, but some cases are untested.** Making the token the default for everything except health closes `/API`, `//api`, `/%61pi` and every other unmatched spelling, because the check no longer depends on how the router matches. The tests should pin:
   - `HEAD /API/world` without the token returns 401 (Express 5 runs GET handlers for HEAD).
   - An OPTIONS preflight on `/API/world` still returns 204 without the token, since `cors()` runs first (`app.js:23-24`).
   - `/API/HEALTH/` returns 200.
   - The behaviour change: an unknown path such as `/nope` now returns 401 instead of 404. Record it.
   - The comment at `app.js:9-10` needs updating.

4. **Gap (R1.6): the cap is right, but held and failed evidence also gets capped.** The failed and held objectives' evidence is capped in the record and in `effectiveQuality` (`:947`, `:990`), though only closing evidence changes the review schedule (`:991`). That is acceptable, but test it.
   - "The objective current at the turn" means `objectives[0]`. In an ordered encounter, reveals only exist for the current objective, so `anyReveal` (`:945`) already says the same thing. Use it rather than a new condition.
   - Over-capping isn't possible: a reveal for a later objective can't exist before that objective is current.

5. **Cut (rejections):** R1.3, R1.4 and R1.7 are reasonable. Under the sandbox rules, the two marked "owner question" (R1.4, R1.7) need rows in `docs/autonomy/decisions.md` (autonomous decision, pending owner review). R1.5's deferral is fine, but give it a backlog ID.

6. **Gap (tests):**
   - Check that no existing grading stubs quote evidence from inside a word. The plan says it found 3 INVALID_GRADING tests; also check the stubs in `learning-flow` and `unordered-objectives`.
   - Add a mutation check for the "caffè nero" case: remove the "entry alone" condition and confirm a test fails.

**Optional:** For R1.1, pinning Express with `app.set('case sensitive routing', true)` and `strict` would also work as a second layer, but the allowlist is enough on its own.
```
