# Round 164 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-23 by the owner's message on waking, after
rounds 153 to 163; the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing
here is frozen.

- **Design source:** the owner's message (no GitHub issue); [round 150](../150/architecture.md) (the icons),
  [round 161](../161/architecture.md) (the journey on the map), [`docs/lore-book.md`](../../lore-book.md).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `client/scripts/make-icons.mjs`, `client/public/parallang-icon-*.png`, `mobile/assets/icon.png`,
  `docs/lore-book.md` ("The stitch", "The first pull"), `docs/proposals/2026-11-23-the-first-pull.md`,
  `docs/rounds/164/shots/`.

## Goal

Three things before the merge: the picture of the whole walk becomes the icon; the owner's new lore of the stitch
goes into the lore book; and the eleven rounds and this one are merged and deployed.

## Design

**The icon is the journey.** The owner picked round 163's picture of a whole walk: 120 walks on rails over the
landscape of seed 4242, seen from far off. `client/scripts/make-icons.mjs` now draws exactly that: it makes the walk
as the game does (at each site the rails' own choice, `offersFor`), frames all of it as the map's "Show Journey so
far" does, and paints the map's gold line with its dark edge, a pale dot where the journey began and the white post
where the walker stands. The maskable icon shows more land round the same walk, so that a round mask does not cut
it. Six files, as before: the web app's five and the iPhone app's.

**The lore book.** "What the book does not say" gains two parts in the owner's words, restated:

- **The stitch**: a stitch is two passes; every character of an encounter has come through from the other world and
  is an impostor here; finishing an encounter sends them back down through the ground and completes the stitch; a
  rift is a stitch seen from the side; and the player's walk is a seam, which is why Collision begins along it.
- **The first pull**: the world event at the step from A2 to B1. The map draws back, the whole graph grows out from
  the player like a wave, and the land is pulled down at every site of the walk, for good.

Its "Not settled" list is rewritten: two of its old questions are answered by this, and new ones are named, first
among them that the game's narrator is told today that characters were born in this world (round 155).

**Nothing of the event is built.** The owner called it "a bit further down the line" and asked how it could be
done. [`docs/proposals/2026-11-23-the-first-pull.md`](../../proposals/2026-11-23-the-first-pull.md) says how: the
pull as data in the save, the land still a pure function of the seed and the pulls, the graph unmoved, and the
animation on the map.

**The merge.** The owner said "merge and deploy". Rounds 153 to 164 go to `main` in one merge without
`[skip render]`: the page and the server are both deployed, because the page's new features (light mode, the
guidebook, the journey) need the server's.

## Amendment (2026-11-23): the pull comes at every larger step

After the deploy the owner said: "Actually, let's make it at all the medium to major transitions so not every single
unit but maybe A1 to a two and so on". The lore book's "The first pull" is now "The pulls": the event comes at the
curriculum's larger steps (A1 to A2, A2 to B1, and so on), each pull taking the sites walked since and drawing the
earlier ones further down. The proposal is amended the same way. Which steps count as "medium" (the steps between
the two stages of a level, or only the changes of level) is asked in both. Still nothing of it is built.

## Tests

- `client/src/__tests__/pages.test.js`: the icon's walk is 120 walks from the start, every site of it is inside
  the picture and inside a round mask's safe circle, the line's gold is on the picture, and each file has its size.
- Every suite before the merge: server, web client, the aesthetic package, and the iPhone app's (run this time).

## Claim boundary

The icons were looked at as files at 512 and 64 pixels, not on a phone's home screen. The lore is the owner's;
its wording in the book is Claude's and unread by the owner.

## Outcome

See [`findings.md`](findings.md).
