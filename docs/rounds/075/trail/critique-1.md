# Codex critique 1: three minor notes from the review (round 075)

- **Dispatched:** 2026-11-06 02:58 UTC (journal row 3)
- **Returned:** 2026-11-06 02:59:44 UTC (the output file's modification time)
- **Model:** codex-cli 0.166.0, `codex exec --sandbox read-only -c model_reasoning_effort=high`, run from the repo; no thread id printed
- **Prompt:** "You are reviewing a small implementation plan for the ParaLLang game. Do NOT run any commands; everything you need is in the bundle on stdin (the plan, then numbered code excerpts). Critique the plan adversarially: is each fix correct, complete and safe, does any test miss the behaviour, does any fix break something else (replays, receipts, VoiceOver, Reduce Motion, stale responses)? Number findings "1. **Error — high: title**" / "**Risk — medium: ...**" / "**Nit — low: ...**", each with the reason and a suggested change. Be concise."
- **Reviewed input:** `plan-v1.md`, sha256 08d1d7e4…, with excerpts of gameStore.js (200–320), DialoguePanel.js (1–105), motion.js, learning-service.js (570–725), routes/encounter.js
- **Findings:** 3 numbered (2 Errors, 1 Risk)

## Raw output (verbatim, the final message)

```text
1. **Error — medium: Progress normalization aliases distinct receipts.** `"abc"` and `" abc "` remain different receipt keys but now share a progress ID. A poll for a queued attempt can receive another attempt’s provisional verdict. Stringify both sides without trimming their identity; use trimming only to reject blank IDs. Test distinct whitespace variants while one request is blocked and another is queued, plus unchanged receipt replay behavior.
2. **Error — medium: Remounting does not ensure VoiceOver announces completion.** Native `aria-live` support is Android-specific; replacing the host node does not establish the promised iOS announcement. The final text also never explicitly says the answer counted. Add an accessible completion message or announcement triggered by a successful, current response. Test that trigger and verify VoiceOver with Reduce Motion enabled; host-node identity alone proves neither behavior.
3. **Risk — medium: A failed POST can produce the proposed “final” transition.** `early` means provisional feedback is currently visible, not that this attempt committed. Ordinary failure clears `earlyAssessment` but retains the previous turn’s `assessment` (`gameStore.js:288–315`), so the new phase key remounts that old verdict as “final.” This can falsely signal that the failed answer counted. Clear the previous assessment when sending, or track the assessment’s owning attempt and completion explicitly. Add a provisional → POST failure test ensuring no counted verdict or completion announcement appears.
```
