# Critique 1: the redacted annex (plan v1)

- **Dispatched:** 09:45:30 UTC
- **Returned:** about 09:49:50 UTC (dispatched 09:45:30 plus the 259 s the agent reported; this file opened at 09:50:09)
- **Model:** a fresh general-purpose subagent of Claude (claude-opus-5-5), read-only by instruction; Codex is at its
  usage limit until 2026-11-09 17:32 UTC
- **Prompt:** an adversarial read-only design critique of `plan-v1.md` against the code (start, serialize, revealHelp,
  resolution, snapshot, storage, schema, routes, the app's Spellbook, store and dialogue panel, the answer check);
  look for replay holes, races with the app's refresh rules, dodges, answer leaks, save risks, test gaps, lore fit;
  numbered findings labelled Error / Gap / Minor, then Optional.
- **Reviewed input:** `plan-v1.md`, sha256 7c380eee…, HEAD c511483, working tree changed: the build had begun while
  the critique ran (content-loader.js, learning-service.js, learning-storage.js, app.js, the mobile api, both
  Fountain encounter files); the critic says so at the end.
- **Findings:** 11

## Raw output (verbatim)

```text
1. **Error: the annex's text and translation leak through `properties`, which nothing in the plan covers.** In HEAD, `containmentFiles` (server/src/learning-service.js:423) takes `designation, name, class, notes` out of the file and copies every other key into `properties`. If `annex` is added to the schema (content-loader.js:54-64) without changing that line, the whole annex goes out in every Spellbook payload: its text, translation and glossary, before the player reads it and during encounters. The mobile app would hide it, because Spellbook.js:97-103 shows only the listed properties, but the payload still carries it. The working-tree code in progress already takes `annex` out of the spread. Fix: write that into the plan, and add a test that `properties` has exactly the five keys. containment.test.js:103 checks this with deepEqual, so say that test must stay unchanged.

2. **Error: the plan's English check fails on the authored redaction.** I ran the round-110 check (lore-fragments.test.js:38-43) over title, redaction and exposure note. Italian gets `['i', 'you']` and Spanish gets `['i']`, from "I will need…", "If you read it" and "you finish". The redaction is shown during encounters, so plan item 2 as written cannot pass. Fix: either reword without "I" or "you" (third person: "Your companion will need a while…"), or add an allow-list for the annex with a reason for each word, as `ENGLISH_ALLOWED` does. The plan's sample line ("I have blacked this one out. Trust me.") also differs from the YAML, so pick one.

3. **Gap: the cost is easy to dodge.** Every `hint_limit` in both packs is 2, so the strain costs one hint per objective. Any resolution spends it, including:
   - a resolved party conversation played again from the start, anywhere (learning-service.js:655, spent at :1040-1043);
   - a restarted location encounter that is already completed. The `!completedEncounterIds.includes` branch at :1044 is skipped, but under the plan the resolution still spends.

   The player reads the annex, replays a party conversation whose answers they know, and pays nothing. Fix, choose one:
   - spend only when the session would have counted (a first completion, or a party conversation that raises `conversations` for the first time at that tier);
   - spend only once the reduced cap actually bit (the player hit `HINTS_EXHAUSTED` at limit−1, or ended with every objective at the reduced cap);
   - accept the dodge and record it in decisions.md as an autonomous decision, pending owner review.

4. **Gap: `readAnnex` in the app must follow the store's Spellbook rules, and the plan only says "applies the returned Spellbook".** The server answers IN_ENCOUNTER from its in-memory session (learning-service.js:274). After a server restart the app can still hold an ongoing encounter while the server reports `inEncounter:false`, which is the case `leaksMeanings` guards (gameStore.js:32). Replies can also arrive out of order against a start. Fix:
   - apply the reply only if the `requestEpoch` and learner match and `!leaksMeanings(get(), spellbook)`;
   - update `snapshots` the way gameStore.js:183 does, or a save switch restores the pre-read Spellbook;
   - disable "Read it anyway" when either `spellbook.inEncounter` or the store's `encounter?.state === 'ongoing'`;
   - a new Spellbook object makes any `refreshSpellbook` already in flight drop its reply (:258); test that.

5. **Gap: the replay path is right by construction but untested.** The spend is written in the same staged save as the receipt (:1056 `keepReceiptId`). A replay (:929, :842) returns the stored encounter (`hints.strained:true`) plus the Spellbook as it is now (`strainPending:false`). A failed save spends nothing. Add tests:
   - resend the resolving turn's attemptId: `replayed:true`, nothing spent twice, `strainSpentOn` unchanged;
   - a STORAGE_FAILURE on the resolving save leaves the strain pending;
   - the next session after a spend has `strained` absent.

6. **Gap: the rule for unknown annex ids is not stated.** Plan item 3 keeps unknown ids. Item 5 defines pending as "any read annex has null". If pending counted ids no longer in the content while the spend only touched known ones, the player would be strained for good. The working tree's `strainPending` filters to known ids and spends all of them, which is consistent. Put that rule in the plan and test it with a save whose annex id is not in the content.

7. **Gap: the strain only applies at session start, and the spend should match that.** `strained` is set at start (the session object near :743 in the working tree) and lives only in memory. The spend marks "every pending annex". Today that is safe only because reads are refused during encounters, which is the condition the lore says is variable. Fix: record which annex ids strained the session (`strainedBy: [ids]`) and spend only those. This keeps it right if a later round allows reads during some events.

8. **Minor: the plan cites the lore the wrong way round.** LORE.md:54 says the companion's ability to redact "is limited during certain events": during events the hazard is less contained, not more. The plan's IN_ENCOUNTER refusal ("the redaction holds during events") is a sound mechanic, but don't justify it with that line. Also, LORE.md:53 puts the cost on translating. Here the cost lands on revealing the target-language text, and the translation is free behind the toggle. Either say why reading counts as exposure (LORE.md:39, "you can't be harmed by an infohazard you can't understand", supports it), or move the charge to the first translation toggle.

9. **Minor: the "recovering" note can outlive the strain.** `hints.strained` stays true on the resolved session the server keeps. DialoguePanel.js:44 would then show "(your companion is recovering)" after the strain is already spent. Show it only while `encounter.state === 'ongoing'`.

10. **Minor: a dropped save entry dodges the cost.** An annex record that fails validation (a bad `readAt`) is dropped silently. That removes the pending strain and makes the annex unread again, so a second read charges again. This is acceptable, but write it down. Also, a retried first read whose reply was lost comes back `charged:false`, so the app must not phrase its message on `charged`.

11. **Minor: the floor of 0 needs a test with synthetic content.** All current objectives have `hint_limit: 2`, so `max(0, limit−1)` with limit 0 or 1 is never exercised. Test it with an objective at 1, checking `hints_available:false` and `HINTS_EXHAUSTED` on the first reveal.

**Optional**
- Add `baseLimit` to `hints`, so the panel can show "Hints: 1/1 (2 when your companion recovers)".
- Make sure the market-entrance tutorial is never strained, since it teaches hints. It comes before CM-001, but it can be restarted.
- Check the annex text with the same `answerLeaks` call in the content loader at startup, not only in tests. Both packs pass today: `forms`, `targetWords` and `meanings` are all empty.
- The web-client contract test checks only that `hints` has certain keys (web-client.test.js:42), so `strained` is harmless there. Note this in the plan to explain "contract test unchanged".

Some of the code is already written in the working tree (content-loader.js, learning-service.js, learning-storage.js, app.js, mobile api). It already handles finding 1, deduplicates annex records in storage, and filters pending strain to known annex ids. Findings 2-5 and 7-9 remain open.
```
