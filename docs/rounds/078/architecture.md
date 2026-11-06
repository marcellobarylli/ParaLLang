# Round 078 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Design source:** [prototype.md](../../../prototype.md) §11 (Technical risks: "post-processing layer that checks
  the ratio and rejects/retries non-conforming responses", never built); [round 048](../048/findings.md) (Marginalia's
  folded-page line was all English in both packs, fixed then by content); the share data of rounds 067–074 (lines
  under the ratio by at most 0.15).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/language-engine.js` (`lacksTargetLanguage`), `server/src/learning-service.js`
  (`narrate`, `correctionNote`, `narrationStats`), `server/test/target-language-guard.test.js`,
  `server/scripts/play-market.js` (reports carry `narrationStats`), `docs/rounds/078/results/offline-scan.mjs`.

## Goal (pre-run)

An NPC line with no target language at all leaves the player nothing to translate on that turn. Detect such a line
and have it written again once. Lines that only fall short of the ratio are left alone: a share estimate on mixed
text is noisy (round 026 hand counts), and a retry costs a full call (about 9 s).

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **Only lines with no target language, not the ratio.** Alternative: retry any line far under the ratio. Rejected:
   no reliable share measure on the server, and the live shortfalls (≤ 0.15) do not hurt play.
2. **One retry, the first line kept when the retry fails, is still all English, or takes over 20 s.** The guard never
   turns a playable turn into an error, and adds at most about 20 s to a rare turn. Alternative: fail the turn, or
   retry until it passes.
3. **On by default** (no flag): it calls the provider only for a flagged line (2 of 1,218 recorded lines).

## Design (pre-run)

1. **The rule.** `lacksTargetLanguage(native, translation, vocabulary)` in `language-engine.js`: fold both texts as
   answers are folded (`normalizeAnswer`, accents stripped) and split into words. Flagged only if `native` has **at
   least 4 words** (critique 1.1: "No, Sam." is valid Italian and Spanish and equals its translation), every word of
   `native` occurs in `translation`, and `matchCanonicalVocabulary(native, narrationEntries)` finds no entry. It is a
   heuristic for one failure kind (critique 1.2): an all-English line that rewords its translation ("Take the book" /
   "Pick up the book") or holds an English homograph of a vocabulary form is not caught.
2. **`LearningService.narrate(messages, definition)`** replaces the three narration `callProvider` calls: the start's
   greeting, the prefetched greeting (round 076) and the turn reply. Grading calls are not touched. The first call's
   messages are byte-identical to today's (Gerald's pinned prompts hold).
3. **The retry.** If the first reply is flagged, a second call gets the same messages plus the rejected reply as an
   assistant message (its JSON) and a user message from `correctionNote(language, ratio)` (critique Optional, and
   1.4): "CORRECTION: in your reply above, dialogue.native has no {Language} in it: every word is also in its
   translation. Write the reply again for the same turn, following every rule above; dialogue.native must be about
   {N}% {Language}, as the LANGUAGE RULES require." No demand for English (the ratio can reach 100%). The history
   saved in the transcript is unchanged.
4. **Keeping the first line.** The second reply is used if it passes the rule. Otherwise the first is used: when the
   retry is flagged too, throws (provider error, invalid schema), or has not answered within `narrationRetryMs`
   (default 20 000; critique 1.5). A timed-out retry is not cancelled (the CLI runner has no cancellation): its
   result and any error are dropped.
5. **Counters** `narrationStats = { checked, flagged, retryPassed, kept, timedOut }`, memory only (critique 1.2: the
   name says the retry passed the rule, not that it is right). No change to the save, the transcript or the API.
   `play-market.js` reports include them.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`, sha256 410c5e6e…; Codex, effort high; raw text in
