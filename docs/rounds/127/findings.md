# Round 127 findings

## Question
The owner asked for non-intrusive ambient music in the background, "kinda like rhubarb by aphex twin". Is there
music, and does it stay out of the way?

## Finding
Yes, as far as tests and measurements go. The web dungeon plays slow generated chords from the first tap, quietly,
and gives way to speech. Whether it sounds good and is like the track in feeling is for the owner's ear: a rendered
sample is in the round's folder.

## Method
`client/src/ambience.js` builds the sound with the Web Audio API: a chord table, two detuned triangle oscillators a
note, a low-pass filter, a reverberation from generated noise. `DungeonScreen` starts it at the first tap and tells
it every 400 ms whether the browser is speaking or listening. Tests use a recorder in place of the audio interface.
`client/scripts/music-check.mjs` loads the built page in headless Chromium, then renders three chords offline
through the real audio graph, measures them and writes the sample.

## Results
- **What it is.** Eight four-note voicings in D flat major. A chord fades in over 6 s and out over 9 s under the
  next one; a new one starts every 14 s, chosen from the last one's neighbours, so the sequence does not repeat. No
  beat, no melody.
- **It is ours.** No recording is shipped and the named track's notes are not copied. Only the kind of music is
  taken: slow, warm, beatless chords.
- **How quiet.** The master gain is 0.14 at most. Rendered, three chords peak at 0.094 of full scale (−20.5 dBFS)
  and average 0.021 (−33.4 dBFS).
- **Speech first.** While a line is read aloud the level drops to 0.045; while the microphone listens it is 0.
- **Starting and stopping.** No audio context exists before a tap. The first tap starts one. Unticking "Ambient
  music" in Settings fades it out and closes the context; ticking it starts it at once. A hidden page is suspended.
- **Tests.** Client 185 passing (172 before). The real-browser check: 9 checks, 0 problems.

## Decision
Kept and deployed to the client. The key, the chords and every number are Claude's first choice.

## Evidence
- The owner's words: [`trail/interview.md`](trail/interview.md).
- A sample, 52 s, three chords at the page's own level: [`ambience-sample.m4a`](ambience-sample.m4a).
- Timeline: [`trail/journal.md`](trail/journal.md).

## Claim boundary
Nobody has listened to it. Claude cannot hear the sample; the measurements say it is quiet and not silent, not
that it is pleasant. Not known: how it sounds on the iPhone's speaker, where notes below about 200 Hz are weak;
whether it is quiet enough under a character's voice; what the phone's ringer switch does to it. The server and
mobile suites were not run; no file of theirs changed. No Codex critique was made.

## Open items
- **Owner:** listen on the iPhone. If it is too loud or too soft, the level is `AMBIENCE.levels.full` in
  `client/src/ambience.js`; the pace is `period`, `attack` and `release`; the brightness is `cutoff`.
- A volume slider is not built; Settings has an on and off switch.
- The iPhone app (`mobile/`) has its own ambience from earlier rounds and is not changed.
