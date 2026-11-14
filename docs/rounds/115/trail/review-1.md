# Codex review 1: the dungeon client as built

- **Dispatched:** 2026-11-14 22:56 UTC (the minute; see journal row 12)
- **Returned:** 2026-11-14 22:59:26 UTC (when this file was written; the subagent ran 248 s)
- **Model:** Codex through the `codex:codex-rescue` subagent, high effort asked, read-only. Model name and thread id: unknown (not printed)
- **Prompt:** a review brief written for this round: the diff, the files in order of weight, what was already established (suites, build, playthrough), the kinds of defect wanted (races, stale replies, stuck screens, leaks, camera maths, phone CSS, Pages and Docker), the output format, and the cluster's no-ports rule
- **Reviewed input:** `git diff 40c471d..7c8f24f`, sha256 a0aa4f5e5db5d9824894944163eec5eca89fa08699f43acb290bfdb936b95ef8, HEAD 7c8f24f, working tree clean but for the journal
- **Findings:** 5

## Raw output (verbatim)

The subagent returned Codex's stdout with its progress log lines removed.

```text
1. **Error — high: Docker excludes the manifest it now copies**
   Dockerfile:19, .dockerignore:7. Every Docker build fails at `COPY aesthetic/package.json` because `.dockerignore` excludes `aesthetic`. Allow that manifest into the build context.

2. **Error — medium: Late progress replies undo Play again**
   client/src/stores/gameStore.js:54. Finish the last encounter, leave while its progress refresh is pending, then select Play again; the delayed refresh can overwrite run 2 with run 1's completed progress, making Start immediately show victory. Guard progress replies by request epoch and run/reset generation.

3. **Error — medium: An old reset cancels the new server's encounter load**
   client/src/stores/gameStore.js:216. Select Play again, save new settings while reset is pending, then Start; the old reset reply unconditionally increments `siteRequest` and returns to overview, discarding the new site reply and leaving `encounterLoading` true. Capture the epoch before resetting and ignore obsolete success and failure replies.

4. **Error — medium: A stale Spellbook refresh exposes encounter answers**
   client/src/stores/gameStore.js:276. During a replay, open Spellbook while the greeting loads; a snapshot read before the server opens the encounter can arrive afterward and replace the protected snapshot with `inEncounter: false` and visible meanings. Invalidate refreshes when the encounter changes and enforce hiding from the current encounter state.

5. **Error — medium: Start over failures are invisible**
   client/src/stores/gameStore.js:96, client/src/components/DungeonScreen.jsx:191. If Start over fails, the store writes `siteError` while remaining in `encounter`, but only the travel caption displays that field; a lost successful reply also leaves the player using a discarded session without an explanation. Display restart errors and a retry action in the encounter sheet.

Optional

No additional defects verified in camera maths, StrictMode/disposal, Pages chunk/YAML handling, or phone CSS; real iOS keyboard behavior remains unverified.
```
