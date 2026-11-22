# Round 148 findings

## Question

Can the characters speak the language being learned only, by a slider that goes up to 100 % and starts there, with
the coloured translation carrying the understanding and the voices kept?

## Finding

Built, on the session branch; **not deployed** (with round 147). The slider is in Settings, at 100 % unless moved.
At 100 % the narrator is told to write every line in the language only, and the line's translation shows under it,
sentence by sentence in matching colours, free. Whether a model keeps to the rule has not been seen: no model was
called.

## Method

Tests of the server's share, the prompts, the client's preference and stores; the built client in headless Chromium
at 390×844 and 1440×900 against an in-process server with a scripted narrator.

## Results

| What | Result |
|---|---|
| Tests | server 505 of 505 (497 before the round); web client 255 of 255 (252 before); aesthetic 87 of 87 (untouched). The iPhone app is untouched (320 at round 144's run) |
| The slider | "How much Italian the characters speak", 10 % to 100 % in tens, 100 % as first opened; stored in the browser; no reconnect |
| At 100 % | the narrator's prompt says "Dialogue is entirely in Italian: every word of every dialogue line, the greeting included"; the three lines about mixing in English are gone; the rest of the prompt is unchanged |
| The translation at 100 % | sent with the line being answered; no hint used, no reveal recorded, the answer's words marked in full |
| Below 100 % | the mixed rules at the share chosen (60 %: "in a 20-word line, about 12 words"), the same on every turn; the translation is a hint as before |
| Without a share | Gerald's pinned prompts are byte for byte what they were; a road conversation keeps its stage's mix |
| Playthrough | passes at both sizes, 42 pictures |

Pictures in [`shots/`](shots/): [the slider](shots/21-language-slider-phone.jpg),
[a line in Italian only](shots/03-conversation-phone.jpg) (the script's line, not a model's).

## Decision

Built as designed in [`architecture.md`](architecture.md).

Decisions Claude took:

1. **The slider replaces the content's share** wherever the web client talks to a character: the stage's share on
   the road, a character's own and its rise by the turn, the level's addition. There is no "as the game sets it"
   position; the owner asked for a slider that starts at 100 %.
2. **At full immersion the line's translation is free and shows at once.** Otherwise a beginner would spend every
   hint on reading, have every mark capped, and meet gates that allow no hints. The owner's words ("the multicolour
   translation should take care of the learning, where I can clearly see") are read as asking for this.
3. **The narration stays English** with a few words of the language. "The NPCs" are the characters' lines.
4. **The server's default is unchanged**, so the iPhone app plays as before. Only the web client sends a share.
5. **The slider stops at 10 %**, not 0: a line with none of the language teaches nothing and trips the check that
   a line has some.

## Evidence

`server/test/immersion.test.js`, `server/test/web-client.test.js`, `server/test/encounters.test.js` (the pinned
prompts), `client/src/__tests__/display.test.js`, `client/src/components/__tests__/settings-sheet.test.jsx`,
`client/src/stores/__tests__/road-flow.test.js`, `client/scripts/road-shots.mjs`, [`shots/`](shots/).

## Claim boundary

- **No model was called.** A model may still slip an English word into a line, or write Italian above a beginner's
  level; the prompt asks for neither. The Italian in the pictures is the script's own and no speaker checked it.
- The translation's colours need the model to keep the translation sentence for sentence; the prompt now asks for
  it, and where the counts differ the page shows the two texts plain, as before.
- A first lesson's line holds the new words on purpose (round 144), so there the free translation shows them in
  English too.
- Voices were not heard: the session has no sound.
- The iPhone app has no slider.

## Open items

- **A deploy**, on the owner's word, with round 147. This round changes the server, so Render restarts; on the free
  plan that wipes the server's saves unless the GitHub save is on, and the browser's copy puts a save back.
- The owner's first conversations at 100 %, to see what the model does.
