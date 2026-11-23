# Round 172 architecture

**Conversational round, recorded after the build.** Opened on 2026-11-23 on the owner's message in
[`trail/interview.md`](trail/interview.md); the events are in [`trail/journal.md`](trail/journal.md). No pre-run
commit; nothing here is frozen.

- **Design source:** the owner's message (no GitHub issue); round 146 (rain and thunder), round 127 (the ambience).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/src/ambience.js`, `client/src/components/SettingsSheet.jsx`, `client/src/display.js`,
  `server/src/road/weather.js`; a picture in [`shots/`](shots/settings-audio.png).

## Decisions

1. **Rain is quieter by a factor of about six.** A downpour's gain was 1.4 under the music's level of 0.14 (0.196 at
   full); it is now 0.035 on its own bus. Thunder went from 0.31 to 0.09.
2. **Rain falls 15 % of the time** (`WEATHER.rainShare` 0.3 → 0.15). The weather is a pure function of the clock and
   the road's seed, so the server's narrator and the page agree with no further change.
3. **Audio buses.** The chain is chords → level → music volume → out ← effects bus ← rain, thunder; `out` carries the
   master volume. The effects bus follows the speech level (full 1, duck 0.6, mute 0) so the microphone still hears
   no rain. `ambience.setVolumes({ master, music, effects })`.
4. **Voice volume** is set on each utterance (`speaker.volume` = voice × master).
5. **Four volumes in the display preferences** (`display.volume`: master, music, effects, voice; 0 to 1 in steps of
   0.05; full unless moved). The ambience runs while the music or the effects can be heard; unticking "Ambient music"
   now silences only the music bus, so rain goes on.
6. **Settings in categories,** each a `<details>` section: Audio (open), Language and learning, Display and controls,
   Your save, Connection (open until a server is set), This build (open when a newer build is on the site). Close
   stays at the bottom, outside the categories.
