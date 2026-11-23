# Round 173 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message (no GitHub issue); round 144 (the curriculum and its pacing).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/road/pacing.js`, `server/src/road/encounters.js`, `server/src/road/service.js`,
  `server/src/app.js`; `client/src/display.js`, `client/src/stores/roadSlice.js`, `client/src/stores/gameStore.js`,
  `client/src/components/SettingsSheet.jsx`, `client/src/components/Road.jsx`; `server/test/streamlined.test.js`.

## Decisions

1. **An exercise is a unit** of the curriculum (Hello and goodbye, Where you are from, ...), as the owner clarified.
2. **A new kind of conversation, `unit`**, played only in streamlined mode: the first objective of each of the unit's
   three lessons (for Hello and goodbye: greet, say your name, say how you are), taught as a lesson is (the character
   models the words first; three hints an objective).
3. **Finishing it completes the unit, whatever the score:** its lessons count as done and its gate as passed (marked
   `streamlined: true`). The next conversation is the next unit's.
4. **Every site ahead offers the current unit**, so the next conversation is the next exercise on rails and off them.
   No reviews, repairs or gates (so no legacy dungeon) until the curriculum is finished; then the road goes on as
   review, as before.
5. **On by default; kept on the road** (`road.streamlined`, absent meaning on) and set by `POST /api/road/mode
   { streamlined }`. The setting is also in this browser's display preferences; entering the road tells the server
   before the road is shown, and ticking the box tells it at once.
6. **Switching it on completes a unit begun:** a unit of which any lesson was finished counts as complete (one
   conversation covered it), and the conversation waiting here becomes the next unit's. **Switching it off** keeps
   what was completed and gives the full pacing back; a waiting unit conversation becomes the pacing's choice.
7. **A conversation under way when the mode changes still counts:** the finish records the session's own activity.
