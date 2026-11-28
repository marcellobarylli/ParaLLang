# Round 216 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-28 on the owner's message in
[`trail/interview.md`](trail/interview.md); events in [`trail/journal.md`](trail/journal.md). It builds on round 148
(the share slider) and round 177 (Follow my level).

- **Design source:** the owner's message; the Council of Europe's CEFR self-assessment grid.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/display.js` (`LEVELS`, `levelOf`, `display.level`), `stores/gameStore.js` (`setLevel`),
  `components/DungeonScreen.jsx` (`TitleLevel`), `index.css`.

## Decisions

1. **Three tiers, after the CEFR's beginner bands** (A1: "familiar words and very basic phrases"; A2: "ask and answer
   simple questions"): "I've never spoken it" (30 %: low, not zero), "I can say a couple of things" (50 %) and
   "I'm comfortable with basic sentences" (100 %, the translation in matching colours under each line, free, as at
   100 % since round 148).
2. **The answer is the share.** `setLevel` stores `display.level` and sets the slider's share with `immersionAuto`
   off, so the server needs no change. Settings' slider and "Follow my level" still move it afterwards.
3. **Asked on a new game's title** (`freshGame`), above the journey button, which stays disabled until a tier is
   picked. A game already begun is not asked again.
4. **The level is the slot's own** (`parallang.level`, a slotted key): a new, deleted or started-over slot is asked
   again and does not inherit another game's share; Delete and Start over clear it with the slot.
