# Critique 1: each card keeps its 20 newest evidence entries (plan v1)

- **Dispatched:** about 07:01:10 UTC 2026-11-06
- **Returned:** about 07:02:25 UTC (74 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id abc5ba3670b1ce17f
- **Prompt:** adversarial read-only critique of `plan-v1.md` against `learning-storage.js`, `learning-service.js`,
  `server/scripts/`, `mobile/src`, `client/src`, prototype.md and the Obsidian notes; missed readers, time order,
  mutation inside `save`, the claim boundary's other bounds, test strength; numbered findings tagged Error / Gap /
  Cut with file:line evidence, Optional list separate, under 500 words.
- **Reviewed input:** `plan-v1.md`, sha256 f9114a03…, HEAD 9f664b6, working tree: docs/rounds/094/ new
- **Findings:** 5 (2 Error, 3 Gap), 3 Optional

## Raw output (verbatim)

```markdown
The plan holds up on its main claims. I found no reader of `evidence` that it missed, and trimming inside `save` causes no harm. There are still two errors and three gaps.

**Checked and fine**
- **Readers:** the only reads are tests (`fountain.test.js:256`, `unordered-objectives.test.js:126`).
  - `spellbookSnapshot` (`learning-service.js:280-300`) does not read it.
  - `server/scripts/play-market.js:232` reads the grader's `vocabularyEvidence` from the response, not the save's evidence.
  - `mobile/src` and `client/src` never use it.
  - prototype.md §5.3 and the Obsidian notes plan no feature that needs the full history.
- **Mutation inside `save`:** every writer saves a `structuredClone` (`:667, :862, :1001, :1081, :1249, :1311`). After `save`, the staged envelope is only passed to `spellbookSnapshot`, which skips evidence. `loadEnvelope` reads from disk on every request (`:172`), so no cached object goes stale.

**Findings**

1. **Error: "appended in time order" is not what the code guarantees.** `at` comes from the injected clock (`:1003`, `:1316`), which can step back, as round 093's critique 1.2 already notes. Keeping the tail is still right, because it keeps the most recently written entries. Fix: say "appended in write order; the tail is the newest written", keep `splice`/`slice(-n)`, and never sort by `at`. Add a test with a clock that steps back: the last 20 pushed are kept even when their `at` values go backwards.

2. **Error: "an old save shrinks to 20 on a start" depends on what "start" means.** `createOrRecoverLearner` (`:145-151`) saves only when no save exists, so recovering a learner never writes. Read-only calls (snapshot, getting a review) don't write either. `startEncounter` does save (`:674`). Fix: name the operation in the test (e.g. start an encounter, or move on the map at `:1083`). Also state that a 100-entry save stays at 100 entries until something writes it.

3. **Gap: the test "the schedule equals that of a run with the cap off" has no way to turn the cap off.** `EVIDENCE_LIMIT` is a module constant. Fix: give `JsonLearningStorage` an `evidenceLimit` option, defaulting to `EVIDENCE_LIMIT`, and pass `Infinity` in the comparison run. Or drop the comparison and argue from the code: scheduling reads only `schedule` (`:1011-1012`, `:1317-1318`).

4. **Gap: the claim boundary is loose.**
   - "The number of cards" is bounded by every vocabulary id any content version has shipped, not by the current pack. `discover` never removes a card, and stale cards stay in the save.
   - Each dialogue receipt holds a full `serializeEncounter` transcript (`:1035`, `forReceipt` at `:79-83` strips only `spellbook`). So the 20 receipts are bounded by 20 × `max_turns` (`content-loader.js:77`) transcripts, and after this change they dominate the file.
   - `validateEnvelope` keeps unknown keys untouched, so the bound covers only fields this server writes.
   - Fix: say all three. Re-measure and report the after-change share taken by receipts versus evidence.

5. **Gap: no test that a trimmed save loads again or that a replay still matches.** `fountain.test.js:262` compares the items before and after a replay with `deepEqual`. That stays true under the cap only because a replay doesn't save. Fix:
   - Trim a 25-entry card, load it, and confirm it validates.
   - Reach the cap and replay the last attempt: the items are unchanged.
   - In the service test, check that the newest entry's `objectiveId`/`kind` (or `at`) is the last turn's. A mutant `slice(0, 20)` passes "has 20 entries" but fails this.

**Optional**
- Trim only in `save`, not in `load`. Nothing reads evidence, so trimming at load changes nothing in memory.
- Test that a limit of exactly 20 trims nothing and 21 drops exactly one, to catch off-by-one mutants.
- Keep the second sentence of the "why 20" rationale ("bounded at 20 × cards") and soften the first ("future learner model") to "a cheap reserve". No design doc plans a learner model.
```
