# Round 220 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `client/src/breath.js` (`BREATH.lead`), the comment on `BREATH_START` in
  `client/src/components/BreathGame.jsx`; the breathing's tests.

## Decisions

1. **A longer lead-in.** The light on the breathing's dial sets off 70 degrees of the ring before the breath in
   (about 1.94 s at ten seconds a turn), not 45 (1.25 s). The lead-in is still not a turn: nothing is judged in it.
   The breath in itself starts at the top as before.

## Tests

`npm exec --workspace client -- vitest run`.
