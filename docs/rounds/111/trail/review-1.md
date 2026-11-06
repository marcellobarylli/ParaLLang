# Review 1: the build of round 111 (commit 848b4f6)

- **Dispatched:** 09:53:55 UTC
- **Returned:** about 09:57 UTC (09:53:55 plus the 186 s the agent reported); this file opened at 09:57:06
- **Model:** a fresh general-purpose subagent of Claude (claude-opus-5-5), read-only by instruction (Codex limited)
- **Prompt:** review commit 848b4f6 against `architecture.md` (not the trail): every hint_limit use, the strain
  spending (resolution, receipts, restarts, party, prefetch), save validation, payload leaks, the store's latest-wins
  and save-switch rules, accessibility, the it/es text; numbered Error / Minor / Gap / Style, then Optional.
- **Reviewed input:** commit 848b4f6, working tree clean but for docs/autonomy/STATE.md
- **Findings:** 13

## Raw output (verbatim)

```text
Review of commit 848b4f6 (redacted annex on CM-001). I found no Error-level bugs. Both suites pass: `server/test/annex.test.js` 8/8 and `mobile/src/__tests__/annex.test.js` 9/9.

What I checked on the server and found correct:
- **Hint limit:** every place that reads `hint_limit` now goes through `hintLimit(session, objective)` (`server/src/learning-service.js:465`). That covers the payload's `hints.limit`, `remaining` and `hints_available` (:603, :618-619) and the `HINTS_EXHAUSTED` check in help (:933). The quality cap (:1039) and the LLM schema do not depend on the limit.
- **When the strain is fixed:** it is decided in `_startEncounter` (:749) from the save loaded at the start of the call, under the per-learner lock. So a prefetched greeting or a `readAnnex` arriving at the same time cannot change it.
- **Resume, restart, party replay:** a resume keeps the held session, and a restart or a party replay builds a new session that is strained again. Sessions are only created at :752, :943 and :1128.
- **Spending:** it happens only in the resolving save (:1114-1117). A failed save spends nothing, and a replay of the receipt (:906) rebuilds the Spellbook without spending again.
- **Payload:** unread, the annex carries no text. Read, the translation and glossary are null during an encounter, and the annex no longer leaks through `properties`.
- **Store:** `readAnnex` (`mobile/src/stores/gameStore.js:299-314`) follows `moveTo`'s epoch, learner, `leaksMeanings` and snapshot rules. Its Spellbook is a new object, so `refreshSpellbook`'s identity check drops an older refresh.

1. **Minor**, `content/languages/es/encounters/cracked_fountain_letharger.yaml:43`, ending. "Esta estrofa no tiene final: únicamente tiene regreso" reads stiffly. "No tiene fin" is the idiom, and "tiene regreso" without an article sounds odd. Avoiding "solo" is justified, since it is part of the "café solo" answer. Fix: "Esta estrofa no tiene fin: únicamente tiene un regreso." "un" is already in the text, so the answer check still passes.
2. **Minor**, same file :43 and :51. "y la encuentra" means "finds it", but the shared English says "finds it again" (the Italian has "la ritrova"). Fix: "y la vuelve a encontrar", with the glossary entry `{ word: "la vuelve a encontrar", meaning: "finds it again" }`.
3. **Minor**, `content/languages/it/encounters/cracked_fountain_letharger.yaml:46-55`. The glossary never glosses "chi" (whoever), which is the structure the whole verse is built on. The Spanish glosses "el que la lee". It is already at the 10-entry maximum. Fix: replace "soltanto" with `{ word: "chi la legge", meaning: "whoever reads it" }`.
4. **Minor**, same file :43 and :53. For "a stranger", "uno sconosciuto" is more natural than "un estraneo" ("estraneo" leans towards "outsider"). Fix: "sulle labbra di uno sconosciuto", and update the glossary to match.
5. **Minor**, `mobile/src/stores/gameStore.js:311-313`. If the server answers `IN_ENCOUNTER` while the app does not know about that conversation (another device, or a session the app lost), the store only sets the error. The Spellbook still offers "Read it anyway", so the player can retry and fail indefinitely. Fix: on `IN_ENCOUNTER`, call `refreshSpellbook()` (the server's Spellbook then says `inEncounter` and the button goes), or fetch `currentEncounter` as `_startNamed` does for `CONVERSATION_UNDER_WAY` (:229-239).
6. **Minor**, wording in the redaction line (both yaml :42) and the alert (`mobile/src/components/Spellbook.js:119`). They say "each task", but the dialogue panel calls these "objectives" ("Current objective"). Fix: "a hint fewer for each objective of the next conversation you finish".
7. **Gap**, `server/test/annex.test.js:114-163`. Only `objectives[0]` is checked under strain. Fix: a test that advances to the second objective and asserts `limit − 1` there, and one on an unordered encounter.
8. **Gap**. Decision 4 says a finished party conversation spends the strain (the `party_of` branch at `learning-service.js:1104-1110`), but no test covers it. Fix: a party replay that is strained, then resolved, ends with `strainSpentOn` set to the party encounter's id.
9. **Gap**. No server test covers a start that is served by a prefetched greeting while the strain is pending. Fix: enable `prefetch`, let the greeting fill, read the annex, start, and assert `hints.strained: true`.
10. **Gap**, `mobile/src/__tests__/annex.test.js:121-132`. The save-switch test only changes `learnerId`. It does not cover the epoch, or the snapshot write at `gameStore.js:309`. Fix: read the annex, switch to save B through `switchSave`, switch back, and assert that the restored Spellbook shows the annex as read.
11. **Gap**. Reading the annex a second time while a conversation is under way (the `IN_ENCOUNTER` check at :381 comes before the already-read check at :384) is untested. That order is correct, but nothing pins it.
12. **Style**, `learning-service.js:749`. `pendingStrainIds(envelope)` is computed twice. Fix: compute it once into a variable.
13. **Style**, `Spellbook.js:124` and :136. `aria-label` on the outer annex `View`, which is not `accessible`, does nothing on iOS (the same pattern is already used on the containment card). The bars group would read better with `role="image"`.

**Optional**
- `learning-storage.js:53-58`: check `record.id` against `/^[a-z0-9_]+$/` and cap `strainSpentOn` at 100 characters, as `id` already is.
- `learning-storage.js:158`: `.slice(0, ANNEX_LIMIT)` keeps the oldest records. A 21st read would be saved and then dropped on reload, which silently lifts its strain. This cannot happen with one annex in the pack, but `readAnnex` could refuse at the limit.
- Show the base limit in `hints` (the deferred `baseLimit`), so the panel can say "1/1 (2 when your companion has recovered)".
- `Spellbook.js:131`: an `accessibilityHint` on "Read it anyway" that states the cost, for VoiceOver users who move straight to the button.
- Spanish: "Quien la lee la tararea; quien la tararea…" is the more proverbial register. "quien" is already on the fragments allowlist.
- Every check that needs the iOS Simulator remains open for the owner: the black bars' layout, the destructive alert, and VoiceOver order through the annex block.
```
