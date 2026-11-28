# Round 217 architecture

**Conversational round.** Opened 2026-11-28 on the owner's message ([`trail/interview.md`](trail/interview.md)); events in
[`trail/journal.md`](trail/journal.md). No Codex critique: the design is the owner's. Findings: [`findings.md`](findings.md).

- **Artifact:** `RoadCaption` in `client/src/components/Road.jsx`; `RoadBreath` and its mount in
  `client/src/components/DungeonScreen.jsx`; `roadBreathing`, `roadBreathed` and `maybeOpen` in
  `client/src/stores/roadSlice.js`; `.road-breath` in `client/src/index.css`. Tests in `narration.test.jsx` and
  `road-flow.test.js`.

## Decisions

1. **No text over the walk.** The travel caption ("On the way to…", "… is getting ready to talk…", the narrator's
   passage) is gone, and the passage is no longer read aloud. A problem (`roadError`) is still told. The server still
   writes the passage; it is not shown. The text boxes of a conversation, and the panel of a finished one, are unchanged.
2. **The breathing starts with the walk.** `roadTravel` sets `roadBreathing` (unless Settings has the breathing off)
   in the same step that starts the camera. `RoadBreath` draws round 214's `BreathGame` over the screen, with the
   same rules: at least three breaths, more while the conversation at the site is still being written or the camera
   has not arrived (`ready` is arrived and loaded, or a problem), and it always ends on a breath out.
3. **The conversation opens when the breathing has ended.** `maybeOpen` waits while `roadBreathing` is set;
   `roadBreathed` (the breathing's `onDone`) clears it and opens the conversation if the camera is there and it is
   loaded. The first time in a game, the guidebook's "A breath while you wait" entry is told first, as before.
