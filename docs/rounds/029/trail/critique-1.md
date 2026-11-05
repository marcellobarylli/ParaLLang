# Critique 1 (round 029)

- **Reviewer:** a fresh Claude subagent (general-purpose agent, claude-opus-5-5), read-only, with repo file access,
  briefed as an adversarial reviewer. Stand-in for Codex, at its usage limit until 20:35 UTC (autonomous decision,
  pending owner review).
- **Critiqued:** `plan-v1.md`, sha256 1867107f…, HEAD 4e6f153.
- **Files named in the brief:** server/src/learning-service.js, language-engine.js, world.js, content-loader.js,
  both packs' the_rift_errata.yaml, content/world/locations/the_rift.yaml, server/scripts/play-market.js,
  server/test/rift-boss.test.js, rift-gate.test.js, mobile/src/components/MapPanel.js, Spellbook.js,
  mobile/src/stores/gameStore.js, mobile/App.js.
- **Returned:** about 18:43 UTC (about 100 s).

The reviewer's final report as relayed to the main agent (reformatted; wording as received):

---

1. **Error: the Rift's "words" are not unique ids, so the app's count and the review queue won't line up.** The plan's drill set is "the encounter's objective target ids". That is 17 ids in it and 15 in es, including alternatives the player never needs (`caffe`/`espresso`/`caffe_nero`, `fermati`/`fermo`/`basta`, `adesso`/`ora`, `sono`/`mi_chiamo`). Worse, the Spellbook's "Review" for a due card calls `startReview(vocabularyId)`, but the store's `onContinue` calls `startReview()` with no id. The server's `createReviewChallenge(null)` (learning-service.js ~566) then picks *any* due card in discovery order, not a drill card. So after the first drill review, "Continue" gives a non-target card, and the player can clear many unrelated due cards while the Rift's N stays put. **Fix:** in drill mode, have `startReview` cycle through the drill ids: pass the next blocking id from the map's `drill.vocabularyIds`. Or show the drill as its own list. Count blocking cards per `required_target_groups` alternative only if all of the group's discovered members are due. At minimum, test that "Continue" after a drill review offers a drill card.

2. **Error: a resolved session stays in memory and blocks restarting the Rift.** It doesn't block reviewing: `assertNoEncounter` only checks `ongoing`. But `startEncounter` returns early for `active && this.definition(active) === definition` with no `restart`. The plan's exemption ("does not block resuming an active session") is also wrong on its own terms: the drill check runs *after* the gate check and *before* line 270, so an old save with an ongoing Errata session gets 409 unless the check is placed after the resume branch. **Fix:** run the drill check after `const active = …` and skip it when `active` is this definition and `!restart`. Test both an ongoing session that resumes and a restart with due cards (blocked).

3. **Error: the drill is blocked whenever another encounter is ongoing, and nothing tells the player.** The player can walk away from an ongoing encounter: `moveTo` doesn't check sessions. They then reach the Rift with a session still in memory, get `DRILL_REQUIRED`, open the Spellbook, and every Review returns 409 `IN_ENCOUNTER`. They are stuck unless they find their way back to the other NPC. **Fix:** the 409 message and the map line should name the ongoing encounter, e.g. "Finish your conversation with Gerald first". Or the drill could end any non-Rift ongoing session before the reviews. Add a test.

4. **Risk: the tour and `--location the_rift` scripts will fail on the next live run.** `play-market.js --tour` never reviews: words chipped from exposure stay due (`initialSchedule` dueAt = now), so the Rift start will 409, and the tour's `resolved` will be false. Also, `--location the_rift` seeds a save (check whether that seed path discovers cards). **Fix:** add a `drill()` step before `playAt('the_rift')` that loops `createReviewChallenge(id)` / `submitReview({action:'reveal'})` over the blocking ids, and assert in a fixture test that the tour still passes the gate and resolves. Note that reveals record a quality-0 failure, which pollutes the learner's SM-2 history in reports. Prefer scripted correct answers from the entry's `target`.

5. **Risk: content-version-stale cards.** The plan says "its content version is current (as the snapshot filters)". `createReviewChallenge` throws `STALE_CONTENT` for a stale card picked by id, so a stale due card must not block. Also test that a card whose `contentVersion` doesn't match doesn't count on either side (the app only sees non-stale cards, so it agrees by construction; the server must match).

6. **Risk: tests that pass vacuously.** `fixedNow` is the tests' clock. A card discovered at `fixedNow` is due at `fixedNow`, but one scheduled by a passed objective is due a day later. Make sure the "blocked" test seeds cards that are due, and assert the 409's N equals the app's computed count for the same fixture.

7. **Suggestion: pedagogy and length.** Forcing up to 15–17 reviews of interchangeable alternatives is long, and "Review N due words" with N=12 after a tour is likely. Consider capping at one card per `required_target_groups` group (≤ 6), choosing each group's most overdue discovered card.

8. **Suggestion: deepEqual updates.** `rift-gate.test.js:91` and `rift-boss.test.js:137` deepEqual the Rift's encounter block with five fields. They will fail with `drill` added, so update them on purpose and mention it.
