# Round 166 findings

## Question

Can the narrator's passage about the way taken stay on the screen until the character is ready to talk, with
"… is getting ready to talk…" at its end?

## Finding

Yes. The passage now stays from setting off until the conversation opens, and the game's line is its last
sentence. At phone size the longest caption seen is six lines and sits inside the screen.

## Method

The change made in the travel captions of the road and the dungeons; unit tests; the road played in headless
Chromium at phone size with the next conversation held back, and looked at.

## Results

| Check | Result |
|---|---|
| Web client tests | 288 of 288 (287 before) |
| Server tests | 567 of 567 (the server is unchanged) |
| The aesthetic package's tests | 95 of 95 |
| The iPhone app's tests | 320 of 320 (its code is unchanged) |
| `node client/scripts/caption-check.mjs` | 8 checks, 0 problems |
| `node client/scripts/narrator-check.mjs` | 5 checks, 0 problems |

What the caption read in the check, on the walk after the first conversation:

| When | The caption |
|---|---|
| The camera walks | "You walk under leaves the size of doors. It rained here an hour ago, or will in an hour; the dripping is the same either way, and keeps better time than you do. On the way to The Lesser Hollow…" |
| The camera is there, the conversation loading | the same passage, ending "Henrietta is getting ready to talk…" |
| The character is ready | no caption; the conversation is open |

Pictures: [the owner's, from the phone](shots/00-the-owners-picture.jpg) (the bare line, before),
[on the way](shots/01-on-the-way.jpg), [getting ready](shots/02-getting-ready.jpg), [talking](shots/03-talking.jpg).

## Decision

- **The line is inside the passage's paragraph, not under it.** The owner's words were to put it "to the end of
  that narrative statement". It reads as the narrator's last sentence.
- **"On the way to…" moves there too.** Otherwise the caption would change shape when the camera arrives: a line
  under the passage would go and a sentence inside it would come.
- **The dungeons' caption follows**, so the two places do not differ. Not asked for.

## Evidence

- `client/src/components/__tests__/narration.test.jsx`, `client/scripts/caption-check.mjs`.
- `docs/rounds/166/shots/`.
- The trail: [`trail/interview.md`](trail/interview.md) (the owner's words).

## Claim boundary

As in the architecture: seen in headless Chromium on the road only; not seen on a real phone; no real model was
called, so how long the caption stays in real play is not measured.

## Open items

- A passage is told once per arrival and some are marked to be told once ever; a site of which nothing is told
  still shows the bare line. Whether every arrival should have something to read is the owner's to say.

## The deploy (2026-11-23)

On the owner's word ("and deploy"), `main` was moved to `b2ba4bc` with `[skip render]`: the page only, since the
server is unchanged. CI run 45151015231 and the Pages run 45151015525 succeeded, read from GitHub's API. The live
page is outside the session's network and was not looked at.
