# Codex critique 1: a retried turn replays (round 071)

- **Dispatched:** 2026-11-06 02:32:20 UTC
- **Returned:** 2026-11-06 02:33:05 UTC (the shell clock after the command exited)
- **Model:** codex-cli 0.166.0, `codex exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=high`, run from /tmp; no thread id printed
- **Prompt:** "You are an adversarial reviewer. Do not run any commands; everything you need is on stdin: a round plan (plan-v1.md) for the ParaLLang language game's Expo app, making a retried dialogue send reuse its attempt id (so the server replays a committed turn whose response was lost) and recovering from a stale encounter version, plus the relevant code. Critique the plan: correctness (idempotency, races, stale state, wrong replays), UX, test gaps, simpler alternatives. Number findings; tag each Error, Risk, or Gap; put nice-to-haves under 'Optional'. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 17be6ef4…, in a bundle on stdin (files and hash in journal row 3), HEAD eb06447, working tree docs/rounds/071/
- **Findings:** 9 numbered (2 Errors, 5 Risks, 2 Gaps; 9 under Optional)

## Raw output (verbatim)

```text
1. **[Risk] Historical receipts can restore stale state.** Receipt lookup precedes active-encounter validation. If the server advances again after the lost response, retrying returns the earlier committed snapshot. The local version guard still passes because the phone holds the original version. Define how replay recovery reconciles with the server’s current encounter.

2. **[Error] The success guard does not check encounter identity.** It checks epoch, learner and version, but a different encounter can have the same version. Applying a response must also require the captured encounter ID and send sequence to remain current; otherwise an old replay can replace another conversation.

3. **[Risk] Reload ownership is underspecified.** Epoch and learner checks alone do not establish that a stale-error reload still owns the encounter. Keep loading active through recovery and guard the reload by send sequence and captured encounter identity/version. An obsolete reload must not overwrite newer state or clear another operation’s loading flag.

4. **[Gap] Recovery omits dependent state.** Normal success and encounter entry update `snapshots`; the proposed reload updates only `encounter` and `spellbook`. Update the cached snapshot too, and define how `assessment`, `earlyAssessment` and `pendingInput` are cleared or reconciled. Otherwise recovery can leave an old verdict attached to new dialogue or later restore stale cached data.

5. **[Risk] One `lastSend` is insufficient for changed-text retries.** After an ambiguous failure for A, sending B replaces A’s identity; reverting to A then creates another ID. The payload hash prevents mismatched receipt reuse, but does not preserve A’s replay path. Explicitly define when an uncertain attempt is abandoned, or retain attempt IDs by the full request tuple until the encounter advances.

6. **[Error] Null does not establish a server restart.** `currentEncounter` only reports that no active encounter exists. The restart claim is unsupported, and retaining an apparently ongoing encounter leaves Send targeting a session known to be absent. Show a neutral “conversation unavailable” recovery state with a working route back to the map.

7. **[Risk] Preserving the draft needs context-sensitive UX.** `STALE_ENCOUNTER` can reload a different conversation; even `STALE_VERSION` can change the prompt or resolve it. Preserve the text, but make clear that it was not submitted to the reloaded conversation. Ensure loading ends and the player can recover when the new encounter is resolved.

8. **[Gap] Tests miss the dangerous boundaries.** Add coverage for `STALE_ENCOUNTER`; different encounter IDs sharing a version; delayed recovery after navigation/save switching or a newer operation; replay after further server advancement; snapshot consistency; resolved/null recovery; and A→B→A retries. The HTTP replay test should also assert no second turn or reward mutation. Step 3’s “progress is null” assumption needs verification against the progress lifecycle.

**Optional**

9. **[Risk] Retry identity is memory-only.** Process termination loses `lastSend`. If recovery across app relaunch matters, persist the uncertain request. Otherwise state that limitation explicitly. A simpler bounded design is to retain one uncertain request with an explicit Retry action, then reconcile current state before accepting a replacement send.
```
