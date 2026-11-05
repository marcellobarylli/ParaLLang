# Codex critique 1: round 017 the Spellbook stops giving answers away

- **Dispatched:** 2026-11-05T15:48:30Z
- **Returned:** 2026-11-05T15:54:40Z (the output file's mtime)
- **Model:** codex-cli, `codex exec --sandbox read-only -c model_reasoning_effort=high --json`; thread 01a1ac65-b465-7da1-83d3-a969a64cbe50
- **Prompt:** the codex-critique template, preceded by the no-commands preamble, plus "Number your findings 1, 2, 3, ..." (verbatim prompt below the output)
- **Reviewed input:** `plan-v1.md`, sha256 e5e0f129197133ed4a3632ea8740b6fade86da6b19c5c88cc27d225a5ce293cb, HEAD f264de7. Stdin bundle sha256 a97f0da7178819f9b77c0590659e0175187f6f5576be5060100717bef07681fa (1456 lines): `cat -n` of docs/rounds/017/trail/plan-v1.md and, at HEAD, server/src/learning-service.js, server/src/language-engine.js, server/src/app.js, mobile/src/components/Spellbook.js, mobile/src/components/ReviewPanel.js, mobile/src/components/BilingualText.js, mobile/src/stores/gameStore.js, mobile/App.js, client/src/components/Spellbook.jsx, client/src/stores/gameStore.js, content/languages/it/vocabulary/gerald_coffee.yaml
- **Findings:** 6

## Raw output (verbatim)

The agent messages of the JSON event stream, in order.

```text
I’ll check the plan against the supplied code and data, including review entry points, card content and the proposed checks. I won’t run commands or change files.
The card rules miss leaks through other vocabulary entries: a visible example can translate a protected word, and a phrase’s meaning can expose it too. I’m also checking whether challenge creation guards cover later submissions and whether the stored `due` flag stays accurate as time passes.
The plan is not sufficient. It misses leaks across cards, previously issued reviews, and time passing.

1. **Error — high: hiding answers on a per-card basis still leaks through other cards.**

   **Evidence:** Plan lines 34–37 show meanings, notes and translated examples on any card that is neither due nor in play. But `vorrei`’s example translates *caffè* as “coffee” ([gerald_coffee.yaml:53](/work/ParaLLang/content/languages/it/vocabulary/gerald_coffee.yaml:53)); `caffe_nero`’s meanings also disclose coffee, and its note connects the phrase to *senza latte* ([gerald_coffee.yaml:85](/work/ParaLLang/content/languages/it/vocabulary/gerald_coffee.yaml:85)).

   **Failure:** With `caffe` protected or due and `vorrei` not due, the Spellbook displays “Vorrei un caffè / I would like a coffee.” Hiding `caffe`’s own card does not hide its answer.

   **Smallest fix (0):** Use a conservative Spellbook-wide guard for meanings, notes and example English whenever any card is due or in play. Show reference content when that guard clears. This avoids adding content-dependency tracking. Include a cross-card example in the checks.

2. **Error — high: reviewing a different vocabulary ID can still disclose an in-play answer.**

   **Evidence:** Plan lines 26–27 exclude only cards whose own ID is in play. Review feedback returns the reviewed entry’s canonical translation ([learning-service.js:509](/work/ParaLLang/server/src/learning-service.js:509)). `caffe_nero`’s canonical translation is “black coffee” ([gerald_coffee.yaml:85](/work/ParaLLang/content/languages/it/vocabulary/gerald_coffee.yaml:85)).

   **Failure:** The current NPC line protects `caffe`; an already discovered, due `caffe_nero` is absent from that line. Reviewing `caffe_nero` and choosing “Show answer” exposes “black coffee,” bypassing the protection on `caffe`.

   **Smallest fix (−):** Replace selective review availability with a blanket review block during ongoing encounters. This is simpler than determining which other review answers disclose each protected word.

3. **Gap — high: challenge creation is guarded, but challenge submission is not.**

   **Evidence:** The plan changes `createReviewChallenge` only. Existing `submitReview` checks challenge existence and content version, then returns the answer without checking the encounter ([learning-service.js:488](/work/ParaLLang/server/src/learning-service.js:488)). Cached review responses return even earlier ([learning-service.js:483](/work/ParaLLang/server/src/learning-service.js:483)).

   **Failure:** Issue a challenge for `caffe` while it is unprotected, start or advance an encounter so `caffe` becomes protected, then submit the old challenge with `action: 'reveal'`. The proposed creation guard never runs, and submission returns “coffee.” Replaying a completed review can likewise return its cached answer.

   **Smallest fix (+):** Reuse the encounter review gate in `submitReview`, before both the cached-response return and grading. Check creation-before-encounter followed by both answer and reveal submissions.

4. **Gap — high: a card can become due while the app still displays its reference meaning.**

   **Evidence:** `due` is calculated only when the server builds a snapshot ([learning-service.js:96](/work/ParaLLang/server/src/learning-service.js:96)). Opening the Spellbook merely changes the view; it does not refresh that snapshot ([gameStore.js:150](/work/ParaLLang/mobile/src/stores/gameStore.js:150)). The actual due rule compares the deadline against the current time ([language-engine.js:110](/work/ParaLLang/server/src/language-engine.js:110)).

   **Failure:** Load a card shortly before `nextReviewAt`, then leave the app open past that time. Its stored `due` remains false, so the proposed reference branch continues displaying its meaning, note and example English after it becomes due.

   **Smallest fix (+):** Derive display eligibility from `nextReviewAt` against the current clock, with one timer to rerender at the next due boundary. Test crossing that boundary without another API response.

5. **Error — medium: the promised review feedback has no data or rendering path.**

   **Evidence:** Plan lines 35–36 promise that notes and example English appear in review feedback. The proposed server additions affect cards only. Existing review results contain neither field ([learning-service.js:504](/work/ParaLLang/server/src/learning-service.js:504)); `ReviewPanel` renders feedback, the canonical answer and scheduling information only ([ReviewPanel.js:9](/work/ParaLLang/mobile/src/components/ReviewPanel.js:9)). Its caller does not pass the Spellbook cards ([App.js:35](/work/ParaLLang/mobile/App.js:35)).

   **Failure:** Review a due `caffe` card or choose “Show answer.” The feedback displays “coffee,” but neither its authored note nor its example appears as promised.

   **Smallest fix (−):** Remove the promise that notes and examples appear in review feedback. Keep notes on eligible reference cards after review; the goal does not require extending `ReviewPanel`.

6. **Cut — medium: `expo-doctor` is an unrelated mandatory check.**

   **Evidence:** Plan line 54 requires it, while the proposed changes affect service behavior and component rendering, with no Expo configuration or dependency changes.

   **Concrete consequence:** It adds an environment-validation requirement without checking answer hiding, review exclusion or web compatibility.

   **Smallest fix (−):** Drop `expo-doctor` from this round’s required checks. Retain the relevant behavioral tests and build/export checks.
```

## Prompt (verbatim)

```text
Your shell sandbox cannot start in this environment, so do not run commands: the plan and the repository files it depends on are given in full, with line numbers, in the <stdin> block below.

Read-only: do not edit, create or delete any files. Critique the plan in `docs/rounds/017/trail/plan-v1.md` against the code in this repo. Its goal: the iPhone app's Spellbook never shows the English meaning (or a note or example translation that gives it away) of a word the game is currently asking the player for, namely words protected in the NPC's current line (the companion's hint budget) and words due for review; vocabulary notes are shown where they do not give an answer away; the review flow cannot be used to read an in-play word's meaning mid-encounter; the frozen web client keeps working. The owner values simplicity: the best plan is the smallest one that meets the goal correctly.

Report three kinds of finding:
1. **Error:** something that would make the plan fail or give a wrong result. That covers a false claim about the code or data (check it and cite file:line), an internal contradiction, a step that does not serve the goal as written, or an unverified assumption the plan rests on.
2. **Gap:** something the goal needs that the plan lacks.
3. **Cut:** a step, component, check or output the goal does not need.

Simplicity limits the fixes, not the search: check every part of the plan, including its checks and acceptance criteria, and report every Error you find.

For each finding give: type, severity (critical/high/medium), evidence, the concrete failure (what input leads to what wrong outcome), and the smallest fix. Prefer fixes that remove, narrow or reuse existing code over fixes that add. Mark each fix as making the plan larger (+), smaller (−) or neither (0).

Leave out hardening, extra controls, extra reporting and style unless leaving them out causes a concrete failure. If you still want to suggest any, list at most three, one line each, under "Optional" at the end. If the plan is sound, say so: no findings is a valid answer. Do not soften.

Number your findings 1, 2, 3, ...
```
