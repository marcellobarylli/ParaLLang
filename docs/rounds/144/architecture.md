# Round 144 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's request, in a Claude Code cloud
session, not through the round pipeline. The request ended in "go", so the open points were decided by Claude on the
most reasonable assumption and are listed in the findings for the owner. There was no pre-run commit and nothing here
is frozen. The owner's words are in [`trail/interview.md`](trail/interview.md); the research the curriculum and the
pacing rest on is in [`trail/research.md`](trail/research.md).

- **Design source:** the owner's request; [round 119](../119/architecture.md) (a dungeon is a map under a world map),
  [round 143](../143/architecture.md) (everything out of the fog is reachable from anywhere),
  [round 129](../129/architecture.md) (beginner mode: a correction closes an objective for a heart),
  [round 133](../133/architecture.md) (more than one open place); `content/narration/style_guide.yaml`.
- **Findings:** [`findings.md`](findings.md). **The curriculum and its sources:** [`docs/curriculum.md`](../../curriculum.md).
- **Artifact:** `server/src/road/` (terrain, graph, curriculum, pacing, characters, encounters, service),
  `content/curriculum/`, `content/languages/{it,es}/curriculum/`, `aesthetic/src/scene/endless.js`,
  `client/src/scene/roadView.js` and `roadDirector.js`, `client/src/stores/roadSlice.js`,
  `client/src/components/Road.jsx` and `RoadView.jsx`, the save's copy in `client/src/stores/gameStore.js`, the tests,
  `client/scripts/road-shots.mjs` and `docs/rounds/144/shots/`.

## Goal

A backbone for the game the owner describes: an endless landscape made by fractal algorithms, of which only the part
around the player exists; a graph of sites computed from that landscape, which is the world map; a curriculum from
first words to B1, looked up and not invented, walked along the graph; a random character at every site, described in
words; pacing matched to what is known about learning; travel on rails or by the map; and the whole game state saved,
with the place in the curriculum on show.

## Design

