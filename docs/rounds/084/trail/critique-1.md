# Critique 1: the Spellbook refreshed (round 084)

- **Dispatched:** 2026-11-06 04:59 (unknown seconds)
- **Returned:** 2026-11-06, about 05:01 (notification; exact time unknown), duration 78 s
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only by instruction, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** adversarial read-only review of `plan-v1.md` against gameStore.js, App.js, learning.js, ambience.js, speech.js, learning-service.js, app.js and the mobile tests; look for races, meaning leaks, guard holes, dedupe failures, server serialization, AppState in tests; numbered findings tagged Error / Gap / Cut / Optional, under 600 words
- **Reviewed input:** `plan-v1.md`, sha256 4e35b9c2…, HEAD 6e635a2, working tree: docs/rounds/084/ new
- **Findings:** 7 numbered (1 Error, 5 Gaps, 1 Cut); items 8–9 are Optional

## Raw output (verbatim)

```text
I found 1 Error, 4 Gaps, 1 Cut and 2 Optionals. The reference-equality guard holds for every write path I traced. The real holes are a meaning leak after a server restart and the "one in flight" rule sitting behind a request that never settles.

1. **Error: the server's encounter view can disagree with the client's, so meanings leak in the dialogue.** Ongoing encounters live only in memory (`this.encounters`, a Map; `inEncounter` reads it). If the server restarts while the app holds an ongoing encounter, `getSpellbook` returns `inEncounter: false` with all meanings, inscription and fragment translations, and kept lines. The foreground refresh makes this likely: the app sits in the background overnight, the dev server restarts, the player returns to the dialogue, and the Spellbook opened from it now shows the answers. Plan point 4 assumes the server's view always matches the client's. Fix: in `refreshSpellbook`, drop the reply when `get().encounter?.state === 'ongoing'` and `reply.inEncounter !== true`. Add a test for this.

2. **Gap: the "one at a time" rule can lock out every later refresh.** The api's `request` has no timeout and no abort. A refresh still in flight when iOS suspends the app (or one that hangs on a flaky network) keeps its in-flight flag set. Every `openSpellbook`, `openMap` and foreground refresh after it returns without asking, which defeats the exact trigger this round adds. Fix: let the latest call win. Keep a `refreshSeq`, always send, and apply a reply only if its seq is still the latest. That also makes the dedupe test unnecessary. Or keep the flag but clear it on an epoch change and on each foreground event.

3. **Gap: the server's `getSpellbook` is not inside `serialized()`.** `_startEncounter` and the send path call `storage.save` and only then `encounters.set`, and both can sit for seconds on an LLM call. A refresh read in that window can carry the new save with the old encounter state. During a start that means `inEncounter: false` and meanings visible. On the client the reference guard drops such a reply if it lands after the start's reply. If it lands before, it shows on the map while `isLoading` is on, and the start's reply then overwrites it, so nothing reaches the dialogue. Finding 1's client check closes this too. Optional server fix: wrap `getSpellbook` in `serialized(learnerId, ...)`. It is cheap (one read) and keeps the server consistent. Also state in the plan that you rely on this ordering.

4. **Gap: the reference guard checked against every write path.** It holds:
   - Every action writes a new object.
   - `latest.spellbook ?? get().spellbook` and `moveTo` without a spellbook keep the same object. The refresh may then apply, which is harmless because its reply is newer.
   - Two paths restore an older object: `switchLearnerForTest` from a snapshot and `_loadSave`. Both bump `requestEpoch`, so the epoch check covers the ABA case.

   Recommendation: write in the plan that the epoch check is load-bearing for those two restore paths, so nobody later removes it as redundant. Also capture `get().spellbook` synchronously, in the same tick the request is sent.

5. **Gap: no guard when there is no learner.** `AppState` can fire `active` during `initialize`, before `learnerId` is set. `refreshSpellbook` must return when there is no `learnerId`. Add a store test: `refreshSpellbook()` before `initialize` makes no call.

6. **Gap: the App test must account for the existing `AppState` subscriptions.** `ambience.test.js` and `speech-background.test.js` spy on `AppState.addEventListener`. Several App render tests (`learning-flow`, `party`, `starting`, `onboarding`) render the singleton `useGameStore`. The new test should collect handlers by type and fire only the App's handler, not assume a single listener. It should also check that `remove()` is called on unmount. Run the full suite, because the singleton store's real `learningApi` will now get an extra `getSpellbook` in App tests if `active` fires.

7. **Cut: the `snapshots` update.** `snapshots` is read only by `switchLearnerForTest`; `_loadSave` refetches from the server. Mirroring `moveTo` is harmless but adds code and a test surface for no player-visible effect. Optional to drop; keep it only if you want strict consistency.

8. **Optional: fewer foreground triggers.** iOS sends `inactive` then `active` for Control Center, Face ID and system alerts. Refresh only when the previous state was `background`, which matches `speech.js`'s distinction (decision 1). This cuts needless requests and keeps a refresh from interleaving with a send for no reason.

9. **Optional: the plan's reply check.** Keep "the reply is an object with a `cards` array". Also make sure a reply that fails it does not touch `error`, as the plan says. No change needed.

Files reviewed: `/work/ParaLLang/docs/rounds/084/trail/plan-v1.md`, `/work/ParaLLang/mobile/src/stores/gameStore.js`, `/work/ParaLLang/mobile/App.js`, `/work/ParaLLang/server/src/learning-service.js` (lines 98, 235-300, 545-570, 900-908, 1101-1104).
```
