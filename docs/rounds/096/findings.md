# Round 096 findings

## Question

The mobile store (`mobile/src/stores/gameStore.js`) holds the app's whole state. Its features were reviewed round by
round, but the store as a whole never was. Does an independent review find bugs a player can hit, and can they be
closed without a Simulator?

## Finding

**Three bugs a player can hit and four gaps, closed in the store; four findings deferred or rejected.**

- **A review answered on a bad connection could never be finished.** The app made a new attempt id on every tap.
  When the reply to a review was lost, the server had already recorded it and closed the card, so the second tap was
  refused as stale. The player never saw the verdict and was stuck on a dead card. The app now resends with the same
  attempt id, so the server replays the verdict (with no sound cue). A card that really is gone says so, and "Try
  again" fetches the next one.
- **A slow start pulled the player out of the Spellbook.** The greeting can take 20 seconds on the CLI providers, and
  the Spellbook stays open meanwhile. When the start finished, the app jumped to the dialogue. It now stays on the
  screen the player opened, and that screen's return button reads "Return to X".
- **A recruit could be undone on screen.** Right after a conversation resolved, the app read the party and the world
  again. A recruit made before those reads came back was then overwritten by the older party, and the Recruit button
  came back. A move could be undone the same way by the map's read. One counter of world and party writes now drops
  any read that began before a write.
- **Smaller:**
  - Restart is guarded like every other start, and a failed restart keeps the last verdict on screen.
  - A help request on a conversation the server had moved on, or forgotten after a restart, now reloads it. Before,
    it showed "Refresh" with nothing to press. Taps on an older line's chips keep the server's own message.
  - A help reply that comes back after a save switch is dropped, and loading still ends.
  - A save the server no longer had is announced, at launch and on a switch, instead of silently starting over.
- **Deferred:**
  - request timeouts, which need the Simulator (owner open item);
  - a removed save coming back after a failed device write;
  - two harmless retry-id details;
  - turning off help on older lines (a component change).
- **Rejected:** guarding the review Spellbook while the app holds a conversation the server forgot (that
  conversation is dead).

The review's "checked and fine" list covers: send ownership, the verdict poll, stale, closed and replayed sends,
`starting`, the conversation takeover, the Spellbook refresh guards, save switch / new / remove locks, failed startup
keeping the slots, onboarding, sounds, atmosphere keys, every server field and error code the app reads, and meanings
hidden during encounters and for due cards.

## Method

As in [architecture.md](architecture.md). Review and plan critique by fresh read-only subagents in place of Codex
(usage limit until 2026-11-09 17:32 UTC): review 11 findings (7 accepted, 3 deferred, 1 rejected), critique 9 (2
Error), all accepted. Jest with fake APIs and held replies; no Simulator, no LLM. Each fix reverted in turn to see a
test fail.

## Results

| Check | Result |
|---|---|
| `mobile/src/__tests__/store-review.test.js` (new) | 16/16: review resend reuses the id and shows the replay without a cue; a different answer or the reveal gets its own id; STALE_CHALLENGE stays on the review with the message; a slow start keeps the Spellbook and returns to the dialogue; a held restart keeps the Party screen; two restarts send one; a failed restart keeps the verdict; a recruit, a move, beat older reads; undisturbed reads apply (post-resolve, `openMap`, `openParty`); stale help reloads, closed help returns to the map, STALE_MESSAGE does not reload; a help reply after a new save is dropped; the lost save at launch, on a switch, not on a first launch or a new save |
| A fix reverted → test fails | 15/15 (attempt id, STALE_CHALLENGE, view guard, `returnView`, the three reads, recruit's write, help reload, STALE_MESSAGE, help guard, both notices, restart guard, replay cue) |
| Full suites | mobile 279/279 (263 before), server 356/356, client 12/12 |
| `npx expo export --platform ios` | bundles (697 modules) |

## Decision

Keep the fixes (autonomous decisions, pending owner review).

## Evidence

`mobile/src/stores/gameStore.js` (`reviewAttempt`, `_sendReview`, `placeWrites`, `_reloadStale`, `_startNamed`'s
`from`, `restartEncounter`, `revealHelp`, `SAVE_LOST`), the new test file, [`trail/review-1.md`](trail/review-1.md),
[`trail/critique-1.md`](trail/critique-1.md).

## Claim boundary

Jest with fake APIs; nothing checked in the Simulator. Components are unchanged; the new texts appear in the existing
error and notice banners.

## Open items

- Owner (Simulator): open the Spellbook during a slow start and check that "Return to X" leads back; answer a review
  with the network off, then on, and check that the verdict shows; check the new messages in the banners.
- Deferred: request timeouts (R1.7; iOS's own timeout and a value per call); a removed save returning after a failed
  device write (R1.10); turning off help on older lines (critique Optional).