The feature is a new place on the world map, **The Long Way Home** (the name is Claude's; Journathan, "still
technically on his way home", is the owner's). It is a mode of the web client beside the dungeons.

### The landscape (`server/src/road/terrain.js`)

A pure function of a seed: `heightAt(x, z)` is a sum of fractal noises (fractional Brownian motion: octaves of value
noise at twice the frequency and half the height each). A very low "continent" noise says where land and water lie
(sea level is 0); hills are fBm read at domain-warped coordinates; mountains are ridged fBm switched on by a second
low mask; a little detail roughens the near ground. Around the origin the land is lifted clear of the water, so every
seed starts dry. `biomeAt` gives water, shore, meadow, forest, highland or snow from height and a moisture noise, and
`treesIn(cx, cz)` the trees of one 48 m chunk: a hashed candidate every 8 m, kept by the biome's density. Nothing is
stored, so the world is as large as the numbers go.

### The graph (`server/src/road/graph.js`)

Read off the landscape, also with no storage:

- **A site** per 88 m cell: of ten hashed points, the flattest on dry ground. A cell of open water has no site.
- **A way** joins two sites in touching cells when the ground between them is easy (little water, no steep climb,
  little total climb): about half of all candidate ways. A way is the best of three gently bowed lines. One diagonal
  at most crosses a square of four cells, so ways do not cross.
- **A forced way**: every site keeps the cheaper of its ways to the next site north and the next site east, however
  hard, as a ford, a pass, or a ferry over the cells with no site. So every site has a way on and a walk cannot be
  boxed in. The mean degree is about 3.

### The curriculum (`content/curriculum/`, `server/src/road/curriculum.js`)

Content, in two layers: a language-neutral skeleton (six stages from A1.1 to B1.2, six units each, three lessons a
unit, three objectives a lesson: what to say and what the character does to invite it) and, per language pack, the
words that say it (one or more vocabulary entries an objective is met by, with examples). The loader compiles each
objective into the shape the encounter engine already grades (round 006's objective schema), and refuses a lesson
without words, two entries that share a form, and an example the game's own answer check would not accept.
[`docs/curriculum.md`](../../curriculum.md) holds the scale, the order and their sources.

**The curriculum's vocabulary is its own**: its ids are prefixed `c_` and it is matched apart from the market pack's
(`content.vocabulary`). Merging it would have put some hundreds of everyday words into lists that the market's
answer-leak checks, lore texts, atmosphere filter and pinned versions all read. A road conversation is graded against
the curriculum's entries (`definition.scope`), a market one against the pack's, as before. A word taught by both has
two Spellbook cards.

### Pacing (`server/src/road/pacing.js`)

Pure. A conversation is a **lesson** (the next of the unit, new words), a **review** (three objectives of earlier
lessons, two units mixed, due cards first), a **repair** (a lesson that went badly, again) or a **checkpoint** (the
unit's gate, without hints). `plan(curriculum, progress, step)` gives what may be played now, the recommended one
first. The rules and their sources are the table in [`docs/curriculum.md`](../../curriculum.md): about 85 % success
steers how often a review comes; a gate comes at least one conversation after its unit's last lesson and opens the
next unit at 80 %; a failed gate is followed by a corrective lesson and a retest with other objectives. A
conversation's score is the share of objectives said cleanly; one closed by a correction or after a hint counts half.

### Characters (`server/src/road/characters.js`)

Generated per site and step from what the conversation is about: the trade is one of the unit's authored `roles`
(a review and a gate have their own), the name, temperament, two habits, looks and voice are drawn from pools, in the
style guide's voice. The result is a character sheet of the usual shape, so the prompts are unchanged.
`encounters.js` builds the conversation's definition from the activity and the sheet. In a lesson the objectives'
intent and a `teaching_note` in the turn data tell the narrator that the words are new and are to be used in the
character's own lines first; in a review and a gate the character never says them first.

### The road on the server (`server/src/road/service.js`)

The save gains `road`: the seed, the step (conversations finished), the site the learner stands at, the trail (the
last 300 sites visited), the cleared sites, the conversation waiting at the site, the curriculum's marks and a journal
of the last 30 conversations. The save stays version 3: an older server ignores the field.

- **The frontier** is every site next to a site of the recent trail that is not on the trail. Any of them may be
  walked to from anywhere (round 143's rule). The **rails** site is a hashed pick among the sites next to the learner.
- **Offers.** The pacing's first choice waits at the rails site; the other choices are dealt to the rest of the
  frontier. So the map is a choice between kinds of conversation, and on rails the order is the pacing's.
- `GET /api/road`, `POST /api/road/move`, `POST /api/road/reset`; a start with `road: true` opens the conversation
  waiting at the site. A finished conversation is recorded in the turn's own save, so a resent answer counts once.
- A road conversation takes its share of target language from its stage, not from the player's level.

### Saving

Progress was already saved on the server after every answer. What was missing is surviving the server: the hosted
server's free plan loses its files on every restart ([handoff](../../handoff.md)). So:

- `GET /api/save` gives the whole save (without the receipts of past answers) and `POST /api/save/restore` puts one
  back, refused if the server holds a save for that learner unless `replace` is true, and for another language.
- The web client copies the save to the browser after every finished conversation, review and walk on the road. When
  the server answers that it made a new save for a learner id the browser already had, the copy goes back in its
  place and the page says so. Settings has "Save to a file" and "Load from a file".

### The level (`aesthetic/src/scene/endless.js`)

`createEndlessWorld({ terrain })` takes the landscape's functions from the host, so the server's graph and the
client's ground agree. `streamTo(x, z)` keeps the 9 by 9 chunks around the camera: it builds the missing ones nearest
first, a few a frame, and drops those left behind. A chunk is 8 by 8 quads of ground in grass, rock or snow by
biome, a water quad where the ground dips under the sea, and its trees: a trunk and one or two cones (a fir) or a
trunk and a faceted ball. Far chunks carry less. The fog hides the edge. A character is a plain cloaked stand-in
coloured by a hue from its sheet, a finished site is a cairn, and a worn track lies along each way.

### The client

- `roadSlice.js`: `mode` is `dungeon` or `road`; on the road `roadPhase` is `hub` (the site's card), `travel` (the
  camera glides) or `encounter` (the dungeon's dialogue sheet). The conversation at the next site is asked for when
  the walk starts and opens when the camera is there.
- `Road.jsx`: the hub card (the place, who waits there in words, the kind and title of the conversation), the way on
  (one "Continue" on rails, the choices otherwise, and a switch between the two), the map (the landscape from above,
  the trail, each site ahead with its kind; a tap picks one), and the curriculum panel (every stage, unit and lesson
  with its marks, the gate, the success rate against the target, the journal, when the save was last copied).
- `roadDirector.js`: the camera arrives from the sky, glides a few metres up along a way in 3 to 9 seconds, holds at a
  site and steps in as objectives close, and wanders round a site where nobody waits.

## Tests

- `server/test/road.test.js`: the landscape and graph are pure and the graph's invariants hold; the curriculum loads
  in both packs with the same shape and every example passes the engine's matcher; the pacing's rules; a character
  is deterministic and drawn from the unit; a walk on rails goes through the curriculum; the frontier's rule; a
  corrected answer scores half and a resent one counts once; the save out and back; a road the server cannot read.
- `aesthetic/test/endless.test.js`: chunks around a point and dropped behind it; PS1 materials and attributes;
  seams; the triangle budget in the densest forest.
- `client/src/stores/__tests__/road-flow.test.js` and `client/src/components/__tests__/road-screen.test.jsx`: the
  store and the screen against the real server logic in process (`client/src/__tests__/roadServer.js`).
  `client/src/scene/__tests__/roadDirector.test.js`: the camera.
- `client/scripts/road-shots.mjs`: the built client in headless Chromium against an in-process server, at a phone
  and a desktop size, including a server that loses the save.

## Claim boundary

Everything was played with a scripted grader and narrator: no model has spoken as a generated character or been
given the teaching note. The Italian and Spanish were written by Claude and a subagent and checked for form only. The
pictures are from software WebGL and were judged by Claude; nothing was seen on a phone. The pacing's numbers are a
first setting. The iPhone app does not have the road.

## Outcome

See [`findings.md`](findings.md).
