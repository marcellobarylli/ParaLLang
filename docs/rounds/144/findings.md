# Round 144 findings

## Question

Can the game be given the backbone the owner asked for in one round: an endless fractal landscape of which only the
part around the player exists, a graph of sites computed from it as the world map, a researched curriculum walked
along that graph with a generated character at every site, pacing by what is known about learning, travel on rails or
by the map, and a save of the whole game state that shows where the player is in the curriculum?

## Finding

Yes, as a playable backbone in the web client, with three things not checked: the Italian and Spanish (written, not
read by a speaker), a live model (every conversation was scripted), and a phone.

**The Long Way Home** is a new place on the world map. With a scripted grader and narrator it plays from the world
map through the curriculum: all 108 lessons and 36 gates of each language, and then on as review without end (`server/test/road-walk.test.js`).

## Method

- Research by a subagent with web search (`trail/research.md`); three of its extracts were searched again. No page
  could be opened from the session.
- The landscape, graph, pacing and characters are pure functions and were tested directly; the road's rules were
  tested through the server's routes with a scripted provider; the client's store and screen were tested against the
  real server logic in process; the level was built headless.
- The built client was played in headless Chromium (software WebGL) against an in-process server at 390×844 and
  1440×900: `client/scripts/road-shots.mjs`.

## Results

| What | Result |
|---|---|
| Tests | server 485 of 485 (469 before the round); web client 241 of 241 (228 before); aesthetic 73 of 73 (66 before); iPhone app 320 of 320 (untouched) |
| Client build | passes; the road's host is a lazy chunk of 14 kB beside the shared three.js chunk |
| Landscape | pure in the seed; dry at the start for every seed tried; about a quarter of the ground under water; heights from about −20 to 115 m; 0.7 to 1.3 µs a height |
| Graph | over three seeds and 441 cells each: every site on dry ground in its cell, every way two-way, every site with a way on north or east, mean degree about 3 |
| Level | 81 chunks around the camera; 27,606 triangles at the start of seed 4242 and inside the style's 64,000 in the densest forest of a square mile; chunks left behind are dropped |
| Curriculum | 6 stages, 36 units, 108 lessons and 324 objectives in each language; 493 vocabulary entries in Italian and 487 in Spanish; every example passes the engine's matcher; the two languages have the same lessons and objectives |
| A walk on rails, said cleanly | lesson, lesson, lesson, review, gate: five conversations a unit; the gate opens the next unit |
| Pacing | a review after two lessons at a normal rate, after one below 75 %, after three above 92 %; a gate only after another conversation; a failed gate is followed by a repair and a retest with other objectives |
| Save | copied out and put back on a second server with an empty disk: the road, the curriculum's marks and the level are the same; in the browser the page restored it by itself after the server was replaced |
| Content load | the curriculum's vocabulary costs about one second at first use in a process (one pattern per form); it is read on first use, so a process that never uses the road does not pay it |

Pictures (each at a phone and a desktop size) in [`shots/`](shots/):
[the hub](shots/02-hub-desktop.jpg), [a conversation](shots/03-conversation-desktop.jpg),
[a finished one](shots/05-resolved-phone.jpg), [the glide](shots/06-glide-desktop.jpg),
[the map](shots/07-map-phone.jpg), [the curriculum](shots/09-curriculum-desktop.jpg),
[after the server lost the save](shots/10-restored-phone.jpg).

## Outcome

Built and played as described under Results. The last whole run, after the last change: every suite above passing,
the client built, and `road-shots.mjs` through at both sizes with 20 pictures and no failure (2026-11-22).

## Decision

Built as designed in [`architecture.md`](architecture.md), on the branch `claude/admiring-mendel-zuqioq`. Not merged
to `main` and not deployed: a merge deploys the server, whose restart wipes the saves on the free plan, and that is
the owner's call. (From this build on, a browser that has played once keeps a copy and puts it back. The first deploy
still loses the runs that exist now, because no browser holds a copy of them yet.)

Decisions Claude took without the owner (the request said "go"):

1. **Its own place, not a replacement.** The road is a new place on the world map beside Ta Prohm, The Kiln and the
   mountain, which are untouched.
2. **The name** The Long Way Home, the place names and the character pools are Claude's.
3. **One landscape per learner** (a random seed, kept in the save). "A new landscape" in the curriculum panel draws
   another and keeps the curriculum's marks.
4. **The curriculum has its own vocabulary**, apart from the market's, so a word taught by both has two Spellbook
   cards.
5. **In a lesson the character says the new words first.** The market's rule is the opposite (a character never
   says an answer before the player has). A learner cannot recall a word they have never met; reviews and gates keep
   the market's rule.
6. **The map offers kinds of conversation, not places for their own sake.** The pacing's recommended conversation is
   at the rails' site; the alternatives (a review, a lesson again, the next lesson) wait at the other sites ahead.
7. **A site is visited once.** The trail is not walked back along; the frontier never runs out.
8. **The pacing's numbers** (`PACING`), each from a source or marked as having none in `docs/curriculum.md`.
9. **Stages, not the player's level, set the share of target language** on the road.
10. **Six units of three lessons a stage.** A spine: real courses to B1 are many times larger.

## Evidence

- `server/test/road.test.js`, `aesthetic/test/endless.test.js`, `client/src/stores/__tests__/road-flow.test.js`,
  `client/src/components/__tests__/road-screen.test.jsx`, `client/src/scene/__tests__/roadDirector.test.js`.
- `client/scripts/road-shots.mjs` and its pictures in `shots/`.
- `node server/scripts/check-curriculum.js`.
- [`trail/research.md`](trail/research.md) for every source.
- [`trail/content-report.md`](trail/content-report.md): the content author's own list of forms and sentences to read first.

## Claim boundary

- **No live model.** Narration and grading were scripted. Not seen: a model speaking as a generated character,
  following the teaching note, grading against the curriculum's rubric, or holding the later stages' higher share
  of target language.
- **The language is unreviewed.** The loader's checks are about form. Stage A1.1 was written by Claude, the other
  stages by a subagent of the session.
- **The sources were read as search extracts**, not as pages.
- **Not on a phone, not on a GPU.** Pictures are from software WebGL at two sizes. Frame rate is unknown.
- **The pacing is untuned**, and its 85 % target is borrowed from a result about learning machines.
- **The web client only.** The iPhone app has no road.

## Open items

- The owner reads the Italian and Spanish of `content/languages/{it,es}/curriculum/` and the decisions above.
- A run against the live model, on the owner's word (it spends the subscription).
- A deploy, on the owner's word.
- Not built: a stage exam larger than a unit's gate; characters that are more than a cloak; the road in the iPhone
  app; a word taught by the market and the road as one card; the camera going round trees.
- The server's test suite takes longer since this round wherever a test file uses the road (about a second each).
