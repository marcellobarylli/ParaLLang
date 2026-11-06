# Critique 1 (substitute for Codex): fragments under the answer check

- **Dispatched:** 2026-11-06 04:51:20 UTC
- **Returned:** 2026-11-06 04:54 UTC (notification; 166 s run)
- **Model:** a fresh general-purpose subagent (Claude, claude-opus-5-5), read-only by instruction (scratch in /tmp)
- **Prompt:** check each rewrite (correct, natural, same meaning as the unchanged English, clears the check with no new
  hit), whether the allowlist hides a real answer, and what the plan misses; at most 8 numbered findings
- **Reviewed input:** `plan-v1.md`, sha256 14afd369…, HEAD 66d285a, working tree: docs/rounds/083/ new
- **Findings:** 8 (2 Errors, 3 Gaps, 1 allowlist review, 1 Optional, 1 Cut)

## Raw output (verbatim)

```text
The plan mostly works. All eight proposed rewrites clear the round 082 check: I ran `answerLeaks` from `server/test/inscriptions.test.js:26` on the rewritten texts with the proposed allowlists (script in `/tmp/rv083/sim.mjs`). The result is zero form, target-word and meaning hits for all 14 fragments. Every glossary word is still in its text. No test anywhere pins the text of a fragment that changes, and fragments reach no prompt. I found two wording problems, one change to the inscriptions check that the plan doesn't state, and a few gaps.

1. **Error (meaning drift), es journey_first_stitch "los más antiguos" → "los antiguos"** (`content/languages/es/lore/fragments.yaml:13`). Standing alone, "los antiguos" reads as "the ancients", meaning people. The English (unchanged) says "the oldest" threads still hold up the weave. The plan also quietly reverses a recorded decision: `docs/rounds/033/findings.md:62` says "round 030's es 'los más antiguos' stays". **Fix:** use "los primeros hilos todavía sostienen…" (I checked: it clears, no new hit), or "los hilos antiguos". Say in the plan that this supersedes the round 033 note.

2. **Error (style), es journey_sirens "repetido sin fin" → "repetido para siempre"** (`es/lore/fragments.yaml:34`). The sentence already has "era siempre el mismo estribillo", so it would say "siempre… para siempre", which is clumsy. **Fix:** use "repetido hasta el infinito". It mirrors the Italian "ripetuto all'infinito" (`it/lore/fragments.yaml:33`), keeps "forever", and clears the check.

3. **Gap: a shared allowlist weakens the inscriptions check without saying so.** Today the inscriptions pass with `ALLOWED = { it: [], es: ['las', 'quien'] }` (`inscriptions.test.js:20`). Sharing one list adds "una" to both packs for inscriptions, which don't need it. **Fix:** keep one allowlist per surface (fragments vs inscriptions), or state the widening as a decision. Either way, add a check that each allowed word matters, like the existing "the allowlist is what lets quien through" (`inscriptions.test.js:69`): planting "Una." / "Las." with no allowlist must give a hit.

4. **Allowlist review (no real answer hidden, but one guarantee needs pinning).** "una" is the only 3+ letter word in every form of `luna` ("è l'una", "l'una") and of `es_la_una` ("es la una", "la una"). Allowing it makes the word check blind to those two targets. Only the pack-form check still sees them: it matches whole folded phrases, so " l una " and " la una " are still caught. `son_las` keeps "son" in the word check; "las" is blind. No fragment contains "son", "la una" or "l'una", and no target has "quién", so "quien" is a true false positive. The article uses of "una"/"las" are not the decisive part of any answer. **Fix:** pin the remaining guarantee in the test. With the allowlist on, planting "a la una", "son las" and "È l'una" must still return the forms `es_la_una`, `son_las` and `luna`.

5. **Optional (wording), es journey_old_dog "Únicamente un perro viejo"** (`es/lore/fragments.yaml:136`). It is correct but more formal than "Solo". If anyone polishes it later: "Solamente" would fail, because the folded word starts with the party stem `sola` (`lore-fragments.test.js:76`). "Sólo" folds to "solo", the same hit as now. Leave it as "Únicamente" and flag it for the native-speaker review.

6. **Cut: the old checks are fully covered by the new one.**
   - `leaks` (`lore-fragments.test.js:16-25`): the new check's form test is the same, and its meaning test is broader (it strips parentheses and "to ").
   - `stemLeaks` (`:59-63`): "word starts with a party stem" is a special case of the new stem rule over all targets.

   Running both in full is redundant. **Fix:** keep the pinned `expected` stem lists and the planted checks (`:29-41`, `:67-79`), since they catch content drift, but drop the duplicate pass over every fragment. Otherwise state why both stay.

7. **Gap: stale prose and a wrong path.**
   - The header comments in `content/languages/{it,es}/lore/fragments.yaml:1-5` and `lore-fragments.test.js:14-15` describe only the old checks; update them to name the new check.
   - The plan says to "check `prompt-builder.js`", but the file is `server/src/llm/prompt-builder.js`. I confirmed that only `content-loader.js`, `world.js` and `learning-service.js` refer to fragments or inscriptions.
   - The moved module is safe as `server/test/answer-check.js`: the test script is `node --test test/*.test.js` (`server/package.json:9`), so it won't run as a test.

8. **Gap (claim boundary): kept lines still show target-language text during encounters with no answer check.** `keptLines` returns `native` unconditionally and hides only the translation (`server/src/learning-service.js:291-298`). Card targets also show during an encounter (`mobile/src/components/Spellbook.js:177-180` hides only meanings and examples). Both are by design, and the cards are words the player already found. The round's findings shouldn't claim that "the Spellbook shows no answer during an encounter" after this round; scope the claim to fragments and inscriptions.

No test breaks from the text changes. `mobile/src/__tests__/fragments.test.js:10` uses its own fixture text. `bookshop.test.js:99` and `rift-boss.test.js:143-144` pin only fragment ids. The English-equality test in `lore-fragments.test.js:28-36` is unaffected because the English stays the same.
```
