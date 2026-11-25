# Round 184 findings

## Question

Why is the ambient music heard only after the microphone has been used, and can the narration's target-language
words be said aloud on a tap?

## Finding

The likely cause is the iPhone's silent switch: iOS mutes Web Audio's default ("ambient") session with it, and
recording switches the page to a session the switch does not mute. The page now asks for a `'playback'` session.
The narration's words are said by the browser's speech voice on a tap. Both are tested with fakes only.

## Method

Reading `ambience.js`, `titleMusic.js` and `DungeonScreen.jsx`; WebKit's bug reports on the silent switch; unit tests
with fake audio, recognition and session objects.

## Results

| Check | Result |
|---|---|
| Client tests | 328 of 328 (4 new) |
| Client build | passes |
| Heard on an iPhone | not checked |

## Claim boundary

- The cause is inferred from the code and WebKit's reports, not observed on the owner's phone. If the phone was not on
  silent, the cause is elsewhere; the `resume()` on every tap covers a context iOS left suspended or interrupted.
- iOS versions before 16.4 have no Audio Session API and keep the old behaviour.

## Open items

- The owner plays on the iPhone with the silent switch on: music after the title, without the microphone.
- Whether the browser's voice says single words well enough, or a cloud voice is wanted.
