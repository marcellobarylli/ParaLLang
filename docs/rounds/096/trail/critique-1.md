# Critique 1: fixes from the mobile store review (plan v1)

- **Dispatched:** about 07:24:45 UTC 2026-11-06
- **Returned:** about 07:27:15 UTC (151 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id a78cc40c5620a5763
- **Prompt:** adversarial read-only critique of `plan-v1.md` against `review-1.md`, the store, the components that
  read the changed state, and the server's review, help and learner paths; R1.1's retry through the server's checks
  and the drill, R1.2's effect on flows that rely on the dialogue opening, R1.4's counters, R1.5's shared helper,
  R1.9's cases, test strength, deferrals; numbered Error / Gap / Cut with file:line evidence, Optional separate,
  under 700 words.
- **Reviewed input:** `plan-v1.md`, sha256 b1c15e4e…, HEAD f23481c, working tree: docs/rounds/096/ new
- **Findings:** 9 (2 Error, 6 Gap, 1 Cut/Gap) and a note on the deferrals; 3 Optional

## Raw output (verbatim)

```markdown
Nine findings. Two are Errors in the plan: R1.5's reload on `STALE_MESSAGE`, and R1.2's claim that the map card always leads back to the conversation. Nothing was edited, no tests were run and no files were left behind.

1. **Error, R1.5 reloads on `STALE_MESSAGE`.** Older NPC messages still offer help. In `BilingualText.js:29,46` the word chips and the "Translate sentence" button stay enabled on every NPC line (`DialoguePanel.js:87`). The server answers a tap on a non-latest message with `STALE_MESSAGE` even when the version matches (`learning-service.js:842`). With the plan, that tap would reload the conversation and wrongly say it "had moved on". **Fix:** reload only on `STALE_VERSION` and `STALE_ENCOUNTER` (the existing `STALE_CODES`, `gameStore.js:35`) and keep the server's text for `STALE_MESSAGE`. Add a test that `STALE_MESSAGE` causes no `currentEncounter` call. Optionally disable help on non-latest messages.

2. **Error, R1.2's way back.** The plan says "the map card's 'Return to …' leads back". That card only appears when the current location has an encounter different from the one under way (`MapPanel.js:69,94`).
   - A party Talk started where the location has no encounter leaves no card at all.
   - A start for this location shows only "Talk to X", which does resume (server `:643`) but is not a "Return".
   - The Spellbook or Party screen opened during the start says "Return to the map", because `returnView` is 'map' (`App.js:38`).

   **Fix:** when the view has changed, also set `returnView: 'dialogue'`. `returnToDialogue` (`gameStore.js:415`) then leads back and the label reads "Return to X". Test the label and that the button opens the dialogue. The other flows still work: party Talk (from = 'party'), `leaveAndEnter` (from the map) and restart (from the dialogue) keep the view unchanged. Onboarding has no nav, and the drill doesn't use `_startNamed`.

3. **Gap, R1.1 on `STALE_CHALLENGE`.**
   - **The retry key works.** The server checks `IN_ENCOUNTER` first, then looks up the receipt, then the challenge (`:1298-1306`). Receipts are kept on disk, so the same attempt id replays even after a server restart. The key includes the trimmed answer, so `ATTEMPT_REUSE` can't occur.
   - **Going to the Spellbook is the wrong target for a drill.** The text "Pick it again from the Spellbook" doesn't fit a review started from the map's drill (`startDrill`, `:410`).
   - **Simpler fix:** set `reviewChallenge: null` and an error, and stay on 'review'. ReviewPanel already shows the error with "Try again", which calls `startReview()` (`ReviewPanel.js:29-33`, `App.js:73`). The server then puts drill cards first (`:1268`).
   - Also clear the key's entries on `STALE_CHALLENGE`, and skip the 'pass' cue when the result is `replayed`, as sends do.

4. **Cut/Gap, R1.3: route restart through `_startNamed`.** Make it `_startNamed(get().encounter?.encounterId ?? null, { restart: true })`. A restart always gets a new id (server `:670`, `randomUUID`), so the `fresh` branch already clears the assessment, `earlyAssessment`, draft and `pendingInput`, and only on success. That brings the `isLoading` guard, `starting`/`startSeq` and R1.2's view guard for free, and removes "Same for `restartEncounter`".

5. **Gap, R1.4: when the counters rise is not specified.**
   - A counter must rise when the write is applied, not when its request starts. Otherwise a read that starts during a recruit and is served first can land after the recruit.
   - "A start" doesn't load world or party; it should say `initialize`/`_loadSave`. The `snapshots` map holds only the encounter and Spellbook (`:38`), so a save switch only needs the counter raised in `_loadSave`.
   - Raise the counter on a resolve before the post-resolve read starts.
   - **Alternative:** one shared counter for world and party, plus the epoch check those reads lack (`:236`, `:267`, `:349`). Dropping an occasional extra read is harmless.

6. **Gap, R1.4 tests can pass a broken fix.** They only prove that reads get dropped, so a version that drops every read would pass. Add a test that a read with no write in between is applied, for `openMap`, `openParty` and the post-resolve read.

7. **Gap, R1.5's shared `_reloadStale`.** The helper must take the caller's `owns()`, because the send's checks `sendSeq` and has to stay that way. It must also take a message, and an option that leaves the draft alone for help. `isLoading` must stay on until the reload settles, as it does at `:358-365`. Whether `retryIds.clear()` runs should be a parameter (harmless for help).

8. **Gap, R1.9's notice cases.** It fires in the right cases:
   - **First launch:** `storedId` is null, so no notice.
   - **New save:** `_loadSave`'s `createLearner(target)` finds the just-created learner, so `recovered` is true and there's no notice.
   - **Switch to a lost slot:** notice.

   But `_loadSave` overwrites the notice with "Now playing X." (`:563`), so the plan must say how the two combine. The notice also uses the green success style (`App.js:52`) and is cleared by `openMap`. Consider `error`, or one combined line: "Now playing X. This save was not found…". Test that the switch shows both lines.

9. **Gap, R1.6's test is hard to set up.** While `revealHelp` holds `isLoading`, only a reset can change the encounter. The test needs `switchLearnerForTest` or a held reply around a `newSave`, so it has to name one.

**Deferrals:** R1.7, R1.10 and R1.11 are reasonable. Rejecting R1.8 is acceptable: the conversation the server forgot is dead and its meanings protect nothing.

**Optional**
- R1.8, cheap: when a review reply says `inEncounter: false` while the app holds an ongoing encounter, drop the encounter (as `STALE_CLOSED` does) rather than keep a dead conversation.
- Disable help chips on non-latest NPC messages in the component, so `STALE_MESSAGE` can't be reached from the UI.
- R1.2 test: restart held, open the Party screen; the view stays 'party' and the return label names the NPC.
```
