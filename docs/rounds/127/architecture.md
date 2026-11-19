# Round 127 architecture

**Conversational round, recorded before the build.** Opened on 2026-11-19 by the owner's request in a Claude Code
cloud session, not through the round pipeline. Sections marked *pre-run* must not be edited after the commit that
holds them. Changes go into dated Amendments; results go into the dated Outcome section, added later. The full
record (the owner's words, timeline) is in `trail/`; it is not needed to implement this round.

- **Design source:** round 126's [architecture](../126/architecture.md) (speech in the web dungeon) and round 117's
  (display preferences in Settings).
- **Findings:** to be written after the build (`findings.md`).
- **Artifact:** `client/src/ambience.js` (new), `client/src/components/DungeonScreen.jsx`,
  `client/src/components/SettingsSheet.jsx`, `client/src/display.js`.

## Goal (pre-run)

Quiet ambient music plays behind the web dungeon and stays out of the way of the voices and the microphone.

## Owner decisions (pre-run)

From [`trail/interview.md`](trail/interview.md):

- "some non-intrusive ambient music in the background, kinda like rhubarb by aphex twin" (Q0).

Claude's decisions:

- **Decision 1: the music is made in the browser, and it is our own.** The named track is a recording under
  copyright, so it is neither shipped nor imitated note for note. What is taken from it is the kind of music: slow,
  beatless, warm synthesiser chords that fade into each other, with no melody to follow. The Web Audio API plays
  it, so there is no audio file to license, host or download.
- **Decision 2: it never repeats.** The chords are chosen as the music goes, from a small table written for this
  game, each led by step from the one before. A loop of a minute would be noticed within ten.
- **Decision 3: on by default, quiet, with a switch in Settings.** The owner asked for it in the background.
- **Decision 4: speech comes first.** The music drops while a character's line is read aloud and is silent while
  the microphone listens, so the recogniser does not hear it.

## Design (pre-run)

### The sound (`client/src/ambience.js`)

- **Chords.** A table of eight voicings in D flat major, four notes each, in the octaves around middle C, with
  added ninths and sevenths and no leading note in the bass. `nextChord(current, random)` moves to one of the
  current chord's listed neighbours, never to itself.
- **Voices.** Each note is two triangle oscillators a few cents apart. A chord fades in over 6 s, holds, and fades
  out over 9 s while the next one fades in, every 14 s. Nothing has an attack a listener could count.
- **Tone.** All voices pass a low-pass filter near 900 Hz that a very slow oscillator moves a little, then a
  reverberation made from four seconds of decaying noise, mixed with the dry sound.
- **Level.** The master gain is 0.14 of full scale at most. It fades in over 4 s at the start, drops to a third
  while a line is spoken, and to nothing while the microphone listens.
- **Starting.** Browsers let a page make sound only after a tap. The music starts at the first tap on the page,
  and is suspended while the page is hidden.

### The wiring

- `display.js` stores `music` (on unless switched off). Settings gets an "Ambient music" checkbox.
- `DungeonScreen` starts the ambience at the first tap while the setting is on, stops it when the setting goes
  off, and tells it every 400 ms whether the browser is speaking or listening.

## Claim boundary (pre-run)

The session has no loudspeaker. The tests prove what is asked of the browser's audio interface: which notes, how
slowly, how loud at most, and that speech lowers it. Whether it sounds good, whether it is quiet enough, and
whether it is "kinda like" the track are the owner's ear. On an iPhone the ringer switch silences Web Audio; that
is the phone's rule, not checked here.

## Tests (pre-run)

- **Chords:** every voicing has four notes of the D flat major scale inside the stated range; every chord has
  neighbours and none is its own; a long walk visits every chord and never repeats one twice running.
- **Ambience** (a fake audio context): nothing is created before `start`; a start builds the chain and fades the
  master in to at most 0.14; chords follow each other with the stated fades and their oscillators are stopped after
  the release; `duck` and `mute` set the stated levels; `stop` fades out and closes; a browser without Web Audio is
  unsupported and does nothing.
- **Display and Settings:** `music` loads on, saves, and the box switches it.
- **Screen:** with the setting on the music starts at the first tap and not before; switching it off stops it;
  a speaking browser ducks it and a listening one mutes it.
- **Real browser:** the built page starts an audio context at the first tap, the context runs, and oscillators
  sound at the table's frequencies.
- All client suites and the build keep passing.
