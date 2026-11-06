# Review 1: the build of round 112 (commit 8bcac66)

- **Dispatched:** after the build commit, about 10:09 UTC (journal row 11)
- **Returned:** this file opened at 10:11:40 UTC (the agent reported 112 s)
- **Model:** a fresh general-purpose subagent of Claude (claude-opus-5-5), read-only by instruction (Codex limited); effort unknown
- **Prompt:** review commit 8bcac66 against `architecture.md`: strain order through storage and the read route, any code that assumes `strainedBy` holds every pending read, receipts and `baseLimit`, the web contract, leaks, it/es quality, UI wording, test gaps; numbered Error / Gap / Minor / Style, then Optional, under 800 words
- **Reviewed input:** commit 8bcac66, working tree: docs/rounds/112/trail/journal.md and docs/autonomy/decisions.md changed
- **Findings:** 9 (0 Error, 3 Gap, 5 Minor, 1 Style); 4 Optional

## Raw output (verbatim)

```text
I found no correctness Errors in commit 8bcac66. There are 3 Gaps (the main one: with two reads pending, the Spellbook note and the CM-002 redaction tell the player the wrong conversation), plus 5 Minor and 1 Style. `node --test test/annex.test.js test/containment.test.js` passed 14/14 and `npx jest src/__tests__/annex.test.js` passed 13/13. I did not run the full suites.

**Things I checked that hold**
- **Strain order:** `strainedBy` takes the first entry of `envelope.annexes`, and that order is the order the reads happened. The read route only appends to the list, and the save loader's filter, dedupe and `slice(0, ANNEX_LIMIT)` keep the order. Once a read is spent its `strainSpentOn` is set, so it drops out of the pending list.
- **Two-reads test:** each `play()` reloads the save, so the order is checked through the save. Reading CM-002 first means the test can tell save order from content order (which would put the Fountain first).
- **Resolve spend:** at the end of a conversation, only the ids in `strainedBy` are spent. That is correct now that `strainedBy` holds one id. Conversations are only held in memory, so no saved round-111 conversation still holds both ids.
- **Receipts and `baseLimit`:** a replay of a finished conversation shows no note. An ongoing receipt from before this round has no `baseLimit` and gets the round 111 wording. The frozen web client (`client/src/components/DialoguePanel.jsx`) reads only `remaining` and `limit`. The only place the hints payload is built is `server/src/learning-service.js:620`.

**Findings**

1. **Gap:** With two reads pending, both annexes show the same Spellbook note (`mobile/src/components/Spellbook.js:152`), "a hint fewer for each objective of your next conversation". For the newer read that is untrue: it costs the conversation after next. `strainPending` comes from that one record, not from the order. Fix: add something like `strainQueue` (the record's place among pending reads) to `annexSnapshot` and word the note "…of the conversation after your next one" or "(after the other annex's)".
2. **Gap:** The same wrong promise is in the CM-002 redaction itself ("the next conversation you finish") when CM-001 was read first and is still pending. Fix: soften it in both packs to "a conversation you finish, after any I am already recovering from". Re-run the English check; "I" and "you" are already allowed.
3. **Gap:** No test checks the Spellbook during the two-reads sequence. Both annexes' `strainPending` after the first finished conversation, and the third conversation's `strainPending: false`, are never asserted. Fix: return `spellbook.containmentFiles[*].annex.strainPending` from `play()` and assert `[true,true]`, then `[false,true]`, then `[false,false]`.
4. **Minor:** The second `play()` in `server/test/annex.test.js` asserts only `hints.limit`. It would pass if `baseLimit` or `strained` were wrong for the second strain. Fix: deepEqual the whole hints object as the first and third runs do.
5. **Minor:** The glossary words "fessura" and "grieta" mean "crack, slit". Glossing them as "seam" teaches a wrong meaning. Fix: gloss them "crack (here: the seam)". Better, use "cucitura" / "costura" for seam, or "spaccatura" if a rift is meant; this needs a new leak-check run.
6. **Minor:** "favella" is literary or archaic Italian. A learner who looks it up meets "speech, the faculty of speech", not "tongue". Fix: use "lingua" if the leak check allows it (critique 1.1 says it does not, since *lingua* is an answer). Otherwise gloss it "tongue, speech (literary)".
7. **Minor:** The glossary misses the line's key verbs, "sbaglia" / "se equivoca" ("makes mistakes"). It glosses the near-transparent "errore" / "error" instead. Fix: swap the "errore" / "error" entry for "non sbaglia mai" / "nunca se equivoca" = "never makes mistakes". The count stays at 10 and still matches across packs.
8. **Minor:** The note logic in `recoveringNote` assumes `baseLimit >= limit`, which the server guarantees; that is fine. But at the floor (an objective with `hint_limit` 1) the line reads "Hints: 0/0 (your companion is recovering: 1 fewer than usual)", and no test covers it. Fix: add a mobile case with `{limit:0, remaining:0, baseLimit:1}` to pin that wording.
9. **Style:** `baseLimit: objective?.hint_limit ?? 0` repeats the start of `hintLimit()`. Fix: have `hintLimit` return `{ base, limit }`, or add a `baseHintLimit(objective)` helper used by both.

I found no leaks. The it/es texts pass the shared answer check, and the English translation names no target. Apart from items 5 to 7, the Italian and Spanish read correctly ("un habla" is right; "Quella" / "Esa" are fine).

**Optional**
- To catch the next annex added in only one pack, have the containment test assert the set of annex keys is equal across packs (beyond the five English keys).
- Add a storage test that a save with two annex records keeps their order after load (for example, a dedupe keeping the later duplicate would silently reorder them).
- The strain still carries over between language packs if a save is shared and both packs have the same annex ids. This predates this round; worth a sentence in findings.
- "minutes of the seam" next to "Acta / Verbale della grieta / fessura": the English "seam" and the target word disagree. Aligning them (item 5) would also make the title gloss honest.
```
