# Critique 1 (round 028)

- **Reviewer:** a fresh Claude subagent (general-purpose agent, claude-opus-5-5), read-only, with repo file access,
  briefed as an adversarial reviewer. Stand-in for Codex, at its usage limit until 20:35 UTC (autonomous decision,
  pending owner review).
- **Critiqued:** `plan-v1.md`, sha256 a52a2b54…, HEAD f084b53.
- **Files named in the brief:** server/src/learning-service.js, server/src/world.js, server/src/content-loader.js,
  server/src/language-engine.js, both packs' the_rift_errata.yaml and cracked_fountain_letharger.yaml,
  rift_errata.yaml, letharger_flick.yaml, mobile/src/components/Spellbook.js, mobile/src/stores/gameStore.js,
  mobile/src/__tests__/spellbook.test.js, parallang_obsidian/LORE.md, docs/rounds/017/architecture.md.
- **Returned:** about 18:34:50 UTC (about 130 s).

The reviewer's final report, as relayed to the main agent (reformatted list layout; wording as received):

---

1. **Error: a background refresh in `openSpellbook` can show card meanings during an encounter.** The server sends `meanings` every time. The app hides them only because the snapshot says `inEncounter: true` (`Spellbook.js` `cardState`). `getSpellbook` is not serialized and `openMap` (the pattern the plan copies) has no epoch check. So this sequence leaks: open the Spellbook from the map, the GET starts with no encounter running, the player goes back and enters the encounter (`_startNamed` sets a spellbook with `inEncounter: true`), then the late GET lands with `inEncounter: false`. Every card's meaning now shows while the NPC's line is protected, which breaks round 017's rule. The same late GET can also overwrite a newer snapshot from `submitReview` or `sendMessage` and bring back old due or mastery states. Fix: keep a spellbook sequence counter that every spellbook write bumps. Apply the refresh only if the counter, `requestEpoch` and `learnerId` are all unchanged since the request. Better still, make `moveTo` return `{ world, spellbook }`, which removes the refresh (and the race) altogether.

2. **Error: "visited" does not mean the hazard was met.** The Fountain sits between the start and the Bookshop (`connections.yaml`), and a player can stand there and leave without starting Flick's encounter. The file would then print the jingle, explain what it means ("Hosts put things off") and give the counter ("do the thing you were putting off") before the player has heard it. That spoils round 025's briefing and the `now` objective. The Rift has the same problem: once it opens, arriving shows Errata's file before any meeting. Fix, with no save change: count a hazard as met when its encounter id is in `completedEncounterIds` or the learner's live session is that encounter. Or show the file on a visit but redact name, vector and containment (`████`) until the encounter is completed. LORE.md lists redaction as a containment method, so the redacted file fits the lore.

3. **Risk: the refresh's error and loading state can land on the wrong screen.** If the refresh fails after the player has gone to `review`, `dialogue` or `map`, it sets `error` there, as `openMap` does today. If the implementation sets `isLoading` for the refresh, it disables the Review buttons and stops `sendMessage` early. Fix: never touch `isLoading`, and set `error` only if `view === 'spellbook'` when the request settles. Test both cases.

4. **Risk: the target-form test only checks objective targets, not what the files teach.** It passes for `it` and `es`, but the Fountain file still pairs `dopo`/`domani` (and `después`/`mañana`, which are vocabulary entries) with their meaning while every card's meaning is hidden. Round 017 hid all meanings because "any card could answer". Fix: also run the check against every vocabulary entry the file's own encounter introduces, keeping a short allow-list for the jingle name with a comment on why it is allowed. Add a negative test that plants "adesso" in a note and expects a failure, so the test cannot pass with nothing checked.

5. **Risk: test fakes may pass without testing anything.** A mobile fake whose `getSpellbook` resolves at once never exercises the ordering in finding 1. Fix: use deferred promises, resolve the GET after `_startNamed` or `submitReview`, and assert that `inEncounter` and the card schedule stay as the newer response left them. Also check that existing `openSpellbook` tests whose fake API has no `getSpellbook` do not now hide a TypeError behind `error`. On the server, a "Rift visited" test that writes `visitedLocationIds: ['the_rift']` by hand skips the seal. Add a case that goes through `applyMove` with the five encounters completed and one where the Rift is still sealed.

6. **Suggestion: the Rift file is written twice.** Both packs carry the same English text, so the two copies can drift apart. Fix: put the file on the shared `characters/enemies/rift_errata.yaml` and let a pack override only `name`, or add a test that the two packs' CM-002 files are identical.

7. **Suggestion: "Native speakers of the other language are immune" is unclear.** LORE.md says natives of the foreign realm (the target language) are immune. From the player's side "the other language" could mean English. Fix: "Native speakers of the realm's language are immune. The author of this file is not."

8. **Suggestion: one test is missing.** No test checks that a party conversation (`flick_slow_walk`, played anywhere) neither reveals nor duplicates the Fountain's file. Add one.

9. **Suggestion: add the new screen checks to the Simulator list.** The open items for the owner should include VoiceOver reading the "Containment files" section during an encounter, and how the file looks below a long card list.
