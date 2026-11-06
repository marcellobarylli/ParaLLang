# Critique 1: lines you translated, kept in the Spellbook

- **Dispatched:** 2026-11-06 00:16:53 UTC
- **Returned:** 2026-11-06 00:20:01 UTC (recorded on return; the subagent ran 141 s)
- **Model:** a Claude general-purpose subagent (claude-opus-5-5), standing in for Codex (Codex at its usage limit
  until 01:36 UTC); read-only by instruction; agent id a9f22d5990478c784
- **Prompt:** adversarial review of `plan-v1.md` against learning-service.js (reveal, snapshot, fragments, party
  conversations, receipts), learning-storage.js, Spellbook.js, gameStore.js and tests; round 017's rule; the frozen
  web client; numbered findings typed Error / Risk / Gap with evidence and a recommendation, then Optional items.
- **Reviewed input:** `plan-v1.md`, sha256 482518aa…, HEAD c6d5514, working tree docs/rounds/060/ only
- **Findings:** 9

## Raw output (verbatim)

```text
I checked the plan against the code. It has one real answer leak, one storage-cost problem the plan doesn't mention, and several smaller gaps. Hiding lines during an encounter does work, and older and newer servers can read each other's saves.

1. **Risk: the translation of a kept line gives away the meaning of a due card.**
   - Evidence: a due card hides its meaning, and the English of its example (`mobile/src/components/Spellbook.js:36-38, 107-110`). The plan hides a line's translation only on `inEncounter` (plan Design 2). Translated lines contain pack vocabulary by construction: `canonicalizeNarration` (`learning-service.js:270-289`) matches the line's words to vocabulary ids. Fragments are safe to show only because their texts hold no vocabulary form (`learning-service.js:237-239`).
   - Result: between encounters, a card due for review sits a few rows above a line like "Il pane è caldo" followed by "The bread is warm". That breaks the round 017 rule.
   - Recommendation: store the line's `vocabularyIds` (`activeMessage.dialogue.words`). The server sets `hidden` when the player is in an encounter or when any of those cards is due. Send the `vocabularyIds` so `Spellbook.js` can apply the same clock-based check as `cardState`, which covers a snapshot that has gone stale. Add server and mobile tests for "line hidden while a card in it is due".

2. **Gap: saved receipts would each carry a full copy of the lines, and receipts are never pruned.**
   - Evidence: every dialogue and review receipt stores the whole response, spellbook snapshot included (`learning-service.js:621-636, 879-893`). Nothing ever deletes receipts.
   - Result: up to 50 lines (each with native text and translation) get copied into every future receipt. Save size grows by about 50 lines times the number of receipts, and every API response grows too.
   - Recommendation: keep `lines` out of the snapshot stored in receipts. Either strip it before storing, or return it from `GET /api/spellbook` only and add it to live responses. Alternatively, bound the receipts. Either way, add a test on save size or receipt shape.

3. **Risk: replaying a stored dialogue response can show translations during a new encounter.**
   - Evidence: a dialogue replay returns `existing.response` unchanged, before any check on the current encounter (`learning-service.js:520-523`). When an encounter resolved, that stored snapshot was built with the resolved encounter (`:632`), so translations are visible in it.
   - Result: retrying a resolving attempt after a new encounter has started returns visible translations. Card meanings already leak the same way, but lines add whole sentences.
   - Recommendation: on a replay, rebuild the spellbook part from the current envelope and encounter (`spellbookSnapshot(envelope)`). The other option is to follow recommendation 2 so receipts hold no lines. Add a test for it.

4. **Risk: one malformed line makes the whole save unreadable, and blocks every write.**
   - Evidence: `save()` runs `validateEnvelope` before writing (`learning-storage.js:139-140`). The plan makes malformed `lines` a `SAVE_UNREADABLE` error.
   - Result: a single bad entry, such as an empty speaker or an unexpected shape from a future change, locks out the learner's cards, world and party. A write-side bug would fail every later save, not only reveals.
   - Recommendation: strictly validate only the container, i.e. `lines` must be an array if present. On load, drop invalid entries and keep the save. Strings must be non-empty and `savedAt` must parse. The translation schema already requires `min(1)` (`llm/schemas.js:15`), so test that case too.

5. **Error: the plan's place name is wrong for party conversations.**
   - Evidence: party encounters have no `location` (`content/languages/it/encounters/flick_lotus.yaml:3` has only `party_of`). A party conversation takes place where the player stood (`sceneLocationId`, `learning-service.js:113, 391`), not at the member's home.
   - Recommendation: store `locationId: this.sceneLocationId(current)` (or the scene name) when saving the line. Resolve it with `locationsById` and fall back to null. Don't derive it later from `encounterId`. Guard the lookup if the `party_of` home has been removed from content.

6. **Gap: the staging and rollback rule is not stated.**
   - Evidence: `revealEncounterHelp` (`learning-service.js:471-478`) saves `stagedEnvelope` and only then commits `staged` to memory. The early return for an already-revealed line (`:469`) comes before any write.
   - Recommendation: say that the line is added to `stagedEnvelope` only, after the `alreadyRevealed` return. Add a test where `storage.save` fails on a sentence reveal: no line is persisted, no hint is charged, the version is unchanged, and a retry stores the line exactly once.

7. **Gap: deduping by native text alone loses context and has edge cases.**
   - Evidence: plan Design 1. Two speakers, or two packs' encounters, can say the same short line ("Buongiorno!").
   - Result: moving the entry to the front keeps the old speaker or place. Case and whitespace differences, which the LLM produces, slip through as duplicates.
   - Recommendation: dedupe on normalised native text plus speaker (or plus `encounterId`). On a move-to-front, overwrite the whole entry, `id` and place included. Test it.

8. **Gap: the reveal path has no receipt, which is fine, but the retry case is untested.**
   - Evidence: a reveal is idempotent through `version` and `alreadyRevealed` (`learning-service.js:445-469`), not through `processedAssessments`. A retry with the old version gets `STALE_VERSION`, and the app refreshes.
   - Recommendation: say explicitly that no receipt is needed. Add a test: reveal, then retry with the same version, gives `STALE_VERSION`, the line is stored once, and `current` shows the line hidden.

9. **Gap: the mobile store and tests are missing.**
   - Evidence: `emptySpellbook` in `mobile/src/stores/gameStore.js:33`. The snapshot cache at `:85, 138, 242, 378, 394`.
   - Recommendation: test that a line saved by `revealHelp` appears, hidden, in the store's spellbook. Test that after the encounter resolves, the dialogue response shows the translation. Test that switching saves (the snapshot restore at `:394`) does not carry one save's lines into another.

**Optional**
- Cap the stored text length (for example 500 characters each) to bound the save against a runaway provider reply.
- Put the visible translation behind a toggle, as fragments do (`Spellbook.js:55-90`), so re-reading becomes recall practice rather than passive reading.
- Saves are per language (`config.js:83`), so mixing packs is not a concern. Add one test that the `accessibilityLanguage` is the pack's tag.
- The frozen `client/` ignores the new field. Run its tests anyway, since the shared snapshot shape changes.
- Remove `lines` along with the save: the existing `remove` does this already. Note it under privacy.
```
