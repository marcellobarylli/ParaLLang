# Round 100 plan v1: the leak scan reads what else the player sees

Source: round 097 review R1.5 (deferred): `leak-scan.js` reads only `dialogue.native`. The app also shows the
line's `narrative` (English, no server filter), its `footnote` (round 081, filtered) and, after each turn, the
grader's `overall_feedback` and each objective's `feedback` (DialoguePanel.js:57-58). Offline; no LLM call.

## Question

In the 149 committed live reports, how often do the narrative, the footnote or the grader's feedback hold a whole
target form of an objective still open when the player reads it?

## Decisions

1. **Separate, uncounted kinds.** `scanReport` adds per scene `extras: [{ field, line | turn, exact, native }]`
   with `field` one of `narrative`, `footnote`, `feedback`; the four existing kinds and their totals are unchanged.
2. **Exact hits only** (a whole surface form of an open objective's target). Word hits are not scanned in these
   English texts: inside English prose single content words of multi-word forms collide too often (e.g. "latte",
   "solo", "come"). Each hit is marked `echo` (an earlier player message holds it) and `quoted` (as for lines).
   A text is `fresh` if one hit is neither.
3. **Which objectives are open.** A line's narrative and footnote: the objectives open at that line (as for its
   native). Feedback of the scene's turn j (shown with reply line j+1): the objectives still open after turn j
   (`openObjectives(..., j + 1)`), since a form for the objective just passed is the player's own answer.
4. **Feedback source.** The step's `feedback` (overall) for every successful say; per-objective feedback from the
   scene's `grading` entry whose `output.overall_feedback` equals the step's feedback (gradings of failed attempts
   then never match). No match: overall only, counted as `feedbackUnmatched`.
5. **English collisions.** A form equal to an English word in `ENGLISH_COLLISIONS` is skipped in these fields
   (all English text). Others are read by hand in the findings.
6. **Totals:** `narrativeLines`, `footnoteLines`, `feedbackTurns` (fresh), and how many texts were scanned of each.
   The printed summary gets one more line per language.
7. **No content or prompt change in this round.** If leaks show, the fix (a narrative filter, a prompt rule) is the
   next round, measured live when Codex is back.

## Tests

`server/test/leak-scan.test.js`: a narrative naming an open form is a fresh hit; a closed one is not; feedback for an
objective passed in that turn is not a hit but for a later open objective is; echo marked; a grading of a failed
attempt (different overall feedback) gives no per-objective scan; the four existing totals unchanged over every
committed report (before/after diff of the printed kinds).
