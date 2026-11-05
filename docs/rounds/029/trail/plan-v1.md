# Round 029 plan v1: forced repetition before the Rift boss (backlog C1)

## Goal
prototype.md Phase 4: "Forced repetition | Pre-encounter vocabulary review (Spellbook drill before boss fights)";
parallang.md: "Also FORCE repetition according to optimal guidelines". Before the player first faces Errata (the
Rift reviews the market's words), every Spellbook card among the Rift's review targets that SM-2 says is due must be
reviewed. Deterministic; no LLM or prompt change.

## Design
1. **Content.** Encounter field `drill_before: true` (optional boolean; location encounters only; loader refuses it
   on a party conversation). Set on `the_rift_errata` in both packs.
2. **Drill set.** The encounter's objective target ids. A card blocks when it is in the learner's Spellbook, its
   content version is current (as the snapshot filters), and it is due (`isDue(schedule, clock)`). Undiscovered
   targets do not block. Every review, passed, failed or revealed, schedules a card at least one day out
   (`scheduleReview`: q<3 → 1 day), so each blocking card needs exactly one review and the drill always ends. At most
   17 (it) / 15 (es) cards; in practice fewer, since passed objectives schedule their words.
3. **Server.** `startEncounter` for a `drill_before` encounter that is not completed refuses with 409
   `DRILL_REQUIRED` ("Errata reviews everything you have learned. Review your N due words in the Spellbook first.")
   while any card blocks, after the gate check. It does not block resuming an active session of that encounter (old
   saves) or a completed encounter's replay. The world snapshot's encounter block gains, only for drill encounters,
   `drill: { vocabularyIds: [...] }` (content-derived, so `worldSnapshot` stays pure); the other blocks are
   unchanged.
4. **App.** On the map, at a location whose encounter has `drill` and is not completed, the app counts the blocking
   cards from its own spellbook (`cardState(card, { now }) === 'due'` and id in `vocabularyIds`), so the count is
   fresh after each review without refetching the world. If N > 0: the Talk button is disabled, a line says
   "Errata reviews everything you have learned. Review N due words first.", and a primary button "Review N due words"
   opens the Spellbook (whose due cards already have Review buttons). If the server still refuses (clock skew), its
   message shows in the error banner, as today.
5. **Web client:** frozen; its start of the default encounter (Gerald) is unaffected.

## Tests
- Server: loader accepts it on the Rift, rejects it on a party conversation; a learner at the open Rift with due
  target cards gets 409 `DRILL_REQUIRED` (in-process and over HTTP via `api()` with `encounterId`), the message
  carries N; after reviewing each (one by reveal, one by a failed answer, the rest correct) the start succeeds; a
  non-target due card does not block; an undiscovered target does not block; a completed Rift does not block; the
  world snapshot carries `drill.vocabularyIds` for the Rift only.
- Mobile: map at the Rift with 2 blocking due cards shows the line and the review button, Talk disabled; the button
  opens the Spellbook; with the cards reviewed (not due) Talk is enabled and the line is gone; a due non-target card
  does not count.
- Full suites, expo-doctor, iOS export. `play-market.js --tour` would hit the drill: its script must review due
  target cards before the Rift (in-process `createReviewChallenge` / `submitReview` with reveal), with a dry check
  using a fixture provider; the live tour stays queued for Codex.
