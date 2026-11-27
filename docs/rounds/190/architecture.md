# Round 190 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-27 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message.
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/components/CorrectionCard.jsx`, `client/src/index.css`, `client/src/display.js`,
  `client/src/stores/gameStore.js`, `client/src/components/DungeonScreen.jsx`,
  `client/src/components/SettingsSheet.jsx`, tests.

## Decisions

1. **The practice box under a correction grows with its text, up to five lines in view, then scrolls inside.** It
   was meant to grow since round 137, but `flex: 1` in its column form kept it at one line; it is `flex: none` now.
   Text of one to five lines shows whole (the owner's "more than three lines" is met by growing from the first wrap).
2. **"When a character replies"** in Settings, Display and controls: **Stay where I am** (the default; the panel is
   the player's to scroll, round 140) or **Follow the reply**: a new line of the character in an open conversation is
   brought to the top of the panel (8 px below its edge) the moment it appears. Opening or resuming a conversation and
   revealing a translation do not move it. Stored as `display.follow`.
3. **No typewriter.** A reply arrives whole from the server; "as it is being written" is met by showing its first
   line as soon as it is on the screen.

## Tests

`npm exec --workspace client -- vitest run` (333; 1 new, 3 changed for the new key), client build.

## Status

Merged to `main` and pushed; GitHub Pages deploys `main`.
