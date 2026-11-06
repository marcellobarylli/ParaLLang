# Round 075 architecture

**Autonomous round, recorded before the build.** Designed on 2026-11-06 by Claude (claude-opus-5-5) during the
autonomous run, with no owner present. Sections marked *pre-run* must not be edited after the commit that holds them.
Changes go into dated Amendments; results go into the dated Outcome section. The trail (plan as sent, raw critique,
journal) is in `trail/`; it is not needed to implement this round.

- **Design source:** STATE.md's next candidates (iteration 20's review of rounds 070–073), [round 070](../070/architecture.md)
  (the provisional verdict, `progress()`), [round 071](../071/architecture.md) (design 3: reconcile after a replay).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `mobile/src/stores/gameStore.js`, `mobile/src/components/DialoguePanel.js`,
  `server/src/learning-service.js`, tests. No live LLM calls.

## Goal (pre-run)

Fix the three minor notes of the review: a reconciled replay keeps an older verdict on screen; the switch from the
provisional verdict to the counted one is easy to miss; `progress()` compares a trimmed string to the raw stored id.

## Owner decisions (pre-run)

No owner was present; each is an **autonomous decision, pending owner review**, also in
[`docs/autonomy/decisions.md`](../../autonomy/decisions.md).

1. **A visible "Counted." line** under the Assessment box when the verdict that was shown as provisional is
   committed (critique 1.2), plus a screen-reader announcement. Alternative: only a re-fade (plan v1), which a
   VoiceOver user does not perceive.

## Design (pre-run)

1. **Reconcile clears the verdict.** In `sendMessage`, when a replay is reconciled to a newer server version of the
   same conversation, the `set` also clears `assessment` (and the counted flag), as the stale-reload paths do.
2. **A counted flag owned by the send** (critiques 1.2, 1.3). The store gains `assessmentCounted` (false by default).
   A send sets it false when it starts. On a successful, owned, non-replayed response, it is set to whether a
   provisional verdict of this send was shown (`get().earlyAssessment` non-null just before the response is applied).
   Every other place that sets or clears `assessment` sets it false (start, restart, reloads, leave, save switch,
   reconcile). A failed POST leaves it false, so the previous turn's verdict that shows again is never marked
   counted.
   `DialoguePanel` takes `assessmentCounted`: when not early and counted, the box ends with "Counted." (role
   status), and the `FadeIn` key carries the phase (`provisional`, `counted` or `final`), so the counted box mounts
   anew and fades in (at once under Reduce Motion). When `assessmentCounted` turns true, the panel calls
   `AccessibilityInfo.announceForAccessibility('Counted.')` once (iOS has no live regions; `aria-live` is
   Android-only).
3. **Progress ids by string, not trimmed** (critique 1.1). `turnProgress` stores `String(request.attemptId)`;
   `progress()` rejects a blank id after trimming but compares `String(attemptId)` untrimmed. Receipts are unchanged.

## Second opinion (pre-run)

Critique 1 (Codex, effort high, bundle on stdin): [raw](trail/critique-1.md), plan as sent
[plan-v1.md](trail/plan-v1.md).

| # | Severity | Finding | Round | Disposition | Owner disposition | Where |
|---|---|---|---|---|---|---|
| 1.1 | Error | Trimming in progress aliases distinct attempt ids (`"abc"`, `" abc "`) | 0 | Accept: stringify both sides, trim only to reject a blank id; test both variants | **Accepted** (autonomous, pending owner review) | Design 3 |
| 1.2 | Error | A remount does not make VoiceOver announce; nothing says the answer counted | 0 | Accept in part: a visible "Counted." line and an announcement on the transition; VoiceOver itself is a Simulator open item | **Accepted in part** (autonomous, pending owner review) | Design 2 |
| 1.3 | Risk | After a failed POST the old verdict would remount as "final", as if counted | 0 | Accept: the counted flag belongs to the send's successful response; a failure test | **Accepted** (autonomous, pending owner review) | Design 2 |

## Tests (pre-run)

- Server (`turn-progress.test.js`): a numeric attempt id is readable during the reply as `'12345'`; an id with spaces
  is readable only by the same spaced string, not by its trimmed form; a blank id is still rejected.
- Mobile (`send-retry.test.js`): the reconcile to a newer version clears `assessment`; a reconcile to the same
  version keeps the replayed one.
- Mobile (`turn-progress.test.js`): provisional shown, then success → `assessmentCounted` true and the panel shows
  "Counted." and announces it once; success without a provisional → no "Counted."; provisional, then a failed POST →
  `assessmentCounted` false and no "Counted." under the old verdict; a new send clears it.
- `npm test` all green; `python3 tools/round_log_check.py 075`.

## Claim boundary (pre-run)

Tests only. The fade, the "Counted." line and the VoiceOver announcement on an iPhone go to the Simulator open items.

## Amendment 1 (2026-11-06): one announcement per verdict across remounts; replays may be counted

A read-only review of the build diff (a Claude subagent) found no blocking bug and three low findings. Each is an
**autonomous decision, pending owner review**.

1. **The announcement repeated after a remount.** The announced verdict was held in a `useRef`, so opening the map
   and coming back announced "Counted." again for the same verdict. It is now held at module level in
   `DialoguePanel.js` (the store keeps the same assessment object), and a test remounts the panel. The "Counted."
   line itself stays visible until the next send, as designed.
2. **A replayed response can be marked counted.** Design 2 said "non-replayed", but the code sets the flag from
   whether this send's provisional verdict was shown. That is kept: a resend with the same attempt id polls the
   original run's progress, and the replayed verdict really was committed. If the reconcile finds a newer version,
   the verdict and the flag are cleared (design 1). Design 2's "non-replayed" is superseded by this sentence.
3. **The failure test had no previous verdict.** A new test plays a counted turn, then a failed one with a
   provisional verdict, and checks the first verdict shows again without "Counted.".

Tests: server 258/258, client 12/12, mobile 218/218.

## Outcome (2026-11-06)

Built as designed, with Amendment 1. All three notes are fixed and tested: a reconciled replay clears its verdict,
the committed verdict after a provisional one says "Counted." (and is announced once), and progress ids are compared
as strings without trimming. See [findings.md](findings.md).
