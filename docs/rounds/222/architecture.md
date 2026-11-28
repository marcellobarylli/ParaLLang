# Round 222 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `server/src/road/characters.js` (`VOICE_SPACE.rate`), `client/src/speech.js` (`MAX_RATE`,
  `voiceProfile`); `client/src/__tests__/speech.test.js`.

## Decisions

1. **The road's voices are drawn at normal speed or slower:** rate 0.8 to 1 on the browser's scale (was 0.82 to 1.22).
   The pitch range is unchanged, so the characters are still told apart.
2. **No character is faster than normal, whatever its sheet.** `voiceProfile` caps the rate at 1 (`MAX_RATE`). This
   covers road characters already in a save (their voice was drawn under the old range), the creature kind (1.05),
   and the sheets that asked for more: Gerald the Imp (1.15) and Errata (1.25, "low and too fast"; its low pitch
   stays). The YAML is left as written; the cap is the client's. The narrator (0.88) and a tapped word (1) are
   unchanged.

## Tests

`npm test -w server`, `npm exec --workspace client -- vitest run`.
