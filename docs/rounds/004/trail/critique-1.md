# Codex critique 1: iPhone app first (Expo, iOS Simulator)

- **Dispatched:** 2026-10-31T10:46:58Z (command start; journal row 7 recorded 10:47:10)
- **Returned:** 2026-10-31T10:51:21Z
- **Model:** codex-companion 1.0.6, `task --effort high`, read-only (no `--write`); thread 01a19191-e245-7e52-b7a7-768bec5259c9, turn 01a19191-e641-7d60-8fc7-5780d811b03d
- **Prompt:** the codex-critique template, plus: plan path with "ignore its '## Round log (pending)' section and everything after it"; goal "shift development to be app-first (iPhone-based): develop the app and test it in the iOS Simulator on this Mac"; note that docs/rounds/003/ is an untracked in-progress round built concurrently by another agent and the plan refers to its documented API contract
- **Reviewed input:** plan-v1 (plan file above the buffer), sha256 d7597ec1a58705294b0de5a307773e6ff51a2885aa34012a2ded1cff26422ee, HEAD 39c78b9, working tree: `docs/rounds/003/` untracked
- **Findings:** 10

## Raw output (verbatim)

```text
The plan needs corrections. The round 003 API references match its documented contract; I have not treated its unfinished implementation as an error. No files were changed.

1. **Error — high: `expo-crypto` is used but never installed.**

   **Evidence:** [Plan:83–104](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:83) lists the dependencies, omits `expo-crypto`, then requires its `randomUUID`. Expo documents it as a [separate installation](https://docs.expo.dev/versions/latest/sdk/crypto/#installation).

   **Failure:** Following the installation list and importing that fallback produces an unresolved module during bundling—even if the fallback is conditional.

   **Smallest fix (−):** Remove this change and retain the existing [attempt-ID generator](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/gameStore.js:6). The server requires a nonempty attempt ID, not a UUID: [dialogue validation](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:300), [review validation](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:425).

2. **Gap — high: the documented startup procedure does not install the standalone app's dependencies.**

   **Evidence:** [Plan:87](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:87) deliberately excludes `mobile/` from workspaces, but [the proposed README instructions](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:134) go directly to running it. Existing setup runs root `npm ci`; [root workspaces](/Users/bary/LocalDocs/Code/ParaLLang/package.json:5) contain only `client` and `server`.

   **Failure:** In a fresh checkout—or the main checkout after merging the separate worktree—root installation leaves `mobile/node_modules` absent. `npm run ios --prefix mobile` cannot launch the app.

   **Smallest fix (+):** Add `npm ci --prefix mobile` to setup, alongside the existing root installation. Keep the standalone arrangement.

3. **Error — medium: "Expo Go in the Simulator only runs the latest SDK" is false.**

   **Evidence:** [Plan:83–85](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:83). Expo explicitly documents installing the [matching Expo Go version for a Simulator project](https://docs.expo.dev/workflow/ios-simulator/#how-do-i-install-a-specific-version-of-expo-go).

   **Failure:** A working project on an earlier SDK is incorrectly classified as requiring an upgrade merely to continue Simulator development.

   **Smallest fix (−):** Delete that justification. Using the current SDK for initial scaffolding is reasonable; keeping it current is not a Simulator requirement.

4. **Gap — medium: the pronunciation recipe does not distinguish a voice object from its identifier.**

   **Evidence:** [Plan:127–129](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:127) selects a voice returned by `getAvailableVoicesAsync()` and supplies `{ voice }`. The existing [web implementation](/Users/bary/LocalDocs/Code/ParaLLang/client/src/components/PronounceButton.jsx:25) passes a voice object. Expo instead requires a [string identifier](https://docs.expo.dev/versions/latest/sdk/speech/#speechoptions).

   **Failure:** Porting the web assignment or passing the selected `Voice` object into Expo supplies an invalid native option. A permissive speech mock can still pass.

   **Smallest fix (0):** Specify `voice: selectedVoice.identifier`, and have the already-planned pronunciation test assert that string.

5. **Error — medium: preserving the "exact draft" contradicts preserving the current store behavior.**

   **Evidence:** [Plan:105](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:105) preserves retained-draft behavior; [plan:153–154](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:153) promises the exact draft. The store [trims input before retaining it](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/gameStore.js:71), including on failure.

   **Failure:** Sending `"  Vorrei un caffè.  "` and receiving a provider error leaves `"Vorrei un caffè."`. I reproduced this in memory. An actual exact-draft assertion fails; the existing test misses it because its input has no surrounding whitespace.

   **Smallest fix (−):** Narrow the acceptance criterion to preserving the **trimmed submitted text**. No store change is needed for this migration.

6. **Error — medium: the stale-response acceptance criterion exceeds the copied store's protection.**

   **Evidence:** [Plan:154–155](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:154) says stale responses after a learner switch are ignored. The existing [test covers dialogue only](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/__tests__/learning-state.test.js:79); [review startup applies its response without checking the learner or epoch](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/gameStore.js:104).

   **Failure:** Start a review for learner A, switch to B through the existing test hook, then resolve A's request. B receives A's challenge and Spellbook. I reproduced this in memory.

   **Smallest fix (−):** Narrow the criterion to the existing **stale dialogue response** test. Expanding learner-switch support is unnecessary for an app with no learner-switch UI.

7. **Error — medium: the live network-failure check runs after sending has been disabled.**

   **Evidence:** [Plan:173–175](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:173) finishes the encounter, then stops the server and sends. The [UI disables input after resolution](/Users/bary/LocalDocs/Code/ParaLLang/client/src/App.jsx:43), and the [store independently rejects sends](/Users/bary/LocalDocs/Code/ParaLLang/client/src/stores/gameStore.js:72).

   **Failure:** Complete the prescribed pass, stop the server, and attempt to send: no request occurs, so neither the network message nor retained-text behavior is exercised.

   **Smallest fix (0):** While the server is still running, return to dialogue and restart the encounter; wait for the greeting, then stop the server and send.

8. **Error — medium: victory does not guarantee a due review remains.**

   **Evidence:** The same [live pass](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:173) requires reviewing after completion. Successful objectives [reschedule due vocabulary](/Users/bary/LocalDocs/Code/ParaLLang/server/src/learning-service.js:351). Even assisted quality moves its next review [at least one day forward](/Users/bary/LocalDocs/Code/ParaLLang/server/src/language-engine.js:86). The [Spellbook only offers Review on due cards](/Users/bary/LocalDocs/Code/ParaLLang/client/src/components/Spellbook.jsx:20).

   **Failure:** Gerald exposes only vocabulary subsequently credited in the successful order, and introduces no new vocabulary afterward. The encounter resolves with zero due cards; the required review cannot be performed.

   **Smallest fix (0):** On a fresh learner, perform the review after the greeting exposes a card and **before** submitting successful dialogue. Then return and finish the encounter. Do not change scheduling or add practice controls.

9. **Error — medium: the live pronunciation requirement contradicts the accepted no-voice fallback.**

   **Evidence:** [Plan:129–130](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:129) accepts a disabled pronunciation button when the Simulator lacks a matching voice. [Plan:174](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:174) nevertheless requires tapping pronounce unconditionally.

   **Failure:** With only non-Italian voices installed, the correctly implemented button is disabled, making the prescribed live step impossible.

   **Smallest fix (0):** Make the existing step conditional: verify audible pronunciation when a matching voice exists; otherwise verify the disabled, correctly labelled fallback and state that live speech was not exercised.

10. **Cut — medium: rerunning the entire server suite is unnecessary for this isolated client migration.**

    **Evidence:** [Plan:166](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:166) requires server tests despite explicitly excluding [server and content changes](/Users/bary/.claude/plans/i-would-like-to-shiny-hopcroft.md:143). Round 003 already owns verification of its server changes.

    **Concrete cost:** A mobile-only change repeats backend grading, storage and CLI-process checks; those checks do not exercise the new native client. The planned mobile tests and live server interaction cover the migration boundary.

    **Smallest fix (−):** Remove the blanket server-suite requirement. Retain mobile verification and the web checks required by the explicit "kept working, tested" decision.
```

