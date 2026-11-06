# Review 1: the mobile store (`mobile/src/stores/gameStore.js`) as a whole, at HEAD

- **Dispatched:** about 07:19:10 UTC 2026-11-06
- **Returned:** about 07:23:50 UTC (282 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id a366ecfeaa1769752. Repro jest file outside the repo (`/tmp/rv2`, deleted).
- **Prompt:** independent adversarial read-only review of the store as a whole (with `saveSlots.js`,
  `api/learning.js`, the server's responses): races between async actions, stale responses, inconsistent state after
  errors, answer leaks on the app side, server/client contract mismatches, device storage; reproduce where cheap;
  numbered R1.n tagged Error / Gap / Minor with file:line evidence, a player sequence and a fix; "checked and fine";
  under 900 words.
- **Reviewed input:** HEAD f23481c, working tree clean
- **Findings:** 11 (3 Error, 5 Gap, 3 Minor)

## Raw output (verbatim)

```markdown
I found 3 bugs a player can hit, 5 gaps and 3 minor issues in the store at HEAD. I reproduced R1.1, R1.2 and R1.4 with an in-process jest file in `/tmp/rv2` (fake API, deferred promises), since deleted; nothing in the repo was touched. The rest I checked by reading the code and following concrete sequences.

**R1.1 Error: retrying a review after a lost response always fails (reproduced).** `mobile/src/stores/gameStore.js:445` and `:458` make a new `attemptId()` on every tap. The server commits the review, stores a receipt and deletes the challenge (`server/src/learning-service.js:1325-1331`). It only replays a receipt when the same attempt id comes back (`:1305`).
- Sequence: open a due card, Review, Submit, and the response is lost (network blip). The banner shows and the challenge stays. The player taps Submit again with a new id and gets `STALE_CHALLENGE` ("Fetch a new due review").
- Result: the review was recorded, but the player never sees the verdict and is stuck on a dead challenge until they leave.
- In the jest run the two calls carried different ids, the error was the stale one, and `reviewChallenge` was still `ch1`.
- Fix: reuse one attempt id per challenge, action and answer, as `retryIds` does for sends. On `STALE_CHALLENGE`, clear `reviewChallenge` and refresh.

**R1.2 Error: a slow encounter start pulls the player out of the Spellbook (reproduced).** `:188` always sets `view: 'dialogue'`. While the greeting is written, the Spellbook button stays enabled because the Header only disables Saves, Map and Restart (`mobile/src/components/Header.js`).
- Sequence: tap an encounter on the map or Talk on the Party screen, then open the Spellbook while the greeting is generated. When the start settles, the Spellbook is replaced by the dialogue.
- `startReview` already guards this with its `from` check (`:426`); `_startNamed` has nothing similar.
- Fix: capture `from = get().view` and switch to the dialogue only if the view is unchanged. Otherwise keep the encounter and let the map's "return to conversation" lead back.

**R1.3 Gap: Restart has no store-side guard.** `restartEncounter` (`:271-282`) checks neither `isLoading` nor `startSeq`/`starting`, and leaves `earlyAssessment` alone. Only the Header's `disabled` stops a second tap, so two quick taps before a re-render send two restarts. If the restart fails, the last verdict is gone, because `assessment` is cleared before the request. Fix: add the `isLoading` check, route it through `_startNamed(id, { restart: true })`, and clear the verdict only on success.

**R1.4 Error (rare): a stale party snapshot overwrites a recruit (reproduced).** After a resolve, `:348-349` fetches world and party with `Promise.all`, checking only `learnerId`, with no epoch or sequence. The resolved screen's Recruit can run in between.
- Sequence: the encounter resolves and the player taps Recruit right away. If recruit returns before `getWorld`, the party read before the recruit is applied afterwards.
- In the jest run the party went from 1 back to 0 while the notice still said "G joined your party.", and the Recruit button reappears.
- `openParty` (`:266-267`) and `openMap`'s `getWorld` (`:235-236`, which can overwrite a newer `moveTo` world) have the same pattern.
- Fix: add a write counter for party and world, and drop a read if a write happened after the read started.

**R1.5 Gap: a stale reveal leaves no way to recover.** `revealHelp`'s catch (`:396`) shows the server's text, "Refresh before retrying" or "Refresh to recover the current encounter" (`STALE_VERSION`, `STALE_ENCOUNTER` and `STALE_MESSAGE`, `learning-service.js:822-823`, `:842`). The app has no refresh action, and only `sendMessage` reloads on those codes (`:357`). Sequence: the server restarts (encounters are kept in memory), then the player taps a hint and every hint keeps failing until they send something. Fix: share the send's reload path for these codes.

**R1.6 Gap: the `revealHelp` success guard is weaker than the others, and stuck-loading cases are covered only by the lock.**
- `revealHelp` (`:393`) does not check `epoch` or `encounter.id`, and when it drops a reply it leaves `isLoading` true.
- The same early return without clearing loading is at `:149`, `:184` and `:319`.
- All of these are safe only because every action that changes the epoch is also blocked by `isLoading`. Fix: use an `owns()` like the send's and clear loading in a `finally` when the request still owns it.

**R1.7 Gap: requests have no timeout.** `mobile/src/api/learning.js:10` accepts `signal` but nothing passes one. A hung request keeps `isLoading` on, and Map, Restart, Saves, Send and Talk stay disabled. iOS's default 60 s request timeout probably limits this; I could not confirm it here. Fix: an AbortController timeout per request, longer for start and dialogue.

**R1.8 Gap: reviews apply their Spellbook without the meaning guard.** `startReview` and `submitReview` (`:431`, `:447`) skip the `leaksMeanings` check. If the server has forgotten the app's ongoing encounter, it allows the review and returns `inEncounter: false`, so meanings show while the app still presents the conversation as under way. That conversation is in fact dead (the next send returns `STALE_CLOSED`), so the leak is small. Fix: run `leaksMeanings` here too, or clear the encounter.

**R1.9 Minor: a save the server lost is silently replaced.** The server recreates an empty learner under the same id and returns `recovered: false` (`learning-service.js:142-153`). The app never reads `recovered` (`:100`, `:544`). Sequence: the server's data directory is wiped, the player relaunches, and their progress is gone with no notice. Fix: show a notice when `recovered === false` for a stored id.

**R1.10 Minor: a removed save can come back.** If the local storage write in `removeSave` fails (`:517-523`), the slot stays in device storage. If the app is killed before another write, the next launch lists the slot again (`initialize` re-persists it at `:104`), and Continue silently creates a fresh empty learner on the server. Fix: keep a "removed" tombstone in memory and retry the write, or filter removed slots at parse time.

**R1.11 Minor:** `retryIds.clear()` (`:320`) also drops other learners' pending retry ids. `startDrill` (`:410`) sets `returnView` even when `startReview` then bails because something is loading.

**Checked and fine:**
- Send ownership (`seq`, epoch, encounter id and version).
- The progress poll: latest send only, stops once the send settles.
- Stale, closed and replayed sends.
- `starting` handled by `startSeq` and the resets.
- The `CONVERSATION_UNDER_WAY` takeover only when nothing is loading.
- Spellbook refresh guards: sequence, epoch, object identity, `inEncounter`.
- Save switch, new save and remove: they lock, raise the epoch and reset per-save fields.
- Failed `initialize` keeps the device's slots.
- Onboarding shown only over the map.
- The sound-switch race.
- Atmosphere keyed by state.
- Contract fields the app reads all exist on the server: `encounterId`, `inEncounter`, `replayed`, `progress.assessment`, `language`, `drill`, `journeyFragments`, `joined`.
- Error codes the app checks (`CONVERSATION_UNDER_WAY`, `STALE_VERSION`, `STALE_ENCOUNTER`) are all sent by the server.
- Meanings stay hidden during encounters and for due cards, including by the clock for kept lines and card cross-references.
```
