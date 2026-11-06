# Critique 1: the round 102 plan

- **Dispatched:** 08:23:35 UTC 2026-11-06 (journal row 3)
- **Returned:** before 08:25:40 UTC (the agent reports 98.5 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC).
- **Prompt:** adversarial read-only critique of `plan-v1.md` against gameStore.js (`sendMessage`, `_reloadStale`,
  `revealHelp`, `_startNamed`), learning-service.js (`currentEncounter`, the receipt replay, `validateVersion`,
  `this.encounters` on resolve and restart) and send-retry.test.js; numbered Error / Gap / Cut with file:line; an
  Optional section and a checked list; under 800 words.
- **Reviewed input:** `plan-v1.md`, sha256 09bcb28e…, HEAD 6a02f88, working tree: docs/rounds/102/ new
- **Findings:** 9

## Raw output (verbatim)

```text
1. Error: the guard is missing a check, so a start or help during the read gets wiped. gameStore.js:375 sets isLoading: false before the replay read at :390. That leaves the screen live while the read is in flight. Today the code is safe only because it also needs latest.encounter.id === now.id (:392). The plan's guard is "same send, epoch, learner, not loading" plus "null or another id". That passes in this case: the player opens Party, talkTo runs _startNamed, and the server (which holds nothing after the restart) starts C at :677. The app shows C. Then the read, sent earlier, comes back null, and _applyLatest drops C and goes to the map with STALE_CLOSED. Help has the same problem: the reveal fails STALE, _reloadStale (:459) adopts B, and the late read then applies B again with a different banner. The fix is to also require get().encounter?.id === result.encounter.id && get().encounter?.version === result.encounter.version, and to compare latest with result.encounter, not with the now read at that moment. Add a test for each (start during the read, help during the read), plus a mutation that drops this check.

2. Error: one claim about the code is wrong. The plan says the next Send's "answer is lost to the box". It isn't. sendMessage passes draft: text to _reloadStale (:427), and the null branch spreads ...keep (:340), so the text stays in the draft. What is lost is the conversation. Fix the Source paragraph.

3. Error: one listed test does not exist. The plan lists "not replayed + read never called (existing)". No test in send-retry.test.js checks that currentEncounter is not called after a non-replayed send (there is no not.toHaveBeenCalled on it). initialize also calls currentEncounter (:131), so a plain "never called" check would fail anyway. Write it as "call count unchanged across the send". The plan also asks whether a read-throws test exists. It doesn't: the only failed-read test (:126) is on the STALE path.

4. Gap: the null branch forces view: 'map' even when the player has opened another screen. During the read the player can open the Spellbook or Party (openSpellbook/openParty don't check loading). _reloadStale's null branch sets view: 'map' without condition (:340). That breaks round 096 R1.2 ("a start never takes the player off a screen they opened"). It matters more here than in _reloadStale, which runs while loading. Set view: 'map' only when the view is 'dialogue'. Otherwise leave it: returnToDialogue already falls back to the map when encounter is null (:483-484), and App.js:38 then labels the button "Return to the map".

5. Gap: the "other conversation" may be resolved. this.encounters keeps resolved encounters until the next start (server :1046 stores the resolved staged encounter; only deleteLearner (:166), a start (:677) or a process restart removes it). So another client may have finished B, and the read returns B as resolved. The STALE_REPLAY_OTHER text ("another conversation is open now") is then wrong. Either word it to cover both ("…another conversation is shown here"), or send a resolved other to the closed/map branch. Add a test either way.

6. Gap: the help path after the fix isn't covered. With the replay closed correctly, revealHelp's pending check (:455) depends on pendingInput and retryIds. Both are cleared on success (:381, :375), so that is fine. Still, record in the plan that the help path after a replay was checked. Today it reaches the map only through STALE → _reloadStale.

7. Gap: the decision to leave a resolved replay alone doesn't say what the map shows next. With a resolved replay and a null read, the player returns to the map. getWorld has run (:415), and completedEncounterIds is persisted (:1036), so the tick is correct. Restart works (restart: true, nothing held). Recruit reads the envelope. Write this down so decision 1 is justified, not just asserted. The test only needs world updated and the encounter kept.

8. Cut: the separate keep and draft handling in _applyLatest. The plan passes { message, keep }. On the replay path keep is always {} (the draft was already set to '' at :375). draft: '' in a test is only true if the player didn't type during the read, and keep: {} leaves anything they typed in place, which is correct. Make keep optional and default it to {} rather than adding a parameter. In the test, assert "the draft is untouched", not ''.

9. Cut: the "drop the ongoing condition" mutation is weak as stated. It kills only if the resolved-replay + null-read test asserts that the encounter stays and that view is not 'map'. State those assertions, or the mutation survives.

Optional
- STALE_CLOSED says "Return to it on the map to start again". For a party conversation (talkTo from Party) the map has no button for it. This is not new (it applies to _reloadStale too), but the replay path makes it more likely to show up. One alternative line, "…start it again from the map or your party", would cover both.
- If helpers are being extracted anyway, write the snapshot update once (snapshots.set + set appear in both branches). Leave anything bigger for later.

Checked, no change needed
- The receipt is checked before validateVersion (server :915-921). A replay after a restart returns the stored v+1 response with the current Spellbook (:832).
- After a restart, currentEncounter returns encounter: null (:817-820). The id check at gameStore.js:392 skips it, as the plan says.
- A later Send during the read is dropped by seq === sendSeq. That Send's own STALE runs _reloadStale.
- A save switch during the read is caught by the epoch and learner checks.
- The snapshots map is updated by both _reloadStale branches, so reusing them keeps it correct.
- Retry ids are already cleared on success (:381).
- "No second read" is right, because a second read would widen the race in item 1.
- A read failure keeping the replayed state (decision 3) matches :398.
- No server change: persisting this.encounters is a larger change, correctly left out of scope.
- returnToDialogue and returnToEncounter already handle a null encounter (:481-484).
```
