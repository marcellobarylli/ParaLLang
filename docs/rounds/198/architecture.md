# Round 198 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message; rounds 153 (light mode), 174 (three replies) and 190 (follow the reply).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/display.js`, `client/src/components/DialoguePanel.jsx`, `DungeonScreen.jsx`,
  `SettingsSheet.jsx`; tests in `client/src/__tests__/display.test.js` and the strict suites;
  `client/scripts/light-check.mjs`; shot in [`shots/`](shots/03-understood.jpg).

## Decisions

1. **Light checking is the default.** A display is light unless it stores `strict: true`, and only choosing Strict
   in Settings from this round on writes that. A display saved earlier holds `light: false` (the default of its day,
   written for everyone) and is read as light, so the owner's and the friends' games change over. Settings lists
   Light first. The server and the iPhone app are unchanged.
2. **The order of a turn** in the conversation panel: the player's answer; directly under it what was understood
   and its correction (the box that stood at the bottom); then the character's reply, last before the reply box.
   `DialoguePanel` takes the box as `afterAnswer` and places it after the last answer in the transcript.
3. **Follow the reply** (round 190) now brings the player's answer to the top when answer, correction and reply fit
   in the panel together; a longer turn shows the reply, which then ends just above the reply box.
4. **After the end** the revelation, the way on and "Keep chatting" still follow the last reply.

## Tests

`npx vitest run` in `client/` (342; 1 new; the suites that test strict and beginner checking store `strict: true`
first); `npx vite build`; `node client/scripts/light-check.mjs` (one light turn in headless Chromium at a phone's
size; the script is cut down to that, its Settings steps were from before round 175's menu).

## Status

Built and tested; seen in Chromium, not on a phone. Merged to `main` with round 197 and pushed on the owner's word
("then deploy"); GitHub Pages deploys `main` and Render redeploys the server from it.
