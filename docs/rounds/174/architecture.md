# Round 174 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message (no GitHub issue); round 154 (light mode's exchange of three to five turns).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/learning-service.js`; `client/src/stores/gameStore.js`,
  `client/src/components/DungeonScreen.jsx`, `client/src/components/DialoguePanel.jsx`, `client/src/index.css`;
  `server/test/exchange-limit.test.js`, `client/scripts/exchange-check.mjs`; shots in [`shots/`](shots/).

## Decisions

1. **Every conversation is complete on the player's third reply** (`EXCHANGE_LIMIT` = 3): strict or light, on the
   road or in a dungeon. A strict one still ends sooner when every objective is met; light mode's three-to-five
   exchange is held to three. What was not met counts as missed in the road's score (round 154's rule), and the
   conversation is played: the site is cleared, the road moves on.
2. **The narrator is told the third reply is the last** through the decision it already receives
   (`encounterState: 'resolved'`), so the character winds up.
3. **A counter** under the objective: "Reply 1 of 3. The conversation is complete after your third reply." The
   server sends `exchange.limit`.
4. **Keep chatting.** A complete conversation shows "Keep chatting with ...". An answer then goes with `chat: true`;
   the server answers it as a light turn with nothing open and records only the transcript and its receipt: no
   marks, Spellbook evidence, XP, curriculum or site change, and the conversation stays complete. While chatting the
   result panel is folded into one line with "Done chatting", which brings the way on back; the new lines are then
   at the bottom, where the player reads.
5. **No current objective after the end:** a conversation completed with an objective open reports none, so the
   pinned bar says "complete".
6. **The limit is a service option** (`exchangeLimit`, 3 by default). The server tests' helper sets none, so the
   tests of long scenarios (rejections, held passes, many receipts) keep their conversations open; the limit has its
   own tests with 3.
