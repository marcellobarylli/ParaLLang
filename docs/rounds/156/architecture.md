# Round 156 architecture

**Conversational round, recorded with the build.** The fourth of the owner's eleven issues (see
[`trail/interview.md`](trail/interview.md)); the owner was asleep. No pre-run commit; nothing here is frozen.

- **Design source:** GitHub issue #6, "Make the italic text a true narrator (storybook voice, Dark Souls mystery
  level)" (step 6 of the build order); [`docs/lore-book.md`](../../lore-book.md), "What the book does not say".
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `content/narration/style_guide.yaml` (`narrator`), `prompts/system/base.txt`,
  `server/src/llm/prompt-builder.js`, `content/narration/passages.yaml`, `server/src/narration.js`,
  `server/src/learning-service.js` (`tell`, `toldView`), `server/src/road/service.js`,
  `server/src/learning-storage.js` (`told`), `client/src/components/Narration.jsx`, `Road.jsx`, `DungeonScreen.jsx`,
  `server/test/fixtures/gerald-prompts-r156.json`, `client/scripts/narrator-check.mjs`, `docs/rounds/156/shots/`.

## Goal

The italic text is a narrator: we are reading a story, told to "you", that keeps a consistent mystery about the truth
of the world. It holds for the narration a model writes and for narration that is written down.

## Design

### The generated narration

Every reply of the narrator model has a `narrative` field; the web client sets it in italics. Until now its voice
was one line of the style guide ("omniscient, slightly exasperated, … inclined to explain a thing by making it
worse"), which is the opposite of what the issue asks.

`content/narration/style_guide.yaml` now holds the narrator as data:

- **`narrator_voice`**: "a storybook narrator telling the player their own story, in the second person and the
  present tense; dry, fond of everyone it describes, and sparing: it knows more than it says".
- **`narrator.rules`**, six of them: the narrative is told to "you" in the present tense; it tells what the player
  sees, hears and does and never what they think or decide; it describes a thing as an old inventory does (the
  thing, a clause of where it has been, an implication left standing) and does not finish the thought; it never
  explains how the world works; at most once in a conversation it lets a hint stand, a word for sewing where a word
  for a road is expected, or a thing slightly the wrong age; its share of the wit is understatement.
- **`narrator.knows`**: the anchor, from the lore book's last part. The world is a web, its roads are threads, the
  web is stitched to other worlds, each learned word is a stitch, and no character knows.

They fill a new block of `prompts/system/base.txt`, "THE NARRATOR (the `narrative` field)", which ends with "WHAT
THE NARRATOR KNOWS AND NEVER SAYS". The model is given the truth so that its hints point the same way every time,
and is told never to state it. The characters' block (round 155) still gives them only what can be seen.

This changes every narrator prompt, so Gerald's pinned prompts were regenerated
(`server/test/fixtures/gerald-prompts-r156.json`); the script that wrote them reproduced the round 131 fixture byte
for byte from the tree before this round.

### The written narration

The narrator also has passages that are written down: `content/narration/passages.yaml`, 26 of them in the same
voice. A passage is `{ id, when, once?, text }`, and `when` names an event and the facts it must have:

| Event | Facts | When it is told |
|---|---|---|
| `road_enter` | | the first step on the road (once) |
| `road_arrive` | `way` (path, ford, pass, ferry), `biome` | an arrival at a site of the road |
| `site_arrive` | `dungeon`, `site` | standing at a site of a dungeon |

`server/src/narration.js` (pure) picks the passage of an event: one marked `once` that this learner has not been
told comes first; otherwise the passages asking for the most facts win, and a hash of the place picks among equals,
so a place keeps its passage.

The road stores the id of the passage of the last arrival (`road.narration`) and its view sends the passage; the
dungeon's view sends the passage of the site the player stands at. The web client shows it on the road's card, in
the caption while the camera walks, and on a dungeon's site card. The last line of a conversation ("Portia sighs
with relief, unlocks herself and lets you into the market.") and the line of an empty site are set as narration too.

### The hooks for the next two issues

- **Spans (issue #4).** A passage is sent as `{ id, segments }`. A segment is `{ text }` or `{ text, kind }`, and the
  client's `Narration` component sets a segment with a kind apart by a class, `narration-<kind>`. Round 156 sends
  plain segments only.
- **Guidebook triggers (issue #5).** The save keeps which passages were told and when: `told: { id: time }`, written
  the first time a passage is told. A guidebook entry can hang on a passage's first telling.

## Tests

- `server/test/narrator.test.js` (7 tests): the narrator's rules; every written passage keeps the voice, explains
  nothing and does not speak for the player; the choice of a passage; the wire shape; the road's first step, an
  arrival and the save's record; a dungeon's sites; the save's validation of `told`.
- `server/test/encounters.test.js`: the pinned prompts, with the narrator block.
- `client/src/components/__tests__/narration.test.jsx` (5 tests): the component, the road's card, the caption, the
  last word.
- `client/scripts/narrator-check.mjs` in headless Chromium at a phone's size.

## Claim boundary

**No model was called.** The prompt asks for the voice; what a model writes under it has not been read, and the
voice is the whole of the first half of this issue. The written passages are Claude's and unread by the owner. Seen
in headless Chromium, not on a phone. The iPhone app's map atmosphere line takes the new `narrator_voice` in its
prompt and is otherwise unchanged.

## Outcome

See [`findings.md`](findings.md).
