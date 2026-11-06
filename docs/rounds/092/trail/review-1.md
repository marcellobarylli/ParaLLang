# Review 1: core server paths of rounds 001–016, at HEAD (the round's source)

- **Dispatched:** 2026-11-06 about 06:40:25 UTC
- **Returned:** about 06:42:25 UTC (exact time unknown; 125 s run)
- **Model:** a fresh general-purpose subagent (claude-opus-5-5), read-only, in place of Codex (usage limit until 2026-11-09 17:32 UTC)
- **Prompt:** "You are an independent, adversarial, read-only code reviewer (do NOT edit files, do NOT start servers or bind ports, do NOT make network or LLM calls). Repo: /work/ParaLLang (a language-learning game: Node server in server/, Expo app in mobile/, YAML packs in content/languages/{it,es}/). Review, at HEAD, the core server paths built in rounds 001–016 and never reviewed since: `server/src/language-engine.js` (SM-2 scheduling, `matchCanonicalVocabulary`, answer normalisation), `server/src/world.js` (adjacency, fog of war, gates), `server/src/routes/*.js` and `server/src/app.js` (validation, the optional PARALLANG_TOKEN check, error shapes), and in `server/src/learning-service.js` the turn path (`submitDialogue`: grading validation, evidence checks, objective progress, receipts / attempt ids and replays, version checks, what a failed save leaves behind), the help path (`revealEncounterHelp`: hint limits, charging, what is revealed of an open objective), the review path (`createReviewChallenge`, `submitReview`: answer checking, reveal, practice vs scheduled reviews, receipts) and `moveTo`. Look for: correctness bugs a player can hit, answers leaking (a hint or reveal giving an open objective's exact target-language answer when it should not; review challenges exposing the answer in the challenge object; the grading prompt's output trusted beyond validation), SM-2 edge cases (ease floor, intervals, a failed review, the clock), state left inconsistent after a thrown error (in-memory encounter advanced but save not written, or the reverse), path traversal or unvalidated ids, and the token check being bypassable. Later rounds' design records are in docs/rounds/NNN/architecture.md if you need intent. Tests: single server files only, e.g. `cd server && node --test test/<file>.test.js` (never bare `node --test` in server/); the tests use in-process runtimes. Report at most 8 findings, most severe first: severity (Error = a bug a player can hit / Gap / Minor), file:line at HEAD, a concrete failure scenario, a suggested fix. Only what you verified; mark uncertain items. End with a short \"checked and fine\" list. Under 600 words."
- **Reviewed input:** `server/src` at HEAD 326da97, working tree: docs/rounds/092/ new
- **Findings:** 7

## Raw output (verbatim)

```text
I found 7 issues; the first two I reproduced. The worst is that the `PARALLANG_TOKEN` check can be skipped just by changing the case of the URL. I edited no files, bound no port and made no network or LLM calls. My only scratch file is `/tmp/tokcheck.mjs`, a harness that sent fake requests straight into the Express app without a port.

1. **Error, bypassable auth: `server/src/app.js:14`.** The check is `if (req.path === '/api/health' || !req.path.startsWith('/api/')) return next();`, and that comparison is case-sensitive. Express 5 routes paths case-insensitively by default, so `/API/...` reaches the real handlers without a token. Reproduced with the token set: `/api/onboarding` returned 401, while `/API/onboarding` and `/Api/world` returned 200 from the service. Anyone who knows a learner id can read and change that learner's save without the token. Fix: register `/api/health` first, then mount `app.use('/api', requireToken(token))` (mount matching is case-insensitive too), or lower-case the path before comparing.

2. **Gap, grader evidence checked out of context: `learning-service.js:870-873`.** The evidence text only has to be a substring of the folded input, and only the excerpt alone is run through `matchCanonicalVocabulary`. So the matcher's word-boundary check is never applied at the excerpt's position in the player's text. Verified: for the input "vorrei un panettone", the substring check is true and the excerpt "pane" alone matches entry `pane`, but the full input matches nothing. A lenient grader that quotes "pane" from "panettone" or "campane" therefore passes the objective. Fix: run `matchCanonicalVocabulary(playerInput, entries)` and require a match of that id whose span covers the evidence.

3. **Gap, answer in the review response: `learning-service.js:1265-1267`.** The challenge object itself is clean, but the same response's `spellbook` carries `cards[].meanings`, the challenged card's full `accepted_translations`. The server leaves hiding to the app (round 090). Any other client, or an app that has not refreshed, sees the answer. Fix: blank the meanings of the challenged card (and of its `formCardIds`/`exampleCardIds`) in that snapshot.

4. **Gap, possibly intended: free translation of the previous line (`serializeEncounter`, `learning-service.js:486-487`).** Only the latest NPC line is protected. Any wrong turn (for example "?") makes the earlier line show its full translation and word meanings. No hint is charged and no assisted-quality cap applies, so `hint_limit` can be bypassed while the same objective is still open. Round 001 says "completed dialogue retain[s] easy translation access", but it also requires "no unrestricted alternate route". Fix: keep earlier lines protected while the objective that was open when they were spoken is still open.

5. **Gap, receipts never pruned: `learning-service.js:1020`, `:1314`.** Each dialogue receipt stores the full serialized transcript plus every card, so the save file grows roughly quadratically. Each one is loaded and rewritten on every request. Round 060 noted "never pruned" but only stripped `lines`. Fix: keep the last N receipts, or store a minimal replay payload.

6. **Minor, assisted cap misses a second objective: `learning-service.js:946`.** In ordered encounters, a sentence reveal is charged to the current objective only. If one turn closes objectives 1 and 2, objective 2's evidence is scheduled at full grader quality even though the revealed line helped. Fix: cap every objective closed in that turn when any reveal was used on the active message.

7. **Minor, "Show answer" scores worse than a wrong guess: `learning-service.js:1292-1294`.** A reveal records quality 0 (ease -0.8). A wrong answer records quality 2 (ease -0.32) and also returns `canonicalAnswer` and `acceptedAnswers`. Typing "x" beats revealing. Fix: give the reveal and a wrong answer the same low quality (0 or 1).

**Checked and fine:**
- **SM-2:** run 5,5,5,0,5 gives intervals 1, 6, 16, 1, 1, the ease floor of 1.3 holds, and only due cards are rescheduled.
- **Typo matching:** a one-edit typo is accepted only on single words of 5 or more letters ("breed" counts as "bread", by design).
- **Thrown errors:** in turn, help, start and review, the save is written before memory changes, so a failed save or narration leaves nothing behind.
- **Receipts:** replay goes through `payloadHash`. Odd attempt ids such as `__proto__` only produce a 409.
- **Path traversal:** learner ids are UUID-pattern checked before any file path is built.
- **Other ids:** location ids and the grader's objective and vocabulary ids are checked against content, and duplicate or missing verdicts are rejected.
- **World:** moves, gates and fog-of-war work as intended.
- **Hint limits:** repeats are not charged twice, and the challenge object holds no answer.
- **Error shape:** unexpected errors are masked.
- **One uncertain point:** `/progress` (`routes/encounter.js:28`) skips `assertLearnerId`. It is harmless, since it only does a map lookup.
```
