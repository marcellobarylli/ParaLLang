# Round 224 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md));
events in [`trail/journal.md`](trail/journal.md). No Codex critique. Findings: [`findings.md`](findings.md).

- **Artifact:** `client/src/components/Road.jsx` (`WelcomeCard`), `client/src/components/DungeonScreen.jsx`;
  `client/src/components/__tests__/road-screen.test.jsx`, `client/scripts/welcome-check.mjs`.

## Decisions

1. **The vision in one sentence:** "A language is learned best by living in it, so here you learn it by talking to the
   people of this world." The teaser stays, shortened: "Listen closely: lately the words here mean more than they
   should, and something is pulling at the seams from your side."
2. **How a conversation goes, in the game's language:** "They will speak with you. Answer in as much {language} as you
   can; where a word escapes you, use English. You will be shown your answer in {language}, since you are still
   learning." {language} is the pack's name (Italian, French, Spanish, Japanese, Chinese).

## Tests

`npm exec --workspace client -- vitest run`; `node client/scripts/welcome-check.mjs docs/rounds/224/shots`.
