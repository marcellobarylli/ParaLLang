# Critique 1: round 091 plan v1 (fixes from a review of rounds 017–028)

- **Dispatched:** 2026-11-06 about 06:33:15 UTC
- **Returned:** about 06:34:30 UTC (exact time unknown; 74 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an adversarial, read-only reviewer (do NOT edit files, no servers, no network, no LLM calls). Critique the plan /work/ParaLLang/docs/rounds/091/trail/plan-v1.md (repo /work/ParaLLang: Node server in server/, Expo app in mobile/). Read: mobile/src/components/MapPanel.js (Talk button, DrillNote, props), mobile/src/components/PartyPanel.js, mobile/App.js (what `ongoing` is, onReturnToEncounter, returnToEncounter), mobile/src/stores/gameStore.js (initialize, _loadSave, refreshParty, enterEncounter, _startNamed, moveTo, returnToEncounter), mobile/src/api/learning.js (error status on 404), server/src/learning-service.js (_startEncounter, moveTo: what happens to an active encounter when the player moves; the party conversation replay rule), and tests in mobile/src/__tests__/ (map, party, drill, saves). Look for: does each fix close its issue; can the player get stuck (an ongoing encounter they cannot finish or leave; a resolved one; after a server restart the app holds an encounter the server forgot, round 084); moving away during an ongoing location encounter and coming back; what the Restart button does; whether the server should refuse instead; wording consistency with the Party screen and the drill note; the 404 rule (which errors count, where else getParty is called); missing tests. Numbered list typed Error / Gap / Cut with brief reasoning and file:line evidence, then Optional. Under 400 words."
- **Reviewed input:** `plan-v1.md`, sha256 092bce01…, HEAD 192780b, working tree: docs/rounds/091/ new
- **Findings:** 9

## Raw output (verbatim)

```text
The plan is close, but R1.1 leans on a guard that only exists in the app, and both fixes leave real gaps. I edited nothing; I only read the files.

1. **Error: the reason for rejecting a server guard does not hold.** `_startEncounter` already treats the frozen web client (no `encounterId`) differently from the app: `NOT_HERE` fires only when `encounterId !== null` (learning-service.js:612). A `CONVERSATION_UNDER_WAY` 409 behind the same condition would leave the web client's replacement intact. The app guard alone leaks. `initialize` turns a failed `currentEncounter` into `null` (gameStore.js:107), so the app holds no encounter while the server still has Flick under way, and map Talk replaces it silently. Add the server check plus a server test.

2. **Gap: moving away and coming back works, but Restart away from the location fails.** `moveTo` leaves the active session alone (learning-service.js:1048-1060), and coming back resumes it through line 623, which is fine. But "Return to X" now routinely sends the player into a conversation whose location they have left. Restart there calls `startEncounter(true, encounterId)` (gameStore.js:250 area, `restartEncounter`) and gets `NOT_HERE` (learning-service.js:612). The player can still finish, since dialogue has no location check. State it, or have Restart skip the location check for an active session.

3. **Gap: there is no way out of a conversation the player cannot finish.** Until now, map Talk elsewhere was the only escape (by replacement). After R1.1 a stuck or bad conversation blocks every other encounter, and no Abandon exists. Decide this explicitly. It is a decision to record.

4. **Gap: a server restart (round 084) now costs extra steps.** If the app holds an encounter the server forgot, map Talk is disabled. The player has to tap Return, send an answer, and only then get `STALE_CLOSED`, which brings them back to the map. The Party screen has the same flaw. Say so in the plan, or re-check with `currentEncounter` before disabling.

5. **Gap: the comparison field and name fallback are not specified.** Compare `ongoing.encounterId` (the content id, learning-service.js:~502) with `here.encounter.id`, as PartyPanel.js:42 does. Do not use `ongoing.id`, which is a session UUID. For a missing name, PartyPanel uses `'them'`, DrillNote drops the note entirely (MapPanel.js:128), and App.js uses `'the encounter'`. Pick one, and avoid "Return to them".

6. **Gap: "same encounter here: Talk resumes it" is false when the drill is pending.** If the drill and the ongoing encounter are the same one, `drillHere` disables Talk (MapPanel.js:92). The server would resume it (learning-service.js:629).

7. **Gap: the 404 rule misses two places.**
   - The server sends no 404 of its own, only Express's HTML one, which arrives as an "unreadable response" error still carrying `status` (learning.js:360). So `status === 404` is safe, but write that down.
   - `sendMessage` on resolve runs `Promise.all([getWorld, getParty])` (gameStore.js:328). On an old server that rejects, and the map loses its completed marks.
   - `openParty` already swallows errors.

8. **Cut (consider): R1.2 may not be worth doing.** Servers older than round 021 also lack `encounterId` starts and recruiting, so the app still breaks against them at Talk and Save. The gain is small. If you keep it, add the line-328 case.

9. **Gap: missing tests.**
   - Server: the guard from item 1.
   - Store: `initialize` with a failed `currentEncounter` followed by Talk.
   - `drill.test.js:37` passes `ongoing` without `encounterId`; update it.
   - A resolved encounter elsewhere leaves Talk enabled.
   - An ongoing party conversation blocks map Talk.

**Optional:** when the map note shows, change the Talk button's accessible label too, so VoiceOver users hear why Talk is disabled.
```
