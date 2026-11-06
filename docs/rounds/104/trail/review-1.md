# Review 1: the code of rounds 100–103

- **Dispatched:** 08:38:28 UTC 2026-11-06 (journal row 2)
- **Returned:** before 08:41:14 UTC (the agent reports 147.6 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only (it ran the two test files), in place of
  Codex (limited until 2026-11-09 17:32 UTC).
- **Prompt:** adversarial read-only review of `git diff a8f01e8^ 770aa11 -- server mobile client` against rounds
  100–103's architecture records: correctness bugs, misleading scan numbers, regressions in `_reloadStale`'s callers,
  races, tests that pass without proving their claim, record/code mismatches; ids R1.n with severity, file:line,
  scenario and fix; a checked list; under 900 words.
- **Reviewed input:** HEAD 770aa11, working tree: docs/rounds/104/ new
- **Findings:** 8

## Raw output (verbatim in wording; layout condensed when saved)

```text
R1.1 to R1.3 are about the scan's numbers, and R1.3 I reproduced with a small script. The two test files pass (leak-scan 24/24, send-retry 19/19). I found no Error-level bug in the mobile store.

R1.1 (Gap) server/scripts/leak-scan.js:126 (NPC_ENGLISH_FORMS), used in soften at about line 259. espresso is marked soft in every Italian NPC line, but it is a required answer. It sits in order_coffee's required group [caffe, espresso, caffe_nero] and in Errata's order group. The rule never checks that the word is used as English. Scenario: Gerald says "Vuoi un espresso?" while order_coffee is open. The player can repeat it and pass, yet the line counts as soft, not leak. Errata's glitched "Un espresso, per favore" is hidden the same way. The findings say the 32 moved lines are all "espresso shots", but the code doesn't enforce that, so new reports are silently undercounted. Fix: treat it as soft only in an English context (for example /\bespresso shots?\b/ in the raw line), or only for Gerald's English lines. Add a test that "Vuoi un espresso?" is still a leak.

R1.2 (Gap) leak-scan.js:268-271 (kind order) and the printed "old leak N+M" line. "Old leak = leak + soft" is false in general. Before round 101, any fresh exact hit made a line leak. Now a line whose fresh exact hits are all frame or English, but which also has a fresh word hit, becomes near. The round's own test shows this: "Il tuo nome? Come ti chiamano? Chiamo io." is near now and was leak before. Such lines leave old leak and get added to near. The 149-report rescan happened to have none, but the printed label and the findings sentence "Earlier rounds' published leak counts equal today's leak plus soft" will be wrong on the first report that does. Fix: count a softNear (old leak, now near) and print old leak = leak + soft + softNear, or reword the label.

R1.3 (Gap, reproduced) leak-scan.js:269. If the player has already said the frame word, a fresh word hit is hidden. scanLine no longer lets a frame hit suppress word hits, but the near test still requires exact.some(fresh) || !exact.length. Scenario (Errata, it): the player said "nome", then the NPC says "Il tuo nome? Come ti chiamano? Chiamo io." The result is echo. The same line without the earlier turn is near. The fresh "chiamo" hint, which is a required form, drops out of every count. This contradicts decision 3 ("leak > near > soft"). Fix: near when any fresh word hit exists and no exact hit counts as a key, for example marked.words.some(fresh) && marked.exact.every((h) => !fresh(h) || h.frame || h.english). Add the echo case to the test.

R1.4 (Gap) leak-scan.js:173-182 (scanText). It keeps only the first matching form per objective. An echo or English form found first hides a fresh form of the same objective. Scenario: the player typed "vorrei", then feedback says "You said vorrei, but where is the caffè?" Both forms belong to order_coffee. vorrei comes first, is an echo, and the text counts as not fresh. A narrative "Gerald pours an espresso, then a caffè" is counted English-only, not fresh. This undercounts both fresh-narrative and fresh-feedback numbers. Fix: collect every matching form per objective and make the objective fresh if any one form is fresh.

R1.5 (Minor) leak-scan.js:98. The soft predicate passed to scanLine covers frame hits only, not espresso. So an English "espresso" hit still suppresses word hits of order_coffee's multi-word forms, which a frame hit no longer does. One soft category behaves two ways, and the findings line "a frame hit no longer suppresses word hits" doesn't say espresso differs. Fix: pass soft: (h) => isFrame(...) || npcEnglish.has(fold(h.form).trim()), or document the difference.

R1.6 (Minor) client/src/components/Spellbook.jsx:21. Meanings are hidden only by the server's card.due flag from when the snapshot was taken. A card that falls due while the Spellbook is open keeps showing its meaning, with "Next review: <past time>" and no Review button. The mobile cardState(card, { now }) handles this case. Fix: also hide when Date.parse(card.nextReviewAt) <= Date.now().

R1.7 (Minor, record) server/src/learning-service.js:292. Round 103 says the web Spellbook "hides meanings during encounters". The server still sends meanings in the Spellbook data during an encounter, so the hiding is cosmetic. This is not new and the app does the same, but the record and the round 017 comment ("the Spellbook gives no meanings") overstate it. Fix: blank meanings on the server when inEncounter is true, or correct the wording.

R1.8 (Minor, test) mobile/src/__tests__/send-retry.test.js, round 102 block. The read-ordering tests depend on one setTimeout(0) tick to reach the deferred currentEncounter read. Nothing asserts that the read was actually called before the player's action, so if the store's timing changed, the "start during read wins" case could pass without testing the race. Fix: assert that api.currentEncounter has been called before talkTo, openSpellbook or revealHelp.

Checked and fine
- _reloadStale → _applyLatest: the draft is kept and the encounter branch leaves the view alone, as before. Without an encounter it still goes to the map with STALE_CLOSED. The only change in behaviour is the saved snapshot's Spellbook: it now falls back to the current one instead of being possibly undefined, which fixes the old defect. leaveView is false for all existing callers.
- The replay branch: it is guarded by live, by the store still showing the replay (same id and version), by ongoing, and by a non-null latest. A start or help reload during the read wins. A resolved replay stands and the map still refreshes. A failed read keeps the replayed state. A send that isn't a replay makes no read.
- Leaving a screen open: with leaveView, a Spellbook or party screen opened during the read stays, and returning goes to the map because there is no encounter.
- openObjectives: narratives at line k use turns before k, feedback for turn j uses turns up to and including j, and echoes include turn j's own message.
- Feedback matching: it takes the first unused grading with the same overall feedback and counts the rest as unmatched.
- Totals: eraOf's regex and threshold are right, byEra adds up correctly, and ?? 0 handles older results that lack the new counts.
- Frame-word content test: it checks each listed id against its own objective's groups and forms in both packs.
- web-client.test.js: it uses the unmodified client store against an in-process server. The token is added only by the test's wrapper, and the no-token case is asserted as refused. fetch is restored afterwards.
- Web Spellbook component test: it covers meanings and the Review button both during and outside an encounter.
```
