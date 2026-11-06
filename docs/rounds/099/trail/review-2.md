# Review 2: the mobile store as changed in round 096, at HEAD

- **Dispatched:** about 07:52:30 UTC 2026-11-06
- **Returned:** about 07:57:30 UTC (293 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC).
- **Prompt:** independent read-only review of `mobile/src/stores/gameStore.js` as changed in round 096
  (`reviewAttempt`, `_sendReview`, `returnView`, `restartEncounter`, `placeWrites`, `_reloadStale`, `SAVE_LOST`),
  reading the API client and the calling screens: stale state, guards that never reset, a reused attempt id
  replaying an old verdict, wrong views, unhandled promises, races with save switches; R2.n Error / Gap / Minor with
  file:line, a scenario and a fix; "checked and fine".
- **Reviewed input:** HEAD 6cc3a5f, working tree: docs/rounds/099/ new
- **Findings:** 6 (1 Error, 4 Minor, 1 Gap)

## Raw output (verbatim in wording; bullet layout condensed when saved)

```text
One real regression (R2.1); the rest are Minor or test gaps. Read the whole store, the API client, App.js, Review/Map/Dialogue/Party/Spellbook/Header components, and the server's submitDialogue/submitReview/replay/currentEncounter/createOrRecoverLearner. store-review.test.js passes (16/16). No test of my own was written for R2.1; it rests on reading the code, including the server's receipt order.

R2.1 — Error — mobile/src/stores/gameStore.js:436-438 (with _reloadStale 310-332)
A help reveal now reloads the conversation after a lost send reply, and that destroys the replay path round 071 built.
Why: after the reload the encounter is at the server's newer version. The answer is still in the box (help passes no `draft`, so the draft is left alone), but its retry key holds the old version, so it never matches again. The committed turn's verdict is lost.
Scenario: (1) At version v the player sends "ciao"; the server commits (v+1) but the reply is lost; banner shows, draft and pendingInput still "ciao". (2) The player taps a word chip for help; the server answers STALE_VERSION. (3) _reloadStale loads v+1: the transcript shows "ciao" and the NPC reply, assessment is null, draft still "ciao", message "Ask for help again." (4) The player taps Send: a new attempt id at v+1, the server grades "ciao" as a second turn — duplicate evidence, an extra escalation step; the first turn's verdict never shown.
Before 096: help only showed the error; the encounter stayed at v; resending replayed the verdict.
Resolved case: if the lost turn resolved the encounter, the reload shows it resolved with no world/party refresh and no cue; "Ask for help again" is wrong there too.
Fix: when pendingInput is set (an answer whose fate is unknown) and help hits a stale code, first resend that answer with its stored attempt id at the old version (the server checks receipts before the version, so it replays). Or skip the reload and say "Your last answer may have been sent; send it again to see its verdict." At least clear the draft when the reloaded transcript's last player line equals pendingInput. Add a test.

R2.2 — Minor — gameStore.js:116/:140 and :598/:612
The SAVE_LOST notice is lost when anything fails after createLearner. The first createLearner(storedId) on a lost save recreates it, so every later call answers recovered: true.
Scenario: launch with a stored id the server lost; createLearner answers recovered: false and creates a fresh save; then getWorld (or setItem) fails and the error banner shows. On retry recovered is true; the save starts over, nothing announced. A switch whose getWorld/currentEncounter fails, then retried, shows only "Now playing X."
Fix: remember recovered === false per learner id in a closure set, cleared once the notice is shown. Test "lost, fail, retry."

R2.3 — Minor — gameStore.js:55 (one counter raised at 172, 277, 399; read at 262, 296, 404)
One shared counter for world and party writes: a party write drops a world read, a move drops a party read.
Scenario: a send resolves the encounter and the post-resolve world+party read starts; the player taps "Save X" at once (allowed, loading already off). The recruit lands first, so the read is dropped, including the world with the completion and gate counts. The store keeps the pre-resolve world until the next openMap or move. A move while the Party screen opens likewise drops round 043's party refresh.
Impact: self-healing; every way onto the map except returnToDialogue (from a Spellbook opened on the map) and _reloadStale's closed branch goes through openMap.
Fix: two counters, worldWrites (move, load, resolve) and partyWrites (recruit, load, resolve), each read checks its own; apply the post-resolve world and party separately.

R2.4 — Minor — gameStore.js:508-511, with ReviewPanel.js:30-41
After STALE_CHALLENGE the review screen relies on `error` to show "Try again", but the banner's dismiss calls clearError. The panel then reads "No due review is available." though cards may be due; the only way on is Return.
Fix: a separate flag (e.g. reviewStale), or the panel offers "Continue reviews" whenever it is on the review screen with no challenge after a stale error.

R2.5 — Minor — gameStore.js:502 and :507-514
_sendReview checks neither the challenge nor the screen when the reply lands.
Scenario: submit, then tap Return while in flight (returnToDialogue clears reviewChallenge). The reply is STALE_CHALLENGE or a network error: the map or dialogue shows "This card was already answered or has expired. Try again for the next one." with no Try again button. A success plays the pass cue on the map.
Fix: capture from = get().view as startReview does; off-screen only clear isLoading (and on success apply the Spellbook).

R2.6 — Gap — not covered by store-review.test.js: the R2.1 sequence; help's reload when currentEncounter rejects (error, loading cleared, draft untouched); a reloaded encounter that is resolved; SAVE_LOST after a failed load and retry; a start whose view changes and returns to `from` before it resolves (should open the dialogue); a review answer whose reply was lost followed by "Show answer" (STALE_CHALLENGE; committed verdict never shown — honest but untested).

Checked and fine:
- Review attempt reuse: key is learner, challenge id (server random UUID), action, trimmed answer; server hashes the same trimmed answer, checks receipts before the challenge, replay sets replayed: true. An id cannot be reused for a different card or answer. On a stale challenge only that challenge's keys are deleted; success clears the map.
- Stuck loading: every path that keeps the same epoch and learner clears isLoading (revealHelp incl. the dropped reply, _reloadStale, _sendReview, _startNamed). Where owns() turns false with loading on, another action holds the epoch.
- Switching saves mid-request: every new or changed path checks epoch and learner before set or snapshots.set (help, reload, review, post-resolve read, openMap, openParty).
- Starts and restarts: the stay logic (from Spellbook or Party "Return to X" leads to the conversation; with no screen change the dialogue opens). Restart: a double tap sends one request; the verdict is cleared only on success; `starting` uses the definition id. CONVERSATION_UNDER_WAY follow-up still skips while loading.
- Help: STALE_MESSAGE does not reload. The send path through _reloadStale behaves as before.
- Post-resolve read: the counter is raised before the read and synchronously after the result unless replayed.
- SAVE_LOST: not shown on first launch or a new save; an older server without the field shows nothing.
- Event arguments: handlers passed to onPress ignore the event; Spellbook wraps onReview.

Not new in 096, noted only: openParty's .then(({ party }) => …) throws an unhandled rejection if getParty resolves to undefined, since .then's second argument does not catch errors thrown in the first.
```
