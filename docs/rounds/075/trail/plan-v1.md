# Round 075 plan v1: three minor notes from the review of rounds 070–073

No live LLM calls. Each fix is one or two lines with a test.

## 1. A replay reconciled to a newer version keeps the replayed verdict (mobile, round 071 design 3)

`sendMessage` in `mobile/src/stores/gameStore.js`: after a replayed response, the store asks `currentEncounter` and,
if the server holds a newer version of the same conversation, applies it. It sets `encounter` and `spellbook` but
leaves `assessment` as the replayed turn's verdict, which belongs to an older turn than the one now on screen.
Fix: in that `set`, also `assessment: null` (as the STALE reload paths at lines ~303/309 already do).
Test (send-retry.test.js): the existing "after a replay, a newer server version…" test also expects
`assessment` null; a new test checks a replay whose reconcile returns the same version keeps the replayed assessment.

## 2. The provisional and final verdicts share a fade key (mobile, round 070)

`DialoguePanel` keys the Assessment box's `FadeIn` by `assessmentKey(verdict)` (feedback and results). When the
final response equals the provisional verdict (6/6 live in round 070), the key is unchanged, the box does not
re-mount, and only the "Your answer" and "Not counted until…" lines vanish: the switch to counted is easy to miss.
Fix: the key gets a phase prefix, `assessmentKey(verdict, early)` → `early ? 'provisional|' : 'final|'` + the rest.
The final box then fades in again (or appears at once under Reduce Motion) and its polite live region is new, so
VoiceOver reads the counted verdict. Export `assessmentKey` for a unit test: different keys for the same verdict by
phase, equal keys for equal verdicts in the same phase. A render test checks the provisional → final rerender
mounts a new box (a test id per phase is not needed; compare the host node identity before and after).

## 3. `progress()` compares a trimmed string to the raw `request.attemptId` (server, round 070)

`progress(learnerId, attemptId)` trims and stringifies the query value; `submitDialogue` stores
`turnProgress.set(learnerId, { attemptId: request.attemptId, … })` raw. A JSON body attempt id that is a number, or
has surrounding spaces, never matches its poll. Fix: store `String(request.attemptId).trim()` in `turnProgress`
only; the receipt key in `processedAssessments` stays the raw value (changing it would break replays of receipts
already saved). Test (server/test/turn-progress.test.js): a numeric attempt id (`12345`) and one with spaces are
readable during the reply through `progress(learnerId, '12345')` / the trimmed form.

## Out of scope
Normalizing attempt ids everywhere (receipts) — not needed by any client; the app sends UUID strings.

## Tests
`npm test` (server, client, mobile) all green; `python3 tools/round_log_check.py 075`.
