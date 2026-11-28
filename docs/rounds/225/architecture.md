# Round 225 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `server/src/road/curriculum.js` (`compileObjective`, `prompt`); `server/test/road.test.js`.

## Decisions

1. **The road's objectives read as the bare task**, one sentence: "Greet Cuthbert.", "Tell Cuthbert your name.",
   "Tell Cuthbert how you are." (was "Cuthbert is plainly waiting to be greeted and will not be the one to start.
   Greet Cuthbert, using Chinese."). The skeleton's `ask` and a full stop, in every language.
2. **What else stays.** The box's "<language> target" line still names the language. The skeleton's cue is kept on the
   compiled objective but shown nowhere; it never reached the model, which reads `intent` (unchanged). The asks are
   unchanged: some keep a short lead ("{name} agrees with you: say 'me too' or 'me neither'"). The market's authored
   encounters (Gerald and the others) keep their own prompts.

## Tests

`npm test -w server`, `npm exec --workspace client -- vitest run`.
