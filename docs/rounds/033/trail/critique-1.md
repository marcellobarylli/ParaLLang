# Claude subagent critique 1: unlocks for Mortimer, Flick and Marginalia

- **Dispatched:** 2026-11-05, between 19:14:40 and 19:16 (journal rows 3–4)
- **Returned:** unknown (the output file is a symlink whose time is the dispatch; the notification came after 19:16:37, journal row 5)
- **Model:** Claude subagent (general-purpose, claude-opus-5-5), read-only, repo access; Codex at its usage limit
- **Prompt:** adversarial critique of `docs/rounds/033/trail/plan-v1.md` against the loader, service, fragment content, party encounter and vocabulary files, `lore-fragments.test.js`, `party-conversation.test.js`, `DialoguePanel.js` and its test, and any test asserting the full fragment list; numbered Error / Risk / Suggestion list with fixes, Optional unnumbered, under 500 words
- **Reviewed input:** `plan-v1.md`, sha256 e85ec1b53c1b8f05901f2bcec616f7a29109733979df5cb91d6f21ce99cb7996, HEAD d13fb04, working tree: draft content and test changes were uncommitted while it ran
- **Findings:** 7

## Raw output (verbatim)

```text
The plan is sound in its main claims. I found no blocking errors, one wrong statement in the plan and a coverage gap in the stem leak check. Note that the working tree already has the content and `lore-fragments.test.js` changes, so I checked those too.

**Claims that hold:**
- **"No server change":** true. Each `found_after` home has a party conversation, so the loader's `after_conversations` check passes. `journeyFragments` gives each new fragment its conversation's `encounterId` and the home's `locationName`, and `fragmentNote` keys on `encounterId`, so Flick's and Marginalia's two fragments each stay apart.
- **Tests that break:** none outside `lore-fragments.test.js`. `bookshop.test.js`, `rift-boss.test.js` and the Gerald flow in `party-conversation.test.js` never raise those members' counts, and the loader cases that use `f[3]` still point at Gerald.

1. **Error (wrong statement in plan).** "Multi-word targets give stems with a space, which never match" is false for es `otra vez`: its first four letters are `otra`, with no space. That stem does apply and bans `otra`/`otras` from Marginalia's es fragment. Fix: correct the sentence in the plan, and in the plan-v2 record if there is one.

2. **Risk (leak-check gap).** For Mortimer the stem check checks next to nothing. In es both targets are multi-word (`me g`, `un p`), so it checks nothing at all; in it only `anco` is live. Marginalia's `di nuovo` gives the dead stem `di n`. The new text already contains Mortimer's comparison word: es "el hambre pudo más que el juramento", it "fu più forte". Nothing catches either. Fix: split multi-word surface forms into words and stem every word of 4 or more letters (`gust`, `poco`, `piac`, `nuov`, `otra`). Add a planted-word check on Mortimer's es fragment (for example "Le gustaba.") so the gap cannot come back.

3. **Risk (scope of the stem check).** Each fragment is checked only against its own conversation. But the Spellbook shows every found fragment's text during every encounter (only the translation is withheld). So the lotus text is visible during Mortimer's tasting, and the old dog's during Flick's walk. Fix: run every party conversation's stems over all four conversation fragments. The current text passes that (es `otros` does not start with `otra`), so it costs nothing now and guards future edits.

4. **Risk (gap in the server tests).** The API test only seeds `conversations` counts by hand. The counter in `learning-service.js` line 536 matches members by `characterId` alone, while `journeyFragments` matches by `encounterId` plus `characterId`. No test drives real resolved conversations for Mortimer, Flick or Marginalia. Fix: add one end-to-end run in `party-conversation.test.js`, for example three resolved tastings giving `['journey_forbidden_herd']` with `encounterId` `mortimer_tasting`, mirroring Gerald's test.

5. **Suggestion (mobile test).** The collision test should pass both Marginalia fragments in one array to `fragmentNote`, then check four cases:
   - resolving `old_bookshop_bookworm` gives "from here: The first stitch";
   - resolving `marginalia_fragment` at 3 conversations gives "from Marginalia: The old dog";
   - at 4 conversations it gives `''`;
   - Flick's lotus works the same way against The Sirens.

   As written the plan only names Marginalia and Mortimer.

6. **Suggestion (Spellbook display).** `mobile/src/components/Spellbook.js` lists fragments flat in file order with no grouping, and shows no location or member name. With seven fragments, Marginalia's two (positions 1 and 7) and Flick's two (2 and 6) end up far apart, and the `found` line is the only clue to where each came from. That is acceptable for this round, but record it as an open item for the owner (Simulator check). Also, "story order" now means file order, not the order of the Odyssey episodes.

7. **Risk (process).** The content and test edits are already in the working tree before the plan is frozen. Record the freeze before running the suites, or note the order in the trail.

Optional:
- The glossary-meaning check uses an exact match. "content, happy" and "even; also until" pass today, but a future "more" in any glossary would be caught only if it is its own comma-separated item. Fine as is.
- The es herd fragment's `compañeros` and the it `compagni` are not in either vocabulary today. Rerun the vocabulary-form check if Gerald's or the tutorial's vocabulary grows.

The files that matter are `/work/ParaLLang/server/test/lore-fragments.test.js` (items 1-3), `/work/ParaLLang/server/test/party-conversation.test.js` (item 4) and `/work/ParaLLang/mobile/src/__tests__/fragments.test.js` (item 5).
```
