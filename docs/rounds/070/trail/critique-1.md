# Codex critique 1: the verdict before the NPC's reply (round 070)

- **Dispatched:** 2026-11-06 02:21:28 UTC
- **Returned:** 2026-11-06 by 02:23:15 UTC (the shell clock when the wait loop saw the output end)
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp; no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is on stdin: a round plan (plan-v1.md) for the ParaLLang language game, adding an early verdict (grading shown while the NPC reply is still generated) to the server and the Expo app, plus the relevant code. Critique the plan: correctness (races, locking, atomicity, replays, stale state, failures), whether anything leaks that the game hides, app UX risks, test gaps, and whether a simpler design would do. Number findings; tag each Error (the plan is wrong or will break something), Risk, or Gap; put nice-to-haves under 'Optional'. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 b3d80356…, in a 667-line bundle on stdin (sha256 23f4a32c28c14c5f…; files listed in journal row 3), HEAD d8d9fa7, working tree docs/rounds/070/
- **Findings:** 8 numbered (2 Errors, 3 Risks, 3 Gaps); one Optional

## Raw output (verbatim)

```text
I’ll review the supplied plan and code for correctness, leaks, UX risks, and test gaps. I won’t run commands.
codex
1. **Error — Late polls can restore stale feedback.** The stated guards—epoch, learner, encounter version—still match after a failed POST and during its retry. Stopping the timer does not stop an outstanding GET. Check a per-send token and POST-settled flag before accepting each response; invalidate them before clearing early state.

2. **Error — A failed POST does not imply a fresh grading.** The server may commit successfully and the response may be lost. Retrying with the app’s new attempt ID and old version then conflicts. Distinguish confirmed server failures from uncertain transport failures; preserve the original payload and attempt ID for replay/reconciliation.

3. **Risk — Disclosure is no longer atomic.** Narration, canonicalization, or storage can fail after feedback was exposed, including vocabulary evidence whose discovery never commits. Persistence can remain atomic, but the player has learned something from an aborted turn. Explicitly accept this behavior and label the verdict provisional.

4. **Gap — Specify cleanup’s lock scope.** Put the progress `finally` inside the serialized operation. Cleanup outside it can race with a queued retry using the same attempt ID after failure and delete that retry’s progress. Attempt-ID equality alone does not distinguish executions.

5. **Risk — The assessment can appear attached to the wrong turn.** The submitted message enters the transcript only on commit, and `sendMessage` currently retains the previous assessment. Associate early feedback visibly with `pendingInput`, clear it on every encounter/save reset, and distinguish provisional feedback from the unchanged current objective. Test that it is visible in a long, scrolled conversation.

6. **Risk — “Only the requesting learner’s own verdict” overstates authorization.** `X-Learner-Id` is caller-controlled; the token is shared and optional. Another-learner tests establish map isolation, not ownership. State the trusted-client assumption and the role of unpredictable attempt IDs.

7. **Gap — Failure and concurrency coverage is too narrow.** Add grading-validation, canonicalization, and storage failures; assert unchanged save, encounter, and receipts. Exercise queued duplicates, conflicting payloads, and concurrent learners. Test delayed polls across failure → retry and save/encounter changes.

8. **Gap — Equality needs representative assessments.** Cover ordered `held` results, ordered reveal caps, unordered “any reveal” caps, and resolving turns. Preserve the existing post-narration timestamps and scheduling behavior when moving assessment construction earlier.

**Optional**

A simpler server representation is a map containing only completed provisional assessments: absence covers grading, unknown attempts, and completion; presence means replying. Use one sequential, cancellable polling loop per send. The POST remains authoritative.
```
