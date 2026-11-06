# Critique 1: the round 100 plan

- **Dispatched:** about 08:12:30 UTC 2026-11-06
- **Returned:** about 08:14:40 UTC (127 s)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (limited until
  2026-11-09 17:32 UTC). Scratch scan in `/tmp/rc100`, deleted.
- **Prompt:** adversarial read-only critique of `plan-v1.md` against leak-scan.js, its tests, play-market's report
  fields, DialoguePanel, `learning-service.js` and committed reports: alignment of feedback and gradings, the open
  objectives for feedback, narrative timing, English collisions, the grader quoting the player, misleading numbers,
  missing tests, anything simpler; numbered Error / Gap / Cut with file:line; an Optional section; under 700 words.
- **Reviewed input:** `plan-v1.md`, sha256 1117ea9a…, HEAD ecc499c, working tree: docs/rounds/100/ new
- **Findings:** 8

## Raw output (verbatim in wording; bullet layout condensed when saved)

```text
The plan's question has a near-zero answer on the current corpus, and several decisions would mislead or do nothing. I ran a scratch scan over the 130 scannable reports (since deleted): 1166 narratives, 942 overall feedbacks and 1824 per-objective feedbacks. Narratives gave 0 fresh exact hits. Feedback gave 13: 11 in rounds 005–007 ("senza latte" / "caffè nero" in no_milk hints) and 2 that are just the English word "once" (052 variant-es).

1. **Error — Footnotes: the scan would read nothing, and it reads the unfiltered text.** play-market.js:236 records `footnote` "as written, before the server's filter". The server then drops any footnote holding any pack form (learning-service.js:463-467). So an exact hit in a report footnote is one the player never saw. Also, no committed report has a non-null footnote: `grep '"footnote": "'` finds nothing; the round 081 reports hold only null. Recommendation: drop `footnote` and `footnoteLines`. If you keep them, run `keptFootnote` first and count only what it keeps.

2. **Error — Reusing ENGLISH_COLLISIONS misses the collisions that matter for exact hits.** That set (leak-scan.js:22: come solo sin no me he son dia mas more) was built for word hits inside multi-word forms. "latte" is not a whole form here, only "senza latte". The single-word pack forms that are English words are: es once, kilo(s), cafe, chorizo, hola, amigo(s), yo, dos; it due, espresso, salami, salame, prosciutto, ciao, basta, otto, chilo. Two of the 13 corpus hits are "once". Recommendation: build a separate ENGLISH_FORMS set from the pack's single-word forms; mark matching hits `english` and count them apart, as FOREIGN_ENGLISH does, rather than skipping them. "Gerald pours an espresso" really does give the answer away.

3. **Error — The echo window for feedback is off by one unless the plan says otherwise.** Today messages = mine.slice(0, k) (scanReport) leaves out the message being graded. Turn j's feedback comments on message j: that covers a held pass that stays open (learning-service.js:952) and a grader quoting the player's failed answer; both would count as fresh leaks. Recommendation: for feedback use mine.slice(0, j + 1), and add a test with a held pass whose form the grader quotes. On this corpus the result doesn't change (0 cases), but the plan's wording invites the bug.

4. **Gap — Counting by surface form inflates the hits.** One no_milk feedback hits caffè nero, caffe nero and caffé nero as three forms. Recommendation: count per (text, objective), or report fresh texts only, as decision 6 says, and never sum hits.

5. **Gap — Separate pre-rule rounds from current ones.** The grader's ORDER rule "never write an expression … that would satisfy it" arrived in round 051 (commit 4a19dfa, prompt-builder.js:89). All the real feedback hits are from rounds 005–007, under an older prompt. Recommendation: print counts split by report round (before and from round 051), or the single number will read as a current problem.

6. **Gap — Pin how gradings are matched.** In 4 scenes there are more gradings than turns (010 butcher-it-1/2, 015 tour-it-usage-limit, 026 limit-after-tour-it), from steps that failed after grading and INVALID_GRADING outputs, which recordCalls keeps (play-market.js:186). The corpus has no duplicate overall feedback, so equality matched all 942 uniquely. Recommendation: still take the first unused grading in scene order, and add a test where two gradings carry identical feedback.

7. **Gap — Missing tests.** An English-form hit ("once") is marked english and not counted; feedbackUnmatched is counted; feedback on the scene's last turn (it resolves, nothing is open) yields no hit; a replay-greeting scene adds no narrative texts; unordered: a feedback form for an objective passed in turn j is not a hit, while one still open is.

8. **Cut — Decision 5's "read by hand" step.** Once English forms are marked (item 2), nothing is left to read by hand: 0 narrative hits and 13 feedback texts.

Optional
- Provisional assessment (DialoguePanel.js:48-58): the player sees the grader's feedback while the reply is being written, even when narration then fails and the step is not ok. The scan skips those gradings; the plan should say so. Scanning unmatched gradings against openObjectives(..., j) plus the failed turn's verdicts is probably not worth it.
- Narrative timing checks out: it renders with its own native (DialoguePanel.js:85), so "open at line k" is right, and narrative-retry groups keep the narrative of the kept call (play-market.js:235).
- `quoted` (intent passages) makes little sense for grader feedback; mark only echo there.
- Simpler: since the answer is essentially known (0 narrative hits; feedback hits only before the round 051 rule), consider a narrative and feedback extras scan with only echo/english marks and no footnote, and spend the round on whichever of these gaps you keep.
```
