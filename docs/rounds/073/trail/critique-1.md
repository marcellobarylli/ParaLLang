# Codex critique 1: a waiting line while an encounter starts (round 073)

- **Dispatched:** 2026-11-06 02:47:51 UTC
- **Returned:** 2026-11-06 by 02:48:48 UTC (the shell clock when the wait loop saw the output end)
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp; no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is on stdin: a small round plan (plan-v1.md) for the ParaLLang language game's Expo app, adding a waiting line while an encounter's greeting is generated, plus the relevant code. Critique the plan: correctness (stale state, races, every exit path), accessibility, test gaps, simpler alternatives. Number findings; tag each Error, Risk, or Gap; put nice-to-haves under 'Optional'. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 ba1e36af…, in a bundle on stdin (files and hash in journal row 3)
- **Findings:** 7 numbered (1 Error, 3 Risks, 3 Gaps; 7 under Optional)

## Raw output (verbatim)

```text
I’ll review the plan against the supplied code, focusing on request ownership, cleanup, and native accessibility. I won’t run commands.
codex
1. **[Risk] Encounter ID is not request ownership** (plan 12–13). If invalidation releases the loading lock and another start uses the same encounter ID, the old request’s cleanup can erase the new indicator—even across learners. Ordinary starts are serialized today. Guard cleanup with the captured epoch and learner, or a request token; test both late success and late rejection.

2. **[Gap] “Every exit” needs explicit handling.** Preserve the initial no-learner/loading guards without changing `starting`. Set it atomically with `isLoading`; clear it atomically on accepted success/failure. Enumerate epoch and learner changes and clear immediately at invalidation, including when save loading fails or returns early. Cleanup only when the old API settles could leave stale status visible indefinitely.

3. **[Error] The proposed save-switch test cannot exercise the claimed race through `switchSave`.** It returns immediately while `isLoading` is true. Assert that behavior separately. Exercise stale completion through an actual supported invalidation path, or explicitly identify a test-only state transition.

4. **[Gap] App wiring is missing from the plan.** Both panels receive explicit props; neither currently reads the store. Add `starting` to their props and pass `state.starting` from `App.js`. Include an integration check: isolated panel tests could pass while the app never displays the line.

5. **[Risk] `role="status"` needs native accessibility verification.** Check VoiceOver and TalkBack announcements; add platform-appropriate live-region/announcement handling if needed. Map’s enclosing card already has `aria-live="polite"`, so verify the update does not announce the whole card or duplicate speech. Preserve focus, and check muted-text contrast and enlarged text.

6. **[Gap] Tests omit important boundaries.** Cover rejected/ignored starts, missing names, `enterEncounter` passing `null`, and name lookup matching the requested ID rather than merely the current location. Party’s Return button remains enabled during loading: test navigation away, whether losing the indicator is acceptable, and the existing success behavior that forces `view: 'dialogue'`. Test rapid ongoing-encounter responses too.

**Optional**

7. **[Risk] Storing the name adds duplicated state.** Store only request ownership and the target ID, then render the name already available in the matching map/party card. Keep the captured name only if preserving the original label across world/party updates is intentional.
```
