# Critique 1: receipts pruned to the 20 newest (plan v1)

- **Dispatched:** about 06:53:00 UTC 2026-11-06
- **Returned:** about 06:54:20 UTC (78 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC); agent id ac41e604cf3c2ac38
- **Prompt:** adversarial read-only critique of `plan-v1.md` against `learning-service.js`, `learning-storage.js`,
  `mobile/src/stores/gameStore.js` and the web client; double application, the "20 later receipts" argument,
  committedAt ordering (injected clock, ties, integer-like ids), other readers of receipts, test strength, other
  growth; numbered findings tagged Error / Gap / Cut with file:line evidence, Optional list separate, under 700 words.
- **Reviewed input:** `plan-v1.md`, sha256 fa90b94d…, HEAD d248d49, working tree: docs/rounds/093/ new
- **Findings:** 6 (3 Error, 3 Gap), 4 Optional

## Raw output (verbatim)

```markdown
The plan's conclusion holds: I found no path where pruning applies a turn or a review twice. But the reason it gives for safety is wrong, the ordering rule can delete the receipt just written, and the size claim is overstated.

**Findings**

1. **Error: the "why safe" argument names the wrong rule.**
   - Safety has nothing to do with 20 later receipts. A dialogue resend reaches the receipt lookup first (`learning-service.js:911`), then `validateVersion` (`:917`, `:815-818`).
   - Every committed turn raises `version` by one (`:1022`), and that is set in memory before `return` (`:1042`). Every start, restart or party replay creates a fresh `randomUUID()` id with version 1 (`:664`).
   - So a resend of any committed turn, even a turn whose receipt was pruned, fails with STALE_VERSION or STALE_ENCOUNTER.
   - Reviews are safe because the challenge is deleted right after the save (`:1336`), which gives STALE_CHALLENGE. "Reviews wait until no encounter is under way" is irrelevant.
   - So safety holds for any limit, 0 included. The limit only decides how long a lost response can still be replayed.
   - Fix: restate it as that rule. Add a comment at the prune call saying the rule depends on the version being bumped and the challenge deleted for every receipt-writing path. A future path that writes a receipt without one of those breaks it.

2. **Error: sorting by `committedAt` can drop the receipt just written.**
   - `timestamp` comes from the injected clock (`:73`, `:1001`, `:1314`). If the clock moves backwards (a test clock, or an NTP step), the new receipt is the oldest. Pruning then deletes it before `save`.
   - Its own resend then gets STALE_VERSION instead of a replay, which is exactly the case receipts exist for.
   - Fix: `pruneReceipts(spellbook, keepId)` always keeps `keepId`, then keeps the newest `limit-1` of the others.

3. **Error: "ties in entry order" is not reliable.**
   - Routes pass `req.body` straight through (`routes/encounter.js:22`, `app.js:75`), so `attemptId` can be a number or a numeric string like `"5"`.
   - Integer-like object keys enumerate first in numeric order, both in memory and after `JSON.stringify`/`parse`. So "later entry" can mean an older one.
   - Ties are the normal case, not an edge case: most server tests use a fixed clock (`butcher.test.js:63`, `bookshop.test.js:66`, `ambient-vocabulary.test.js:144`).
   - Fix: with finding 2's always-keep rule, the tie order among older receipts no longer matters for safety. Document it as arbitrary, or add a `seq` field (an additive change; `validateEnvelope` at `learning-storage.js:96` ignores extra fields). Add a unit test with ids `"3"`, `"10"`, `"a"`.

4. **Gap: the size bound is a count, not bytes.**
   - Each receipt holds the encounter's transcript and a Spellbook snapshot (`:1033-1039`, `:1323-1333`), and both grow without limit.
   - The test "size flat after 20 receipts" passes in the fixture only because its Spellbook stops growing.
   - Fix: claim only a count bound. Either also drop `spellbook` from receipts and rebuild it on replay, as `replayWithLines` already does for lines (`:821-829`), or measure on the full market.

5. **Gap: the tests would miss broken implementations.**
   - The plan never names the first pruned attempt for the review test. After 20 later receipts, a resend reaches the challenge check and gets STALE_CHALLENGE (`:1302`). A resend made during an encounter gets IN_ENCOUNTER (`:1296`) before the receipt is even looked up.
   - Assert that the pruned resend leaves the Spellbook `evidence` count and the schedule unchanged, not only the transcript.
   - Add a clock-moves-backwards test where the newest receipt still replays (finding 2).
   - Add a test that a failed `save` (an injected `io.writeFile` throw) leaves the file's receipts untouched.
   - Prune through one shared helper so a test that deletes the review-path call fails. As planned, "limit removed fails a test" covers only the constant.

6. **Gap: old saves stay big until the next turn or review.**
   - `startEncounter` and `revealEncounterHelp` also rewrite the whole save (`:668`, `:863`) without pruning. A big old save pays the full cost on those calls and while browsing.
   - Fix: prune in `JsonLearningStorage.save` (`learning-storage.js:168`, after validation), keeping the id passed by the caller. Or accept the cost and say so.

**Other code that reads receipts:** only tests (`inscriptions.test.js:170`, `kept-lines.test.js:132`, `evidence-context.test.js:33`) and `measure.mjs`. None depends on old receipts, and I found no clients that do. The mobile app clears `retryIds` after every success or stale reload (`gameStore.js:320`, `:365`), so it never resends an old id. The web client never resends: it makes a fresh id per send (`client/src/stores/gameStore.js:80`).

**Optional**

- Pre-existing: `attemptId` values `"__proto__"` or `"constructor"` hit inherited properties (`:911`, `:1298`), giving a spurious ATTEMPT_REUSE or setting the prototype. Fix with `Object.hasOwn` plus `String(attemptId)`. `Object.entries` in the pruner would also miss a `__proto__` entry.
- `reviewChallenges` (`:1279`) grows in memory for each fetched but unanswered challenge until the learner is deleted. Cap it per learner.
- Saves are pretty-printed (`learning-storage.js:176`). Compact JSON would make each file about 30% smaller.
- `evidence` arrays (`:1011`, `:1316`) are the next unbounded growth in the save. Open a backlog item for them rather than leaving them only in the claim boundary.
```
