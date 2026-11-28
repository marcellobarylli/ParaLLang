# Round 226 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `client/src/components/BreathGame.jsx` (`PALE_BLUE`, `BLUE`, `NAVY`, `inShare`, `LABEL_PX`);
  `client/src/components/__tests__/breath-game.test.jsx`, `client/scripts/breath-colours-check.mjs`.

## Decisions

1. **Larger words.** "in" and "out" are 22 px bold (were 13 px), a little further out from the ring, brighter, with a
   soft glow of their colour.
2. **The breath in is pale blue:** its stretch of the ring, its word, and the ripple a press in time leaves. The breath
   out stays gold.
3. **The breath's own light** (the glow that swells and sinks in the middle) is pale blue while breathing in and gold
   while breathing out, turning over 1.2 s at each turn so there is no jump (`inShare`).
4. **No turmeric circle:** the best moment's ripple is navy (rgb 58 92 196, a navy light enough to show on the dark
   panel).

## Tests

`npm exec --workspace client -- vitest run`; `node client/scripts/breath-colours-check.mjs docs/rounds/226/shots`.