[`trail/critique-1.md`](trail/critique-1.md).

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Risk | Valid target language can be flagged ("No, Sam." equals its translation) | 0 | Accept in part: at least 4 words, tests for short and shared-word lines; the claim narrowed | **Accepted in part** (autonomous decision, pending owner review) | Design 1, Tests |
| 1.2 | Gap | All-English rewordings and English homographs pass the guard; "fixed" overclaims | 0 | Accept: negative tests document the subset; counter `retryPassed`; Claim boundary | **Accepted** (autonomous, pending owner review) | Design 1, 5, Claim boundary |
| 1.3 | Error | The offline scan used only `encounterId`, fell back to the whole pack, deduped without language and encounter | + | Accept: resolve `encounterId` or `definitionId` against the pack, count unresolved lines, dedupe by language, encounter, native, translation; re-run (done: 1,218 lines, 43 unresolved, 2 flagged; the word rule alone also flags 2) | **Accepted** (autonomous, pending owner review) | Findings, `results/offline-scan.mjs` |
| 1.4 | Error | The correction demands English, contradicting a ratio of 100% | 0 | Accept: the correction asks for the ratio's share of the target language, no English demanded; test at ratio 1 | **Accepted** (autonomous, pending owner review) | Design 3, Tests |
| 1.5 | Gap | No deadline for the retry; it holds the learner's lock | 0 | Accept in part: a 20 s deadline keeping the first line; no cancellation (the runner has none); test that progress is cleared | **Accepted in part** (autonomous, pending owner review) | Design 4, Tests |

**Deferred:** none. Codex's Optional (show the rejected reply to the model on the retry, and word the correction to
fit the subset rule) was taken: Design 3.

## Tests (pre-run)

`server/test/target-language-guard.test.js`:
- rule: an all-English line flagged; a translation longer than the line; case, apostrophes, punctuation and accents
  folded; a mixed line not; a vocabulary word ("ciao") not; under 4 words not ("No, Sam."); no words not; a
  rewording ("Take the book" / "Pick up the book") not flagged, documenting the subset.
- service, with a queued test provider: a normal greeting makes one call (`checked` only); an all-English greeting
  is written again with the rejected reply and the correction appended to the same messages, and the second line is
  used (chips from it); still English → the first kept; retry throws → the first kept, the start succeeds; the first
  call failing still fails the start, without a retry; a turn reply retried, grading called once; a prefetched
  greeting goes through the guard; a retry over the deadline keeps the first line, `timedOut` counted, and the turn's
  progress entry is cleared; the correction at ratio 1 asks for 100% and does not mention English.
- the golden prompt test passes unchanged; the full suite (server, client, mobile) passes.

## Live run (pre-run)

The failure is rare (2 of 1,218 recorded lines) and cannot be triggered on purpose without changing content. One
Gerald run (`play-market.js --provider codex-cli`, about 5 calls) and its `narrationStats` check that normal lines
make no extra call: success if `flagged` is 0 or every flagged line is all English by reading. If Codex is at its
usage limit, the offline scan stands as the data and the run is queued.

## Claim boundary (pre-run)

Catches one failure kind: a line of at least 4 words that all appear in its translation, with no vocabulary of the
encounter. It does not enforce the ratio, does not catch an all-English line that rewords its translation, and does
not judge whether the target language is correct.

## Outcome (2026-11-06)

Built as designed, then changed by Amendment 1. The rule flags 2 of 1,218 recorded live lines, both round 048's
all-English ones, with no false positive. Two live runs (codex-cli; Gerald it, Marginalia's folded page es at tier 3)
checked 14 narration lines and flagged none, so no extra call was made. The retry branch is tested, not seen live
([findings](findings.md)).

## Amendment 1 (2026-11-06): the timed-out retry is aborted

A read-only review of the build (a fresh general-purpose subagent, claude-opus-5-5) found one real problem. Design 4
was wrong to say the CLI runner cannot cancel: it can (`task.cancel`). A retry left running after its 20 s deadline
kept the runner's one slot, so the player's next call queued behind it, for up to the 120 s CLI timeout. Changes:

1. `CLIProcessRunner.run` takes an optional `signal`. An abort takes a queued task out of the queue, or cancels the
   running one (`CLI_INTERRUPTED`), and the listener is removed when the task settles. The codex-cli and claude-cli
   adapters pass `options.signal` through, and `callProvider` forwards a signal. The HTTP adapters ignore it: they do
   not share a slot.
2. `narrate` aborts the retry at its deadline, `unref`s the deadline timer, and makes no retry once the service is
   stopping (review 3).
3. Tests (review 2): the runner aborts an active and a queued task, and the next task then runs at once. With a
   one-slot provider, the next turn after a timed-out retry is not blocked; the retry is aborted and
   `providerCallsInFlight` returns to 0; no retry while stopping. Without the abort, the timeout test fails and the
   one-slot test hangs.
4. `verify-cli.js` (found while drafting round 079): its 14-call budget now allows one extra call per flagged line,
   and its report carries `narrationStats`.

Server 284/284, client 12/12, mobile 218/218. Autonomous decision, pending owner review.
