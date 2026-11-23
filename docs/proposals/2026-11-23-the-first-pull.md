# Proposal: the pulls

*2026-11-23. Not built. Written because the owner described the event and said "we need to kind of think of how to
implement that animation and then permanently update the world map". No second opinion was taken (the cloud session
has no Codex); the questions at the end are for the owner.*

**Amendment, 2026-11-23.** The owner then said: "let's make it at all the medium to major transitions so not every
single unit but maybe A1 to a two and so on". The event is no longer one moment at A2 to B1: it comes at each larger
step of the curriculum. Sections 3 and 4 below are changed for that. Asked which steps, the owner settled it: "Really only do A1 to A2 and
so on": the changes of level, and no step inside a level. With today's curriculum (A1 to B1) that is two events.
The work is GitHub issue #23.

## Goal

At each change of level in the curriculum (A1 to A2, A2 to B1, and so on) the player sees what they have
been walking on and what their walk has done to it ([`docs/lore-book.md`](../lore-book.md), "The pulls"): the map
draws back, the whole graph grows out from where they stand like a wave, and then the land is pulled down at every
site of their walk, for good.

## Problem

The landscape is a pure function of a seed (`server/src/road/terrain.js`), and everything rests on that: the server
rules on moves with it, the client builds its ground and paints its map from the same functions, and the save holds
ids and nothing else. A landscape that changes because of what one learner did must stay a pure function, or the
server and the client stop agreeing on where the ground is.

## Change

**1. The pull is data in the save, and the land is still a function.** Each time the event happens the road adds
to `pulled` an entry `{ step, sites: [node ids], depth }`: the sites walked since the last pull, each once (the
earlier entries are kept and count again, deeper). `createTerrain(seed, { pulls })`
takes their positions and lowers the ground round each:

    height(x, z) = base(x, z) − Σ depth · k(distance to the site / radius),   k(t) = (1 − t²)² for t < 1, else 0

About 60 m across and 8 to 12 m deep makes a hollow that reads as a small valley on the map and a dip in the level;
where sites of the walk lie along a line, the hollows run together into a valley along the seam, which is the picture
the lore asks for. A site never goes under water: its own depth is capped at its height less a metre and a half.
The pulls are indexed by the graph's cell, so a height asks nine cells at most.

**2. The graph does not move.** Sites and ways are still read from the land without pulls, so every id, every way
and every saved walk stays valid; only a site's height is read from the pulled land. (Otherwise a pull could flood a
way or move a site, and old saves would point at nothing.)

**3. The event.** `finishRoad` already knows when a conversation opens a new unit, and each unit knows its stage
(`content/curriculum/`: six stages, two to a level, each with its `cefr`). When the unit it opens is the first of
a new level (its stage's `cefr` differs from the stage before), it adds to `pulled` in the same save and the reply carries
`worldEvent: 'pull'` with its number. The client then plays, on the map:

- *the map draws back*: the journey's frame (round 161), a little wider;
- *the web*: every site and way within a radius that grows from the player outward over a few seconds, drawn as the
  map draws ways (the graph is generated as the radius reaches it, which is the generation the owner wants shown);
- *the pull*: the map's picture painted again with the pulls at 0 %, 10 %, … 100 % of their depth. The painter takes
  some tens of milliseconds a frame at the map's 240 columns, so ten frames a second is within reach on a phone;
- then the narrator's passage for it (a written one, with a turmeric text), and the guidebook's entry.

After it the 3D level builds its chunks from the pulled land, and the map and the icon-like picture of the journey
show the valleys from then on.

**4. Each pull is deeper than the last.** A site's depth is the sum over the pulls it has been in, so the first
sites of the walk sink furthest and the newest are only dimpled: "not pulled without limit, but that is the way it
is going". The same cap keeps every site above water.

**5. The characters going back.** Separate and small: at the end of a conversation on the road the stand-in sinks
through the ground (`client/src/scene/roadView.js` already moves the figures each frame).

## Questions for the owner

- **Which sites are pulled**: every site walked to, or only those where a conversation was finished (a completed
  stitch, by the lore)?
- **How deep and how wide** the first pull is: a dip that needs the map to notice, or a valley seen from the road?
- **Is it shown once**, or can the player watch it again from the guidebook?
- **Does the web stay visible** on the map after the event (faintly), or only during it?
