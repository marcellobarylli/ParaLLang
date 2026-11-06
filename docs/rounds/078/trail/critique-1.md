# Codex critique 1: an NPC line with no target language is written again

- **Dispatched:** 2026-11-06 03:33:20 UTC
- **Returned:** 2026-11-06 03:34:35 UTC
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp, bundle on stdin; thread id not printed
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is on stdin: a plan (plan-v1.md) for round 078 of ParaLLang, a language-learning game whose NPC lines are LLM-generated JSON with dialogue.native (mixed target language + English) and dialogue.translation (English), plus the relevant source excerpts. Critique the plan: find errors (things that would be wrong or break), risks and gaps. Number each finding at the start of a line as '1. **Error — high: title**' (types Error, Risk, Gap; severity high/medium/low), give the reason and a concrete fix. Put optional suggestions after a line starting 'Optional'. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 410c5e6e61314c9d32fb5fed9d90e58719a9970e49ada7c65c0a81e39f420289, HEAD f68a3f7, working tree: server/src/language-engine.js modified (lacksTargetLanguage), docs/rounds/078/ new; bundle /tmp/r078-bundle.txt sha256 bc10c917846a6497a3c9d84098927c6cf1b22643669ff9c21454337dda1669b4
- **Findings:** 5

## Raw output (verbatim)

```text
1. **Risk — medium: Valid target language can trigger a retry**
   Shared words and accent folding do not establish language identity. For example, Italian/Spanish “No, Sam.” equals its English translation and is flagged if `no` is absent from `narrationEntries`. Encounter vocabulary is not exhaustive. Treat this as a heuristic, narrow the claim, and add ambiguous-word and out-of-vocabulary tests before using it to replace valid dialogue.

2. **Gap — medium: All-English rewrites can bypass the guard**
   Native “Take the book” with translation “Pick up the book” is entirely English but passes because `take` is absent from the translation. English homographs of vocabulary entries also bypass detection. Consequently, a second English response can be counted as `fixed`. Add these negative cases, describe the supported subset explicitly, and name the counter `passedGuard` unless target-language presence is independently established.

3. **Error — medium: The offline scan does not reproduce runtime vocabulary context**
   The scanner recognizes only `encounterId`; the shown encounter stores its content key as `definitionId`, while its instance ID is a UUID. Missing or unmatched context falls back to the entire pack, which can suppress flags that runtime encounter vocabulary would produce. Deduplication also omits language and encounter. Resolve the actual content definition, report unresolved contexts separately, and deduplicate by language, definition, native and translation. Rerun before relying on “exactly 2” or “no false positive.”

4. **Error — medium: The correction can contradict a 100% target ratio**
   `calculateTargetRatio` can return `1`, but the correction always demands a mixture of target language **and English**. That introduces conflicting instructions precisely when the model is being corrected. Require compliance with the existing language percentage rather than mandating English in every retry; test the 100% case.

5. **Gap — medium: One retry does not bound added latency**
   The fallback handles rejection, but the plan supplies no retry deadline. A slow retry delays an already usable greeting or holds `submitDialogue` inside the learner’s serialized operation; consuming an in-flight prefetch can incur the same wait. Specify a bounded retry deadline, cancellation behavior where supported, and fallback to the first response on expiry. Test that timeout commits only the first response and clears turn progress.

Optional: Include the rejected response in retry-local context, without saving it to the transcript. Currently “your last reply” refers to a response the model never receives, and “the same as its translation” is inaccurate for the rule’s subset matches.
```
